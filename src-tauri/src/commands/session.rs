use serde::{Deserialize, Serialize};
use specta::Type;
use std::env;

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub image: Option<String>,
    pub email_verified: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub expires_at: String,
    pub token: String,
    pub created_at: String,
    pub updated_at: String,
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct SessionResponse {
    pub session: Session,
    pub user: User,
}

#[tauri::command]
#[specta::specta]
pub async fn get_session(token: String) -> Result<SessionResponse, String> {
    let api_url = env::var("API_URL").map_err(|e| format!("API_URL not set: {}", e))?;

    log::info!("Fetching session from: {}", api_url);

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(format!("{}/api/session", api_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("API request failed with status: {}", status));
    }

    let session_response = response
        .json::<SessionResponse>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(session_response)
}
