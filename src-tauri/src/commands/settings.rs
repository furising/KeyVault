use crate::db::DB;
use serde::Serialize;

#[derive(Serialize)]
pub struct SettingResponse {
    pub key: String,
    pub value: Option<String>,
}

#[tauri::command]
pub fn get_setting(key: String) -> Result<SettingResponse, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    let value: Option<String> = conn
        .query_row("SELECT value FROM settings WHERE key = ?1", [&key], |row| row.get(0))
        .ok();
    Ok(SettingResponse { key, value })
}

#[tauri::command]
pub fn set_setting(key: String, value: String) -> Result<bool, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        [&key, &value],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}