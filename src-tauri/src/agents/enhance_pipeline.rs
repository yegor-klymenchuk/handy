use super::intent_classifier::TranslationDetector;
use super::prompt_enhancer::PromptEnhancer;
use super::translator::Translator;
use anyhow::Result;
use log::{debug, error, info};
use rig::providers::openai::Client;
use std::env;
use tauri::AppHandle;

/// Result of the enhancement pipeline
#[derive(Debug, Clone)]
pub struct EnhanceResult {
    /// Final processed content
    pub content: String,
    /// Whether translation was applied
    pub was_translated: bool,
}

/// Enhancement pipeline: cleans up transcribed text + optional translation
pub struct EnhancePipeline {
    translation_detector: TranslationDetector,
    enhancer: PromptEnhancer,
    translator: Translator,
}

impl EnhancePipeline {
    /// Create new enhancement pipeline with API key
    pub fn new(api_key: &str) -> Self {
        let client = Client::new(api_key);

        Self {
            translation_detector: TranslationDetector::new(&client),
            enhancer: PromptEnhancer::new(client.clone()),
            translator: Translator::new(client),
        }
    }

    /// Create pipeline from environment variable
    pub fn from_env() -> Result<Self> {
        let api_key = env::var("OPENAI_API_KEY")
            .map_err(|_| anyhow::anyhow!("OPENAI_API_KEY environment variable not set"))?;

        Ok(Self::new(&api_key))
    }

    /// Process text through enhancement pipeline with overlay updates
    pub async fn process(
        &self,
        user_input: &str,
        app_handle: Option<&AppHandle>,
    ) -> Result<EnhanceResult> {
        info!("Enhancement pipeline processing: {}", user_input);

        // Step 1: Detect if translation is needed
        let translation_intent =
            self.translation_detector
                .detect(user_input)
                .await
                .map_err(|e| {
                    error!("Translation detection failed: {}", e);
                    e
                })?;

        debug!(
            "Translation needed: {}, Target: {:?}",
            translation_intent.needs_translation, translation_intent.target_language
        );

        // Step 2: Enhance the text
        if let Some(app) = app_handle {
            crate::utils::show_improving_overlay(app);
        }

        let enhanced = self.enhancer.enhance(user_input).await.map_err(|e| {
            error!("Enhancement failed: {}", e);
            e
        })?;

        debug!("Enhanced text: {}", enhanced);

        // Step 3: Translate if needed
        let (final_content, was_translated) = if translation_intent.needs_translation {
            if let Some(target_lang) = translation_intent.target_language {
                if let Some(app) = app_handle {
                    crate::utils::show_translating_overlay(app);
                }

                match self.translator.translate(&enhanced, &target_lang).await {
                    Ok(translated) => {
                        info!("Translation successful to {}", target_lang);
                        (translated, true)
                    }
                    Err(e) => {
                        error!("Translation failed: {}, using enhanced text", e);
                        (enhanced, false)
                    }
                }
            } else {
                debug!("Translation requested but no target language specified");
                (enhanced, false)
            }
        } else {
            (enhanced, false)
        };

        info!("Enhancement pipeline complete: {}", final_content);

        Ok(EnhanceResult {
            content: final_content,
            was_translated,
        })
    }

    /// Process with timeout
    pub async fn process_with_timeout(
        &self,
        user_input: &str,
        app_handle: Option<&AppHandle>,
        timeout: std::time::Duration,
    ) -> Result<EnhanceResult> {
        tokio::time::timeout(timeout, self.process(user_input, app_handle))
            .await
            .map_err(|_| anyhow::anyhow!("Enhancement pipeline timed out"))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_enhance_pipeline() {
        let pipeline = EnhancePipeline::from_env().unwrap();

        let result = pipeline
            .process("um so like I was thinking we should go", None)
            .await
            .unwrap();

        assert!(!result.content.contains("um"));
        assert!(!result.was_translated);
    }

    #[tokio::test]
    #[ignore]
    async fn test_enhance_with_translation() {
        let pipeline = EnhancePipeline::from_env().unwrap();

        let result = pipeline
            .process("hello world переведи на русский", None)
            .await
            .unwrap();

        assert!(result.was_translated);
    }
}
