use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::{Deserialize, Serialize};
use std::sync::{
    mpsc::{self, Sender},
    Arc, Mutex,
};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

const DISCORD_APPLICATION_ID: &str = "1541227940354859099";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresencePayload {
    pub details: String,
    pub state: String,
    pub large_image_key: Option<String>,
    pub large_image_text: Option<String>,
    pub small_image_key: Option<String>,
    pub small_image_text: Option<String>,
    pub start_timestamp: Option<i64>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscordStatus {
    pub connected: bool,
    pub last_error: Option<String>,
    pub updated_at: Option<u64>,
}

enum DiscordCommand {
    Update(PresencePayload),
    Clear,
    Shutdown,
}

pub struct DiscordService {
    sender: Sender<DiscordCommand>,
    status: Arc<Mutex<DiscordStatus>>,
}

impl DiscordService {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel();
        let status = Arc::new(Mutex::new(DiscordStatus::default()));
        let worker_status = Arc::clone(&status);

        thread::spawn(move || {
            let mut client: Option<DiscordIpcClient> = None;
            while let Ok(command) = receiver.recv() {
                match command {
                    DiscordCommand::Update(payload) => {
                        let result = set_activity_with_reconnect(&mut client, &payload);
                        update_status(&worker_status, result);
                    }
                    DiscordCommand::Clear => {
                        let result = if let Some(current) = client.as_mut() {
                            current.clear_activity().map_err(|error| error.to_string())
                        } else {
                            Ok(())
                        };
                        update_cleared_status(&worker_status, result);
                    }
                    DiscordCommand::Shutdown => {
                        if let Some(current) = client.as_mut() {
                            let _ = current.clear_activity();
                            let _ = current.close();
                        }
                        break;
                    }
                }
            }
        });

        Self { sender, status }
    }

    pub fn update(&self, payload: PresencePayload) -> Result<(), String> {
        self.sender
            .send(DiscordCommand::Update(payload))
            .map_err(|_| "Discord presence worker stopped unexpectedly.".to_string())
    }

    pub fn clear(&self) -> Result<(), String> {
        self.sender
            .send(DiscordCommand::Clear)
            .map_err(|_| "Discord presence worker stopped unexpectedly.".to_string())
    }

    pub fn status(&self) -> DiscordStatus {
        self.status.lock().map(|status| status.clone()).unwrap_or_else(|_| DiscordStatus {
            connected: false,
            last_error: Some("Discord status lock was interrupted.".into()),
            updated_at: None,
        })
    }
}

impl Drop for DiscordService {
    fn drop(&mut self) {
        let _ = self.sender.send(DiscordCommand::Shutdown);
    }
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn update_status(status: &Arc<Mutex<DiscordStatus>>, result: Result<(), String>) {
    if let Ok(mut current) = status.lock() {
        match result {
            Ok(()) => {
                current.connected = true;
                current.last_error = None;
                current.updated_at = Some(now_unix());
            }
            Err(error) => {
                current.connected = false;
                current.last_error = Some(error);
                current.updated_at = Some(now_unix());
            }
        }
    }
}

fn update_cleared_status(status: &Arc<Mutex<DiscordStatus>>, result: Result<(), String>) {
    if let Ok(mut current) = status.lock() {
        current.connected = false;
        current.updated_at = Some(now_unix());
        current.last_error = result.err();
    }
}

fn build_activity(payload: &PresencePayload) -> activity::Activity<'static> {
    let mut assets = activity::Assets::new();
    if let Some(value) = payload.large_image_key.clone() {
        assets = assets.large_image(value);
    }
    if let Some(value) = payload.large_image_text.clone() {
        assets = assets.large_text(value);
    }
    if let Some(value) = payload.small_image_key.clone() {
        assets = assets.small_image(value);
    }
    if let Some(value) = payload.small_image_text.clone() {
        assets = assets.small_text(value);
    }

    let mut result = activity::Activity::new()
        .details(payload.details.clone())
        .state(payload.state.clone())
        .assets(assets);
    if let Some(start) = payload.start_timestamp {
        result = result.timestamps(activity::Timestamps::new().start(start));
    }
    result
}

fn connect_new() -> Result<DiscordIpcClient, String> {
    let mut client = DiscordIpcClient::new(DISCORD_APPLICATION_ID);
    client
        .connect()
        .map_err(|error| format!("Open the Discord desktop app and try again: {error}"))?;
    Ok(client)
}

fn set_activity_with_reconnect(
    client: &mut Option<DiscordIpcClient>,
    payload: &PresencePayload,
) -> Result<(), String> {
    if client.is_none() {
        *client = Some(connect_new()?);
    }

    let first_result = client
        .as_mut()
        .expect("client is initialized")
        .set_activity(build_activity(payload));
    if first_result.is_ok() {
        return Ok(());
    }

    if let Some(current) = client.as_mut() {
        let _ = current.close();
    }
    *client = Some(connect_new()?);
    client
        .as_mut()
        .expect("client is reinitialized")
        .set_activity(build_activity(payload))
        .map_err(|error| format!("Discord rejected the presence update: {error}"))
}

#[tauri::command]
pub fn set_discord_presence(
    service: tauri::State<'_, DiscordService>,
    payload: PresencePayload,
) -> Result<(), String> {
    service.update(payload)
}

#[tauri::command]
pub fn clear_discord_presence(service: tauri::State<'_, DiscordService>) -> Result<(), String> {
    service.clear()
}

#[tauri::command]
pub fn discord_status(service: tauri::State<'_, DiscordService>) -> DiscordStatus {
    service.status()
}
