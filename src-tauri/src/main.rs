// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent}, menu::{Menu, MenuItem}};

// Shared handle to the spawned Next.js server process
type ServerProcess = Arc<Mutex<Option<std::process::Child>>>;

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

fn spawn_nextjs_server(app: &tauri::App) -> Option<std::process::Child> {
    // Resolve the path to the bundled standalone server
    let resource_path = app
        .path()
        .resource_dir()
        .ok()?
        .join("standalone")
        .join("server.js");

    if !resource_path.exists() {
        eprintln!("[IpHire] standalone/server.js not found at {:?} — skipping sidecar (dev mode?)", resource_path);
        return None;
    }

    eprintln!("[IpHire] Starting Next.js server at {:?}", resource_path);

    // Spawn: node standalone/server.js on port 3001
    let child = std::process::Command::new("node")
        .arg(&resource_path)
        .env("PORT", "3001")
        .env("HOSTNAME", "127.0.0.1")
        .spawn()
        .map_err(|e| eprintln!("[IpHire] Failed to spawn Next.js server: {}", e))
        .ok()?;

    Some(child)
}

fn main() {
    let server_process: ServerProcess = Arc::new(Mutex::new(None));
    let server_process_clone = server_process.clone();

    tauri::Builder::default()
        .setup(move |app| {
            use std::net::ToSocketAddrs;
            
            // Check if Vercel is reachable
            let vercel_url = "https://iphire.vercel.app";
            let is_online = if let Ok(mut addrs) = "iphire.vercel.app:443".to_socket_addrs() {
                if let Some(addr) = addrs.next() {
                    std::net::TcpStream::connect_timeout(&addr, std::time::Duration::from_secs(3)).is_ok()
                } else {
                    false
                }
            } else {
                false
            };

            let target_url = if is_online {
                eprintln!("[IpHire] Vercel is reachable, loading {}", vercel_url);
                vercel_url.to_string()
            } else {
                eprintln!("[IpHire] Vercel unreachable, falling back to localhost sidecar");
                // Spawn the Next.js sidecar server (production only)
                let child = spawn_nextjs_server(app);
                *server_process.lock().unwrap() = child;
                "http://localhost:3001".to_string()
            };

            // Create the main window manually
            let _main_window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::External(target_url.parse().unwrap()),
            )
            .title("IpHire AI - Career Operating System")
            .inner_size(1280.0, 800.0)
            .resizable(true)
            .build()?;

            // Set up system tray
            let quit_i = MenuItem::with_id(app, "quit", "Quit IpHire", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            // Load the tray icon image from bundled resources
            let icon = app.default_window_icon().cloned();

            let mut tray_builder = TrayIconBuilder::new()
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
                });

            if let Some(img) = icon {
                tray_builder = tray_builder.icon(img);
            }

            let _tray = tray_builder.build(app)?;
            Ok(())
        })
        .on_window_event(move |_window, event| {
            // Kill the Next.js server when the app closes
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut guard) = server_process_clone.lock() {
                    if let Some(ref mut child) = *guard {
                        let _ = child.kill();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![start_auto_apply])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

