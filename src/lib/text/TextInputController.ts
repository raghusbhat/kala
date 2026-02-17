import { TextInputManager } from './TextInputManager';
import { useCanvasStore } from '../store';

/**
 * Coordinates between TextInputManager and TextModel
 * Implements business logic for text editing
 */
export class TextInputController {
  private inputManager: TextInputManager;
  private redrawCallback: () => void = () => {};
  private onStopEditingCallback: () => void = () => {};

  constructor(redrawCallback?: () => void, onStopEditingCallback?: () => void) {
    this.inputManager = new TextInputManager();
    if (redrawCallback) {
      this.redrawCallback = redrawCallback;
    }
    if (onStopEditingCallback) {
      this.onStopEditingCallback = onStopEditingCallback;
    }

    // Set up callbacks
    this.inputManager.callbacks = {
      onTextInput: this.handleTextInput.bind(this),
      onCursorMove: this.handleCursorMove.bind(this),
      onDelete: this.handleDelete.bind(this),
      onEnter: this.handleEnter.bind(this),
      onEscape: this.handleEscape.bind(this),
      onSelectAll: this.handleSelectAll.bind(this),
      onCopy: this.handleCopy.bind(this),
      onCut: this.handleCut.bind(this),
      onPaste: this.handlePaste.bind(this),
    };
  }

  /**
   * Start editing a text object
   */
  public startEditing(
    textId: string,
    screenX: number,
    screenY: number,
    scale: number
  ): void {
    const store = useCanvasStore.getState();
    const textObj = store.getTextObjectById(textId);
    if (!textObj) {
      console.error('[TextInputController] Text object not found for id:', textId);
      return;
    }

    // Update model
    store.startTextEditing(textId);

    // Verify editing started
    const editingObj = store.getEditingTextObject();

    // Create textarea
    this.inputManager.createTextarea(screenX, screenY, scale, textObj.fontSize);
  }

  /**
   * Stop editing current text object
   */
  public stopEditing(): void {
    useCanvasStore.getState().stopTextEditing();
    this.inputManager.destroy();
    this.onStopEditingCallback();
  }

  /**
   * Update textarea position (when canvas pans/zooms)
   */
  public updateTextareaPosition(
    screenX: number,
    screenY: number,
    scale: number,
    fontSize: number
  ): void {
    this.inputManager.updatePosition(screenX, screenY, scale, fontSize);
  }

  /**
   * Handle text input (regular typing or IME composition result)
   */
  private handleTextInput(inputText: string): void {
    const store = useCanvasStore.getState();
    const textObj = store.getEditingTextObject();
    if (!textObj) {
      console.warn('[TextInputController] handleTextInput: No editing text object found');
      return;
    }

    let newText: string;
    let newCursorPos: number;

    // If there's a selection, delete it first
    if (textObj.selectionStart !== null && textObj.selectionStart !== undefined &&
        textObj.selectionEnd !== null && textObj.selectionEnd !== undefined) {
      const start = Math.min(textObj.selectionStart, textObj.selectionEnd);
      const end = Math.max(textObj.selectionStart, textObj.selectionEnd);

      const before = textObj.text.substring(0, start);
      const after = textObj.text.substring(end);

      newText = before + inputText + after;
      newCursorPos = start + inputText.length;

      store.updateTextContent(textObj.id, newText);
      store.updateTextCursor(textObj.id, newCursorPos);
      store.updateTextSelection(textObj.id, null, null);
    } else {
      // No selection - insert at cursor
      const cursorPos = textObj.cursorPosition || 0;
      const before = textObj.text.substring(0, cursorPos);
      const after = textObj.text.substring(cursorPos);

      newText = before + inputText + after;
      newCursorPos = cursorPos + inputText.length;

      store.updateTextContent(textObj.id, newText);
      store.updateTextCursor(textObj.id, newCursorPos);
    }

    // Trigger canvas redraw
    this.redrawCallback();
  }

  /**
   * Handle cursor movement
   */
  private handleCursorMove(
    direction: 'left' | 'right' | 'home' | 'end',
    shiftKey: boolean
  ): void {
    const textObj = useCanvasStore.getState().getEditingTextObject();
    if (!textObj) return;

    const cursorPos = textObj.cursorPosition || 0;
    let newPosition = cursorPos;

    switch (direction) {
      case 'left':
        newPosition = Math.max(0, cursorPos - 1);
        break;
      case 'right':
        newPosition = Math.min(textObj.text.length, cursorPos + 1);
        break;
      case 'home':
        newPosition = 0;
        break;
      case 'end':
        newPosition = textObj.text.length;
        break;
    }

    if (shiftKey) {
      // Extend selection
      if (textObj.selectionStart === null || textObj.selectionStart === undefined) {
        // Start new selection from current cursor
        useCanvasStore.getState().updateTextSelection(textObj.id, cursorPos, newPosition);
      } else {
        // Extend existing selection
        useCanvasStore.getState().updateTextSelection(textObj.id, textObj.selectionStart, newPosition);
      }
    } else {
      // Clear selection
      useCanvasStore.getState().updateTextSelection(textObj.id, null, null);
    }

    useCanvasStore.getState().updateTextCursor(textObj.id, newPosition);

    // Trigger canvas redraw
    this.redrawCallback();
  }

