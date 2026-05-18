use crate::crypto;
use crate::db::DB;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ExportGroup {
    pub id: i64,
    pub name: String,
    pub is_private: i64,
    pub encrypted_group_password: Option<String>,
    pub group_password_iv: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ExportPasswordEntry {
    pub app_name: String,
    pub username: String,
    pub encrypted_password: String,
    pub iv: String,
    pub url: Option<String>,
    pub email: Option<String>,
    pub description: Option<String>,
    pub group_name: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    #[serde(rename = "exportedAt")]
    pub exported_at: String,
    pub salt: String,
    pub groups: Vec<ExportGroup>,
    pub passwords: Vec<ExportPasswordEntry>,
}

#[derive(Serialize)]
pub struct ImportResult {
    pub imported: i64,
    pub skipped: i64,
}

#[tauri::command]
pub fn export_data() -> Result<ExportData, String> {
    let key = crypto::get_cached_key().ok_or("加密密钥不可用，请先解锁应用")?;
    let conn = DB.lock().map_err(|e| e.to_string())?;

    // 获取盐值
    let salt: String = conn
        .query_row("SELECT value FROM settings WHERE key = 'master_password_salt'", [], |row| row.get(0))
        .map_err(|_| "主密码盐值不可用".to_string())?;

    // 导出分组
    let groups: Vec<ExportGroup> = conn.prepare("SELECT id, name, is_private, group_password FROM groups ORDER BY name")
        .map_err(|e| e.to_string())?
        .query_map([], |row| {
            let gp: Option<String> = row.get(3)?;
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)?, gp))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .map(|(id, name, is_private, gp)| {
            if let Some(password) = gp {
                let result = crypto::encrypt(&password, &key).unwrap();
                ExportGroup {
                    id, name, is_private,
                    encrypted_group_password: Some(BASE64.encode(&result.encrypted)),
                    group_password_iv: Some(BASE64.encode(&result.iv)),
                }
            } else {
                ExportGroup { id, name, is_private, encrypted_group_password: None, group_password_iv: None }
            }
        })
        .collect();

    // 导出密码
    let passwords: Vec<ExportPasswordEntry> = conn.prepare("SELECT p.app_name, p.username, p.encrypted_password, p.iv, p.url, p.email, p.description, g.name, p.created_at, p.updated_at FROM passwords p LEFT JOIN groups g ON p.group_id = g.id ORDER BY p.app_name")
        .map_err(|e| e.to_string())?
        .query_map([], |row| {
            let ep: Vec<u8> = row.get(2)?;
            let iv: Vec<u8> = row.get(3)?;
            Ok(ExportPasswordEntry {
                app_name: row.get(0)?, username: row.get(1)?,
                encrypted_password: BASE64.encode(&ep),
                iv: BASE64.encode(&iv),
                url: row.get(4)?, email: row.get(5)?,
                description: row.get(6)?, group_name: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ExportData {
        version: "1.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        salt,
        groups,
        passwords,
    })
}

#[tauri::command]
pub fn import_data(data: ExportData, password: String) -> Result<ImportResult, String> {
    let current_key = crypto::get_cached_key().ok_or("加密密钥不可用，请先解锁应用")?;
    let import_key = crypto::derive_key(&password, &data.salt);

    // 验证密钥是否正确
    if let Some(first) = data.passwords.first() {
        let encrypted = BASE64.decode(&first.encrypted_password).map_err(|e| e.to_string())?;
        let iv = BASE64.decode(&first.iv).map_err(|e| e.to_string())?;
        crypto::decrypt(&encrypted, &iv, &import_key)
            .map_err(|_| "密码不正确，无法解密导入文件中的数据".to_string())?;
    }

    let conn = DB.lock().map_err(|e| e.to_string())?;
    let mut imported: i64 = 0;
    let mut skipped: i64 = 0;

    // 创建不存在的分组
    let mut group_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    {
        let existing: Vec<(i64, String, String)> = conn.prepare("SELECT id, name, updated_at FROM groups")
            .map_err(|e| e.to_string())?
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        for (id, name, _) in existing { group_map.insert(name, id); }
    }

    for g in &data.groups {
        if !group_map.contains_key(&g.name) {
            let mut gp: Option<String> = None;
            if let (Some(enc), Some(iv_str)) = (&g.encrypted_group_password, &g.group_password_iv) {
                let enc_bytes = BASE64.decode(enc).map_err(|e| e.to_string())?;
                let iv_bytes = BASE64.decode(iv_str).map_err(|e| e.to_string())?;
                gp = Some(crypto::decrypt(&enc_bytes, &iv_bytes, &import_key)?);
            }
            conn.execute("INSERT INTO groups (name, is_private, group_password) VALUES (?1, ?2, ?3)",
                rusqlite::params![g.name, g.is_private, gp]).map_err(|e| e.to_string())?;
            group_map.insert(g.name.clone(), conn.last_insert_rowid());
        } else {
            // 分组已存在，比较更新时间，如果导入的分组更新则更新
            let existing_id = group_map.get(&g.name).unwrap();
            let local_updated_at: String = conn.query_row(
                "SELECT updated_at FROM groups WHERE id = ?1",
                [existing_id], |row| row.get(0)
            ).map_err(|e| e.to_string())?;
            
            let import_updated_at = chrono::Utc::now().to_rfc3339(); // 导出的分组暂时没有updated_at字段，使用当前时间
            
            let local_time = chrono::DateTime::parse_from_rfc3339(&local_updated_at)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());

            let import_time = chrono::DateTime::parse_from_rfc3339(&import_updated_at)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());

            if import_time > local_time {
                let mut gp: Option<String> = None;
                if let (Some(enc), Some(iv_str)) = (&g.encrypted_group_password, &g.group_password_iv) {
                    let enc_bytes = BASE64.decode(enc).map_err(|e| e.to_string())?;
                    let iv_bytes = BASE64.decode(iv_str).map_err(|e| e.to_string())?;
                    gp = Some(crypto::decrypt(&enc_bytes, &iv_bytes, &import_key)?);
                }
                conn.execute(
                    "UPDATE groups SET is_private = ?1, group_password = ?2, updated_at = ?3 WHERE id = ?4",
                    rusqlite::params![g.is_private, gp, import_updated_at, existing_id],
                ).map_err(|e| e.to_string())?;
            }
        }
    }

    // 导入密码
    for entry in &data.passwords {
        // 检查是否已存在相同的条目（通过 app_name 和 username 作为唯一标识）
        let existing_entry = conn.query_row(
            "SELECT id, updated_at FROM passwords WHERE app_name = ?1 AND username = ?2",
            [&entry.app_name, &entry.username], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
            },
        ).ok();

        if let Some((existing_id, local_updated_at)) = existing_entry {
            // 条目已存在，比较更新时间
            let import_updated_at = entry.updated_at.as_deref().unwrap_or("");
            
            // 解析时间进行比较
            let local_time = chrono::DateTime::parse_from_rfc3339(&local_updated_at)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());

            let import_time = chrono::DateTime::parse_from_rfc3339(import_updated_at)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| {
                    // 如果导入的条目没有更新时间或者格式错误，视为比本地旧，跳过
                    chrono::DateTime::UNIX_EPOCH.with_timezone(&chrono::Utc)
                });

            // 如果导入的条目更新时间更新，则覆盖本地条目
            if import_time > local_time {
                let enc_bytes = BASE64.decode(&entry.encrypted_password).map_err(|e| e.to_string())?;
                let iv_bytes = BASE64.decode(&entry.iv).map_err(|e| e.to_string())?;
                let plain = crypto::decrypt(&enc_bytes, &iv_bytes, &import_key)?;
                let result = crypto::encrypt(&plain, &current_key)?;

                // 确保分组存在（处理 group_name 在 data.groups 中未列出的情况）
                let group_id: Option<i64> = if let Some(name) = &entry.group_name {
                    if let Some(&id) = group_map.get(name) {
                        Some(id)
                    } else {
                        // 分组不在 map 中，创建它
                        conn.execute("INSERT OR IGNORE INTO groups (name) VALUES (?1)",
                            rusqlite::params![name]).map_err(|e| e.to_string())?;
                        let id = conn.query_row("SELECT id FROM groups WHERE name = ?1", [name], |row| row.get::<_, i64>(0))
                            .map_err(|e| e.to_string())?;
                        group_map.insert(name.clone(), id);
                        Some(id)
                    }
                } else {
                    None
                };

                // 更新现有条目
                conn.execute(
                    "UPDATE passwords SET encrypted_password = ?1, iv = ?2, url = ?3, email = ?4, description = ?5, group_id = ?6, updated_at = ?7 WHERE id = ?8",
                    rusqlite::params![result.encrypted, result.iv, entry.url, entry.email, entry.description, group_id, entry.updated_at, existing_id],
                ).map_err(|e| e.to_string())?;
                imported += 1;
            } else {
                // 本地条目更新，跳过
                skipped += 1;
            }
        } else {
            // 条目不存在，新增
            let enc_bytes = BASE64.decode(&entry.encrypted_password).map_err(|e| e.to_string())?;
            let iv_bytes = BASE64.decode(&entry.iv).map_err(|e| e.to_string())?;
            let plain = crypto::decrypt(&enc_bytes, &iv_bytes, &import_key)?;
            let result = crypto::encrypt(&plain, &current_key)?;

            // 确保分组存在（处理 group_name 在 data.groups 中未列出的情况）
            let group_id: Option<i64> = if let Some(name) = &entry.group_name {
                if let Some(&id) = group_map.get(name) {
                    Some(id)
                } else {
                    // 分组不在 map 中，创建它
                    conn.execute("INSERT OR IGNORE INTO groups (name) VALUES (?1)",
                        rusqlite::params![name]).map_err(|e| e.to_string())?;
                    let id = conn.query_row("SELECT id FROM groups WHERE name = ?1", [name], |row| row.get::<_, i64>(0))
                        .map_err(|e| e.to_string())?;
                    group_map.insert(name.clone(), id);
                    Some(id)
                }
            } else {
                None
            };

            conn.execute(
                "INSERT INTO passwords (app_name, username, encrypted_password, iv, url, email, description, group_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                rusqlite::params![entry.app_name, entry.username, result.encrypted, result.iv, entry.url, entry.email, entry.description, group_id, entry.created_at, entry.updated_at],
            ).map_err(|e| e.to_string())?;
            imported += 1;
        }
    }

    Ok(ImportResult { imported, skipped })
}