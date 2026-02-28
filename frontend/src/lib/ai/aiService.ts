import { buildSystemPrompt } from "./systemPrompt";
import { buildCanvasContext } from "./contextBuilder";
import { parseAIResponse, executeCommands } from "./commandExecutor";
import claudeProvider from "./providers/claude";
import openaiProvider from "./providers/openai";
import geminiProvider from "./providers/gemini";
import type { AIProvider, AIMessage, AIStreamCallbacks } from "./types";

// Map from model display name to provider
const providersByModelName: Record<string, AIProvider> = {
  Claude: claudeProvider,
  "GPT-4": openaiProvider,
  Gemini: geminiProvider,
};

function resolveProvider(modelName: string): AIProvider {
  const provider = providersByModelName[modelName];
  if (!provider) {
    throw new Error(`Unknown model: "${modelName}". Available: ${Object.keys(providersByModelName).join(", ")}`);
  }
  return provider;
}

function resolveModelId(provider: AIProvider, modelName: string): string {
  // The display name maps to a specific provider; use its default model unless overridden.
  // Future: allow sub-model selection; for now use provider default.
  return provider.defaultModel;
}

export interface SendAIMessageOptions {
  text: string;
  attachedImages: string[]; // data URLs
  history: Array<{ role: "user" | "ai"; content: string }>;
  modelName: string; // "Claude" | "GPT-4" | "Gemini"
  apiKey: string;
}

export async function sendAIMessage(
  opts: SendAIMessageOptions,
  streamCallbacks: {
    onToken: (chunk: string) => void;
    onComplete: (message: string) => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  const { text, attachedImages, history, modelName, apiKey } = opts;

  if (!apiKey.trim()) {
    streamCallbacks.onError(new Error("No API key provided. Enter your API key in the AI panel."));
    return;
  }

  const provider = resolveProvider(modelName);
  const modelId = resolveModelId(provider, modelName);
  const systemPrompt = buildSystemPrompt();
  const canvasContext = buildCanvasContext();

  // Build message history for the API (only user/assistant pairs, no "ai" role)
  const messages: AIMessage[] = [];

  // Add conversation history (excluding the current message)
  for (const msg of history) {
    if (msg.role === "user") {
      messages.push({ role: "user", content: msg.content });
    } else if (msg.role === "ai") {
      messages.push({ role: "assistant", content: msg.content });
    }
  }

  // Append canvas context to the current user message
  const userMessageText = `${text}\n\n${canvasContext}`;

  // If there are images, build a multipart message
  if (attachedImages.length > 0) {
    const parts: any[] = [{ type: "text", text: userMessageText }];
    for (const imgDataUrl of attachedImages) {
      parts.push({ type: "image_url", image_url: { url: imgDataUrl } });
    }
    messages.push({ role: "user", content: parts });
  } else {
    messages.push({ role: "user", content: userMessageText });
  }

  const internalCallbacks: AIStreamCallbacks = {
    onToken: streamCallbacks.onToken,
    onComplete: (fullText: string) => {
      const aiResponse = parseAIResponse(fullText);

      // Execute commands on the canvas
      if (aiResponse.commands.length > 0) {
        try {
          executeCommands(aiResponse.commands);
        } catch (err) {
          console.error("[Kala AI] Error executing commands:", err);
        }
      }

      streamCallbacks.onComplete(aiResponse.message);
    },
    onError: streamCallbacks.onError,
  };

  await provider.sendMessage(
    { apiKey, model: modelId, system: systemPrompt, messages },
    internalCallbacks
  );
}
