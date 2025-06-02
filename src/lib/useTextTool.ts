import { useState, useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "./store";

export const useTextTool = () => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textToolActiveRef = useRef<boolean>(false);
  const clickedPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const { setTextPosition } = useCanvasStore();

  // Cleanup function
  const cleanupTextarea = () => {
    if (textareaRef.current && document.body.contains(textareaRef.current)) {
      document.body.removeChild(textareaRef.current);
    }
    textareaRef.current = null;
    setShowTextInput(false);
  };

  // Cleanup on unmount
  useEffect(() => () => cleanupTextarea(), []);

  const activateTextTool = useCallback(
    (
      screenX: number,
      screenY: number,
      worldX: number,
      worldY: number,
      onSubmit: (text: string) => void
    ) => {
      if (textareaRef.current) return;

      clickedPositionRef.current = { x: worldX, y: worldY };
      setTextPosition({ x: worldX, y: worldY });

      const textarea = document.createElement("textarea");
      textarea.style.position = "absolute";
      textarea.style.left = `${screenX}px`;
      textarea.style.top = `${screenY}px`;
      textarea.style.fontSize = "16px";
      textarea.style.border = "2px solid #007acc";
      textarea.style.borderRadius = "4px";
      textarea.style.padding = "4px";
      textarea.style.backgroundColor = "white";
      textarea.style.color = "black";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.fontFamily = "Arial, sans-serif";
      textarea.style.minWidth = "100px";
      textarea.style.minHeight = "24px";
      textarea.style.zIndex = "10000";

      textareaRef.current = textarea;
      setShowTextInput(true);

      // Handle submit on Enter or blur
      const submitText = (text: string) => {
        if (!text.trim() || !clickedPositionRef.current) return;

        onSubmit(text);
        setShowTextInput(false);

        if (
          textareaRef.current &&
          document.body.contains(textareaRef.current)
        ) {
          document.body.removeChild(textareaRef.current);
        }
        textareaRef.current = null;
      };

      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submitText(textarea.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowTextInput(false);
          if (document.body.contains(textarea)) {
            document.body.removeChild(textarea);
          }
          textareaRef.current = null;
        }
      });

      textarea.addEventListener("blur", () => {
        submitText(textarea.value);
      });

      document.body.appendChild(textarea);
      setTimeout(() => textarea.focus(), 0);
    },
    [setShowTextInput, setTextPosition]
  );

  return {
    textareaRef,
    textToolActiveRef,
    clickedPositionRef,
    showTextInput,
    setShowTextInput,
    activateTextTool,
  };
};
