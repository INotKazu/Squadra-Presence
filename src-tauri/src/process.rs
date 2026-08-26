use serde::Serialize;
use std::env;
use sysinfo::System;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessStatus {
    pub running: bool,
    pub process_name: Option<String>,
}

fn normalize_hints(process_hints: Vec<String>) -> Vec<String> {
    let mut hints: Vec<String> = process_hints
        .into_iter()
        .map(|hint| hint.trim().to_lowercase())
        .filter(|hint| hint.len() >= 3 && hint.len() <= 80)
        .take(12)
        .collect();
    if hints.is_empty() {
        hints = vec!["gekishin".into(), "squadra".into(), "dbgs".into()];
    }
    hints
}

#[tauri::command(rename_all = "camelCase")]
pub fn detect_game_process(process_hints: Vec<String>) -> ProcessStatus {
    let hints = normalize_hints(process_hints);
    let own_executable = env::current_exe()
        .ok()
        .and_then(|path| path.file_name().map(|name| name.to_string_lossy().to_lowercase()));
    let system = System::new_all();

    for process in system.processes().values() {
        let process_name = process.name().to_string_lossy().to_string();
        let normalized_name = process_name.to_lowercase();
        if own_executable.as_deref() == Some(normalized_name.as_str()) {
            continue;
        }
        if normalized_name.contains("squadra-presence")
            || normalized_name.contains("squadra presence")
        {
            continue;
        }

        if hints.iter().any(|hint| normalized_name.contains(hint)) {
            return ProcessStatus {
                running: true,
                process_name: Some(process_name),
            };
        }
    }

    ProcessStatus {
        running: false,
        process_name: None,
    }
}
