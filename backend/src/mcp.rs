#![allow(dead_code)]

use crate::db;
use crate::models::{SessionPhase, TopicStatus};
use crate::state::AppState;
use crate::ws::{broadcast_snapshot, handle_timer_control};
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use ulid::Ulid;

#[derive(Debug, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    pub params: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<Value>,
}

fn extract_facilitator_token(headers: &HeaderMap, args: &Value) -> Option<String> {
    if let Some(arg_token) = args.get("facilitator_token").and_then(|t| t.as_str()) {
        if !arg_token.trim().is_empty() {
            return Some(arg_token.trim().to_string());
        }
    }
    if let Some(auth) = headers.get("authorization").and_then(|h| h.to_str().ok()) {
        if let Some(token) = auth.strip_prefix("Bearer ") {
            return Some(token.trim().to_string());
        }
        return Some(auth.trim().to_string());
    }
    if let Some(token) = headers.get("x-facilitator-token").and_then(|h| h.to_str().ok()) {
        return Some(token.trim().to_string());
    }
    None
}

pub async fn mcp_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<JsonRpcRequest>,
) -> impl IntoResponse {
    match payload.method.as_str() {
        "initialize" => {
            let result = json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "resources": { "subscribe": false, "listChanged": true },
                    "tools": { "listChanged": true }
                },
                "serverInfo": {
                    "name": "coffeeyrd-mcp-server",
                    "version": "0.2.0"
                }
            });
            (
                StatusCode::OK,
                Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: payload.id,
                    result: Some(result),
                    error: None,
                }),
            )
        }

        "resources/list" => {
            let resources = json!([
                {
                    "uri": "coffee://session/{session_id}/summary",
                    "name": "Lean Coffee Session Summary",
                    "description": "Structured JSON state containing current phase, timebox, active topic, and topic counts.",
                    "mimeType": "application/json"
                },
                {
                    "uri": "coffee://session/{session_id}/topics",
                    "name": "Lean Coffee Topics List",
                    "description": "Full list of ideated, voting, discussing, and discussed topics with vote counts and notes.",
                    "mimeType": "application/json"
                }
            ]);

            (
                StatusCode::OK,
                Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: payload.id,
                    result: Some(json!({ "resources": resources })),
                    error: None,
                }),
            )
        }

        "resources/read" => {
            let params = payload.params.unwrap_or(Value::Null);
            let uri = params.get("uri").and_then(|u| u.as_str()).unwrap_or("");

            match read_resource(&state, uri) {
                Ok(content) => (
                    StatusCode::OK,
                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: payload.id,
                        result: Some(json!({ "contents": [{ "uri": uri, "mimeType": "application/json", "text": content }] })),
                        error: None,
                    }),
                ),
                Err(err) => (
                    StatusCode::OK,
                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: payload.id,
                        result: None,
                        error: Some(json!({ "code": -32002, "message": err })),
                    }),
                ),
            }
        }

        "tools/list" => {
            let tools = json!([
                {
                    "name": "get_session_summary",
                    "description": "Retorna o status atual da mesa de Lean Coffee, tópicos em fila, em discussão e notas tomadas.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": { "type": "string", "description": "ID da sessão no CoffeeYrd" }
                        },
                        "required": ["session_id"]
                    }
                },
                {
                    "name": "add_topic",
                    "description": "Adiciona um novo tópico à mesa de discussão do Lean Coffee e transmite aos participantes via WebSocket.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": { "type": "string", "description": "ID da sessão" },
                            "title": { "type": "string", "description": "Título do tópico" },
                            "description": { "type": "string", "description": "Detalhes opcionais do tópico" },
                            "author_name": { "type": "string", "description": "Nome do autor ou 'Agente IA'" }
                        },
                        "required": ["session_id", "title"]
                    }
                },
                {
                    "name": "summarize_meeting",
                    "description": "Gera uma ata executiva formatada em Markdown com as conclusões e notas de cada tópico discutido.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": { "type": "string", "description": "ID da sessão" }
                        },
                        "required": ["session_id"]
                    }
                },
                {
                    "name": "coffee_change_phase",
                    "description": "Avança a fase da cerimônia de Lean Coffee (IDEATION -> VOTING -> DISCUSSION -> COMPLETED). Requer permissão de Facilitador.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": { "type": "string", "description": "ID da sessão" },
                            "phase": { "type": "string", "enum": ["IDEATION", "VOTING", "DISCUSSION", "COMPLETED"], "description": "Nova fase" },
                            "facilitator_token": { "type": "string", "description": "Token de facilitador (opcional se enviado via Header Authorization)" }
                        },
                        "required": ["session_id", "phase"]
                    }
                },
                {
                    "name": "coffee_control_timer",
                    "description": "Controla o cronômetro do tópico em discussão (START, PAUSE, RESET, ADD_SECONDS). Requer permissão de Facilitador.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": { "type": "string", "description": "ID da sessão" },
                            "command": { "type": "string", "enum": ["START", "PAUSE", "RESET", "ADD_SECONDS"], "description": "Comando do timer" },
                            "seconds": { "type": "integer", "description": "Segundos para START, RESET ou ADD_SECONDS (opcional)" },
                            "facilitator_token": { "type": "string", "description": "Token de facilitador (opcional se enviado via Header Authorization)" }
                        },
                        "required": ["session_id", "command"]
                    }
                }
            ]);

            (
                StatusCode::OK,
                Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: payload.id,
                    result: Some(json!({ "tools": tools })),
                    error: None,
                }),
            )
        }

        "tools/call" => {
            let params = payload.params.unwrap_or(Value::Null);
            let tool_name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let arguments = params.get("arguments").unwrap_or(&Value::Null);

            let res = execute_tool(&state, &headers, tool_name, arguments).await;
            match res {
                Ok(content) => (
                    StatusCode::OK,
                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: payload.id,
                        result: Some(json!({ "content": [{ "type": "text", "text": content }] })),
                        error: None,
                    }),
                ),
                Err((code, err)) => (
                    StatusCode::OK,
                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: payload.id,
                        result: None,
                        error: Some(json!({ "code": code, "message": err })),
                    }),
                ),
            }
        }

        _ => (
            StatusCode::OK,
            Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: payload.id,
                result: None,
                error: Some(json!({ "code": -32601, "message": "Method not found" })),
            }),
        ),
    }
}

