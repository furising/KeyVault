use crate::crypto;
use crate::db::DB;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::Serialize;

#[derive(Serialize)]
pub struct AuthStatus {
    #[serde(rename = "hasMasterPassword")]
    pub has_master_password: bool,
}

fn get_setting(key: &str) -> Option<String> {
    let conn = DB.lock().unwrap();
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        [key],
        |row| row.get::<_, String>(0),
    )
    .ok()
}

fn set_setting(key: &str, value: &str) {
    let conn = DB.lock().unwrap();
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        [key, value],
    )
    .ok();
}

#[tauri::command]
pub fn get_auth_status() -> Result<AuthStatus, String> {
    let has = get_setting("master_password_hash").is_some();
    Ok(AuthStatus { has_master_password: has })
}

#[tauri::command]
pub async fn setup_master_password(password: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let salt = crypto::generate_salt();
        // 单次 PBKDF2：派生密钥同时用于 hash 存储和加密缓存
        let key = crypto::derive_and_cache_key(&password, &salt);
        let hash = BASE64.encode(&key);

        set_setting("master_password_hash", &hash);
        set_setting("master_password_salt", &salt);

        Ok(true)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn verify_master_password(password: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let stored_hash = get_setting("master_password_hash")
            .ok_or_else(|| "主密码未设置".to_string())?;
        let salt = get_setting("master_password_salt")
            .ok_or_else(|| "盐值不存在".to_string())?;

        // 单次 PBKDF2：派生密钥验证 + 缓存
        let key = crypto::derive_and_cache_key(&password, &salt);
        let input_hash = BASE64.encode(&key);
        if input_hash != stored_hash {
            crypto::clear_cached_key();
            return Ok(false);
        }

        Ok(true)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn change_master_password(old_password: String, new_password: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let stored_hash = get_setting("master_password_hash")
            .ok_or_else(|| "主密码未设置".to_string())?;
        let old_salt = get_setting("master_password_salt")
            .ok_or_else(|| "盐值不存在".to_string())?;

        // 验证旧密码（单次 PBKDF2）
        let old_key = crypto::derive_key(&old_password, &old_salt);
        let input_hash = BASE64.encode(&old_key);
        if input_hash != stored_hash {
            return Ok(false);
        }

        // 派生新密钥（单次 PBKDF2）
        let new_salt = crypto::generate_salt();
        let new_key = crypto::derive_and_cache_key(&new_password, &new_salt);
        let new_hash = BASE64.encode(&new_key);

        let conn = DB.lock().map_err(|e| e.to_string())?;
        let rows: Vec<(i64, Vec<u8>, Vec<u8>)> = conn.prepare("SELECT id, encrypted_password, iv FROM passwords")
            .map_err(|e| e.to_string())?
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (id, encrypted, iv) in rows {
            let plain = crypto::decrypt(&encrypted, &iv, &old_key)?;
            let result = crypto::encrypt(&plain, &new_key)?;
            conn.execute(
                "UPDATE passwords SET encrypted_password = ?1, iv = ?2, updated_at = datetime('now') WHERE id = ?3",
                rusqlite::params![result.encrypted, result.iv, id],
            ).map_err(|e| e.to_string())?;
        }

        set_setting("master_password_hash", &new_hash);
        set_setting("master_password_salt", &new_salt);

        Ok(true)
    }).await.map_err(|e| e.to_string())?
}