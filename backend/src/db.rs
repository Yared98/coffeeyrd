#![allow(dead_code)]

use crate::models::{
    AdminMetrics, AdminSessionSummary, RomanVoteChoice, Session, SessionPhase, ThermometerPosition,
    Topic, TopicStatus, VotingMode,
};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Result};
use std::collections::HashMap;

use ulid::Ulid;

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
            updated_at TEXT NOT NULL,
            voting_mode TEXT NOT NULL DEFAULT 'PRIORITY',
            thermometer_anonymous INTEGER NOT NULL DEFAULT 1
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

        CREATE TABLE IF NOT EXISTS thermometer_votes (
            session_id TEXT NOT NULL,
            topic_id TEXT NOT NULL,
            voter_hash TEXT NOT NULL,
            voter_name TEXT NOT NULL,
            value INTEGER NOT NULL,
            updated_at TEXT NOT NULL,
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

        CREATE TABLE IF NOT EXISTS topic_merges (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            source_topic_id TEXT NOT NULL,
            target_topic_id TEXT NOT NULL,
            source_title TEXT NOT NULL,
            source_description TEXT,
            source_author_name TEXT NOT NULL,
            source_author_session_hash TEXT NOT NULL,
            source_status TEXT NOT NULL,
            source_vote_count INTEGER NOT NULL,
            source_duration_seconds_spent INTEGER NOT NULL,
            source_notes TEXT NOT NULL,
            source_created_at TEXT NOT NULL,
            target_prev_description TEXT,
            target_prev_notes TEXT,
            target_prev_author_name TEXT NOT NULL,
            target_prev_vote_count INTEGER NOT NULL,
            transferred_votes_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
        ",
    )?;

    // Migração de colunas para bancos existentes
    let mut stmt = conn.prepare("PRAGMA table_info(sessions)")?;
    let mut has_voting_mode = false;
    let mut has_thermometer_anonymous = false;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let col_name: String = row.get(1)?;
        if col_name == "voting_mode" {
            has_voting_mode = true;
        } else if col_name == "thermometer_anonymous" {
            has_thermometer_anonymous = true;
        }
    }
    if !has_voting_mode {
        conn.execute(
            "ALTER TABLE sessions ADD COLUMN voting_mode TEXT NOT NULL DEFAULT 'PRIORITY'",
            [],
        )?;
    }
    if !has_thermometer_anonymous {
        conn.execute(
            "ALTER TABLE sessions ADD COLUMN thermometer_anonymous INTEGER NOT NULL DEFAULT 1",
            [],
        )?;
    }

    Ok(())
}

/// Remove sessões mais antigas que `retention_days` dias.
/// Retorna o número de sessões removidas.
/// Tópicos, votos e roman_votes são removidos automaticamente via ON DELETE CASCADE.
pub fn cleanup_expired_sessions(conn: &Connection, retention_days: i64) -> Result<usize> {
    let cutoff = format!("-{} days", retention_days);
    let count = conn.execute(
        "DELETE FROM sessions WHERE created_at < datetime('now', ?1)",
        params![cutoff],
    )?;
    Ok(count)
}

pub fn create_session(
    conn: &Connection,
    id: &str,
    title: &str,
    facilitator_token: &str,
    max_votes: u32,
    default_timebox_seconds: u32,
    voting_mode: VotingMode,
    thermometer_anonymous: bool,
) -> Result<Session> {
    let now = Utc::now().to_rfc3339();
    let anon_int = if thermometer_anonymous { 1 } else { 0 };
    conn.execute(
        "INSERT INTO sessions (
            id, title, phase, facilitator_token, max_votes_per_user,
            default_timebox_seconds, timer_seconds_remaining, timer_is_running,
            timer_ends_at, active_topic_id, created_at, updated_at,
            voting_mode, thermometer_anonymous
        ) VALUES (?1, ?2, 'IDEATION', ?3, ?4, ?5, ?5, 0, NULL, NULL, ?6, ?6, ?7, ?8)",
        params![
            id,
            title,
            facilitator_token,
            max_votes,
            default_timebox_seconds,
            now,
            voting_mode.to_str(),
            anon_int
        ],
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
        voting_mode,
        thermometer_anonymous,
    })
}

pub fn get_session(conn: &Connection, id: &str) -> Result<Option<(Session, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, phase, facilitator_token, max_votes_per_user,
                default_timebox_seconds, timer_seconds_remaining, timer_is_running,
                timer_ends_at, active_topic_id, created_at, updated_at,
                voting_mode, thermometer_anonymous
         FROM sessions WHERE id = ?1",
    )?;

    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        let phase_str: String = row.get(2)?;
        let facilitator_token: String = row.get(3)?;
        let timer_is_running_int: i32 = row.get(7)?;
        let voting_mode_str: String = row.get(12)?;
        let thermometer_anonymous_int: i32 = row.get(13)?;

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
            voting_mode: VotingMode::from_str(&voting_mode_str),
            thermometer_anonymous: thermometer_anonymous_int == 1,
        };

        Ok(Some((session, facilitator_token)))
    } else {
        Ok(None)
    }
}

