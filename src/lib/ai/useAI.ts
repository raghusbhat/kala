import { useState, useRef, useCallback } from "react";
import { sendAIMessage } from "./aiService";

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  isStreaming?: boolean;
}

export interface UseAIReturn {
  isLoading: boolean;
  send: (
    text: string,
    attachedImages: string[],
    history: ChatMessage[],
    modelName: string,
    apiKey: string,
    onMessageUpdate: (updater: (msgs: ChatMessage[]) => ChatMessage[]) => void
  ) => Promise<void>;
}

export function useAI(): UseAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const streamBufferRef = useRef<string>("");

  const send = useCallback(
    async (
      text: string,
      attachedImages: string[],
      history: ChatMessage[],
      modelName: string,
      apiKey: string,
      onMessageUpdate: (updater: (msgs: ChatMessage[]) => ChatMessage[]) => void
    ): Promise<void> => {
      setIsLoading(true);
      streamBufferRef.current = "";

      // Append the streaming AI bubble
      onMessageUpdate((msgs) => [
        ...msgs,
        { role: "ai", content: "", isStreaming: true },
      ]);

      try {
        await sendAIMessage(
          {
            text,
            attachedImages,
            history,
            modelName,
            apiKey,
          },
          {
            onToken: (chunk: string) => {
              streamBufferRef.current += chunk;
              const accumulated = streamBufferRef.current;
              // Update the last streaming bubble with accumulated text
              onMessageUpdate((msgs) => {
                const newMsgs = [...msgs];
                const lastIdx = newMsgs.length - 1;
                if (lastIdx >= 0 && newMsgs[lastIdx].isStreaming) {
                  newMsgs[lastIdx] = {
                    ...newMsgs[lastIdx],
                    content: accumulated,
                  };
                }
                return newMsgs;
              });
            },
            onComplete: (parsedMessage: string) => {
              // Replace streaming bubble with finalized message
              onMessageUpdate((msgs) => {
                const newMsgs = [...msgs];
                const lastIdx = newMsgs.length - 1;
                if (lastIdx >= 0 && newMsgs[lastIdx].isStreaming) {
                  newMsgs[lastIdx] = {
                    role: "ai",
                    content: parsedMessage,
                    isStreaming: false,
                  };
                }
                return newMsgs;
              });
              setIsLoading(false);
            },
            onError: (error: Error) => {
              // Replace streaming bubble with error message
              onMessageUpdate((msgs) => {
                const newMsgs = [...msgs];
                const lastIdx = newMsgs.length - 1;
                if (lastIdx >= 0 && newMsgs[lastIdx].isStreaming) {
                  newMsgs[lastIdx] = {
                    role: "ai",
                    content: `Error: ${error.message}`,
                    isStreaming: false,
                  };
                }
                return newMsgs;
              });
              setIsLoading(false);
            },
          }
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        onMessageUpdate((msgs) => {
          const newMsgs = [...msgs];
          const lastIdx = newMsgs.length - 1;
          if (lastIdx >= 0 && newMsgs[lastIdx].isStreaming) {
            newMsgs[lastIdx] = {
              role: "ai",
              content: `Error: ${errorMsg}`,
              isStreaming: false,
            };
          }
          return newMsgs;
        });
        setIsLoading(false);
      }
    },
    []
  );

  return { isLoading, send };
}
