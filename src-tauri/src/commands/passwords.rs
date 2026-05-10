use crate::crypto;
use crate::db::DB;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct PasswordEntry {
    pub id: i64,
    pub app_name: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub email: Option<String>,
    pub description: Option<String>,
    pub group_id: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Deserialize)]
pub struct CreatePasswordInput {
    pub app_name: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub email: Option<String>,
    pub description: Option<String>,
    pub group_id: Option<i64>,
}

struct RawPassword {
    id: i64,
    app_name: String,
    username: String,
    encrypted_password: Vec<u8>,
    iv: Vec<u8>,
    url: Option<String>,
    email: Option<String>,
    description: Option<String>,
    group_id: Option<i64>,
    created_at: Option<String>,
    updated_at: Option<String>,
}

fn decrypt_row(row: RawPassword, key: &[u8]) -> Result<PasswordEntry, String> {
    let password = crypto::decrypt(&row.encrypted_password, &row.iv, key)?;
    Ok(PasswordEntry {
        id: row.id,
        app_name: row.app_name,
        username: row.username,
        password,
        url: row.url,
        email: row.email,
        description: row.description,
        group_id: row.group_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[tauri::command]
pub fn get_all_passwords(group_id: Option<String>, search: Option<String>, show_private: Option<bool>) -> Result<Vec<PasswordEntry>, String> {
    let key = crypto::get_cached_key().ok_or("加密密钥不可用，请先解锁应用")?;
    let conn = DB.lock().map_err(|e| e.to_string())?;
    let show_priv = show_private.unwrap_or(false);

    // 获取私密分组 ID 列表
    let private_ids: Vec<i64> = if !show_priv {
        conn.prepare("SELECT id FROM groups WHERE is_private = 1")
            .map_err(|e| e.to_string())?
            .query_map([], |row| row.get::<_, i64>(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect()
    } else {
        vec![]
    };

    let rows: Vec<RawPassword> = if let Some(keyword) = search {
        let pattern = format!("%{}%", keyword);
        if !show_priv && !private_ids.is_empty() {
            let placeholders: Vec<String> = private_ids.iter().map(|id| id.to_string()).collect();
            let sql = format!("SELECT id, app_name, username, encrypted_password, iv, url, email, description, group_id, created_at, updated_at FROM passwords WHERE app_name LIKE ?1 AND (group_id IS NULL OR group_id NOT IN ({})) ORDER BY app_name ASC", placeholders.join(","));
            conn.prepare(&sql)
                .map_err(|e| e.to_string())?
                .query_map([&pattern], |row| Ok(RawPassword {
                    id: row.get(0)?, app_name: row.get(1)?, username: row.get(2)?,
                    encrypted_password: row.get(3)?, iv: row.get(4)?, url: row.get(5)?,
                    email: row.get(6)?, description: row.get(7)?, group_id: row.get(8)?,
                    created_at: row.get(9)?, updated_at: row.get(10)?,
                })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
        } else {
            conn.prepare("SELECT id, app_name, username, encrypted_password, iv, url, email, description, group_id, created_at, updated_at FROM passwords WHERE app_name LIKE ?1 ORDER BY app_name ASC")
                .map_err(|e| e.to_string())?
                .query_map([&pattern], |row| Ok(RawPassword {
                    id: row.get(0)?, app_name: row.get(1)?, username: row.get(2)?,
                    encrypted_password: row.get(3)?, iv: row.get(4)?, url: row.get(5)?,
                    email: row.get(6)?, description: row.get(7)?, group_id: row.get(8)?,
                    created_at: row.get(9)?, updated_at: row.get(10)?,
                })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
        }
    } else if let Some(gid) = &group_id {
        if gid == "ungrouped" {
            conn.prepare("SELECT id, app_name, username, encrypted_password, iv, url, email, description, group_id, created_at, updated_at FROM passwords WHERE group_id IS NULL ORDER BY app_name ASC")
                .map_err(|e| e.to_string())?
                .query_map([], |row| Ok(RawPassword {
                    id: row.get(0)?, app_name: row.get(1)?, username: row.get(2)?,
                    encrypted_password: row.get(3)?, iv: row.get(4)?, url: row.get(5)?,
                    email: row.get(6)?, description: row.get(7)?, group_id: row.get(8)?,
                    created_at: row.get(9)?, updated_at: row.get(10)?,
                })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
        } else {
            let gid_num: i64 = gid.parse().map_err(|_| "无效的 group_id")?;
            conn.prepare("SELECT id, app_name, username, encrypted_password, iv, url, email, description, group_id, created_at, updated_at FROM passwords WHERE group_id = ?1 ORDER BY app_name ASC")
                .map_err(|e| e.to_string())?
                .query_map([gid_num], |row| Ok(RawPassword {
                    id: row.get(0)?, app_name: row.get(1)?, username: row.get(2)?,
                    encrypted_password: row.get(3)?, iv: row.get(4)?, url: row.get(5)?,
                    email: row.get(6)?, description: row.get(7)?, group_id: row.get(8)?,
                    created_at: row.get(9)?, updated_at: row.get(10)?,
                })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
        }
    } else {
        // 全部密码 - 需排除私密分组
        if !show_priv && !private_ids.is_empty() {
            let placeholders: Vec<String> = private_ids.iter().map(|id| id.to_string()).collect();
            let sql = format!("SELECT id, app_name, username, encrypted_password, iv, url, email, description, group_id, created_at, updated_at FROM passwords WHERE (group_id IS NULL OR group_id NOT IN ({})) ORDER BY app_name ASC", placeholders.join(","));
            conn.prepare(&sql)
                .map_err(|e| e.to_string())?
                .query_map([], |row| Ok(RawPassword {
                    id: row.get(0)?, app_name: row.get(1)?, username: row.get(2)?,
                    encrypted_password: row.get(3)?, iv: row.get(4)?, url: row.get(5)?,
                    email: row.get(6)?, description: row.get(7)?, group_id: row.get(8)?,
                    created_at: row.get(9)?, updated_at: row.get(10)?,
                })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
        } else {
            conn.prepare("SELECT id, app_name, username, encrypted_password, iv, url, email, description, group_id, created_at, updated_at FROM passwords ORDER BY app_name ASC")
                .map_err(|e| e.to_string())?
                .query_map([], |row| Ok(RawPassword {
                    id: row.get(0)?, app_name: row.get(1)?, username: row.get(2)?,
                    encrypted_password: row.get(3)?, iv: row.get(4)?, url: row.get(5)?,
                    email: row.get(6)?, description: row.get(7)?, group_id: row.get(8)?,
                    created_at: row.get(9)?, updated_at: row.get(10)?,
                })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
        }
    };

    rows.into_iter().map(|r| decrypt_row(r, &key)).collect()
}

#[tauri::command]
pub fn get_password_by_id(id: i64) -> Result<PasswordEntry, String> {
    let key = crypto::get_cached_key().ok_or("加密密钥不可用，请先解锁应用")?;
    let conn = DB.lock().map_err(|e| e.to_string())?;

    let row = conn.query_row(
        "SELECT id, app_name, username, encrypted_password, iv, url, email, description, group_id, created_at, updated_at FROM passwords WHERE id = ?1",
        [id],
        |row| Ok(RawPassword {
            id: row.get(0)?, app_name: row.get(1)?, username: row.get(2)?,
            encrypted_password: row.get(3)?, iv: row.get(4)?, url: row.get(5)?,
            email: row.get(6)?, description: row.get(7)?, group_id: row.get(8)?,
            created_at: row.get(9)?, updated_at: row.get(10)?,
        }),
    ).map_err(|e| format!("密码条目不存在: {}", e))?;

    decrypt_row(row, &key)
}

#[tauri::command]
pub fn create_password(input: CreatePasswordInput) -> Result<PasswordEntry, String> {
    let key = crypto::get_cached_key().ok_or("加密密钥不可用，请先解锁应用")?;
    let result = crypto::encrypt(&input.password, &key)?;

    let conn = DB.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO passwords (app_name, username, encrypted_password, iv, url, email, description, group_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![input.app_name, input.username, result.encrypted, result.iv, input.url, input.email, input.description, input.group_id],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    drop(conn);
    get_password_by_id(id)
}

#[tauri::command]
pub fn update_password(id: i64, input: CreatePasswordInput) -> Result<PasswordEntry, String> {
    let key = crypto::get_cached_key().ok_or("加密密钥不可用，请先解锁应用")?;
    let result = crypto::encrypt(&input.password, &key)?;

    let conn = DB.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE passwords SET app_name = ?1, username = ?2, encrypted_password = ?3, iv = ?4, url = ?5, email = ?6, description = ?7, group_id = ?8, updated_at = datetime('now') WHERE id = ?9",
        rusqlite::params![input.app_name, input.username, result.encrypted, result.iv, input.url, input.email, input.description, input.group_id, id],
    ).map_err(|e| e.to_string())?;

    drop(conn);
    get_password_by_id(id)
}

#[tauri::command]
pub fn delete_password(id: i64) -> Result<bool, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM passwords WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn delete_ungrouped_passwords() -> Result<i64, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM passwords WHERE group_id IS NULL", [], |row| row.get(0))
        .unwrap_or(0);
    conn.execute("DELETE FROM passwords WHERE group_id IS NULL", [])
        .map_err(|e| e.to_string())?;
    Ok(count)
}