pub fn get_topics(conn: &Connection, session_id: &str) -> Result<Vec<Topic>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.session_id, t.title, t.description, t.author_name, t.author_session_hash,
                t.status, t.vote_count, t.duration_seconds_spent, t.notes, t.created_at,
                (SELECT COUNT(*) FROM topic_merges m WHERE m.target_topic_id = t.id AND m.session_id = t.session_id) as merged_count,
                (SELECT COUNT(*) FROM thermometer_votes tv WHERE tv.session_id = t.session_id AND tv.topic_id = t.id) as thermo_count,
                (SELECT AVG(CAST(tv.value AS REAL)) FROM thermometer_votes tv WHERE tv.session_id = t.session_id AND tv.topic_id = t.id) as thermo_avg,
                (SELECT (AVG(CAST(tv.value AS REAL) * CAST(tv.value AS REAL)) - (AVG(CAST(tv.value AS REAL)) * AVG(CAST(tv.value AS REAL))))
                 FROM thermometer_votes tv WHERE tv.session_id = t.session_id AND tv.topic_id = t.id) as thermo_variance
         FROM topics t WHERE t.session_id = ?1
         ORDER BY t.vote_count DESC, COALESCE(thermo_variance, 0.0) DESC, thermo_count DESC, t.created_at ASC",
    )?;

    let rows = stmt.query_map(params![session_id], |row| {
        let status_str: String = row.get(6)?;
        let thermo_count: u32 = row.get(12)?;
        let raw_avg: Option<f64> = row.get(13)?;
        let raw_variance: Option<f64> = row.get(14)?;

        let (thermo_avg, thermo_spread) = if thermo_count == 0 {
            (None, None)
        } else {
            let avg = raw_avg.map(|a| (a * 10.0).round() / 10.0);
            let spread = raw_variance.map(|v| (v.max(0.0).sqrt() * 10.0).round() / 10.0);
            (avg, spread)
        };

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
            merged_count: row.get(11)?,
            thermo_count,
            thermo_avg,
            thermo_spread,
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
    conn.execute(
        "DELETE FROM thermometer_votes WHERE topic_id = ?1 AND session_id = ?2",
        params![id, session_id],
    )?;
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

pub fn update_topic_notes(conn: &Connection, session_id: &str, topic_id: &str, notes: &str) -> Result<()> {
    conn.execute(
        "UPDATE topics SET notes = ?1 WHERE id = ?2 AND session_id = ?3",
        params![notes, topic_id, session_id],
    )?;
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

    // Busca source e target antes de abrir transação
    let source: Option<(
        String,
        String,
        Option<String>,
        String,
        String,
        String,
        u32,
        u32,
        String,
        String,
    )> = {
        let mut stmt = conn.prepare(
            "SELECT id, title, description, author_name, author_session_hash, status, vote_count, duration_seconds_spent, notes, created_at
             FROM topics WHERE session_id = ?1 AND id = ?2",
        )?;
        stmt.query_row(params![session_id, source_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, String>(5)?,
                r.get::<_, u32>(6)?,
                r.get::<_, u32>(7)?,
                r.get::<_, String>(8)?,
                r.get::<_, String>(9)?,
            ))
        })
        .optional()?
    };

    let target: Option<(String, String, Option<String>, String, String, u32)> = {
        let mut stmt = conn.prepare(
            "SELECT id, title, description, author_name, notes, vote_count
             FROM topics WHERE session_id = ?1 AND id = ?2",
        )?;
        stmt.query_row(params![session_id, target_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, u32>(5)?,
            ))
        })
        .optional()?
    };

    if let (
        Some((
            s_id,
            s_title,
            s_desc,
            s_author,
            s_hash,
            s_status,
            s_votes,
            s_duration,
            s_notes,
            s_created_at,
        )),
        Some((_t_id, _t_title, t_desc, t_author, t_notes, t_votes)),
    ) = (source, target)
    {
        // Concatena descrições com créditos
        let merged_desc = {
            let mut parts = Vec::new();
            if let Some(ref td) = t_desc {
                if !td.trim().is_empty() {
                    parts.push(td.clone());
                }
            }
            let source_info = if let Some(ref sd) = s_desc {
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
                s_notes.clone()
            }
        } else {
            t_notes.clone()
        };

        // Combina autores
        let merged_author = if t_author.contains(&s_author) {
            t_author.clone()
        } else {
            format!("{}, {}", t_author, s_author)
        };

        // --- Transação atômica: todas as mutações ou nenhuma ---
        let tx = conn.unchecked_transaction()?;

        // Atualiza tópico destino
        tx.execute(
            "UPDATE topics SET description = ?1, notes = ?2, author_name = ?3 WHERE id = ?4 AND session_id = ?5",
            params![merged_desc, merged_notes, merged_author, target_id, session_id],
        )?;

        // Busca votos do source
        let source_voters: Vec<(String, String)> = {
            let mut v_stmt = tx.prepare(
                "SELECT voter_hash, created_at FROM votes WHERE session_id = ?1 AND topic_id = ?2",
            )?;
            let rows = v_stmt
                .query_map(params![session_id, source_id], |r| {
                    Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
                })?
                .filter_map(|r| r.ok())
                .collect::<Vec<_>>();
            rows
        };

        // Migra votos únicos do source para target registrando os que foram transferidos
        let mut transferred_voters: Vec<(String, String)> = Vec::new();
        for (v_hash, v_created) in source_voters {
            let already_voted_target: i64 = tx.query_row(
                "SELECT COUNT(*) FROM votes WHERE session_id = ?1 AND topic_id = ?2 AND voter_hash = ?3",
                params![session_id, target_id, v_hash],
                |r| r.get(0),
            )?;
            if already_voted_target == 0 {
                tx.execute(
                    "INSERT INTO votes (session_id, topic_id, voter_hash, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![session_id, target_id, v_hash, v_created],
                )?;
                transferred_voters.push((v_hash, v_created));
            }
        }

        // Deleta votos do source
        tx.execute(
            "DELETE FROM votes WHERE session_id = ?1 AND topic_id = ?2",
            params![session_id, source_id],
        )?;

        // Deleta votos de termômetro do source (não são transferidos na mescla)
        tx.execute(
            "DELETE FROM thermometer_votes WHERE session_id = ?1 AND topic_id = ?2",
            params![session_id, source_id],
        )?;

        // Recalcula total de votos do target
        let total_target_votes: i64 = tx.query_row(
            "SELECT COUNT(*) FROM votes WHERE session_id = ?1 AND topic_id = ?2",
            params![session_id, target_id],
            |r| r.get(0),
        )?;
        tx.execute(
            "UPDATE topics SET vote_count = ?1 WHERE id = ?2",
            params![total_target_votes, target_id],
        )?;

        // Salva snapshot em topic_merges para permitir reversão atômica em caso de falha ou engano
        let merge_record_id = Ulid::new().to_string();
        let transferred_json =
            serde_json::to_string(&transferred_voters).unwrap_or_else(|_| "[]".to_string());
        let now = Utc::now().to_rfc3339();

        tx.execute(
            "INSERT INTO topic_merges (
                id, session_id, source_topic_id, target_topic_id,
                source_title, source_description, source_author_name, source_author_session_hash,
                source_status, source_vote_count, source_duration_seconds_spent, source_notes, source_created_at,
                target_prev_description, target_prev_notes, target_prev_author_name, target_prev_vote_count,
                transferred_votes_json, created_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19
            )",
            params![
                merge_record_id,
                session_id,
                s_id,
                target_id,
                s_title,
                s_desc,
                s_author,
                s_hash,
                s_status,
                s_votes,
                s_duration,
                s_notes,
                s_created_at,
                t_desc,
                t_notes,
                t_author,
                t_votes,
                transferred_json,
                now
            ],
        )?;

        // Deleta o tópico de origem
        tx.execute(
            "DELETE FROM topics WHERE id = ?1 AND session_id = ?2",
            params![source_id, session_id],
        )?;

        tx.commit()?;
    }

    Ok(())
}

