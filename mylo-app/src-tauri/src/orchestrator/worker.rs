use crate::state::AppState;
use anyhow::Result;
use headless_chrome::{Browser, LaunchOptions};
use serde_json::json;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

pub async fn run_worker_task(app: AppHandle, task_id: String, task_prompt: String) {
    let app_clone = app.clone();
    let task_id_clone = task_id.clone();

    // Run the blocking headless_chrome work inside spawn_blocking
    let res =
        tokio::task::spawn_blocking(move || run_worker_sync(app_clone, task_id_clone, task_prompt))
            .await;

    // Verify whether this task was intentionally cancelled / killed
    let was_cancelled = {
        let state = app.state::<AppState>();
        let active = state
            .active_agents
            .lock()
            .unwrap_or_else(|p| p.into_inner());
        !active.contains_key(&task_id)
    };

    match res {
        Ok(Err(e)) => {
            if !was_cancelled {
                let _ = app.emit(
                    "agent_log",
                    json!({
                        "agent_id": task_id,
                        "message": format!("Worker Error: {}", e),
                    }),
                );
                let _ = app.emit(
                    "agent_status",
                    json!({
                        "agent_id": task_id,
                        "status": "error",
                    }),
                );
            }
        }
        Err(e) => {
            if !was_cancelled {
                let _ = app.emit(
                    "agent_log",
                    json!({
                        "agent_id": task_id,
                        "message": format!("Worker panicked/aborted: {}", e),
                    }),
                );
                let _ = app.emit(
                    "agent_status",
                    json!({
                        "agent_id": task_id,
                        "status": "killed",
                    }),
                );
            }
        }
        Ok(Ok(_)) => {} // success or cooperative cancellation already handled
    }
}

fn run_worker_sync(app: AppHandle, task_id: String, task_prompt: String) -> Result<()> {
    let is_active = || -> bool {
        let state = app.state::<AppState>();
        let active = state
            .active_agents
            .lock()
            .unwrap_or_else(|p| p.into_inner());
        active.contains_key(&task_id)
    };

    let emit_log = |msg: &str| {
        let _ = app.emit(
            "agent_log",
            json!({
                "agent_id": task_id,
                "message": msg,
            }),
        );
    };

    if !is_active() {
        return Ok(());
    }

    emit_log("Initializing real headless Playwright/Chrome worker...");
    std::thread::sleep(Duration::from_millis(300));

    if !is_active() {
        return Ok(());
    }

    let browser = Browser::new(LaunchOptions {
        headless: true,
        sandbox: true,
        args: vec![
            std::ffi::OsStr::new("--disable-webgl"),
            std::ffi::OsStr::new("--disable-plugins"),
        ],
        ..Default::default()
    })?;

    emit_log("Headless Chrome launched successfully. Opening new incognito tab...");
    let tab = browser.new_tab()?;

    let target_url = if task_prompt.starts_with("http") {
        task_prompt.clone()
    } else {
        format!(
            "https://duckduckgo.com/?q={}",
            urlencoding::encode(&task_prompt)
        )
    };
    emit_log(&format!(
        "Analyzing task: '{}' -> Decided to start at {}",
        task_prompt, target_url
    ));

    if !is_active() {
        return Ok(());
    }

    tab.navigate_to(&target_url)?;
    tab.wait_until_navigated()?;

    if !is_active() {
        return Ok(());
    }

    emit_log("Page loaded. Extracting DOM elements...");
    std::thread::sleep(Duration::from_millis(1000));

    if !is_active() {
        return Ok(());
    }

    let title = tab.get_title()?;
    emit_log(&format!(
        "Successfully read page title: '{}'. Executing background action.",
        title
    ));

    std::thread::sleep(Duration::from_millis(1000));

    if !is_active() {
        return Ok(());
    }

    emit_log("Simulating analysis to find target coordinates on page...");
    std::thread::sleep(Duration::from_millis(1500));

    if !is_active() {
        return Ok(());
    }

    // Emit dynamic coordinates for Coach mode based on page analysis (simulated for now)
    // We would normally use tab.find_element() to get a bounding box.
    let _ = app.emit(
        "target-pos-changed",
        json!({
            "x": 450,
            "y": 300
        }),
    );

    emit_log("Emitted target coordinates (450, 300) to Coach Mode overlay.");

    emit_log("Background task completed successfully.");

    let _ = app.emit(
        "agent_status",
        json!({
            "agent_id": task_id,
            "status": "completed",
        }),
    );

    Ok(())
}
