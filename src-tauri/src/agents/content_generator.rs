use anyhow::Result;
use log::{debug, info};
use rig::completion::Prompt;
use rig::providers::openai::Client;

/// Content generator for creating new content based on user instructions
pub struct ContentGenerator {
    client: Client,
    model: String,
}

impl ContentGenerator {
    /// Create a new content generator
    pub fn new(client: Client) -> Self {
        Self {
            client,
            model: "gpt-4o-mini".to_string(),
        }
    }

    /// Generate content based on user instructions
    pub async fn generate(&self, user_input: &str) -> Result<String> {
        if user_input.trim().is_empty() {
            debug!("Empty input, returning as-is");
            return Ok(user_input.to_string());
        }

        debug!("Generating content for: {}", user_input);

        let system_prompt = r#"You are a helpful AI assistant that generates content based on user instructions.

Your role:
- Understand user's request (write, create, generate, find, summarize, etc.)
- Generate high-quality content that fulfills the request
- Be creative and helpful
- Provide complete, well-structured responses
- Use appropriate formatting and style for the content type

Guidelines:
- Follow the user's instructions exactly
- Generate content in the language requested (or same as input)
- Be concise but comprehensive
- Use proper grammar and formatting
- For code: use best practices
- For text: use clear structure and paragraphs
- For lists: use bullet points or numbering"#;

        let agent = self
            .client
            .agent(&self.model)
            .preamble(system_prompt)
            .build();

        let response = agent
            .prompt(user_input)
            .await
            .map_err(|e| anyhow::anyhow!("Content generation failed: {}", e))?;

        let generated = response.trim().to_string();

        info!("User request: {}", user_input);
        info!("Generated {} characters", generated.len());

        Ok(generated)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_generation() {
        let client = Client::from_env();
        let generator = ContentGenerator::new(client);

        let result = generator
            .generate("create a short list of 3 colors")
            .await
            .unwrap();

        assert!(!result.is_empty());
    }
}