/// Reverte uma mescla realizada anteriormente (Undo Merge).
/// Restaura o tópico de origem, seus votos estornados e o estado prévio do tópico destino.
pub fn undo_merge(
    conn: &Connection,
    session_id: &str,
    target_topic_id: Option<&str>,
) -> Result<Option<String>> {
    let merge_record = if let Some(t_id) = target_topic_id {
        let mut stmt = conn.prepare(
            "SELECT id, source_topic_id, target_topic_id, source_title, source_description,
                    source_author_name, source_author_session_hash, source_status, source_vote_count,
                    source_duration_seconds_spent, source_notes, source_created_at,
                    target_prev_description, target_prev_notes, target_prev_author_name,
                    transferred_votes_json
             FROM topic_merges
             WHERE session_id = ?1 AND target_topic_id = ?2
             ORDER BY created_at DESC LIMIT 1",
        )?;
        stmt.query_row(params![session_id, t_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, Option<String>>(4)?,
                r.get::<_, String>(5)?,
                r.get::<_, String>(6)?,
                r.get::<_, String>(7)?,
                r.get::<_, u32>(8)?,
                r.get::<_, u32>(9)?,
                r.get::<_, String>(10)?,
                r.get::<_, String>(11)?,
                r.get::<_, Option<String>>(12)?,
                r.get::<_, String>(13)?,
                r.get::<_, String>(14)?,
                r.get::<_, String>(15)?,
            ))
        })
        .optional()?
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, source_topic_id, target_topic_id, source_title, source_description,
                    source_author_name, source_author_session_hash, source_status, source_vote_count,
                    source_duration_seconds_spent, source_notes, source_created_at,
                    target_prev_description, target_prev_notes, target_prev_author_name,
                    transferred_votes_json
             FROM topic_merges
             WHERE session_id = ?1
             ORDER BY created_at DESC LIMIT 1",
        )?;
        stmt.query_row(params![session_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, Option<String>>(4)?,
                r.get::<_, String>(5)?,
                r.get::<_, String>(6)?,
                r.get::<_, String>(7)?,
                r.get::<_, u32>(8)?,
                r.get::<_, u32>(9)?,
                r.get::<_, String>(10)?,
                r.get::<_, String>(11)?,
                r.get::<_, Option<String>>(12)?,
                r.get::<_, String>(13)?,
                r.get::<_, String>(14)?,
                r.get::<_, String>(15)?,
            ))
        })
        .optional()?
    };

    let Some((
        m_id,
        s_id,
        t_id,
        s_title,
        s_desc,
        s_author,
        s_hash,
        s_status,
        _s_votes,
        s_duration,
        s_notes,
        s_created_at,
        t_prev_desc,
        t_prev_notes,
        t_prev_author,
        transferred_json,
    )) = merge_record else {
        return Ok(None);
    };

    let transferred_voters: Vec<(String, String)> =
        serde_json::from_str(&transferred_json).unwrap_or_default();

    let tx = conn.unchecked_transaction()?;

    // 1. Restaura o tópico source original
    tx.execute(
        "INSERT OR REPLACE INTO topics (
            id, session_id, title, description, author_name, author_session_hash,
            status, vote_count, duration_seconds_spent, notes, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?9, ?10)",
        params![
            s_id,
            session_id,
            s_title,
            s_desc,
            s_author,
            s_hash,
            s_status,
            s_duration,
            s_notes,
            s_created_at
        ],
    )?;

    // 2. Estorna os votos transferidos
    for (v_hash, v_created) in &transferred_voters {
        tx.execute(
            "DELETE FROM votes WHERE session_id = ?1 AND topic_id = ?2 AND voter_hash = ?3",
            params![session_id, t_id, v_hash],
        )?;
        tx.execute(
            "INSERT OR REPLACE INTO votes (session_id, topic_id, voter_hash, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![session_id, s_id, v_hash, v_created],
        )?;
    }

    // 3. Atualiza contagem de votos de source e target
    let s_votes_count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM votes WHERE session_id = ?1 AND topic_id = ?2",
        params![session_id, s_id],
        |r| r.get(0),
    )?;
    tx.execute(
        "UPDATE topics SET vote_count = ?1 WHERE id = ?2",
        params![s_votes_count, s_id],
    )?;

    let t_votes_count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM votes WHERE session_id = ?1 AND topic_id = ?2",
        params![session_id, t_id],
        |r| r.get(0),
    )?;

    // 4. Restaura os campos do target
    tx.execute(
        "UPDATE topics SET description = ?1, notes = ?2, author_name = ?3, vote_count = ?4
         WHERE id = ?5 AND session_id = ?6",
        params![
            t_prev_desc,
            t_prev_notes,
            t_prev_author,
            t_votes_count,
            t_id,
            session_id
        ],
    )?;

    // 5. Remove o registro da mescla
    tx.execute("DELETE FROM topic_merges WHERE id = ?1", params![m_id])?;

    tx.commit()?;

    Ok(Some(s_id))
}

