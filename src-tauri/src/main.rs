// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent}, menu::{Menu, MenuItem}};

#[tauri::command]
fn start_auto_apply(app: tauri::AppHandle, url: String) -> Result<(), String> {
    // Read content.js from the extension folder
    let content_script = include_str!("../../extension/content.js");

    // Add a small snippet to trigger auto apply immediately
    let auto_trigger = "\nsetTimeout(() => { window.postMessage({ action: 'TRIGGER_AUTO_APPLY', source: 'iphire-web', url: window.location.href }, '*'); }, 2000);";
    let combined_script = format!("{}\n{}", content_script, auto_trigger);

    // Create a new window for the job application
    let _window = WebviewWindowBuilder::new(&app, format!("apply-{}", url.len()), WebviewUrl::External(url.parse().unwrap()))
        .title("IpHire Auto-Apply")
        .initialization_script(&combined_script)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit IpHire", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_auto_apply])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
