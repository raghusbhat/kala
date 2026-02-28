import type { AIProvider, AIRequestOptions, AIStreamCallbacks } from "../types";

const openaiProvider: AIProvider = {
  id: "openai",
  name: "GPT-4",
  defaultModel: "gpt-4o",
  availableModels: ["gpt-4o", "gpt-4-turbo"],

  async sendMessage(options: AIRequestOptions, callbacks: AIStreamCallbacks): Promise<void> {
    const { apiKey, model, system, messages } = options;

    // Convert messages to OpenAI format
    const openaiMessages: any[] = [
      { role: "system", content: system },
      ...messages.map((msg) => {
        if (typeof msg.content === "string") {
          return { role: msg.role, content: msg.content };
        }
        // Multi-part: text + image_url
        const content = (msg.content as any[]).map((part: any) => {
          if (part.type === "text") {
            return { type: "text", text: part.text };
          }
          if (part.type === "image_url") {
            return { type: "image_url", image_url: part.image_url };
          }
          return { type: "text", text: "[unsupported content]" };
        });
        return { role: msg.role, content };
      }),
    ];

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: openaiMessages,
          stream: true,
          max_tokens: 4096,
        }),
      });
    } catch (err) {
      callbacks.onError(new Error(`Network error: ${(err as Error).message}`));
      return;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      callbacks.onError(new Error(`OpenAI API error ${response.status}: ${errorText}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error("No response body from OpenAI API"));
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
            const delta = event?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              fullText += delta;
              callbacks.onToken(delta);
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

export default openaiProvider;