fn read_resource(state: &AppState, uri: &str) -> Result<String, String> {
    let clean_uri = uri.trim_start_matches("coffee://session/");
    let parts: Vec<&str> = clean_uri.split('/').collect();
    if parts.len() < 2 {
        return Err("Invalid resource URI format. Expected: coffee://session/{session_id}/{summary|topics}".to_string());
    }
    let session_id = parts[0];
    let resource_type = parts[1];

    let conn = Connection::open(&state.db_path).map_err(|e| format!("Database error: {:?}", e))?;
    let (session, _) = db::get_session(&conn, session_id).map_err(|e| e.to_string())?.ok_or("Session not found")?;

    match resource_type {
        "summary" => {
            let topics = db::get_topics(&conn, session_id).map_err(|e| e.to_string())?;
            let res = json!({
                "session": session,
                "topics_count": topics.len(),
                "active_topic_id": session.active_topic_id,
            });
            Ok(serde_json::to_string_pretty(&res).unwrap())
        }
        "topics" => {
            let topics = db::get_topics(&conn, session_id).map_err(|e| e.to_string())?;
            Ok(serde_json::to_string_pretty(&topics).unwrap())
        }
        _ => Err(format!("Unknown resource type: '{}'", resource_type)),
    }
}

async fn execute_tool(
    state: &AppState,
    headers: &HeaderMap,
    tool_name: &str,
    args: &Value,
) -> Result<String, (i32, String)> {
    let conn = Connection::open(&state.db_path).map_err(|e| (-32603, format!("Database error: {:?}", e)))?;

    match tool_name {
        "get_session_summary" => {
            let session_id = args.get("session_id").and_then(|s| s.as_str()).ok_or((-32602, "session_id required".to_string()))?;
            let (session, _) = db::get_session(&conn, session_id).map_err(|e| (-32603, e.to_string()))?.ok_or((-32004, "Session not found".to_string()))?;
            let topics = db::get_topics(&conn, session_id).map_err(|e| (-32603, e.to_string()))?;

            let summary = json!({
                "session": {
                    "id": session.id,
                    "title": session.title,
                    "phase": session.phase.to_str(),
                    "active_topic_id": session.active_topic_id,
                    "timer_seconds_remaining": session.timer_seconds_remaining,
                    "timer_is_running": session.timer_is_running,
                },
                "topics_count": topics.len(),
                "topics": topics,
            });

            Ok(serde_json::to_string_pretty(&summary).unwrap())
        }

        "add_topic" => {
            let session_id = args.get("session_id").and_then(|s| s.as_str()).ok_or((-32602, "session_id required".to_string()))?;
            let title = args.get("title").and_then(|s| s.as_str()).ok_or((-32602, "title required".to_string()))?;
            let description = args.get("description").and_then(|s| s.as_str());
            let author_name = args.get("author_name").and_then(|s| s.as_str()).unwrap_or("Agente IA");

            let topic_id = Ulid::new().to_string();
            db::insert_topic(&conn, &topic_id, session_id, title, description, author_name, "mcp_agent")
                .map_err(|e| (-32603, e.to_string()))?;

            // Dispara sincronização em tempo real via WebSocket para todos os navegadores na sala
            broadcast_snapshot(state, session_id);

            Ok(format!("Tópico '{}' adicionado com sucesso com ID {}", title, topic_id))
        }

        "summarize_meeting" => {
            let session_id = args.get("session_id").and_then(|s| s.as_str()).ok_or((-32602, "session_id required".to_string()))?;
            let (session, _) = db::get_session(&conn, session_id).map_err(|e| (-32603, e.to_string()))?.ok_or((-32004, "Session not found".to_string()))?;
            let topics = db::get_topics(&conn, session_id).map_err(|e| (-32603, e.to_string()))?;

            let mut md = format!("# Ata de Reunião Lean Coffee: {}\n\n", session.title);
            md.push_str(&format!("- **Data:** {}\n", session.created_at));
            md.push_str(&format!("- **Fase Final:** {}\n\n", session.phase.to_str()));

            md.push_str("## ☕ Tópicos Discutidos\n\n");
            let discussed: Vec<_> = topics.iter().filter(|t| t.status == TopicStatus::Discussed).collect();
            if discussed.is_empty() {
                md.push_str("_Nenhum tópico marcado como discutido ainda._\n\n");
            } else {
                for t in discussed {
                    md.push_str(&format!("### {}\n", t.title));
                    if let Some(desc) = &t.description {
                        md.push_str(&format!("> {}\n\n", desc));
                    }
                    md.push_str(&format!("- **Votos:** {}\n", t.vote_count));
                    if !t.notes.is_empty() {
                        md.push_str(&format!("- **Notas/Combinados:**\n{}\n", t.notes));
                    }
                    md.push_str("\n");
                }
            }

            let pending: Vec<_> = topics.iter().filter(|t| t.status == TopicStatus::ToDiscuss).collect();
            if !pending.is_empty() {
                md.push_str("## 📝 Tópicos Não Discutidos (Fila)\n\n");
                for t in pending {
                    md.push_str(&format!("- **{}** (Votos: {})\n", t.title, t.vote_count));
                }
                md.push_str("\n");
            }

            Ok(md)
        }

        "coffee_change_phase" => {
            let session_id = args.get("session_id").and_then(|s| s.as_str()).ok_or((-32602, "session_id required".to_string()))?;
            let phase_raw = args.get("phase").and_then(|s| s.as_str()).ok_or((-32602, "phase required".to_string()))?;
            let phase_upper = phase_raw.trim().to_uppercase();
            let valid_phases = ["IDEATION", "VOTING", "DISCUSSION", "COMPLETED"];
            if !valid_phases.contains(&phase_upper.as_str()) {
                return Err((-32602, format!("Invalid phase '{}'. Expected one of: {:?}", phase_raw, valid_phases)));
            }
            let phase = SessionPhase::from_str(&phase_upper);

            let (_, actual_token) = db::get_session(&conn, session_id)
                .map_err(|e| (-32603, e.to_string()))?
                .ok_or((-32004, "Session not found".to_string()))?;

            let provided_token = extract_facilitator_token(headers, args);
            if provided_token.as_deref() != Some(&actual_token) {
                return Err((-32003, "Unauthorized: facilitator_token required".to_string()));
            }

            db::update_session_phase(&conn, session_id, phase.clone()).map_err(|e| (-32603, e.to_string()))?;

            if phase == SessionPhase::Discussion {
                if let Ok(topics) = db::get_topics(&conn, session_id) {
                    if let Some(first_to_discuss) = topics.into_iter().find(|t| t.status == TopicStatus::ToDiscuss) {
                        let _ = db::update_topic_status(&conn, &first_to_discuss.id, TopicStatus::Discussing);
                        let _ = conn.execute(
                            "UPDATE sessions SET active_topic_id = ?1 WHERE id = ?2",
                            [&first_to_discuss.id, session_id],
                        );
                    }
                }
            }

            broadcast_snapshot(state, session_id);
            Ok(format!("Sessão '{}' avançada para a fase '{}'.", session_id, phase.to_str()))
        }

        "coffee_control_timer" => {
            let session_id = args.get("session_id").and_then(|s| s.as_str()).ok_or((-32602, "session_id required".to_string()))?;
            let command = args.get("command").and_then(|s| s.as_str()).ok_or((-32602, "command required".to_string()))?;
            let seconds = args.get("seconds").and_then(|v| v.as_u64()).map(|s| s as u32);

            let (_, actual_token) = db::get_session(&conn, session_id)
                .map_err(|e| (-32603, e.to_string()))?
                .ok_or((-32004, "Session not found".to_string()))?;

            let provided_token = extract_facilitator_token(headers, args);
            if provided_token.as_deref() != Some(&actual_token) {
                return Err((-32003, "Unauthorized: facilitator_token required".to_string()));
            }

            handle_timer_control(state, session_id, command, seconds).await;
            Ok(format!("Comando do timer '{}' executado com sucesso na sessão '{}'.", command, session_id))
        }

        _ => Err((-32601, "Ferramenta desconhecida".to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> (AppState, String, String, std::path::PathBuf) {
        let db_path = std::env::temp_dir().join(format!("coffee_test_{}.db", Ulid::new()));
        let conn = Connection::open(&db_path).unwrap();
        db::init_db(&conn).unwrap();

        let session_id = "test_coffee_session_01";
        let facilitator_token = "coffee_secret_fac_token";
        let _ = db::create_session(
            &conn,
            session_id,
            "Lean Coffee Architecture Review",
            facilitator_token,
            3,
            300,
        ).unwrap();

        let state = AppState::new(db_path.to_str().unwrap().to_string());
        (state, session_id.to_string(), facilitator_token.to_string(), db_path)
    }

    #[tokio::test]
    async fn test_coffee_mcp_initialize() {
        let (state, _, _, db_path) = setup_test_db();

        let req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(1)),
            method: "initialize".to_string(),
            params: None,
        };
        let headers = HeaderMap::new();
        let _ = mcp_handler(State(state), headers, Json(req)).await;
        let _ = std::fs::remove_file(db_path);
    }

    #[tokio::test]
    async fn test_coffee_mcp_phase_control_security() {
        let (state, session_id, fac_token, db_path) = setup_test_db();
        let empty_headers = HeaderMap::new();

        // 1. Unauthenticated attempt -> error -32003
        let fail_res = execute_tool(
            &state,
            &empty_headers,
            "coffee_change_phase",
            &json!({ "session_id": session_id, "phase": "voting" }),
        ).await;
        assert!(fail_res.is_err());
        assert_eq!(fail_res.unwrap_err().0, -32003);

        // 2. Authenticated attempt with Bearer header -> success
        let mut auth_headers = HeaderMap::new();
        auth_headers.insert("authorization", format!("Bearer {}", fac_token).parse().unwrap());
        let ok_res = execute_tool(
            &state,
            &auth_headers,
            "coffee_change_phase",
            &json!({ "session_id": session_id, "phase": "voting" }),
        ).await;
        assert!(ok_res.is_ok());

        let _ = std::fs::remove_file(db_path);
    }

    #[tokio::test]
    async fn test_coffee_mcp_add_topic_and_read_resource() {
        let (state, session_id, _, db_path) = setup_test_db();
        let headers = HeaderMap::new();

        let add_res = execute_tool(
            &state,
            &headers,
            "add_topic",
            &json!({
                "session_id": session_id,
                "title": "Migrate to MCP 2024-11-05",
                "description": "Standardize across all Yrd apps",
                "author_name": "Claude Agent"
            }),
        ).await;
        assert!(add_res.is_ok());

        // Read resource
        let uri = format!("coffee://session/{}/topics", session_id);
        let resource_res = read_resource(&state, &uri);
        assert!(resource_res.is_ok());
        let text = resource_res.unwrap();
        assert!(text.contains("Migrate to MCP 2024-11-05"));

        let _ = std::fs::remove_file(db_path);
    }
}


