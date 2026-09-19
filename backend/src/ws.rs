#![allow(dead_code)]

use crate::db;
use crate::models::{
    RomanVotingState, SessionPhase, SessionSnapshot, TopicStatus,
};
use crate::state::{AppState, ClientMessage, ServerMessage};
use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, Query, State, WebSocketUpgrade,
    },
    response::IntoResponse,
};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use rusqlite::Connection;
use serde::Deserialize;
use tokio::time::{sleep, Duration};
use tracing::error;
use ulid::Ulid;

#[derive(Debug, Deserialize)]
pub struct WsQuery {
    pub token: Option<String>,
    pub session_hash: Option<String>,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(session_id): Path<String>,
    Query(query): Query<WsQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let voter_hash = query
        .session_hash
        .unwrap_or_else(|| Ulid::new().to_string());
    let token = query.token;

    ws.on_upgrade(move |socket| handle_socket(socket, session_id, voter_hash, token, state))
}

async fn handle_socket(
    socket: WebSocket,
    session_id: String,
    voter_hash: String,
    token: Option<String>,
    state: AppState,
) {
    let (mut sender, mut receiver) = socket.split();
    let hub = state.get_or_create_hub(&session_id);
    let mut rx = hub.tx.subscribe();

    // Incrementar contagem online
    {
        let mut count = hub.online_count.lock().unwrap();
        *count += 1;
    }

    // Verificar se é facilitador
    let is_facilitator = {
        let conn = Connection::open(&state.db_path).unwrap();
        if let Ok(Some((_, fac_token))) = db::get_session(&conn, &session_id) {
            token.as_deref() == Some(&fac_token)
        } else {
            false
        }
    };

    // Enviar snapshot inicial
    if let Some(snapshot) = build_snapshot(&state, &session_id, &voter_hash, is_facilitator) {
        let _ = sender
            .send(Message::Text(
                serde_json::to_string(&ServerMessage::Snapshot(snapshot)).unwrap().into(),
            ))
            .await;
    }

    // Notificar todos da presença atualizada
    broadcast_snapshot(&state, &session_id);

    // Canal de saída para mensagens enviadas ao cliente
    let session_id_clone = session_id.clone();
    let voter_hash_clone = voter_hash.clone();
    let state_clone = state.clone();

    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            // Se for SNAPSHOT genérico, personaliza para o voter_hash e is_facilitator
            let text = match msg {
                ServerMessage::Snapshot(_) => {
                    if let Some(snap) =
                        build_snapshot(&state_clone, &session_id_clone, &voter_hash_clone, is_facilitator)
                    {
                        serde_json::to_string(&ServerMessage::Snapshot(snap)).unwrap()
                    } else {
                        continue;
                    }
                }
                other => serde_json::to_string(&other).unwrap(),
            };

            if sender.send(Message::Text(text.into())).await.is_err() {
                break;
            }
        }
    });

    // Loop de recepção de mensagens do cliente
    let hub_clone = hub.clone();
    let state_for_recv = state.clone();
    let session_id_for_recv = session_id.clone();
    let voter_hash_for_recv = voter_hash.clone();

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                // Limite de tamanho de payload: previne DoS por mensagens gigantes
                if text.len() > 65_536 {
                    continue;
                }
                if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                    process_client_message(
                        &state_for_recv,
                        &session_id_for_recv,
                        &voter_hash_for_recv,
                        is_facilitator,
                        client_msg,
                    )
                    .await;
                }
            }
        }
    });

    // Aguardar desconexão
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    // Decrementar contagem online
    {
        let mut count = hub_clone.online_count.lock().unwrap();
        if *count > 0 {
            *count -= 1;
        }
    }
    broadcast_snapshot(&state, &session_id);
}

