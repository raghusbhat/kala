import { useState, useEffect, useRef } from "react";
import { useCanvasStore } from "./store";

export function useTextTool() {
  const { currentTool, setTextPosition } = useCanvasStore();
  const [showTextInput, setShowTextInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textToolActiveRef = useRef<boolean>(false);
  const clickedPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const textSubmittedRef = useRef<boolean>(false);

  // Clean up existing textarea
  const cleanupTextarea = () => {
    if (textareaRef.current) {
      try {
        if (document.body.contains(textareaRef.current)) {
          document.body.removeChild(textareaRef.current);
        }
      } catch {}
      textareaRef.current = null;
      setShowTextInput(false);
    }
  };

  // Submit text and cleanup
  const safeSubmitText = (
    text: string,
    handleTextSubmit: (text: string) => void
  ) => {
    if (textSubmittedRef.current || !textareaRef.current) return;
    textSubmittedRef.current = true;
    cleanupTextarea();
    if (!text.trim()) return;
    console.log(`[TextFlow] [TextTool] Submitted text: "${text}" at world { x:${clickedPositionRef.current.x}, y:${clickedPositionRef.current.y} }`);
    handleTextSubmit(text);
  };

  // Create and position textarea
  const createTextArea = (
    x: number,
    y: number,
    handleTextSubmit: (text: string) => void
  ) => {
    cleanupTextarea();
    textSubmittedRef.current = false;
    console.log(`[TextFlow] [TextTool] Create textarea at screen { x:${x}, y:${y} } world { x:${clickedPositionRef.current.x}, y:${clickedPositionRef.current.y} }`);
    const textarea = document.createElement("textarea");
    Object.assign(textarea.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: "200px",
      minHeight: "40px",
      padding: "8px",
      border: "2px solid #7c3aed",
      borderRadius: "4px",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "#ffffff",
      fontFamily: "sans-serif",
      fontSize: "16px",
      zIndex: "1000",
      resize: "both",
      overflow: "hidden",
      outline: "none",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
    });
    textarea.placeholder = "Type text here...";
    textarea.dataset.skiaTextarea = "true";
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        safeSubmitText(textarea.value, handleTextSubmit);
      } else if (e.key === "Escape") {
        e.preventDefault();
        cleanupTextarea();
      }
    });
    textarea.addEventListener("blur", () => {
      safeSubmitText(textarea.value, handleTextSubmit);
    });
    document.body.appendChild(textarea);
    textareaRef.current = textarea;
    setTimeout(() => textarea.focus(), 10);
    setShowTextInput(true);
  };

  // Track tool change
  useEffect(() => {
    textToolActiveRef.current = currentTool === "text";
    if (currentTool !== "text" && textareaRef.current) {
      cleanupTextarea();
    }
  }, [currentTool]);

  // Cleanup on unmount
  useEffect(() => () => cleanupTextarea(), []);

  const activateTextTool = (
    mouseX: number,
    mouseY: number,
    worldX: number,
    worldY: number,
    handleTextSubmit: (text: string) => void
  ) => {
    clickedPositionRef.current = { x: worldX, y: worldY };
    setTextPosition({ x: worldX, y: worldY });
    createTextArea(mouseX, mouseY, handleTextSubmit);
  };

  return { textareaRef, textToolActiveRef, clickedPositionRef, showTextInput, activateTextTool, setShowTextInput };
}
