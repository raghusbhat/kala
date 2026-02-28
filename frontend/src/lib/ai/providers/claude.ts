import type { AIProvider, AIRequestOptions, AIStreamCallbacks } from "../types";

const claudeProvider: AIProvider = {
  id: "claude",
  name: "Claude",
  defaultModel: "claude-sonnet-4-5-20250929",
  availableModels: [
    "claude-sonnet-4-5-20250929",
    "claude-opus-4-6",
    "claude-haiku-4-5-20251001",
  ],

  async sendMessage(options: AIRequestOptions, callbacks: AIStreamCallbacks): Promise<void> {
    const { apiKey, model, system, messages } = options;

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg) => {
      if (typeof msg.content === "string") {
        return { role: msg.role, content: msg.content };
      }
      // Multi-part content (text + images)
      const content = (msg.content as any[]).map((part: any) => {
        if (part.type === "text") {
          return { type: "text", text: part.text };
        }
        if (part.type === "image_url" && part.image_url?.url) {
          // Convert data URL to Anthropic image format
          const dataUrl: string = part.image_url.url;
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            return {
              type: "image",
              source: {
                type: "base64",
                media_type: match[1],
                data: match[2],
              },
            };
          }
        }
        return { type: "text", text: "[unsupported content]" };
      });
      return { role: msg.role, content };
    });

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system,
          messages: anthropicMessages,
          stream: true,
        }),
      });
    } catch (err) {
      callbacks.onError(new Error(`Network error: ${(err as Error).message}`));
      return;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      callbacks.onError(new Error(`Claude API error ${response.status}: ${errorText}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error("No response body from Claude API"));
      return;
    }

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta" &&
              typeof event.delta.text === "string"
            ) {
              fullText += event.delta.text;
              callbacks.onToken(event.delta.text);
            }
          } catch {
            // Ignore malformed SSE events
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    callbacks.onComplete(fullText);
  },
};

export default claudeProvider;
