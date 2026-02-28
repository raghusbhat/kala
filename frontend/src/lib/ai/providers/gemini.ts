import type { AIProvider, AIRequestOptions, AIStreamCallbacks } from "../types";

const geminiProvider: AIProvider = {
  id: "gemini",
  name: "Gemini",
  defaultModel: "gemini-2.0-flash",
  availableModels: ["gemini-2.0-flash", "gemini-1.5-pro"],

  async sendMessage(options: AIRequestOptions, callbacks: AIStreamCallbacks): Promise<void> {
    const { apiKey, model, system, messages } = options;

    // Convert messages to Gemini format
    const geminiContents = messages.map((msg) => {
      const role = msg.role === "assistant" ? "model" : "user";
      if (typeof msg.content === "string") {
        return { role, parts: [{ text: msg.content }] };
      }
      // Multi-part: text + inline images
      const parts = (msg.content as any[]).map((part: any) => {
        if (part.type === "text") {
          return { text: part.text };
        }
        if (part.type === "image_url" && part.image_url?.url) {
          const dataUrl: string = part.image_url.url;
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            return {
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            };
          }
        }
        return { text: "[unsupported content]" };
      });
      return { role, parts };
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: system }],
          },
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 4096,
          },
        }),
      });
    } catch (err) {
      callbacks.onError(new Error(`Network error: ${(err as Error).message}`));
      return;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      callbacks.onError(new Error(`Gemini API error ${response.status}: ${errorText}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error("No response body from Gemini API"));
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
          if (!data || data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            const text = event?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof text === "string") {
              fullText += text;
              callbacks.onToken(text);
            }
          } catch {
            // Ignore malformed events
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    callbacks.onComplete(fullText);
  },
};

export default geminiProvider;
