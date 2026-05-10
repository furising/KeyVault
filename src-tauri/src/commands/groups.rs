use crate::db::DB;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Clone)]
pub struct Group {
    pub id: i64,
    pub name: String,
    pub is_private: i64,
    pub has_group_password: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize)]
pub struct GroupsResponse {
    pub groups: Vec<Group>,
    pub counts: HashMap<i64, i64>,
    #[serde(rename = "ungroupedCount")]
    pub ungrouped_count: i64,
    #[serde(rename = "totalCount")]
    pub total_count: i64,
}

#[derive(Deserialize)]
pub struct UpdateGroupInput {
    pub name: Option<String>,
    pub is_private: Option<bool>,
    pub group_password: Option<Option<String>>,
}

#[tauri::command]
pub fn get_all_groups(show_private: Option<bool>) -> Result<GroupsResponse, String> {
    let show_priv = show_private.unwrap_or(false);
    let conn = DB.lock().map_err(|e| e.to_string())?;

    // 获取所有分组
    let groups: Vec<Group> = conn.prepare("SELECT id, name, is_private, group_password, created_at, updated_at FROM groups ORDER BY name")
        .map_err(|e| e.to_string())?
        .query_map([], |row| {
            let gp: Option<String> = row.get(3)?;
            Ok(Group {
                id: row.get(0)?,
                name: row.get(1)?,
                is_private: row.get(2)?,
                has_group_password: gp.is_some(),
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // 获取私密分组 ID
    let private_ids: Vec<i64> = groups.iter().filter(|g| g.is_private == 1).map(|g| g.id).collect();

    // 获取每个分组的密码数量
    let counts: HashMap<i64, i64> = conn.prepare("SELECT group_id, COUNT(*) FROM passwords WHERE group_id IS NOT NULL GROUP BY group_id")
        .map_err(|e| e.to_string())?
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // 未分组数量
    let ungrouped_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM passwords WHERE group_id IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    // 总数（排除私密分组）
    let total_count: i64 = if !show_priv && !private_ids.is_empty() {
        let placeholders: Vec<String> = private_ids.iter().map(|id| id.to_string()).collect();
        let sql = format!("SELECT COUNT(*) FROM passwords WHERE (group_id IS NULL OR group_id NOT IN ({}))", placeholders.join(","));
        conn.query_row(&sql, [], |row| row.get(0)).unwrap_or(0)
    } else {
        conn.query_row("SELECT COUNT(*) FROM passwords", [], |row| row.get(0)).unwrap_or(0)
    };

    Ok(GroupsResponse { groups, counts, ungrouped_count, total_count })
}

#[tauri::command]
pub fn create_group(name: String, is_private: Option<bool>, group_password: Option<String>) -> Result<Group, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    let priv_val: i64 = if is_private.unwrap_or(false) { 1 } else { 0 };
    let gp = group_password.as_deref().filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO groups (name, is_private, group_password) VALUES (?1, ?2, ?3)",
        rusqlite::params![name, priv_val, gp],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(Group {
        id,
        name,
        is_private: priv_val,
        has_group_password: gp.is_some(),
        created_at: None,
        updated_at: None,
    })
}

#[tauri::command]
pub fn update_group(id: i64, data: UpdateGroupInput) -> Result<bool, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;

    if let Some(name) = &data.name {
        conn.execute("UPDATE groups SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![name, id]).map_err(|e| e.to_string())?;
    }
    if let Some(is_private) = data.is_private {
        let val: i64 = if is_private { 1 } else { 0 };
        conn.execute("UPDATE groups SET is_private = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![val, id]).map_err(|e| e.to_string())?;
    }
    if let Some(gp) = &data.group_password {
        let gp_val = gp.as_deref().filter(|s| !s.is_empty());
        conn.execute("UPDATE groups SET group_password = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![gp_val, id]).map_err(|e| e.to_string())?;
    }

    Ok(true)
}

#[tauri::command]
pub fn delete_group(id: i64) -> Result<bool, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM groups WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn verify_group_password(id: i64, password: String) -> Result<bool, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    let stored: Option<String> = conn.query_row(
        "SELECT group_password FROM groups WHERE id = ?1", [id],
        |row| row.get(0),
    ).ok().flatten();

    match stored {
        None => Ok(true), // 没设密码，直接通过
        Some(p) => Ok(p == password),
    }
}

#[tauri::command]
pub fn has_group_password(id: i64) -> Result<bool, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    let stored: Option<String> = conn.query_row(
        "SELECT group_password FROM groups WHERE id = ?1", [id],
        |row| row.get(0),
    ).ok().flatten();
    Ok(stored.is_some())
}

#[tauri::command]
pub fn get_group_password(id: i64) -> Result<Option<String>, String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;
    let stored: Option<String> = conn.query_row(
        "SELECT group_password FROM groups WHERE id = ?1", [id],
        |row| row.get(0),
    ).ok().flatten();
    Ok(stored)
}