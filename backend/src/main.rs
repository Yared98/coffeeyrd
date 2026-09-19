mod db;
mod mcp;
mod models;
mod state;
mod ws;

use axum::{
    extract::{Path, State},
    http::{header, HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use state::AppState;
use std::net::SocketAddr;
use std::path::PathBuf;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use ulid::Ulid;

#[derive(Debug, Deserialize)]
struct CreateSessionRequest {
    title: String,
    max_votes_per_user: Option<u32>,
    default_timebox_seconds: Option<u32>,
}

#[derive(Debug, Serialize)]
struct CreateSessionResponse {
    id: String,
    facilitator_token: String,
    title: String,
}

async fn create_session_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateSessionRequest>,
) -> Result<Json<CreateSessionResponse>, StatusCode> {
    let session_id = Ulid::new().to_string();
    let facilitator_token = Ulid::new().to_string();
    let max_votes = payload.max_votes_per_user.unwrap_or(3);
    let timebox = payload.default_timebox_seconds.unwrap_or(300);

    let conn = Connection::open(&state.db_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let session = db::create_session(
        &conn,
        &session_id,
        payload.title.trim(),
        &facilitator_token,
        max_votes,
        timebox,
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CreateSessionResponse {
        id: session.id,
        facilitator_token,
        title: session.title,
    }))
}

async fn get_session_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<models::Session>, StatusCode> {
    let conn = Connection::open(&state.db_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if let Ok(Some((session, _))) = db::get_session(&conn, &id) {
        Ok(Json(session))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn export_session_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Response, StatusCode> {
    let conn = Connection::open(&state.db_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let (session, _) = db::get_session(&conn, &id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    let topics = db::get_topics(&conn, &id).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut md = format!("# Ata de Reunião Lean Coffee: {}\n\n", session.title);
    md.push_str(&format!("- **Data:** {}\n", session.created_at));
    md.push_str(&format!("- **Fase:** {}\n\n", session.phase.to_str()));

    md.push_str("## ☕ Tópicos Discutidos\n\n");
    let discussed: Vec<_> = topics
        .iter()
        .filter(|t| t.status == models::TopicStatus::Discussed)
        .collect();
    if discussed.is_empty() {
        md.push_str("_Nenhum tópico finalizado._\n\n");
    } else {
        for t in discussed {
            md.push_str(&format!("### {}\n", t.title));
            if let Some(desc) = &t.description {
                md.push_str(&format!("> {}\n\n", desc));
            }
            md.push_str(&format!("- **Votos:** {}\n", t.vote_count));
            if !t.notes.is_empty() {
                md.push_str(&format!("- **Notas / Combinados:**\n{}\n", t.notes));
            }
            md.push_str("\n");
        }
    }

    let pending: Vec<_> = topics
        .iter()
        .filter(|t| t.status == models::TopicStatus::ToDiscuss)
        .collect();
    if !pending.is_empty() {
        md.push_str("## 📝 Tópicos Não Discutidos\n\n");
        for t in pending {
            md.push_str(&format!("- **{}** (Votos: {})\n", t.title, t.vote_count));
        }
        md.push_str("\n");
    }

    let filename = format!("lean-coffee-{}.md", &session.id[0..8.min(session.id.len())]);
    let mut response = md.into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/markdown; charset=utf-8"),
    );
    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("attachment; filename=\"{}\"", filename))
            .unwrap_or_else(|_| HeaderValue::from_static("attachment")),
    );

    Ok(response)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Criar pasta de dados se não existir
    std::fs::create_dir_all("data").ok();
    let db_path = "data/coffeeyrd.db".to_string();

    {
        let conn = Connection::open(&db_path).expect("Falha ao abrir SQLite");
        db::init_db(&conn).expect("Falha ao inicializar tabelas");
    }

    let state = AppState::new(db_path.clone());

    // Rotina periódica de auto-purge para higienização de sessões antigas (Padrão: 60 dias)
    // Aceita RETENTION_DAYS unificada ou SESSION_RETENTION_DAYS específica
    let retention_days: i64 = std::env::var("RETENTION_DAYS")
        .or_else(|_| std::env::var("SESSION_RETENTION_DAYS"))
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(60);

    let purge_db_path = db_path.clone();
    tokio::spawn(async move {
        // Checar na inicialização e a cada 24 horas
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(24 * 3600));
        loop {
            interval.tick().await;
            match Connection::open(&purge_db_path)
                .and_then(|conn| db::cleanup_expired_sessions(&conn, retention_days))
            {
                Ok(count) if count > 0 => {
                    tracing::info!(
                        purged_sessions = count,
                        retention_days = retention_days,
                        "Auto-purge: sessões com mais de {} dias removidas com sucesso",
                        retention_days
                    );
                }
                Ok(_) => {}
                Err(e) => {
                    tracing::warn!(error = %e, "Erro ao executar rotina de auto-purge de sessões no CoffeeYrd");
                }
            }
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());
    let static_service = ServeDir::new(PathBuf::from(&static_dir))
        .fallback(get(spa_fallback));

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/robots.txt", get(robots_txt_handler))
        .route("/api/sessions", post(create_session_handler))
        .route("/api/sessions/{id}", get(get_session_handler))
        .route("/api/sessions/{id}/export", get(export_session_handler))
        .route("/ws/session/{id}", get(ws::ws_handler))
        .route("/mcp", post(mcp::mcp_handler))
        .fallback_service(static_service)
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8082);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("☕ CoffeeYrd backend rodando em http://{}", addr);
    info!("🔗 WebSocket disponível em ws://{}/ws/session/{{id}}", addr);
    info!("🤖 Servidor MCP disponível em http://{}/mcp", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}

async fn robots_txt_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "text/plain; charset=utf-8"),
            (header::HeaderName::from_static("x-robots-tag"), "noindex, nofollow, noarchive"),
        ],
        "# Bloqueio estrito de rastreadores e motores de busca\nUser-agent: *\nDisallow: /\n",
    )
}

async fn spa_fallback() -> impl IntoResponse {
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());
    let index_file = PathBuf::from(&static_dir).join("index.html");
    match tokio::fs::read_to_string(index_file).await {
        Ok(html) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                (header::HeaderName::from_static("x-robots-tag"), "noindex, nofollow, noarchive"),
                (header::HeaderName::from_static("referrer-policy"), "no-referrer"),
            ],
            html,
        )
            .into_response(),
        Err(_) => (
            StatusCode::NOT_FOUND,
            "Frontend not built or index.html not found",
        )
            .into_response(),
    }
}
