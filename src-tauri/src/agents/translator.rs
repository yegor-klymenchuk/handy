use anyhow::Result;
use log::{debug, info};
use rig::completion::Prompt;
use rig::providers::openai::Client;

/// Translator using Rig's Completion
pub struct Translator {
    client: Client,
    model: String,
}

impl Translator {
    /// Create a new translator
    pub fn new(client: Client) -> Self {
        Self {
            client,
            model: "gpt-4o-mini".to_string(),
        }
    }

    /// Translate text to target language
    pub async fn translate(&self, content: &str, target_language: &str) -> Result<String> {
        if content.trim().is_empty() {
            debug!("Empty content, returning as-is");
            return Ok(content.to_string());
        }

        debug!("Translating to {}: {}", target_language, content);

        let system_prompt = format!(
            r#"You are a professional translator. Translate the given text to {}.

Guidelines:
- Preserve original formatting and structure
- Maintain original tone and style
- Keep meaning accurate
- Use natural, native-sounding language
- Return ONLY the translation, no explanations
- If the text is already in {}, return it unchanged."#,
            target_language, target_language
        );

        let agent = self
            .client
            .agent(&self.model)
            .preamble(&system_prompt)
            .temperature(0.2) // Low temperature for accuracy
            .build();

        let prompt = format!("Translate this text:\n\n{}", content);

        let response = agent
            .prompt(&prompt)
            .await
            .map_err(|e| anyhow::anyhow!("Translation failed: {}", e))?;

        let translated = response.trim().to_string();

        info!("Original: {}", content);
        info!("Translated to {}: {}", target_language, translated);

        Ok(translated)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_translation() {
        let client = Client::from_env();
        let translator = Translator::new(client);

        let result = translator
            .translate("Hello world", "Russian")
            .await
            .unwrap();

        assert!(result.contains("Привет") || result.contains("мир"));
    }
}
