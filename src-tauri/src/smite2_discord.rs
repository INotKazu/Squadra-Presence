use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::Deserialize;
use std::sync::mpsc::{self, Sender};
use std::thread;

const APPLICATION_ID: Option<&str> = option_env!("SMITE2_DISCORD_APPLICATION_ID");

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Smite2PresencePayload {
    details: String,
    state: String,
    large_image_key: String,
    large_image_text: String,
    small_image_key: Option<String>,
    small_image_text: Option<String>,
    start_timestamp: i64,
}

enum Command { Update(Smite2PresencePayload), Clear, Shutdown }

pub struct Smite2DiscordService { sender: Sender<Command> }

impl Smite2DiscordService {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel();
        thread::Builder::new().name("smite2-discord-presence".into()).spawn(move || {
            let mut client: Option<DiscordIpcClient> = None;
            while let Ok(command) = receiver.recv() {
                match command {
                    Command::Update(payload) => { let _ = update_with_reconnect(&mut client, &payload); }
                    Command::Clear => if let Some(current) = client.as_mut() { let _ = current.clear_activity(); },
                    Command::Shutdown => {
                        if let Some(current) = client.as_mut() { let _ = current.clear_activity(); let _ = current.close(); }
                        break;
                    }
                }
            }
        }).expect("failed to start SMITE 2 Discord worker");
        Self { sender }
    }

    fn update(&self, payload: Smite2PresencePayload) -> Result<(), String> {
        if APPLICATION_ID.is_none() {
            return Err("Set SMITE2_DISCORD_APPLICATION_ID when building after the dedicated Discord app is created.".into());
        }
        self.sender.send(Command::Update(payload)).map_err(|_| "SMITE 2 Discord worker stopped.".into())
    }

    fn clear(&self) -> Result<(), String> {
        self.sender.send(Command::Clear).map_err(|_| "SMITE 2 Discord worker stopped.".into())
    }
}

impl Drop for Smite2DiscordService {
    fn drop(&mut self) { let _ = self.sender.send(Command::Shutdown); }
}

fn activity_from(payload: &Smite2PresencePayload) -> activity::Activity<'static> {
    let mut assets = activity::Assets::new()
        .large_image(payload.large_image_key.clone())
        .large_text(payload.large_image_text.clone());
    if let Some(value) = payload.small_image_key.clone() { assets = assets.small_image(value); }
    if let Some(value) = payload.small_image_text.clone() { assets = assets.small_text(value); }
    activity::Activity::new()
        .details(payload.details.clone())
        .state(payload.state.clone())
        .assets(assets)
        .timestamps(activity::Timestamps::new().start(payload.start_timestamp))
}

fn connect() -> Result<DiscordIpcClient, String> {
    let app_id = APPLICATION_ID.ok_or_else(|| "Dedicated SMITE 2 Discord application ID is not configured.".to_string())?;
    let mut client = DiscordIpcClient::new(app_id);
    client.connect().map_err(|error| format!("Open Discord and try again: {error}"))?;
    Ok(client)
}

fn update_with_reconnect(client: &mut Option<DiscordIpcClient>, payload: &Smite2PresencePayload) -> Result<(), String> {
    if client.is_none() { *client = Some(connect()?); }
    if client.as_mut().expect("client exists").set_activity(activity_from(payload)).is_ok() { return Ok(()); }
    if let Some(current) = client.as_mut() { let _ = current.close(); }
    *client = Some(connect()?);
    client.as_mut().expect("client exists").set_activity(activity_from(payload))
        .map_err(|error| format!("Discord rejected the SMITE 2 presence: {error}"))
}

#[tauri::command]
pub fn set_smite2_discord_presence(service: tauri::State<'_, Smite2DiscordService>, payload: Smite2PresencePayload) -> Result<(), String> {
    service.update(payload)
}

#[tauri::command]
pub fn clear_smite2_discord_presence(service: tauri::State<'_, Smite2DiscordService>) -> Result<(), String> {
    service.clear()
}
