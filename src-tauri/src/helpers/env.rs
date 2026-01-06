use once_cell::sync::Lazy;

pub struct Environment {
    pub api_url: String,
    pub openai_api_key: String,
}

impl Environment {
    pub fn new() -> Self {
        let api_url = option_env!("API_URL")
            .map(|s| s.to_string())
            .or_else(|| dotenv::var("API_URL").ok())
            .unwrap_or_default();
        let openai_api_key = option_env!("OPENAI_API_KEY")
            .map(|s| s.to_string())
            .or_else(|| dotenv::var("OPENAI_API_KEY").ok())
            .unwrap_or_default();

        Self {
            api_url,
            openai_api_key,
        }
    }
}

pub static ENV: Lazy<Environment> = Lazy::new(|| Environment::new());
