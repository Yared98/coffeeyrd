#![allow(dead_code)]

use crate::models::{RomanVoteChoice, Session, SessionPhase, Topic, TopicStatus};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            phase TEXT NOT NULL DEFAULT 'IDEATION',
            facilitator_token TEXT NOT NULL,
            max_votes_per_user INTEGER NOT NULL DEFAULT 3,
            default_timebox_seconds INTEGER NOT NULL DEFAULT 300,
            timer_seconds_remaining INTEGER NOT NULL DEFAULT 300,
            timer_is_running INTEGER NOT NULL DEFAULT 0,
            timer_ends_at INTEGER,
            active_topic_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS topics (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            author_name TEXT NOT NULL DEFAULT 'Anônimo',
            author_session_hash TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'TO_DISCUSS',
            vote_count INTEGER NOT NULL DEFAULT 0,
            duration_seconds_spent INTEGER NOT NULL DEFAULT 0,
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS votes (
            session_id TEXT NOT NULL,
            topic_id TEXT NOT NULL,
            voter_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (session_id, topic_id, voter_hash),
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS roman_votes (
            session_id TEXT NOT NULL,
            topic_id TEXT NOT NULL,
            voter_hash TEXT NOT NULL,
            choice TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (session_id, topic_id, voter_hash),
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
        ",
    )?;
    Ok(())
}

pub fn create_session(
    conn: &Connection,
    id: &str,
    title: &str,
    facilitator_token: &str,
    max_votes: u32,
    default_timebox_seconds: u32,
) -> Result<Session> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO sessions (
            id, title, phase, facilitator_token, max_votes_per_user,
            default_timebox_seconds, timer_seconds_remaining, timer_is_running,
            timer_ends_at, active_topic_id, created_at, updated_at
        ) VALUES (?1, ?2, 'IDEATION', ?3, ?4, ?5, ?5, 0, NULL, NULL, ?6, ?6)",
        params![id, title, facilitator_token, max_votes, default_timebox_seconds, now],
    )?;

    Ok(Session {
        id: id.to_string(),
        title: title.to_string(),
        phase: SessionPhase::Ideation,
        max_votes_per_user: max_votes,
        default_timebox_seconds,
        timer_seconds_remaining: default_timebox_seconds,
        timer_is_running: false,
        timer_ends_at: None,
        active_topic_id: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn get_session(conn: &Connection, id: &str) -> Result<Option<(Session, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, phase, facilitator_token, max_votes_per_user,
                default_timebox_seconds, timer_seconds_remaining, timer_is_running,
                timer_ends_at, active_topic_id, created_at, updated_at
         FROM sessions WHERE id = ?1",
    )?;

    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        let phase_str: String = row.get(2)?;
        let facilitator_token: String = row.get(3)?;
        let timer_is_running_int: i32 = row.get(7)?;

        let session = Session {
            id: row.get(0)?,
            title: row.get(1)?,
            phase: SessionPhase::from_str(&phase_str),
            max_votes_per_user: row.get(4)?,
            default_timebox_seconds: row.get(5)?,
            timer_seconds_remaining: row.get(6)?,
            timer_is_running: timer_is_running_int == 1,
            timer_ends_at: row.get(8)?,
            active_topic_id: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        };

        Ok(Some((session, facilitator_token)))
    } else {
        Ok(None)
    }
}

pub fn get_topics(conn: &Connection, session_id: &str) -> Result<Vec<Topic>> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, title, description, author_name, author_session_hash,
                status, vote_count, duration_seconds_spent, notes, created_at
         FROM topics WHERE session_id = ?1
         ORDER BY vote_count DESC, created_at ASC",
    )?;

    let rows = stmt.query_map(params![session_id], |row| {
        let status_str: String = row.get(6)?;
        Ok(Topic {
            id: row.get(0)?,
            session_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            author_name: row.get(4)?,
            author_session_hash: row.get(5)?,
            status: TopicStatus::from_str(&status_str),
            vote_count: row.get(7)?,
            duration_seconds_spent: row.get(8)?,
            notes: row.get(9)?,
            created_at: row.get(10)?,
        })
    })?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r?);
    }
    Ok(list)
}

pub fn insert_topic(
    conn: &Connection,
    id: &str,
    session_id: &str,
    title: &str,
    description: Option<&str>,
    author_name: &str,
    author_hash: &str,
) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO topics (
            id, session_id, title, description, author_name, author_session_hash,
            status, vote_count, duration_seconds_spent, notes, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'TO_DISCUSS', 0, 0, '', ?7)",
        params![id, session_id, title, description, author_name, author_hash, now],
    )?;
    Ok(())
}

