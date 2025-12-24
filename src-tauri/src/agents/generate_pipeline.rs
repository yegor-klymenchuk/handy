use super::content_generator::ContentGenerator;
use super::intent_classifier::TranslationDetector;
use super::translator::Translator;
use anyhow::Result;
use log::{debug, error, info};
use rig::providers::openai::Client;
use std::env;
use tauri::AppHandle;

/// Result of the generation pipeline
#[derive(Debug, Clone)]
pub struct GenerateResult {
    /// Final generated content
    pub content: String,
    /// Whether translation was applied
    pub was_translated: bool,
}

/// Generation pipeline: generates content from instructions + optional translation
pub struct GeneratePipeline {
    translation_detector: TranslationDetector,
    generator: ContentGenerator,
    translator: Translator,
}

impl GeneratePipeline {
    /// Create new generation pipeline with API key
    pub fn new(api_key: &str) -> Self {
        let client = Client::new(api_key);

        Self {
            translation_detector: TranslationDetector::new(&client),
            generator: ContentGenerator::new(client.clone()),
            translator: Translator::new(client),
        }
    }

    /// Create pipeline from environment variable
    pub fn from_env() -> Result<Self> {
        let api_key = env::var("OPENAI_API_KEY")
            .map_err(|_| anyhow::anyhow!("OPENAI_API_KEY environment variable not set"))?;

        Ok(Self::new(&api_key))
    }

    /// Process text through generation pipeline with overlay updates
    pub async fn process(
        &self,
        user_input: &str,
        app_handle: Option<&AppHandle>,
    ) -> Result<GenerateResult> {
        info!("Generation pipeline processing: {}", user_input);

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

        // Step 2: Generate content
        if let Some(app) = app_handle {
            crate::utils::show_generating_overlay(app);
        }

        let generated = self.generator.generate(user_input).await.map_err(|e| {
            error!("Generation failed: {}", e);
            e
        })?;

        debug!("Generated content: {} chars", generated.len());

        // Step 3: Translate if needed
        let (final_content, was_translated) = if translation_intent.needs_translation {
            if let Some(target_lang) = translation_intent.target_language {
                if let Some(app) = app_handle {
                    crate::utils::show_translating_overlay(app);
                }

                match self.translator.translate(&generated, &target_lang).await {
                    Ok(translated) => {
                        info!("Translation successful to {}", target_lang);
                        (translated, true)
                    }
                    Err(e) => {
                        error!("Translation failed: {}, using generated text", e);
                        (generated, false)
                    }
                }
            } else {
                debug!("Translation requested but no target language specified");
                (generated, false)
            }
        } else {
            (generated, false)
        };

        info!(
            "Generation pipeline complete: {} chars",
            final_content.len()
        );

        Ok(GenerateResult {
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
    ) -> Result<GenerateResult> {
        tokio::time::timeout(timeout, self.process(user_input, app_handle))
            .await
            .map_err(|_| anyhow::anyhow!("Generation pipeline timed out"))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_generate_pipeline() {
        let pipeline = GeneratePipeline::from_env().unwrap();

        let result = pipeline
            .process("create a short list of 3 colors", None)
            .await
            .unwrap();

        assert!(!result.content.is_empty());
        assert!(!result.was_translated);
    }

    #[tokio::test]
    #[ignore]
    async fn test_generate_with_translation() {
        let pipeline = GeneratePipeline::from_env().unwrap();

        let result = pipeline
            .process("write a greeting and translate to Spanish", None)
            .await
            .unwrap();

        assert!(result.was_translated);
    }
}