pub fn get_admin_metrics(conn: &Connection, db_path: &str) -> Result<AdminMetrics> {
    let total_sessions: usize = conn.query_row("SELECT COUNT(*) FROM sessions", [], |r| r.get(0))?;
    let active_sessions_30d: usize = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE created_at >= datetime('now', '-30 days')",
        [],
        |r| r.get(0),
    )?;
    let total_topics: usize = conn.query_row("SELECT COUNT(*) FROM topics", [], |r| r.get(0))?;
    let total_votes: usize = conn.query_row("SELECT COUNT(*) FROM votes", [], |r| r.get(0))?;
    let distinct_participants: usize = conn.query_row(
        "SELECT COUNT(DISTINCT voter_hash) FROM votes",
        [],
        |r| r.get(0),
    )?;

    let db_size_bytes = std::fs::metadata(db_path).map(|m| m.len()).unwrap_or(0);

    Ok(AdminMetrics {
        total_sessions,
        active_sessions_30d,
        total_topics,
        total_votes,
        distinct_participants,
        db_size_bytes,
    })
}

pub fn list_admin_sessions(conn: &Connection, limit: usize) -> Result<Vec<AdminSessionSummary>> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.title, s.phase,
                (SELECT COUNT(*) FROM topics t WHERE t.session_id = s.id) as topic_count,
                (SELECT COUNT(*) FROM votes v WHERE v.session_id = s.id) as vote_count,
                s.created_at
         FROM sessions s
         ORDER BY s.created_at DESC
         LIMIT ?1",
    )?;

    let rows = stmt.query_map(params![limit as i64], |row| {
        Ok(AdminSessionSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            phase: row.get(2)?,
            topic_count: row.get(3)?,
            vote_count: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;

    let mut sessions = Vec::new();
    for r in rows {
        sessions.push(r?);
    }
    Ok(sessions)
}

pub fn delete_session_by_admin(conn: &Connection, session_id: &str) -> Result<usize> {
    conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])
}