fn build_snapshot(
    state: &AppState,
    session_id: &str,
    voter_hash: &str,
    is_facilitator: bool,
) -> Option<SessionSnapshot> {
    let conn = Connection::open(&state.db_path).ok()?;
    let (session, _) = db::get_session(&conn, session_id).ok()??;
    let topics = db::get_topics(&conn, session_id).ok()?;
    let user_voted_topic_ids = db::get_user_votes(&conn, session_id, voter_hash).unwrap_or_default();

    let hub = state.get_or_create_hub(session_id);
    let online_count = *hub.online_count.lock().unwrap();
    let roman_voting = hub.roman_voting.lock().unwrap().clone();

    Some(SessionSnapshot {
        session,
        topics,
        user_voted_topic_ids,
        is_facilitator,
        online_count,
        roman_voting,
    })
}

fn broadcast_snapshot(state: &AppState, session_id: &str) {
    let hub = state.get_or_create_hub(session_id);
    // Dispara sinal para o loop de cada cliente gerar o snapshot com seu respectivo voter_hash
    if let Some(dummy_snap) = build_snapshot(state, session_id, "", false) {
        let _ = hub.tx.send(ServerMessage::Snapshot(dummy_snap));
    }
}

async fn process_client_message(
    state: &AppState,
    session_id: &str,
    voter_hash: &str,
    is_facilitator: bool,
    msg: ClientMessage,
) {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => {
            error!("Erro ao abrir banco: {:?}", e);
            return;
        }
    };

    match msg {
        ClientMessage::AddTopic {
            title,
            description,
            author_name,
        } => {
            let topic_id = Ulid::new().to_string();
            let _ = db::insert_topic(
                &conn,
                &topic_id,
                session_id,
                title.trim(),
                description.as_deref(),
                author_name.trim(),
                voter_hash,
            );
            broadcast_snapshot(state, session_id);
        }

        ClientMessage::DeleteTopic { topic_id } => {
            // Apenas facilitador ou o autor pode deletar
            let can_delete = if is_facilitator {
                true
            } else {
                conn.query_row(
                    "SELECT author_session_hash FROM topics WHERE id = ?1",
                    [&topic_id],
                    |r| r.get::<_, String>(0),
                )
                .map(|author| author == voter_hash)
                .unwrap_or(false)
            };

            if can_delete {
                let _ = db::delete_topic(&conn, &topic_id, session_id);
                broadcast_snapshot(state, session_id);
            }
        }

        ClientMessage::ToggleVote { topic_id } => {
            if let Ok(Some((session, _))) = db::get_session(&conn, session_id) {
                if session.phase == SessionPhase::Voting || session.phase == SessionPhase::Ideation {
                    let _ = db::toggle_vote(
                        &conn,
                        session_id,
                        &topic_id,
                        voter_hash,
                        session.max_votes_per_user,
                    );
                    broadcast_snapshot(state, session_id);
                }
            }
        }

        ClientMessage::ChangePhase { phase } => {
            if is_facilitator {
                let _ = db::update_session_phase(&conn, session_id, phase.clone());

                // Se entrar em DISCUSSION e não houver tópico ativo, escolhe o mais votado
                if phase == SessionPhase::Discussion {
                    if let Ok(topics) = db::get_topics(&conn, session_id) {
                        if let Some(first_to_discuss) = topics
                            .into_iter()
                            .find(|t| t.status == TopicStatus::ToDiscuss)
                        {
                            let _ = db::update_topic_status(
                                &conn,
                                &first_to_discuss.id,
                                TopicStatus::Discussing,
                            );
                            let _ = conn.execute(
                                "UPDATE sessions SET active_topic_id = ?1 WHERE id = ?2",
                                [&first_to_discuss.id, session_id],
                            );
                        }
                    }
                }

                broadcast_snapshot(state, session_id);
            }
        }

        ClientMessage::ControlTimer { command, seconds } => {
            if is_facilitator {
                handle_timer_control(state, session_id, &command, seconds).await;
            }
        }

        ClientMessage::SelectActiveTopic { topic_id } => {
            if is_facilitator {
                // Marca tópico anterior como discutido se estava discutindo
                let _ = conn.execute(
                    "UPDATE topics SET status = 'DISCUSSED' WHERE session_id = ?1 AND status = 'DISCUSSING'",
                    [session_id],
                );
                // Ativa novo tópico
                let _ = db::update_topic_status(&conn, &topic_id, TopicStatus::Discussing);
                let _ = conn.execute(
                    "UPDATE sessions SET active_topic_id = ?1 WHERE id = ?2",
                    [&topic_id, session_id],
                );
                broadcast_snapshot(state, session_id);
            }
        }

        ClientMessage::UpdateTopicNotes { topic_id, notes } => {
            // Apenas facilitador pode editar notas de tópicos
            if is_facilitator {
                let _ = db::update_topic_notes(&conn, &topic_id, &notes);
                broadcast_snapshot(state, session_id);
            }
        }

        ClientMessage::MoveTopicStatus { topic_id, status } => {
            if is_facilitator {
                let _ = db::update_topic_status(&conn, &topic_id, status.clone());

                if status == TopicStatus::Discussing {
                    let _ = conn.execute(
                        "UPDATE sessions SET active_topic_id = ?1 WHERE id = ?2",
                        [&topic_id, session_id],
                    );
                } else {
                    let active_id: Option<String> = conn
                        .query_row(
                            "SELECT active_topic_id FROM sessions WHERE id = ?1",
                            [session_id],
                            |r| r.get(0),
                        )
                        .ok();
                    if active_id.as_deref() == Some(&topic_id) {
                        let _ = conn.execute(
                            "UPDATE sessions SET active_topic_id = NULL WHERE id = ?1",
                            [session_id],
                        );
                    }
                }

                broadcast_snapshot(state, session_id);
            }
        }

        ClientMessage::MergeTopics {
            source_topic_id,
            target_topic_id,
        } => {
            // Apenas facilitador pode mesclar tópicos
            if is_facilitator {
                let _ = db::merge_topics(&conn, session_id, &source_topic_id, &target_topic_id);
                broadcast_snapshot(state, session_id);
            }
        }

        ClientMessage::UndoMerge { target_topic_id } => {
            // Apenas facilitador pode reverter mesclas
            if is_facilitator {
                let _ = db::undo_merge(&conn, session_id, target_topic_id.as_deref());
                broadcast_snapshot(state, session_id);
            }
        }

        ClientMessage::CastRomanVote { choice } => {
            let hub = state.get_or_create_hub(session_id);
            let active_topic = {
                let roman = hub.roman_voting.lock().unwrap();
                if roman.is_active {
                    roman.topic_id.clone()
                } else {
                    None
                }
            };

            if let Some(topic_id) = active_topic {
                let _ = db::record_roman_vote(&conn, session_id, &topic_id, voter_hash, choice);
                if let Ok((extend, next, neutral)) =
                    db::get_roman_voting_summary(&conn, session_id, &topic_id)
                {
                    {
                        let mut roman = hub.roman_voting.lock().unwrap();
                        roman.extend_votes = extend;
                        roman.next_votes = next;
                        roman.neutral_votes = neutral;
                    }
                    hub.tx.send(ServerMessage::RomanVoteUpdated {
                        extend,
                        next,
                        neutral,
                    }).ok();
                }
            }
        }

        ClientMessage::TriggerRomanVoting => {
            if is_facilitator {
                trigger_roman_voting_flow(state, session_id).await;
            }
        }

        ClientMessage::CloseRomanVoting { extend } => {
            if is_facilitator {
                close_roman_voting_flow(state, session_id, extend).await;
            }
        }
    }
}

