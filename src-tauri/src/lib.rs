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

// --- n8n webhook call (bypasses WebView fetch timeout) ---

#[tauri::command]
async fn send_n8n_webhook(
    webhook_url: String,
    session_id: String,
    produit: String,
    client_name: String,
    cdv_pdf: Vec<u8>,
    fiche_pdf: Vec<u8>,
    auth_type: String,
    auth_value: String,
) -> Result<FetchTokenResult, String> {
    log::info!(
        "[n8n] POST to {} (session={}, cdv={}B, fiche={}B)",
        webhook_url,
        session_id,
        cdv_pdf.len(),
        fiche_pdf.len()
    );

    let cdv_part = reqwest::multipart::Part::bytes(cdv_pdf)
        .file_name("cdv.pdf")
        .mime_str("application/pdf")
        .map_err(|e| e.to_string())?;
    let fiche_part = reqwest::multipart::Part::bytes(fiche_pdf)
        .file_name("fiche_lot.pdf")
        .mime_str("application/pdf")
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new()
        .text("sessionId", session_id)
        .text("produit", produit)
        .text("client", client_name)
        .part("cdvPdf", cdv_part)
        .part("ficheLotPdf", fiche_part);

    let client = reqwest::Client::new(); // No timeout — wait for n8n to finish
    let mut request = client.post(&webhook_url).multipart(form);

    match auth_type.as_str() {
        "apiKey" if !auth_value.is_empty() => {
            request = request.header("X-API-Key", &auth_value);
        }
        "bearer" if !auth_value.is_empty() => {
            request = request.header("Authorization", format!("Bearer {}", auth_value));
        }
        _ => {}
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    log::info!("[n8n] Response status={}, body_len={}", status, body.len());
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
            fabric_graphql_query,
            send_n8n_webhook
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
