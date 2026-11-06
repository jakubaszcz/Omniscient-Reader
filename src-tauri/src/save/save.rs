use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};

const QUALIFIER: &str = "com";
const ORGANISATION: &str = "omniscient-reader";
const APPLICATION: &str = "omniscient-reader";

#[derive(Serialize, Deserialize)]
pub struct Save {
    pub chapter: i32,
    
    #[serde(default)]
    pub paragraph_id: Option<String>,
}

pub fn _path() -> Option<ProjectDirs> {
    ProjectDirs::from(
        QUALIFIER,
        ORGANISATION,
        APPLICATION,
    )
}

#[tauri::command]
pub fn save(content: Save) -> Result<(), String> {
    let directory = _path().unwrap().data_dir().to_path_buf();

    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;

    let json = serde_json::to_string_pretty(&content).map_err(|e| e.to_string())?;

    fs::write(directory.join("omniscient-reader-save.json"), json).map_err(|e| e.to_string())
}

#[tauri::command]

pub fn load() -> Result<Option<Save>, String>{
    let directory = _path().unwrap().data_dir().join("omniscient-reader-save.json");

    match fs::read_to_string(directory) {
        Ok(content) => serde_json::from_str::<Save>(&content).map(Some).map_err(|e| e.to_string()),

        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),

        Err(error) => Err(error.to_string())
    }

}