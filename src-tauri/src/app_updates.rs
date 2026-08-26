use serde::Serialize;
use std::sync::Mutex;
use tauri::{ipc::Channel, AppHandle, Manager, State};
use tauri_plugin_updater::{Update, UpdaterExt};

const UPDATE_ENDPOINT: &str = "https://github.com/INotKazu/Squadra-Presence/releases/latest/download/latest.json";
const UPDATE_PUBLIC_KEY: &str = include_str!("../updater_public_key.txt");

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Updater(#[from] tauri_plugin_updater::Error),
    #[error(transparent)]
    Url(#[from] url::ParseError),
    #[error("there is no pending update; check again first")]
    NoPendingUpdate,
    #[error("automatic updates are not configured yet; run Setup-Updater.ps1 before the first release build")]
    NotConfigured,
    #[error("the update state could not be accessed")]
    State,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

type Result<T> = std::result::Result<T, Error>;

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum DownloadEvent {
    #[serde(rename_all = "camelCase")]
    Started { content_length: Option<u64> },
    #[serde(rename_all = "camelCase")]
    Progress { chunk_length: usize },
    Finished,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMetadata {
    version: String,
    current_version: String,
    notes: Option<String>,
    date: Option<String>,
}

pub struct PendingUpdate(pub Mutex<Option<Update>>);

#[tauri::command]
pub async fn fetch_update(
    app: AppHandle,
    pending_update: State<'_, PendingUpdate>,
) -> Result<Option<UpdateMetadata>> {
    let public_key = UPDATE_PUBLIC_KEY.trim();
    if public_key.is_empty() || public_key.starts_with("UNCONFIGURED") {
        return Err(Error::NotConfigured);
    }
    let endpoint = url::Url::parse(UPDATE_ENDPOINT)?;
    let update = app
        .updater_builder()
        .endpoints(vec![endpoint])?
        .pubkey(public_key)
        .build()?
        .check()
        .await?;
    let metadata = update.as_ref().map(|value| UpdateMetadata {
        version: value.version.clone(),
        current_version: value.current_version.clone(),
        notes: value.body.clone(),
        date: value.date.as_ref().map(ToString::to_string),
    });
    *pending_update.0.lock().map_err(|_| Error::State)? = update;
    Ok(metadata)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn install_update(
    app: AppHandle,
    pending_update: State<'_, PendingUpdate>,
    on_event: Channel<DownloadEvent>,
) -> Result<()> {
    let update = pending_update
        .0
        .lock()
        .map_err(|_| Error::State)?
        .take()
        .ok_or(Error::NoPendingUpdate)?;
    let mut started = false;
    update
        .download_and_install(
            |chunk_length, content_length| {
                if !started {
                    let _ = on_event.send(DownloadEvent::Started { content_length });
                    started = true;
                }
                let _ = on_event.send(DownloadEvent::Progress { chunk_length });
            },
            || {
                let _ = on_event.send(DownloadEvent::Finished);
            },
        )
        .await?;
    app.restart();
}

pub fn initialize(app: &tauri::App) -> tauri::Result<()> {
    app.handle()
        .plugin(tauri_plugin_updater::Builder::new().build())?;
    app.manage(PendingUpdate(Mutex::new(None)));
    Ok(())
}

