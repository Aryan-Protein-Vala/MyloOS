pub fn test<R: tauri::Runtime, M: tauri::Manager<R>>(builder: tauri::WebviewWindowBuilder<'_, R, M>) -> tauri::WebviewWindowBuilder<'_, R, M> {
    builder
}
