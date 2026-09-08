use rusqlite::{params, Connection, Result};
use std::path::PathBuf;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub id: Option<i64>,
    pub role: String,
    pub content: String,
    pub timestamp: String,
}

pub fn get_db_path(app: &tauri::AppHandle) -> PathBuf {
    use tauri::Manager;
    let mut path = app.path().app_data_dir().expect("Failed to get app data dir");
    std::fs::create_dir_all(&path).ok();
    path.push("mylo_chat_history.db");
    path
}

pub fn init_db(app: &tauri::AppHandle) -> Result<()> {
    let db_path = get_db_path(app);
    let conn = Connection::open(db_path)?;

    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;")?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    log::info!("[MYLO DB] SQLite chat_history initialized.");
    Ok(())
}

pub fn insert_message(app: &tauri::AppHandle, role: &str, content: &str) -> Result<i64> {
    let db_path = get_db_path(app);
    let conn = Connection::open(db_path)?;
    
    conn.execute(
        "INSERT INTO chat_history (role, content) VALUES (?1, ?2)",
        params![role, content],
    )?;
    
    Ok(conn.last_insert_rowid())
}

pub fn get_recent_messages(app: &tauri::AppHandle, limit: usize) -> Result<Vec<ChatMessage>> {
    let db_path = get_db_path(app);
    let conn = Connection::open(db_path)?;
    
    let mut stmt = conn.prepare("SELECT id, role, content, timestamp FROM chat_history ORDER BY id DESC LIMIT ?1")?;
    let message_iter = stmt.query_map([limit as i64], |row| {
        Ok(ChatMessage {
            id: Some(row.get(0)?),
            role: row.get(1)?,
            content: row.get(2)?,
            timestamp: row.get(3)?,
        })
    })?;
    
    let mut messages = Vec::new();
    for msg in message_iter {
        messages.push(msg?);
    }
    
    // Reverse so chronological order is maintained
    messages.reverse();
    
    Ok(messages)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chat_message_serde_roundtrip() {
        let msg = ChatMessage {
            id: Some(42),
            role: "user".to_string(),
            content: "Hello MYLO".to_string(),
            timestamp: "2026-09-08 14:00:00".to_string(),
        };

        let json = serde_json::to_string(&msg).expect("Serialize failed");
        let deserialized: ChatMessage = serde_json::from_str(&json).expect("Deserialize failed");

        assert_eq!(deserialized.id, Some(42));
        assert_eq!(deserialized.role, "user");
        assert_eq!(deserialized.content, "Hello MYLO");
        assert_eq!(deserialized.timestamp, "2026-09-08 14:00:00");
    }
}
