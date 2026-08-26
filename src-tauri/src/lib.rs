mod discord;
mod app_updates;
mod process;
mod tracker;

use discord::{clear_discord_presence, discord_status, set_discord_presence, DiscordService};
use app_updates::{fetch_update, install_update};
use process::detect_game_process;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tracker::{fetch_build_guide, fetch_hero_abilities, fetch_tracker_profile};
use serde::Serialize;

#[derive(Serialize)]
struct LaunchContext {
    background: bool,
}

#[tauri::command]
fn launch_context() -> LaunchContext {
    LaunchContext {
        background: std::env::args().any(|argument| argument == "--background"),
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn set_launch_at_login(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    let is_enabled = manager.is_enabled().map_err(|error| error.to_string())?;
    if enabled && !is_enabled {
        manager.enable().map_err(|error| error.to_string())?;
    } else if !enabled && is_enabled {
        manager.disable().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--background"]),
        ))
        .manage(DiscordService::new())
        .setup(|app| {
            app_updates::initialize(app)?;
            let open_item = MenuItem::with_id(app, "open", "Open Squadra Presence", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("application icon").clone())
                .tooltip("Squadra Presence")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            if std::env::args().any(|argument| argument == "--background") {
                if let Some(window) = app.get_webview_window("main") {
                    window.hide()?;
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            fetch_tracker_profile,
            fetch_hero_abilities,
            fetch_build_guide,
            detect_game_process,
            set_discord_presence,
            clear_discord_presence,
            discord_status,
            set_launch_at_login,
            launch_context,
            fetch_update,
            install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running Squadra Presence");
}
