#![allow(dead_code)]

use crate::db;
use crate::models::TopicStatus;
use crate::state::AppState;
use axum::{
    extract::State,
    http::StatusCode,
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

pub async fn mcp_handler(
    State(state): State<AppState>,
    Json(payload): Json<JsonRpcRequest>,
) -> impl IntoResponse {
    match payload.method.as_str() {
        "initialize" => {
            let result = json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "coffeeyrd-mcp-server",
                    "version": "0.1.0"
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
                    "description": "Adiciona um novo tópico à mesa de discussão do Lean Coffee.",
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

            let res = execute_tool(&state, tool_name, arguments).await;
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
                Err(err) => (
                    StatusCode::OK,
                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: payload.id,
                        result: None,
                        error: Some(json!({ "code": -32603, "message": err })),
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

async fn execute_tool(state: &AppState, tool_name: &str, args: &Value) -> Result<String, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| format!("Database error: {:?}", e))?;

    match tool_name {
        "get_session_summary" => {
            let session_id = args.get("session_id").and_then(|s| s.as_str()).ok_or("session_id required")?;
            let (session, _) = db::get_session(&conn, session_id).map_err(|e| e.to_string())?.ok_or("Session not found")?;
            let topics = db::get_topics(&conn, session_id).map_err(|e| e.to_string())?;

            let summary = json!({
                "session": {
                    "id": session.id,
                    "title": session.title,
                    "phase": session.phase.to_str(),
                    "active_topic_id": session.active_topic_id,
                },
                "topics_count": topics.len(),
                "topics": topics,
            });

            Ok(serde_json::to_string_pretty(&summary).unwrap())
        }

        "add_topic" => {
            let session_id = args.get("session_id").and_then(|s| s.as_str()).ok_or("session_id required")?;
            let title = args.get("title").and_then(|s| s.as_str()).ok_or("title required")?;
            let description = args.get("description").and_then(|s| s.as_str());
            let author_name = args.get("author_name").and_then(|s| s.as_str()).unwrap_or("Agente IA");

            let topic_id = Ulid::new().to_string();
            db::insert_topic(&conn, &topic_id, session_id, title, description, author_name, "mcp_agent")
                .map_err(|e| e.to_string())?;

            Ok(format!("Tópico '{}' adicionado com sucesso com ID {}", title, topic_id))
        }

        "summarize_meeting" => {
            let session_id = args.get("session_id").and_then(|s| s.as_str()).ok_or("session_id required")?;
            let (session, _) = db::get_session(&conn, session_id).map_err(|e| e.to_string())?.ok_or("Session not found")?;
            let topics = db::get_topics(&conn, session_id).map_err(|e| e.to_string())?;

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

        _ => Err("Ferramenta desconhecida".to_string()),
    }
}