pub fn delete_topic(conn: &Connection, id: &str, session_id: &str) -> Result<()> {
    conn.execute("DELETE FROM topics WHERE id = ?1 AND session_id = ?2", params![id, session_id])?;
    Ok(())
}

pub fn toggle_vote(
    conn: &Connection,
    session_id: &str,
    topic_id: &str,
    voter_hash: &str,
    max_votes: u32,
) -> Result<bool> {
    let existing_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM votes WHERE session_id = ?1 AND topic_id = ?2 AND voter_hash = ?3",
        params![session_id, topic_id, voter_hash],
        |r| r.get(0),
    )?;

    if existing_count > 0 {
        // Remover voto
        conn.execute(
            "DELETE FROM votes WHERE session_id = ?1 AND topic_id = ?2 AND voter_hash = ?3",
            params![session_id, topic_id, voter_hash],
        )?;
        conn.execute(
            "UPDATE topics SET vote_count = MAX(0, vote_count - 1) WHERE id = ?1",
            params![topic_id],
        )?;
        Ok(false)
    } else {
        // Verificar limite de votos
        if max_votes > 0 {
            let total_user_votes: i64 = conn.query_row(
                "SELECT COUNT(*) FROM votes WHERE session_id = ?1 AND voter_hash = ?2",
                params![session_id, voter_hash],
                |r| r.get(0),
            )?;
            if total_user_votes >= max_votes as i64 {
                return Ok(false);
            }
        }

        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO votes (session_id, topic_id, voter_hash, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![session_id, topic_id, voter_hash, now],
        )?;
        conn.execute(
            "UPDATE topics SET vote_count = vote_count + 1 WHERE id = ?1",
            params![topic_id],
        )?;
        Ok(true)
    }
}

pub fn get_user_votes(conn: &Connection, session_id: &str, voter_hash: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT topic_id FROM votes WHERE session_id = ?1 AND voter_hash = ?2")?;
    let rows = stmt.query_map(params![session_id, voter_hash], |r| r.get(0))?;
    let mut list = Vec::new();
    for r in rows {
        list.push(r?);
    }
    Ok(list)
}

pub fn update_topic_notes(conn: &Connection, topic_id: &str, notes: &str) -> Result<()> {
    conn.execute("UPDATE topics SET notes = ?1 WHERE id = ?2", params![notes, topic_id])?;
    Ok(())
}

pub fn update_topic_status(conn: &Connection, topic_id: &str, status: TopicStatus) -> Result<()> {
    conn.execute("UPDATE topics SET status = ?1 WHERE id = ?2", params![status.to_str(), topic_id])?;
    Ok(())
}

pub fn update_session_phase(conn: &Connection, session_id: &str, phase: SessionPhase) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE sessions SET phase = ?1, updated_at = ?2 WHERE id = ?3",
        params![phase.to_str(), now, session_id],
    )?;
    Ok(())
}

pub fn update_session_timer(
    conn: &Connection,
    session_id: &str,
    seconds_remaining: u32,
    is_running: bool,
    ends_at: Option<i64>,
) -> Result<()> {
    conn.execute(
        "UPDATE sessions SET timer_seconds_remaining = ?1, timer_is_running = ?2, timer_ends_at = ?3 WHERE id = ?4",
        params![seconds_remaining, if is_running { 1 } else { 0 }, ends_at, session_id],
    )?;
    Ok(())
}

pub fn record_roman_vote(
    conn: &Connection,
    session_id: &str,
    topic_id: &str,
    voter_hash: &str,
    choice: RomanVoteChoice,
) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR REPLACE INTO roman_votes (session_id, topic_id, voter_hash, choice, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![session_id, topic_id, voter_hash, choice.to_str(), now],
    )?;
    Ok(())
}

pub fn get_roman_voting_summary(
    conn: &Connection,
    session_id: &str,
    topic_id: &str,
) -> Result<(u32, u32, u32)> {
    let mut stmt = conn.prepare(
        "SELECT choice, COUNT(*) FROM roman_votes WHERE session_id = ?1 AND topic_id = ?2 GROUP BY choice",
    )?;

    let rows = stmt.query_map(params![session_id, topic_id], |row| {
        let choice_str: String = row.get(0)?;
        let count: u32 = row.get(1)?;
        Ok((choice_str, count))
    })?;

    let mut extend = 0;
    let mut next = 0;
    let mut neutral = 0;

    for r in rows {
        let (choice, count) = r?;
        match choice.as_str() {
            "EXTEND" => extend = count,
            "NEXT" => next = count,
            _ => neutral = count,
        }
    }

    Ok((extend, next, neutral))
}

