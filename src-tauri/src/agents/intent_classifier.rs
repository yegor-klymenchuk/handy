use anyhow::Result;
use log::debug;
use rig::providers::openai::Client;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Translation detection result using structured extraction
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct TranslationIntent {
    /// Whether translation is requested
    pub needs_translation: bool,

    /// Target language if translation is needed (e.g., "English", "Russian", "Spanish")
    pub target_language: Option<String>,

    /// Confidence score 0.0-1.0
    pub confidence: f32,

    /// Brief reasoning for detection
    pub reasoning: String,
}

/// Translation intent detector using Rig's Extractor for structured output
pub struct TranslationDetector {
    extractor:
        rig::extractor::Extractor<rig::providers::openai::CompletionModel, TranslationIntent>,
}

impl TranslationDetector {
    /// Create a new translation detector
    pub fn new(client: &Client) -> Self {
        let extractor = client
            .extractor::<TranslationIntent>("gpt-4o-mini")
            .preamble(
                r#"You are a translation detection system for voice transcriptions. Analyze user input and determine if translation is requested.

Detection rules:
- Check if user requests translation to another language
- Detect phrases like: "переведи на...", "translate to...", "напиши на английском", "write this in Spanish", etc.
- Extract target language name (e.g., "English", "Russian", "Spanish", "French", "German", "Japanese", "Chinese")

Examples:

Input: "hello world переведи на русский"
needs_translation: true
target_language: "Russian"
reasoning: User explicitly requests translation to Russian

Input: "напиши это на английском"
needs_translation: true
target_language: "English"
reasoning: User wants the result in English

Input: "translate this to Spanish please"
needs_translation: true
target_language: "Spanish"
reasoning: Explicit translation request to Spanish

Input: "um so like I was thinking we should go"
needs_translation: false
target_language: null
reasoning: No translation request detected

Input: "напиши письмо моему другу"
needs_translation: false
target_language: null
reasoning: No translation request, just generation in same language

Input: "create a summary and translate to French"
needs_translation: true
target_language: "French"
reasoning: User wants the result translated to French

If no translation is requested, set needs_translation to false and target_language to null."#,
            )
            .build();

        Self { extractor }
    }

    /// Detect if translation is needed
    pub async fn detect(&self, user_input: &str) -> Result<TranslationIntent> {
        debug!("Detecting translation intent for: {}", user_input);

        let context = format!(
            "Check if this input requests translation:\n\n\"{}\"\n\nProvide structured detection result.",
            user_input
        );

        let result = self
            .extractor
            .extract(&context)
            .await
            .map_err(|e| anyhow::anyhow!("Translation detection failed: {}", e))?;

        debug!(
            "Translation needed: {}, Target: {:?}, Confidence: {}",
            result.needs_translation, result.target_language, result.confidence
        );

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires API key
    async fn test_no_translation() {
        let client = Client::from_env();
        let detector = TranslationDetector::new(&client);

        let result = detector
            .detect("um so like I was thinking we should go")
            .await
            .unwrap();

        assert!(!result.needs_translation);
    }

    #[tokio::test]
    #[ignore]
    async fn test_translation_to_russian() {
        let client = Client::from_env();
        let detector = TranslationDetector::new(&client);

        let result = detector
            .detect("hello world переведи на русский")
            .await
            .unwrap();

        assert!(result.needs_translation);
        assert_eq!(result.target_language, Some("Russian".to_string()));
    }
}