async fn handle_timer_control(
    state: &AppState,
    session_id: &str,
    command: &str,
    seconds: Option<u32>,
) {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(_) => return,
    };

    if let Ok(Some((session, _))) = db::get_session(&conn, session_id) {
        match command {
            "START" => {
                let secs = seconds.unwrap_or(session.timer_seconds_remaining);
                let ends_at = Utc::now().timestamp_millis() + (secs as i64 * 1000);
                let _ = db::update_session_timer(&conn, session_id, secs, true, Some(ends_at));
                broadcast_snapshot(state, session_id);

                // Spawn background runner for auto Roman Voting trigger
                let state_clone = state.clone();
                let session_id_clone = session_id.to_string();
                tokio::spawn(async move {
                    sleep(Duration::from_secs(secs as u64)).await;
                    // Verifica se ainda está rodando no mesmo timestamp
                    let conn = Connection::open(&state_clone.db_path).unwrap();
                    if let Ok(Some((current, _))) = db::get_session(&conn, &session_id_clone) {
                        if current.timer_is_running && current.timer_ends_at == Some(ends_at) {
                            let _ = db::update_session_timer(
                                &conn,
                                &session_id_clone,
                                0,
                                false,
                                None,
                            );
                            broadcast_snapshot(&state_clone, &session_id_clone);
                            trigger_roman_voting_flow(&state_clone, &session_id_clone).await;
                        }
                    }
                });
            }
            "PAUSE" => {
                let now = Utc::now().timestamp_millis();
                let remaining = if let Some(ends_at) = session.timer_ends_at {
                    ((ends_at - now) / 1000).max(0) as u32
                } else {
                    session.timer_seconds_remaining
                };
                let _ = db::update_session_timer(&conn, session_id, remaining, false, None);
                broadcast_snapshot(state, session_id);
            }
            "RESET" => {
                let secs = seconds.unwrap_or(session.default_timebox_seconds);
                let _ = db::update_session_timer(&conn, session_id, secs, false, None);
                broadcast_snapshot(state, session_id);
            }
            "ADD_SECONDS" => {
                let add = seconds.unwrap_or(60);
                let new_remaining = session.timer_seconds_remaining + add;
                let new_ends_at = session
                    .timer_ends_at
                    .map(|ends| ends + (add as i64 * 1000));
                let _ = db::update_session_timer(
                    &conn,
                    session_id,
                    new_remaining,
                    session.timer_is_running,
                    new_ends_at,
                );
                broadcast_snapshot(state, session_id);
            }
            _ => {}
        }
    }
}

