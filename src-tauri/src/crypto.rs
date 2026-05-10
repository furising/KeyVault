use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use once_cell::sync::Lazy;
use rand::RngCore;
use ring::pbkdf2;
use std::num::NonZeroU32;
use std::sync::Mutex;

/// 加密结果
pub struct EncryptResult {
    pub encrypted: Vec<u8>,
    pub iv: Vec<u8>,
}

/// 缓存的加密密钥（32 字节）
static CACHED_KEY: Lazy<Mutex<Option<Vec<u8>>>> = Lazy::new(|| Mutex::new(None));

/// PBKDF2 迭代次数 - 与原 Electrobun 版本保持一致
const PBKDF2_ITERATIONS: u32 = 600_000;

/// 从主密码派生 AES-256 密钥 (使用 ring，底层 BoringSSL C/ASM 实现)
pub fn derive_key(master_password: &str, salt: &str) -> Vec<u8> {
    let salt_bytes = BASE64.decode(salt).unwrap_or_default();
    let mut key = vec![0u8; 32];
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        NonZeroU32::new(PBKDF2_ITERATIONS).unwrap(),
        &salt_bytes,
        master_password.as_bytes(),
        &mut key,
    );
    key
}

/// 派生密钥并缓存
pub fn derive_and_cache_key(master_password: &str, salt: &str) -> Vec<u8> {
    let key = derive_key(master_password, salt);
    let mut cached = CACHED_KEY.lock().unwrap();
    *cached = Some(key.clone());
    key
}

/// 获取缓存的密钥
pub fn get_cached_key() -> Option<Vec<u8>> {
    let cached = CACHED_KEY.lock().unwrap();
    cached.clone()
}

/// 清除缓存密钥
#[allow(dead_code)]
pub fn clear_cached_key() {
    let mut cached = CACHED_KEY.lock().unwrap();
    *cached = None;
}

/// AES-256-GCM 加密
pub fn encrypt(plain_text: &str, key: &[u8]) -> Result<EncryptResult, String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;
    let mut iv = vec![0u8; 12];
    OsRng.fill_bytes(&mut iv);
    let nonce = Nonce::from_slice(&iv);
    let encrypted = cipher
        .encrypt(nonce, plain_text.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    Ok(EncryptResult { encrypted, iv })
}

/// AES-256-GCM 解密
pub fn decrypt(encrypted: &[u8], iv: &[u8], key: &[u8]) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;
    let nonce = Nonce::from_slice(iv);
    let decrypted = cipher
        .decrypt(nonce, encrypted)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    String::from_utf8(decrypted).map_err(|e| format!("UTF-8 decode failed: {}", e))
}

/// 生成随机盐值（16字节，Base64 编码）
pub fn generate_salt() -> String {
    let mut salt = vec![0u8; 16];
    OsRng.fill_bytes(&mut salt);
    BASE64.encode(&salt)
}

/// 对密码进行哈希（PBKDF2-SHA256，用于验证）
#[allow(dead_code)]
pub fn hash_password(password: &str, salt: &str) -> String {
    let salt_bytes = BASE64.decode(salt).unwrap_or_default();
    let mut hash = vec![0u8; 32];
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        NonZeroU32::new(PBKDF2_ITERATIONS).unwrap(),
        &salt_bytes,
        password.as_bytes(),
        &mut hash,
    );
    BASE64.encode(&hash)
}