pub fn clear_roman_votes(conn: &Connection, session_id: &str) -> Result<()> {
    conn.execute("DELETE FROM roman_votes WHERE session_id = ?1", params![session_id])?;
    Ok(())
}

pub fn merge_topics(
    conn: &Connection,
    session_id: &str,
    source_id: &str,
    target_id: &str,
) -> Result<()> {
    if source_id == target_id {
        return Ok(());
    }

    let mut stmt = conn.prepare(
        "SELECT id, title, description, author_name, notes FROM topics WHERE session_id = ?1 AND id = ?2",
    )?;

    let source = stmt
        .query_row(params![session_id, source_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, String>(4)?,
            ))
        })
        .optional()?;

    let target = stmt
        .query_row(params![session_id, target_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, String>(4)?,
            ))
        })
        .optional()?;

    if let (Some((_, s_title, s_desc, s_author, s_notes)), Some((_, _t_title, t_desc, t_author, t_notes))) =
        (source, target)
    {
        // Concatena descrições com créditos
        let merged_desc = {
            let mut parts = Vec::new();
            if let Some(td) = t_desc {
                if !td.trim().is_empty() {
                    parts.push(td);
                }
            }
            let source_info = if let Some(sd) = s_desc {
                if !sd.trim().is_empty() {
                    format!("[Mesclado de {}: {} - {}]", s_author, s_title, sd)
                } else {
                    format!("[Mesclado de {}: {}]", s_author, s_title)
                }
            } else {
                format!("[Mesclado de {}: {}]", s_author, s_title)
            };
            parts.push(source_info);
            parts.join("\n\n")
        };

        // Concatena notas
        let merged_notes = if !s_notes.trim().is_empty() {
            if !t_notes.trim().is_empty() {
                format!("{}\n\n{}", t_notes, s_notes)
            } else {
                s_notes
            }
        } else {
            t_notes
        };

        // Combina autores
        let merged_author = if t_author.contains(&s_author) {
            t_author
        } else {
            format!("{}, {}", t_author, s_author)
        };

        // Atualiza tópico destino
        conn.execute(
            "UPDATE topics SET description = ?1, notes = ?2, author_name = ?3 WHERE id = ?4 AND session_id = ?5",
            params![merged_desc, merged_notes, merged_author, target_id, session_id],
        )?;

        // Migra votos do source para target
        let mut v_stmt = conn.prepare(
            "SELECT voter_hash, created_at FROM votes WHERE session_id = ?1 AND topic_id = ?2",
        )?;
        let source_voters: Vec<(String, String)> = v_stmt
            .query_map(params![session_id, source_id], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
            })?
            .filter_map(|r| r.ok())
            .collect();

        for (v_hash, v_created) in source_voters {
            let already_voted_target: i64 = conn.query_row(
                "SELECT COUNT(*) FROM votes WHERE session_id = ?1 AND topic_id = ?2 AND voter_hash = ?3",
                params![session_id, target_id, v_hash],
                |r| r.get(0),
            )?;
            if already_voted_target == 0 {
                conn.execute(
                    "INSERT INTO votes (session_id, topic_id, voter_hash, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![session_id, target_id, v_hash, v_created],
                )?;
            }
        }

        // Deleta votos associados ao source
        conn.execute(
            "DELETE FROM votes WHERE session_id = ?1 AND topic_id = ?2",
            params![session_id, source_id],
        )?;

        // Recalcula total de votos do target
        let total_target_votes: i64 = conn.query_row(
            "SELECT COUNT(*) FROM votes WHERE session_id = ?1 AND topic_id = ?2",
            params![session_id, target_id],
            |r| r.get(0),
        )?;
        conn.execute(
            "UPDATE topics SET vote_count = ?1 WHERE id = ?2",
            params![total_target_votes, target_id],
        )?;

        // Deleta o tópico de origem
        conn.execute(
            "DELETE FROM topics WHERE id = ?1 AND session_id = ?2",
            params![source_id, session_id],
        )?;
    }

    Ok(())
}

