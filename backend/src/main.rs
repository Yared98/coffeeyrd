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

    let state = AppState::new(db_path);

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let dist_path = PathBuf::from("../frontend/dist");

    let app = Router::new()
        .route("/api/sessions", post(create_session_handler))
        .route("/api/sessions/{id}", get(get_session_handler))
        .route("/api/sessions/{id}/export", get(export_session_handler))
        .route("/ws/session/{id}", get(ws::ws_handler))
        .route("/mcp", post(mcp::mcp_handler))
        .layer(cors)
        .fallback_service(ServeDir::new(dist_path))
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8082);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("☕ CoffeeYrd Backend rodando em http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
