/**
 * Text object data structure
 * Extends base CanvasObject with text-specific properties
 */
export interface TextObject {
  // Base properties (from CanvasObject)
  id: string;
  type: 'text';
  startX: number;
  startY: number;
  endX: number;  // Calculated from text width
  endY: number;  // Calculated from text height
  visible: boolean;
  rotation: number;
  scaleX: number;
  scaleY: number;

  // Text content
  text: string;

  // Font properties
  fontFamily: string;      // e.g., 'Inter', 'Roboto'
  fontSize: number;        // In pixels (not points!)
  fontWeight: number;      // 100-900
  fontStyle: 'normal' | 'italic';

  // Styling
  fillColor: string;       // Hex color for text
  strokeColor?: string;    // Optional text outline
  strokeWidth?: number;

  // Editing state
  isEditing: boolean;
  cursorPosition: number;          // Character index (0 to text.length)
  selectionStart: number | null;   // null if no selection
  selectionEnd: number | null;     // null if no selection
}

/**
 * Text input event types
 */
export type TextInputEvent =
  | { type: 'input'; text: string }
  | { type: 'cursorMove'; direction: 'left' | 'right' | 'home' | 'end' }
  | { type: 'delete'; direction: 'backspace' | 'delete' }
  | { type: 'selection'; start: number; end: number }
  | { type: 'paste'; text: string }
  | { type: 'copy' }
  | { type: 'cut' };

/**
 * IME composition state
 */
export interface CompositionState {
  isComposing: boolean;
  compositionText: string;
  compositionStart: number;
  compositionEnd: number;
}

/**
 * Cached text metrics for performance
 */
export interface CachedTextMetrics {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  width: number;
  glyphWidths: number[];
  timestamp: number;  // For LRU eviction
}
