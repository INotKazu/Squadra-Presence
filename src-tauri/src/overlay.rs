use serde::{Deserialize, Serialize};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{Arc, RwLock},
    thread,
    time::Duration,
};
use tauri::State;

const OVERLAY_PORT: u16 = 47_612;
const OVERLAY_HTML: &str = include_str!("overlay.html");

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySnapshot {
    enabled: bool,
    nickname: String,
    character_name: String,
    role: String,
    rank: String,
    rank_score: Option<i64>,
    rank_floor: Option<i64>,
    rank_ceiling: Option<i64>,
    rank_progress: f64,
    next_rank: Option<String>,
    wins: u32,
    losses: u32,
    rp_delta: i64,
    session_started_at: i64,
    updated_at: i64,
}

impl Default for OverlaySnapshot {
    fn default() -> Self {
        Self {
            enabled: false,
            nickname: "Player".into(),
            character_name: "Bardock".into(),
            role: "tank".into(),
            rank: "C3".into(),
            rank_score: None,
            rank_floor: None,
            rank_ceiling: None,
            rank_progress: 0.0,
            next_rank: None,
            wins: 0,
            losses: 0,
            rp_delta: 0,
            session_started_at: 0,
            updated_at: 0,
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayServerStatus {
    running: bool,
    url: String,
    error: Option<String>,
}

#[derive(Default)]
struct OverlayAssets {
    character: Option<Vec<u8>>,
    rank: Option<Vec<u8>>,
    revision: u64,
}

struct OverlayShared {
    snapshot: RwLock<OverlaySnapshot>,
    assets: RwLock<OverlayAssets>,
}

pub struct OverlayService {
    shared: Arc<OverlayShared>,
    status: OverlayServerStatus,
}

impl OverlayService {
    pub fn start() -> Self {
        let shared = Arc::new(OverlayShared {
            snapshot: RwLock::new(OverlaySnapshot::default()),
            assets: RwLock::new(OverlayAssets::default()),
        });
        let url = format!("http://127.0.0.1:{OVERLAY_PORT}/overlay");

        match TcpListener::bind(("127.0.0.1", OVERLAY_PORT)) {
            Ok(listener) => {
                let server_state = Arc::clone(&shared);
                thread::Builder::new()
                    .name("squadra-obs-overlay".into())
                    .spawn(move || serve(listener, server_state))
                    .expect("failed to start overlay server thread");
                Self {
                    shared,
                    status: OverlayServerStatus { running: true, url, error: None },
                }
            }
            Err(error) => Self {
                shared,
                status: OverlayServerStatus {
                    running: false,
                    url,
                    error: Some(format!("OBS overlay port {OVERLAY_PORT} is unavailable: {error}")),
                },
            },
        }
    }
}

fn serve(listener: TcpListener, shared: Arc<OverlayShared>) {
    for connection in listener.incoming() {
        match connection {
            Ok(stream) => handle_connection(stream, &shared),
            Err(_) => thread::sleep(Duration::from_millis(25)),
        }
    }
}

fn handle_connection(mut stream: TcpStream, shared: &OverlayShared) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
    let mut request = [0_u8; 8_192];
    let Ok(read) = stream.read(&mut request) else { return };
    if read == 0 { return; }
    let request = String::from_utf8_lossy(&request[..read]);
    let Some(first_line) = request.lines().next() else { return };
    let mut parts = first_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("/").split('?').next().unwrap_or("/");

    if method == "OPTIONS" {
        write_response(&mut stream, "204 No Content", "text/plain", &[], "no-store");
        return;
    }
    if method != "GET" {
        write_response(&mut stream, "405 Method Not Allowed", "text/plain", b"Method not allowed", "no-store");
        return;
    }

    match path {
        "/" | "/overlay" => write_response(
            &mut stream,
            "200 OK",
            "text/html; charset=utf-8",
            OVERLAY_HTML.as_bytes(),
            "no-store",
        ),
        "/api/state" => {
            let snapshot = shared.snapshot.read().map(|value| value.clone()).unwrap_or_default();
            let revision = shared.assets.read().map(|value| value.revision).unwrap_or_default();
            let mut value = serde_json::to_value(snapshot).unwrap_or_default();
            if let Some(object) = value.as_object_mut() {
                object.insert("assetRevision".into(), revision.into());
            }
            let body = serde_json::to_vec(&value).unwrap_or_else(|_| b"{}".to_vec());
            write_response(&mut stream, "200 OK", "application/json", &body, "no-store");
        }
        "/assets/character.png" => write_asset(&mut stream, shared, true),
        "/assets/rank.png" => write_asset(&mut stream, shared, false),
        "/health" => write_response(&mut stream, "200 OK", "text/plain", b"ok", "no-store"),
        _ => write_response(&mut stream, "404 Not Found", "text/plain", b"Not found", "no-store"),
    }
}

fn write_asset(stream: &mut TcpStream, shared: &OverlayShared, character: bool) {
    let bytes = shared.assets.read().ok().and_then(|assets| {
        if character { assets.character.clone() } else { assets.rank.clone() }
    });
    match bytes {
        Some(bytes) => write_response(stream, "200 OK", "image/png", &bytes, "no-cache"),
        None => write_response(stream, "404 Not Found", "text/plain", b"Artwork unavailable", "no-store"),
    }
}

fn write_response(stream: &mut TcpStream, status: &str, content_type: &str, body: &[u8], cache_control: &str) {
    let header = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: {cache_control}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(header.as_bytes());
    let _ = stream.write_all(body);
    let _ = stream.flush();
}

#[tauri::command]
pub fn overlay_status(service: State<'_, OverlayService>) -> OverlayServerStatus {
    service.status.clone()
}

#[tauri::command]
pub fn update_overlay_state(service: State<'_, OverlayService>, snapshot: OverlaySnapshot) {
    if let Ok(mut current) = service.shared.snapshot.write() {
        *current = snapshot;
    }
}

#[tauri::command]
pub fn update_overlay_assets(
    service: State<'_, OverlayService>,
    character_image: Option<Vec<u8>>,
    rank_image: Option<Vec<u8>>,
    revision: u64,
) {
    if let Ok(mut assets) = service.shared.assets.write() {
        assets.character = character_image;
        assets.rank = rank_image;
        assets.revision = revision;
    }
}
