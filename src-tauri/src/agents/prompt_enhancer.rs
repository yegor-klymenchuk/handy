use anyhow::Result;
use log::{debug, info};
use rig::completion::Prompt;
use rig::providers::openai::Client;

/// Prompt enhancer using Rig's Completion for text transformation
pub struct PromptEnhancer {
    client: Client,
    model: String,
}

impl PromptEnhancer {
    /// Create a new prompt enhancer
    pub fn new(client: Client) -> Self {
        Self {
            client,
            model: "gpt-4o-mini".to_string(),
        }
    }

    /// Enhance/clean up transcribed text
    pub async fn enhance(&self, user_input: &str) -> Result<String> {
        if user_input.trim().is_empty() {
            debug!("Empty input, returning as-is");
            return Ok(user_input.to_string());
        }

        debug!("Enhancing text: {}", user_input);

        let system_prompt = r#"You are a text enhancement specialist for voice transcriptions.

Your tasks:
- Remove filler words like 'um', 'uh', 'like', 'you know', etc.
- Remove duplicate phrases and repeated words
- Handle corrections when the speaker changes their mind mid-sentence. Keep only the final intended version
- Apply proper grammar, punctuation, capitalization, and sentence structure
- Choose the most appropriate and natural words for the context
- Preserve the core meaning and intent
- Keep the same language as input

Guidelines:
- Do not add new information
- Do not elaborate or explain
- Return ONLY the cleaned text
- If already clean, return as-is

Examples:

Input: "um so like I was thinking uh we should maybe like go to the store you know"
Output: "I was thinking we should go to the store."

Input: "я хочу... нет, лучше напишу что я приеду завтра"
Output: "Я приеду завтра."

Input: "the the report from yesterday no wait from last week"
Output: "The report from last week.""#;

        let agent = self
            .client
            .agent(&self.model)
            .preamble(system_prompt)
            .temperature(0.3) // Low temperature for consistency
            .build();

        let prompt = format!("Clean up this transcribed text:\n\n{}", user_input);

        let response = agent
            .prompt(&prompt)
            .await
            .map_err(|e| anyhow::anyhow!("Enhancement failed: {}", e))?;

        let enhanced = response.trim().to_string();

        info!("Original: {}", user_input);
        info!("Enhanced: {}", enhanced);

        Ok(enhanced)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_enhancement() {
        let client = Client::from_env();
        let enhancer = PromptEnhancer::new(client);

        let result = enhancer
            .enhance("um so like I was thinking we should go")
            .await
            .unwrap();

        assert!(!result.contains("um"));
        assert!(!result.contains("like"));
    }
}