async fn trigger_roman_voting_flow(state: &AppState, session_id: &str) {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(_) => return,
    };

    let active_topic_id = if let Ok(Some((session, _))) = db::get_session(&conn, session_id) {
        session.active_topic_id
    } else {
        None
    };

    let hub = state.get_or_create_hub(session_id);
    let _ = db::clear_roman_votes(&conn, session_id);

    let state_vote = RomanVotingState {
        is_active: true,
        topic_id: active_topic_id,
        seconds_remaining: 10,
        extend_votes: 0,
        next_votes: 0,
        neutral_votes: 0,
    };

    {
        let mut r = hub.roman_voting.lock().unwrap();
        *r = state_vote.clone();
    }

    hub.tx.send(ServerMessage::RomanVotingStarted(state_vote)).ok();
    broadcast_snapshot(state, session_id);
}

async fn close_roman_voting_flow(state: &AppState, session_id: &str, extend: bool) {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(_) => return,
    };

    let hub = state.get_or_create_hub(session_id);
    let topic_id = {
        let mut r = hub.roman_voting.lock().unwrap();
        r.is_active = false;
        r.topic_id.clone()
    };

    if extend {
        // Estende tópico em +2 minutos (120s) e inicia o timer
        handle_timer_control(state, session_id, "START", Some(120)).await;
    } else {
        // Marca tópico atual como DISCUSSED e puxa o próximo da fila
        if let Some(curr_id) = topic_id {
            let _ = db::update_topic_status(&conn, &curr_id, TopicStatus::Discussed);
        }

        if let Ok(topics) = db::get_topics(&conn, session_id) {
            if let Some(next_topic) = topics
                .into_iter()
                .find(|t| t.status == TopicStatus::ToDiscuss)
            {
                let _ = db::update_topic_status(&conn, &next_topic.id, TopicStatus::Discussing);
                let _ = conn.execute(
                    "UPDATE sessions SET active_topic_id = ?1 WHERE id = ?2",
                    [&next_topic.id, session_id],
                );
                // Reseta timer para 5 minutos
                let _ = db::update_session_timer(&conn, session_id, 300, false, None);
            } else {
                let _ = conn.execute(
                    "UPDATE sessions SET active_topic_id = NULL WHERE id = ?1",
                    [session_id],
                );
            }
        }
    }

    broadcast_snapshot(state, session_id);
}
