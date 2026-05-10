use once_cell::sync::Lazy;
use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// 全局数据库连接
pub static DB: Lazy<Mutex<Connection>> = Lazy::new(|| {
    let db_path = get_db_path();
    // 确保目录存在
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).expect("Failed to create database directory");
    }
    let conn = Connection::open(&db_path).expect("Failed to open database");
    // 启用 WAL 模式
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .expect("Failed to set PRAGMA");
    Mutex::new(conn)
});

/// 获取数据库文件路径
fn get_db_path() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot find home directory");
    home.join(".kv").join("data.sqlite")
}

/// 初始化数据库表结构
pub fn init_database() -> Result<(), String> {
    let conn = DB.lock().map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            is_private INTEGER NOT NULL DEFAULT 0,
            group_password TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS passwords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name TEXT NOT NULL,
            username TEXT NOT NULL,
            encrypted_password BLOB NOT NULL,
            iv BLOB NOT NULL,
            url TEXT,
            email TEXT,
            description TEXT,
            group_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_passwords_app_name ON passwords(app_name);
        ",
    )
    .map_err(|e| format!("Failed to initialize database: {}", e))?;

    // 迁移：添加 is_private 字段
    let _ = conn.execute("ALTER TABLE groups ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0", []);
    // 迁移：添加 group_password 字段
    let _ = conn.execute("ALTER TABLE groups ADD COLUMN group_password TEXT", []);

    Ok(())
}