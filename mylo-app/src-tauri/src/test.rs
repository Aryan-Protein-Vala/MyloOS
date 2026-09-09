use tauri::webview::WebviewWindowBuilder;
fn test(builder: WebviewWindowBuilder) {
    let _ = builder.autoplay_policy(tauri::webview::AutoplayPolicy::NoUserGestureRequired);
}
