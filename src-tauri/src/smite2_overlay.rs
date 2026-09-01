use serde::{Deserialize, Serialize};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{Arc, RwLock},
    thread,
    time::Duration,
};
use tauri::State;

const PORT: u16 = 47_622;
const HTML: &str = include_str!("smite2_overlay.html");

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Smite2OverlaySnapshot {
    enabled: bool,
    player_name: String,
    god_name: String,
    role: String,
    mode: String,
    wins: u32,
    losses: u32,
    kills: u32,
    deaths: u32,
    assists: u32,
    session_started_at: i64,
    updated_at: i64,
}

impl Default for Smite2OverlaySnapshot {
    fn default() -> Self {
        Self { enabled: false, player_name: "Player".into(), god_name: "Select a god".into(), role: "solo".into(), mode: "conquest".into(), wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, session_started_at: 0, updated_at: 0 }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Smite2OverlayStatus { running: bool, url: String, error: Option<String> }

pub struct Smite2OverlayService {
    snapshot: Arc<RwLock<Smite2OverlaySnapshot>>,
    status: Smite2OverlayStatus,
}

impl Smite2OverlayService {
    pub fn start() -> Self {
        let snapshot = Arc::new(RwLock::new(Smite2OverlaySnapshot::default()));
        let url = format!("http://127.0.0.1:{PORT}/overlay");
        match TcpListener::bind(("127.0.0.1", PORT)) {
            Ok(listener) => {
                let state = Arc::clone(&snapshot);
                thread::Builder::new().name("smite2-obs-overlay".into()).spawn(move || serve(listener, state)).expect("failed to start SMITE 2 overlay");
                Self { snapshot, status: Smite2OverlayStatus { running: true, url, error: None } }
            }
            Err(error) => Self { snapshot, status: Smite2OverlayStatus { running: false, url, error: Some(format!("SMITE 2 OBS port {PORT} is unavailable: {error}")) } },
        }
    }
}

fn serve(listener: TcpListener, snapshot: Arc<RwLock<Smite2OverlaySnapshot>>) {
    for connection in listener.incoming() {
        match connection { Ok(stream) => handle(stream, &snapshot), Err(_) => thread::sleep(Duration::from_millis(25)) }
    }
}

fn handle(mut stream: TcpStream, snapshot: &RwLock<Smite2OverlaySnapshot>) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let mut request = [0_u8; 4096];
    let Ok(read) = stream.read(&mut request) else { return };
    let first = String::from_utf8_lossy(&request[..read]).lines().next().unwrap_or("").to_string();
    let path = first.split_whitespace().nth(1).unwrap_or("/").split('?').next().unwrap_or("/");
    match path {
        "/" | "/overlay" => respond(&mut stream, "200 OK", "text/html; charset=utf-8", HTML.as_bytes()),
        "/api/state" => {
            let value = snapshot.read().map(|state| state.clone()).unwrap_or_default();
            respond(&mut stream, "200 OK", "application/json", &serde_json::to_vec(&value).unwrap_or_default());
        }
        "/health" => respond(&mut stream, "200 OK", "text/plain", b"ok"),
        _ => respond(&mut stream, "404 Not Found", "text/plain", b"Not found"),
    }
}

fn respond(stream: &mut TcpStream, status: &str, content_type: &str, body: &[u8]) {
    let header = format!("HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n", body.len());
    let _ = stream.write_all(header.as_bytes()); let _ = stream.write_all(body); let _ = stream.flush();
}

#[tauri::command]
pub fn smite2_overlay_status(service: State<'_, Smite2OverlayService>) -> Smite2OverlayStatus { service.status.clone() }

#[tauri::command]
pub fn update_smite2_overlay_state(service: State<'_, Smite2OverlayService>, snapshot: Smite2OverlaySnapshot) {
    if let Ok(mut current) = service.snapshot.write() { *current = snapshot; }
}
