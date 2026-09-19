#![allow(dead_code)]

use crate::models::{RomanVoteChoice, RomanVotingState, SessionPhase, SessionSnapshot, TopicStatus};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ServerMessage {
    #[serde(rename = "SNAPSHOT")]
    Snapshot(SessionSnapshot),
    #[serde(rename = "ROMAN_VOTING_STARTED")]
    RomanVotingStarted(RomanVotingState),
    #[serde(rename = "ROMAN_VOTE_UPDATED")]
    RomanVoteUpdated {
        extend: u32,
        next: u32,
        neutral: u32,
    },
    #[serde(rename = "TIMER_TICK")]
    TimerTick {
        seconds_remaining: u32,
        is_running: bool,
    },
    #[serde(rename = "ERROR")]
    Error { message: String },
    /// Evento de digitação — transmitido para todos exceto o remetente
    #[serde(rename = "TYPING_INDICATOR")]
    TypingIndicator {
        author_name: String,
        topic_id: String,
        is_typing: bool,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action", content = "payload")]
pub enum ClientMessage {
    #[serde(rename = "ADD_TOPIC")]
    AddTopic {
        title: String,
        description: Option<String>,
        author_name: String,
    },
    #[serde(rename = "DELETE_TOPIC")]
    DeleteTopic { topic_id: String },
    #[serde(rename = "TOGGLE_VOTE")]
    ToggleVote { topic_id: String },
    #[serde(rename = "CHANGE_PHASE")]
    ChangePhase { phase: SessionPhase },
    #[serde(rename = "CONTROL_TIMER")]
    ControlTimer {
        command: String, // "START", "PAUSE", "RESET", "ADD_SECONDS"
        seconds: Option<u32>,
    },
    #[serde(rename = "SELECT_ACTIVE_TOPIC")]
    SelectActiveTopic { topic_id: String },
    #[serde(rename = "UPDATE_TOPIC_NOTES")]
    UpdateTopicNotes { topic_id: String, notes: String },
    #[serde(rename = "MOVE_TOPIC_STATUS")]
    MoveTopicStatus {
        topic_id: String,
        status: TopicStatus,
    },
    #[serde(rename = "MERGE_TOPICS")]
    MergeTopics {
        source_topic_id: String,
        target_topic_id: String,
    },
    #[serde(rename = "UNDO_MERGE")]
    UndoMerge {
        target_topic_id: Option<String>,
    },
    #[serde(rename = "CAST_ROMAN_VOTE")]
    CastRomanVote { choice: RomanVoteChoice },
    #[serde(rename = "TRIGGER_ROMAN_VOTING")]
    TriggerRomanVoting {},
    #[serde(rename = "CLOSE_ROMAN_VOTING")]
    CloseRomanVoting { extend: bool },
    /// Notifica o servidor que o usuário está (ou parou de) digitando
    #[serde(rename = "TYPING_INDICATOR")]
    TypingIndicator {
        topic_id: String,
        author_name: String,
        is_typing: bool,
    },
}

#[derive(Clone)]
pub struct SessionHub {
    pub session_id: String,
    pub tx: broadcast::Sender<ServerMessage>,
    pub online_count: Arc<Mutex<usize>>,
    pub roman_voting: Arc<Mutex<RomanVotingState>>,
    /// Map de voter_hash -> (author_name, topic_id) para os que estão digitando
    pub typing_users: Arc<Mutex<HashMap<String, (String, String)>>>,
}

#[derive(Clone)]
pub struct AppState {
    pub db_path: String,
    pub sessions: Arc<DashMap<String, SessionHub>>,
}

impl AppState {
    pub fn new(db_path: String) -> Self {
        Self {
            db_path,
            sessions: Arc::new(DashMap::new()),
        }
    }

    pub fn get_or_create_hub(&self, session_id: &str) -> SessionHub {
        if let Some(hub) = self.sessions.get(session_id) {
            hub.clone()
        } else {
            let (tx, _) = broadcast::channel(128);
            let hub = SessionHub {
                session_id: session_id.to_string(),
                tx,
                online_count: Arc::new(Mutex::new(0)),
                roman_voting: Arc::new(Mutex::new(RomanVotingState::default())),
                typing_users: Arc::new(Mutex::new(HashMap::new())),
            };
            self.sessions.insert(session_id.to_string(), hub.clone());
            hub
        }
    }

    pub fn broadcast(&self, session_id: &str, msg: ServerMessage) {
        if let Some(hub) = self.sessions.get(session_id) {
            let _ = hub.tx.send(msg);
        }
    }
}
