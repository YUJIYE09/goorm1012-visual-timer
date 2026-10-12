// 릴리스 빌드에서 콘솔 창이 뜨지 않도록 설정
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("앱 실행 중 오류가 발생했습니다");
}