pub fn set_thermometer_vote(
    conn: &Connection,
    session_id: &str,
    topic_id: &str,
    voter_hash: &str,
    voter_name: &str,
    value: i64,
) -> Result<bool> {
    // 1. Valida modo e fase da sessão
    let session_check: Option<(String, String)> = conn
        .query_row(
            "SELECT phase, voting_mode FROM sessions WHERE id = ?1",
            params![session_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;

    let Some((phase, voting_mode)) = session_check else {
        return Ok(false);
    };

    if phase != "VOTING" || voting_mode != "THERMOMETER" {
        return Ok(false);
    }

    // 2. Valida pertença do tópico à sessão
    let topic_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM topics WHERE id = ?1 AND session_id = ?2",
        params![topic_id, session_id],
        |r| r.get(0),
    )?;

    if topic_exists == 0 {
        return Ok(false);
    }

    // 3. Limita valor e nome
    let clamped_val = value.clamp(0, 100);
    let trimmed = voter_name.trim();
    let final_name = if trimmed.is_empty() {
        "Anônimo".to_string()
    } else if trimmed.chars().count() > 60 {
        trimmed.chars().take(60).collect::<String>()
    } else {
        trimmed.to_string()
    };

    let now = Utc::now().to_rfc3339();

    // 4. Upsert
    conn.execute(
        "INSERT INTO thermometer_votes (session_id, topic_id, voter_hash, voter_name, value, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(session_id, topic_id, voter_hash) DO UPDATE SET
             voter_name = excluded.voter_name,
             value = excluded.value,
             updated_at = excluded.updated_at",
        params![session_id, topic_id, voter_hash, final_name, clamped_val, now],
    )?;

    Ok(true)
}

pub fn clear_thermometer_vote(
    conn: &Connection,
    session_id: &str,
    topic_id: &str,
    voter_hash: &str,
) -> Result<bool> {
    // 1. Valida modo e fase da sessão
    let session_check: Option<(String, String)> = conn
        .query_row(
            "SELECT phase, voting_mode FROM sessions WHERE id = ?1",
            params![session_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;

    let Some((phase, voting_mode)) = session_check else {
        return Ok(false);
    };

    if phase != "VOTING" || voting_mode != "THERMOMETER" {
        return Ok(false);
    }

    // 2. Valida pertença do tópico à sessão
    let topic_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM topics WHERE id = ?1 AND session_id = ?2",
        params![topic_id, session_id],
        |r| r.get(0),
    )?;

    if topic_exists == 0 {
        return Ok(false);
    }

    let rows = conn.execute(
        "DELETE FROM thermometer_votes WHERE session_id = ?1 AND topic_id = ?2 AND voter_hash = ?3",
        params![session_id, topic_id, voter_hash],
    )?;

    Ok(rows > 0)
}

pub fn get_thermometer_positions(
    conn: &Connection,
    session_id: &str,
    anonymous: bool,
) -> Result<HashMap<String, Vec<ThermometerPosition>>> {
    let mut positions: HashMap<String, Vec<ThermometerPosition>> = HashMap::new();

    if anonymous {
        let mut stmt = conn.prepare(
            "SELECT topic_id, value FROM thermometer_votes WHERE session_id = ?1 ORDER BY topic_id, value ASC",
        )?;
        let rows = stmt.query_map(params![session_id], |row| {
            let topic_id: String = row.get(0)?;
            let value: i64 = row.get(1)?;
            Ok((topic_id, value as u8))
        })?;
        for r in rows {
            let (topic_id, value) = r?;
            positions.entry(topic_id).or_default().push(ThermometerPosition {
                value,
                name: None,
            });
        }
    } else {
        let mut stmt = conn.prepare(
            "SELECT topic_id, value, voter_name FROM thermometer_votes WHERE session_id = ?1 ORDER BY topic_id, updated_at ASC",
        )?;
        let rows = stmt.query_map(params![session_id], |row| {
            let topic_id: String = row.get(0)?;
            let value: i64 = row.get(1)?;
            let name: String = row.get(2)?;
            Ok((topic_id, value as u8, name))
        })?;
        for r in rows {
            let (topic_id, value, name) = r?;
            positions.entry(topic_id).or_default().push(ThermometerPosition {
                value,
                name: Some(name),
            });
        }
    }

    Ok(positions)
}

pub fn get_user_thermometer(
    conn: &Connection,
    session_id: &str,
    voter_hash: &str,
) -> Result<HashMap<String, u8>> {
    let mut stmt = conn.prepare(
        "SELECT topic_id, value FROM thermometer_votes WHERE session_id = ?1 AND voter_hash = ?2",
    )?;
    let rows = stmt.query_map(params![session_id, voter_hash], |row| {
        let topic_id: String = row.get(0)?;
        let value: i64 = row.get(1)?;
        Ok((topic_id, value as u8))
    })?;

    let mut map = HashMap::new();
    for r in rows {
        let (topic_id, value) = r?;
        map.insert(topic_id, value);
    }
    Ok(map)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::VotingMode;
    use rusqlite::Connection;
    use ulid::Ulid;

    fn temp_db() -> (Connection, std::path::PathBuf) {
        let db_path = std::env::temp_dir().join(format!("coffee_db_test_{}.db", Ulid::new()));
        let conn = Connection::open(&db_path).unwrap();
        (conn, db_path)
    }

    #[test]
    fn test_migration_from_legacy_sessions() {
        let (conn, db_path) = temp_db();

        // 1. Cria schema antigo de sessions SEM voting_mode e SEM thermometer_anonymous
        conn.execute_batch(
            "
            CREATE TABLE sessions (
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
            INSERT INTO sessions (
                id, title, phase, facilitator_token, max_votes_per_user,
                default_timebox_seconds, timer_seconds_remaining, timer_is_running,
                timer_ends_at, active_topic_id, created_at, updated_at
            ) VALUES ('legacy_s1', 'Old Session', 'IDEATION', 'token123', 3, 300, 300, 0, NULL, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
            ",
        ).unwrap();

        // 2. Executa init_db que deve rodar a migração
        init_db(&conn).unwrap();

        // 3. Lê com get_session e valida defaults
        let (session, _) = get_session(&conn, "legacy_s1").unwrap().unwrap();
        assert_eq!(session.voting_mode, VotingMode::Priority);
        assert_eq!(session.thermometer_anonymous, true);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_thermometer_upsert_and_rerecord() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        let _ = create_session(&conn, "s1", "Thermo Session", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s1", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t1", "s1", "Topic 1", None, "Alice", "h_alice").unwrap();

        // Primeiro voto: 40
        let saved1 = set_thermometer_vote(&conn, "s1", "t1", "voter1", "Alice", 40).unwrap();
        assert!(saved1);

        let user_votes = get_user_thermometer(&conn, "s1", "voter1").unwrap();
        assert_eq!(user_votes.get("t1"), Some(&40));

        // Regravação (upsert): 80
        let saved2 = set_thermometer_vote(&conn, "s1", "t1", "voter1", "Alice Updated", 80).unwrap();
        assert!(saved2);

        let user_votes2 = get_user_thermometer(&conn, "s1", "voter1").unwrap();
        assert_eq!(user_votes2.get("t1"), Some(&80));

        // Deve existir apenas 1 voto no total
        let topics = get_topics(&conn, "s1").unwrap();
        assert_eq!(topics[0].thermo_count, 1);
        assert_eq!(topics[0].thermo_avg, Some(80.0));

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_thermometer_rejection_outside_voting_and_in_priority_mode() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        // 1. Sessão THERMOMETER em IDEATION -> deve rejeitar
        create_session(&conn, "s_ideation", "S1", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        insert_topic(&conn, "t1", "s_ideation", "T1", None, "Alice", "h1").unwrap();
        let res_ideation = set_thermometer_vote(&conn, "s_ideation", "t1", "vh1", "Alice", 50).unwrap();
        assert_eq!(res_ideation, false);

        // 2. Sessão THERMOMETER em DISCUSSION -> deve rejeitar
        create_session(&conn, "s_disc", "S2", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s_disc", SessionPhase::Discussion).unwrap();
        insert_topic(&conn, "t2", "s_disc", "T2", None, "Alice", "h1").unwrap();
        let res_disc = set_thermometer_vote(&conn, "s_disc", "t2", "vh1", "Alice", 50).unwrap();
        assert_eq!(res_disc, false);

        // 3. Sessão PRIORITY em VOTING -> deve rejeitar
        create_session(&conn, "s_prio", "S3", "tok", 3, 300, VotingMode::Priority, true).unwrap();
        update_session_phase(&conn, "s_prio", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t3", "s_prio", "T3", None, "Alice", "h1").unwrap();
        let res_prio = set_thermometer_vote(&conn, "s_prio", "t3", "vh1", "Alice", 50).unwrap();
        assert_eq!(res_prio, false);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_thermometer_rejection_topic_from_other_session() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        create_session(&conn, "s1", "S1", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s1", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t1", "s1", "T1", None, "Alice", "h1").unwrap();

        create_session(&conn, "s2", "S2", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s2", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t2", "s2", "T2", None, "Bob", "h2").unwrap();

        // Tenta votar no tópico t2 usando session_id s1 -> deve rejeitar
        let res = set_thermometer_vote(&conn, "s1", "t2", "vh1", "Alice", 50).unwrap();
        assert_eq!(res, false);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_thermometer_value_clamping() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        create_session(&conn, "s1", "S1", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s1", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t1", "s1", "T1", None, "Alice", "h1").unwrap();

        // 150 vira 100
        set_thermometer_vote(&conn, "s1", "t1", "v1", "Alice", 150).unwrap();
        let u1 = get_user_thermometer(&conn, "s1", "v1").unwrap();
        assert_eq!(u1.get("t1"), Some(&100));

        // -5 vira 0
        set_thermometer_vote(&conn, "s1", "t1", "v2", "Bob", -5).unwrap();
        let u2 = get_user_thermometer(&conn, "s1", "v2").unwrap();
        assert_eq!(u2.get("t1"), Some(&0));

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_thermometer_avg_and_spread() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        create_session(&conn, "s1", "S1", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s1", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t1", "s1", "T1", None, "Alice", "h1").unwrap();

        // 3 votos: 0, 50, 100 -> média 50.0, desvio 40.8
        set_thermometer_vote(&conn, "s1", "t1", "v1", "Alice", 0).unwrap();
        set_thermometer_vote(&conn, "s1", "t1", "v2", "Bob", 50).unwrap();
        set_thermometer_vote(&conn, "s1", "t1", "v3", "Carol", 100).unwrap();

        let topics = get_topics(&conn, "s1").unwrap();
        assert_eq!(topics.len(), 1);
        assert_eq!(topics[0].thermo_count, 3);
        assert_eq!(topics[0].thermo_avg, Some(50.0));
        assert_eq!(topics[0].thermo_spread, Some(40.8));

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_thermometer_divergence_ordering() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        create_session(&conn, "s1", "S1", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s1", SessionPhase::Voting).unwrap();

        // Cria 3 tópicos
        insert_topic(&conn, "t_low", "s1", "Low Divergence", None, "A", "h1").unwrap();
        insert_topic(&conn, "t_high", "s1", "High Divergence", None, "B", "h2").unwrap();
        insert_topic(&conn, "t_none", "s1", "No Votes", None, "C", "h3").unwrap();

        // t_low: votos 40, 50, 60 -> média 50.0, desvio ~8.2, variância 66.7
        set_thermometer_vote(&conn, "s1", "t_low", "v1", "U1", 40).unwrap();
        set_thermometer_vote(&conn, "s1", "t_low", "v2", "U2", 50).unwrap();
        set_thermometer_vote(&conn, "s1", "t_low", "v3", "U3", 60).unwrap();

        // t_high: votos 0, 50, 100 -> média 50.0, desvio 40.8, variância 1666.7
        set_thermometer_vote(&conn, "s1", "t_high", "v1", "U1", 0).unwrap();
        set_thermometer_vote(&conn, "s1", "t_high", "v2", "U2", 50).unwrap();
        set_thermometer_vote(&conn, "s1", "t_high", "v3", "U3", 100).unwrap();

        let topics = get_topics(&conn, "s1").unwrap();
        assert_eq!(topics.len(), 3);
        assert_eq!(topics[0].id, "t_high");
        assert_eq!(topics[1].id, "t_low");
        assert_eq!(topics[2].id, "t_none");
        assert_eq!(topics[2].thermo_avg, None);
        assert_eq!(topics[2].thermo_spread, None);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_thermometer_positions_anonymous_and_identified() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        create_session(&conn, "s1", "S1", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s1", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t1", "s1", "T1", None, "A", "h1").unwrap();

        // Alice: 80, Bob: 20, Carol: 50
        set_thermometer_vote(&conn, "s1", "t1", "v1", "Alice", 80).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(10));
        set_thermometer_vote(&conn, "s1", "t1", "v2", "Bob", 20).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(10));
        set_thermometer_vote(&conn, "s1", "t1", "v3", "Carol", 50).unwrap();

        // Anônimo: sem nomes e ordenado por valor ASC (20, 50, 80)
        let anon_pos = get_thermometer_positions(&conn, "s1", true).unwrap();
        let t1_anon = anon_pos.get("t1").unwrap();
        assert_eq!(t1_anon.len(), 3);
        assert_eq!(t1_anon[0].value, 20);
        assert_eq!(t1_anon[0].name, None);
        assert_eq!(t1_anon[1].value, 50);
        assert_eq!(t1_anon[1].name, None);
        assert_eq!(t1_anon[2].value, 80);
        assert_eq!(t1_anon[2].name, None);

        // Identificado: com nomes e ordenado por updated_at ASC (Alice, Bob, Carol)
        let ident_pos = get_thermometer_positions(&conn, "s1", false).unwrap();
        let t1_ident = ident_pos.get("t1").unwrap();
        assert_eq!(t1_ident.len(), 3);
        assert_eq!(t1_ident[0].value, 80);
        assert_eq!(t1_ident[0].name.as_deref(), Some("Alice"));
        assert_eq!(t1_ident[1].value, 20);
        assert_eq!(t1_ident[1].name.as_deref(), Some("Bob"));
        assert_eq!(t1_ident[2].value, 50);
        assert_eq!(t1_ident[2].name.as_deref(), Some("Carol"));

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_thermometer_clear_vote() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        create_session(&conn, "s1", "S1", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s1", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t1", "s1", "T1", None, "A", "h1").unwrap();

        set_thermometer_vote(&conn, "s1", "t1", "v1", "Alice", 75).unwrap();
        assert_eq!(get_user_thermometer(&conn, "s1", "v1").unwrap().get("t1"), Some(&75));

        let cleared = clear_thermometer_vote(&conn, "s1", "t1", "v1").unwrap();
        assert_eq!(cleared, true);
        assert_eq!(get_user_thermometer(&conn, "s1", "v1").unwrap().get("t1"), None);

        // Segunda tentativa deve retornar false (já removido)
        let cleared2 = clear_thermometer_vote(&conn, "s1", "t1", "v1").unwrap();
        assert_eq!(cleared2, false);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_delete_and_merge_topic_deletes_thermometer_votes() {
        let (conn, db_path) = temp_db();
        init_db(&conn).unwrap();

        create_session(&conn, "s1", "S1", "tok", 3, 300, VotingMode::Thermometer, true).unwrap();
        update_session_phase(&conn, "s1", SessionPhase::Voting).unwrap();
        insert_topic(&conn, "t1", "s1", "T1", None, "A", "h1").unwrap();
        insert_topic(&conn, "t2", "s1", "T2", None, "B", "h2").unwrap();

        set_thermometer_vote(&conn, "s1", "t1", "v1", "Alice", 75).unwrap();
        set_thermometer_vote(&conn, "s1", "t2", "v2", "Bob", 30).unwrap();

        // 1. Apagar tópico apaga seus votos
        delete_topic(&conn, "t1", "s1").unwrap();
        let votes_t1: i64 = conn.query_row(
            "SELECT COUNT(*) FROM thermometer_votes WHERE topic_id = 't1'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(votes_t1, 0);

        // 2. Mesclar tópicos: votos do source são descartados
        insert_topic(&conn, "t3", "s1", "T3", None, "C", "h3").unwrap();
        set_thermometer_vote(&conn, "s1", "t3", "v3", "Carol", 90).unwrap();

        merge_topics(&conn, "s1", "t3", "t2").unwrap();
        let votes_t3: i64 = conn.query_row(
            "SELECT COUNT(*) FROM thermometer_votes WHERE topic_id = 't3'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(votes_t3, 0);

        // Votos de t2 continuam intactos (não somam)
        let votes_t2: i64 = conn.query_row(
            "SELECT COUNT(*) FROM thermometer_votes WHERE topic_id = 't2'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(votes_t2, 1);

        let _ = std::fs::remove_file(db_path);
    }
}


#[cfg(test)]
mod thermo_summary_tests {
    use crate::models::{Topic, TopicStatus};

    fn topic(count: u32, avg: Option<f64>, spread: Option<f64>) -> Topic {
        Topic {
            id: "t".into(), session_id: "s".into(), title: "T".into(), description: None,
            author_name: "A".into(), author_session_hash: "h".into(), status: TopicStatus::ToDiscuss,
            vote_count: 0, duration_seconds_spent: 0, notes: String::new(), created_at: String::new(),
            merged_count: 0, thermo_count: count, thermo_avg: avg, thermo_spread: spread,
        }
    }

    #[test]
    fn summary_without_votes_says_no_votes() {
        assert_eq!(topic(0, None, None).thermo_summary(), "Termômetro: sem votos");
    }

    #[test]
    fn summary_with_votes() {
        assert_eq!(
            topic(3, Some(50.0), Some(40.8)).thermo_summary(),
            "Termômetro: média 50.0% · divergência 40.8 (3 votos)"
        );
        assert_eq!(
            topic(1, Some(70.0), Some(0.0)).thermo_summary(),
            "Termômetro: média 70.0% · divergência 0.0 (1 voto)"
        );
    }
}
