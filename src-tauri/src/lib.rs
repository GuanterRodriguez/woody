use tauri::{webview::NewWindowResponse, WebviewUrl, WebviewWindowBuilder};

// --- Entra ID token fetch (bypasses browser Origin header) ---

#[derive(serde::Serialize)]
struct FetchTokenResult {
    status: u16,
    body: String,
}

#[tauri::command]
async fn fetch_entra_token(
    tenant_id: String,
    client_id: String,
    client_secret: String,
    scope: String,
) -> Result<FetchTokenResult, String> {
    let token_url = format!(
        "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
        tenant_id.trim()
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&token_url)
        .form(&[
            ("grant_type", "client_credentials"),
            ("client_id", client_id.trim()),
            ("client_secret", client_secret.trim()),
            ("scope", scope.trim()),
        ])
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    Ok(FetchTokenResult { status, body })
}

// --- Fabric REST API call ---

#[tauri::command]
async fn fabric_rest_get(url: String, token: String) -> Result<FetchTokenResult, String> {
    log::info!("[Fabric REST] GET {}", url);
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    log::info!("[Fabric REST] Response status={}", status);
    Ok(FetchTokenResult { status, body })
}

// --- Fabric GraphQL query (POST) ---

#[tauri::command]
async fn fabric_graphql_query(
    url: String,
    token: String,
    query: String,
) -> Result<FetchTokenResult, String> {
    log::info!("[Fabric GraphQL] POST to {}", url);
    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(query)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    log::info!("[Fabric GraphQL] Response status={}", status);
    Ok(FetchTokenResult { status, body })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            fetch_entra_token,
            fabric_rest_get,
            fabric_graphql_query
        ])
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let main_window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            )
            .title("Woody")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .resizable(true)
            .center()
            .on_new_window(move |_url, _features| NewWindowResponse::Allow)
            .build()?;

            let _ = main_window;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