  /**
   * Handle delete/backspace
   */
  private handleDelete(direction: 'backspace' | 'delete'): void {
    const textObj = useCanvasStore.getState().getEditingTextObject();
    if (!textObj) return;

    // If there's a selection, delete it
    if (textObj.selectionStart !== null && textObj.selectionStart !== undefined && textObj.selectionEnd !== null && textObj.selectionEnd !== undefined) {
      const start = Math.min(textObj.selectionStart, textObj.selectionEnd);
      const end = Math.max(textObj.selectionStart, textObj.selectionEnd);

      const before = textObj.text.substring(0, start);
      const after = textObj.text.substring(end);

      useCanvasStore.getState().updateTextContent(textObj.id, before + after);
      useCanvasStore.getState().updateTextCursor(textObj.id, start);
      useCanvasStore.getState().updateTextSelection(textObj.id, null, null);
    } else {
      // No selection - delete single character
      const cursorPos = textObj.cursorPosition || 0;
      if (direction === 'backspace' && cursorPos > 0) {
        const before = textObj.text.substring(0, cursorPos - 1);
        const after = textObj.text.substring(cursorPos);

        useCanvasStore.getState().updateTextContent(textObj.id, before + after);
        useCanvasStore.getState().updateTextCursor(textObj.id, cursorPos - 1);
      } else if (direction === 'delete' && cursorPos < textObj.text.length) {
        const before = textObj.text.substring(0, cursorPos);
        const after = textObj.text.substring(cursorPos + 1);

        useCanvasStore.getState().updateTextContent(textObj.id, before + after);
      }
    }

    // Trigger canvas redraw
    this.redrawCallback();
  }

  /**
   * Handle Enter key - finish editing
   */
  private handleEnter(): void {
    // For now, Enter finishes editing
    // In future: support multi-line with Shift+Enter
    this.stopEditing();
  }

  /**
   * Handle Escape key - cancel editing
   */
  private handleEscape(): void {
    this.stopEditing();
  }

  /**
   * Handle Select All (Ctrl+A)
   */
  private handleSelectAll(): void {
    const textObj = useCanvasStore.getState().getEditingTextObject();
    if (!textObj) return;

    useCanvasStore.getState().updateTextSelection(textObj.id, 0, textObj.text.length);
    useCanvasStore.getState().updateTextCursor(textObj.id, textObj.text.length);

    // Update textarea for clipboard access
    this.inputManager.setTextareaContent(textObj.text, 0, textObj.text.length);

    // Trigger canvas redraw
    this.redrawCallback();
  }

  /**
   * Handle Copy (Ctrl+C)
   */
  private handleCopy(): void {
    const textObj = useCanvasStore.getState().getEditingTextObject();
    if (!textObj) return;

    // Update textarea content so browser can copy
    if (textObj.selectionStart !== null && textObj.selectionStart !== undefined && textObj.selectionEnd !== null && textObj.selectionEnd !== undefined) {
      const start = Math.min(textObj.selectionStart, textObj.selectionEnd);
      const end = Math.max(textObj.selectionStart, textObj.selectionEnd);
      const selectedText = textObj.text.substring(start, end);

      this.inputManager.setTextareaContent(selectedText, 0, selectedText.length);
    }
  }

  /**
   * Handle Cut (Ctrl+X)
   */
  private handleCut(): void {
    const textObj = useCanvasStore.getState().getEditingTextObject();
    if (!textObj) return;

    if (textObj.selectionStart !== null && textObj.selectionStart !== undefined && textObj.selectionEnd !== null && textObj.selectionEnd !== undefined) {
      const start = Math.min(textObj.selectionStart, textObj.selectionEnd);
      const end = Math.max(textObj.selectionStart, textObj.selectionEnd);
      const selectedText = textObj.text.substring(start, end);

      // Copy to clipboard via textarea
      this.inputManager.setTextareaContent(selectedText, 0, selectedText.length);
      document.execCommand('copy');

      // Delete selection
      const before = textObj.text.substring(0, start);
      const after = textObj.text.substring(end);

      useCanvasStore.getState().updateTextContent(textObj.id, before + after);
      useCanvasStore.getState().updateTextCursor(textObj.id, start);
      useCanvasStore.getState().updateTextSelection(textObj.id, null, null);

      // Trigger canvas redraw
      this.redrawCallback();
    }
  }

  /**
   * Handle Paste (Ctrl+V)
   */
  private handlePaste(pastedText: string): void {
    // Strip formatting - only paste plain text
    const plainText = pastedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // For single-line text, strip newlines
    const singleLineText = plainText.replace(/\n/g, ' ');

    this.handleTextInput(singleLineText);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.inputManager.destroy();
  }
}
