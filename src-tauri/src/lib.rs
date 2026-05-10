mod commands;
mod crypto;
mod db;

use commands::{auth, backup, groups, passwords, settings};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            // 初始化数据库
            db::init_database().expect("Failed to initialize database");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 认证
            auth::get_auth_status,
            auth::setup_master_password,
            auth::verify_master_password,
            auth::change_master_password,
            // 分组
            groups::get_all_groups,
            groups::create_group,
            groups::update_group,
            groups::delete_group,
            groups::verify_group_password,
            groups::has_group_password,
            groups::get_group_password,
            // 密码
            passwords::get_all_passwords,
            passwords::get_password_by_id,
            passwords::create_password,
            passwords::update_password,
            passwords::delete_password,
            passwords::delete_ungrouped_passwords,
            // 备份
            backup::export_data,
            backup::import_data,
            // 设置
            settings::get_setting,
            settings::set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}