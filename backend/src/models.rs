#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SessionPhase {
    Ideation,
    Voting,
    Discussion,
    Completed,
}

impl SessionPhase {
    pub fn from_str(s: &str) -> Self {
        match s {
            "VOTING" => SessionPhase::Voting,
            "DISCUSSION" => SessionPhase::Discussion,
            "COMPLETED" => SessionPhase::Completed,
            _ => SessionPhase::Ideation,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            SessionPhase::Ideation => "IDEATION",
            SessionPhase::Voting => "VOTING",
            SessionPhase::Discussion => "DISCUSSION",
            SessionPhase::Completed => "COMPLETED",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TopicStatus {
    ToDiscuss,
    Discussing,
    Discussed,
}

impl TopicStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "DISCUSSING" => TopicStatus::Discussing,
            "DISCUSSED" => TopicStatus::Discussed,
            _ => TopicStatus::ToDiscuss,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            TopicStatus::ToDiscuss => "TO_DISCUSS",
            TopicStatus::Discussing => "DISCUSSING",
            TopicStatus::Discussed => "DISCUSSED",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RomanVoteChoice {
    Extend,
    Next,
    Neutral,
}

impl RomanVoteChoice {
    pub fn from_str(s: &str) -> Self {
        match s {
            "NEXT" => RomanVoteChoice::Next,
            "NEUTRAL" => RomanVoteChoice::Neutral,
            _ => RomanVoteChoice::Extend,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            RomanVoteChoice::Extend => "EXTEND",
            RomanVoteChoice::Next => "NEXT",
            RomanVoteChoice::Neutral => "NEUTRAL",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Topic {
    pub id: String,
    pub session_id: String,
    pub title: String,
    pub description: Option<String>,
    pub author_name: String,
    #[serde(skip_serializing)]
    pub author_session_hash: String,
    pub status: TopicStatus,
    pub vote_count: u32,
    pub duration_seconds_spent: u32,
    pub notes: String,
    pub created_at: String,
    #[serde(default)]
    pub merged_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomanVotingState {
    pub is_active: bool,
    pub topic_id: Option<String>,
    pub seconds_remaining: u32,
    pub extend_votes: u32,
    pub next_votes: u32,
    pub neutral_votes: u32,
}

impl Default for RomanVotingState {
    fn default() -> Self {
        Self {
            is_active: false,
            topic_id: None,
            seconds_remaining: 10,
            extend_votes: 0,
            next_votes: 0,
            neutral_votes: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub phase: SessionPhase,
    pub max_votes_per_user: u32,
    pub default_timebox_seconds: u32,
    pub timer_seconds_remaining: u32,
    pub timer_is_running: bool,
    pub timer_ends_at: Option<i64>,
    pub active_topic_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSnapshot {
    pub session: Session,
    pub topics: Vec<Topic>,
    pub user_voted_topic_ids: Vec<String>,
    pub is_facilitator: bool,
    pub online_count: usize,
    pub roman_voting: RomanVotingState,
}
