import type { CompositionState } from './types';

export type TextInputCallback = {
  onTextInput: (text: string) => void;
  onCursorMove: (direction: 'left' | 'right' | 'home' | 'end', shiftKey: boolean) => void;
  onDelete: (direction: 'backspace' | 'delete') => void;
  onEnter: () => void;
  onEscape: () => void;
  onSelectAll: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: (text: string) => void;
};

/**
 * Manages the hidden textarea element for text input
 * Handles keyboard events, IME composition, and clipboard
 */
export class TextInputManager {
  public textarea: HTMLTextAreaElement | null = null;
  private compositionState: CompositionState = {
    isComposing: false,
    compositionText: '',
    compositionStart: 0,
    compositionEnd: 0,
  };

  // Callbacks
  public callbacks: TextInputCallback = {
    onTextInput: () => {},
    onCursorMove: () => {},
    onDelete: () => {},
    onEnter: () => {},
    onEscape: () => {},
    onSelectAll: () => {},
    onCopy: () => {},
    onCut: () => {},
    onPaste: () => {},
  };

  /**
   * Create and show the hidden textarea at the specified screen position
   */
  public createTextarea(screenX: number, screenY: number, scale: number, fontSize: number): void {
    // Clean up existing textarea
    this.destroy();

    // Create new textarea
    this.textarea = document.createElement('textarea');

    // Styling - transparent and positioned at cursor
    this.textarea.style.position = 'absolute';
    this.textarea.style.left = `${screenX}px`;
    this.textarea.style.top = `${screenY}px`;
    this.textarea.style.width = '1px';
    this.textarea.style.height = '1px';
    this.textarea.style.padding = '0';
    this.textarea.style.margin = '0';
    this.textarea.style.border = 'none';
    this.textarea.style.outline = 'none';
    this.textarea.style.resize = 'none';
    this.textarea.style.overflow = 'hidden';
    this.textarea.style.background = 'transparent';
    this.textarea.style.color = 'transparent';
    this.textarea.style.caretColor = 'transparent'; // Hide browser caret
    this.textarea.style.fontSize = `${fontSize * scale}px`;
    this.textarea.style.fontFamily = 'monospace';
    this.textarea.style.zIndex = '1000';
    // CRITICAL: Do NOT set pointer-events to 'none' - it blocks keyboard input!
    // The 1px x 1px size already makes it non-obtrusive

    // Prevent browser autocomplete/suggestions
    this.textarea.setAttribute('autocomplete', 'off');
    this.textarea.setAttribute('autocorrect', 'off');
    this.textarea.setAttribute('autocapitalize', 'off');
    this.textarea.setAttribute('spellcheck', 'false');

    // Set up event listeners
    this.setupEventListeners();

    // Add to DOM and focus
    document.body.appendChild(this.textarea);
    this.textarea.focus();
  }

  /**
   * Update textarea position (when canvas pans/zooms)
   */
  public updatePosition(screenX: number, screenY: number, scale: number, fontSize: number): void {
    if (!this.textarea) return;

    this.textarea.style.left = `${screenX}px`;
    this.textarea.style.top = `${screenY}px`;
    this.textarea.style.fontSize = `${fontSize * scale}px`;
  }

  /**
   * Remove textarea from DOM and clean up
   */
  public destroy(): void {
    if (this.textarea && document.body.contains(this.textarea)) {
      document.body.removeChild(this.textarea);
    }
    this.textarea = null;
    this.compositionState = {
      isComposing: false,
      compositionText: '',
      compositionStart: 0,
      compositionEnd: 0,
    };
  }

  /**
   * Focus the textarea (e.g., after canvas click)
   */
  public focus(): void {
    if (this.textarea) {
      this.textarea.focus();
    }
  }

  /**
   * Set up all event listeners on the textarea
   */
  private setupEventListeners(): void {
    if (!this.textarea) return;

    // Auto-refocus when focus is lost (during canvas redraws)
    this.textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (this.textarea && document.body.contains(this.textarea)) {
          this.textarea.focus();
        }
      }, 0);
    }, true);

    // === IME Composition Events (Chinese/Japanese/Korean) ===
    this.textarea.addEventListener('compositionstart', () => {
      this.compositionState.isComposing = true;
      this.compositionState.compositionText = '';
    });

    this.textarea.addEventListener('compositionupdate', (e) => {
      this.compositionState.compositionText = e.data || '';
    });

    this.textarea.addEventListener('compositionend', (e) => {
      this.compositionState.isComposing = false;
      const finalText = e.data || '';

      // Final composition result
      if (finalText) {
        this.callbacks.onTextInput(finalText);
      }

      // Clear textarea
      if (this.textarea) {
        this.textarea.value = '';
      }
    });

    // === Text Input ===
    this.textarea.addEventListener('input', (e) => {
      // Ignore input during IME composition
      if (this.compositionState.isComposing) {
        return;
      }

      const inputText = (e.target as HTMLTextAreaElement).value;

      if (inputText) {
        this.callbacks.onTextInput(inputText);
        // Clear textarea for next input
        (e.target as HTMLTextAreaElement).value = '';
      }
    });

    // === Keyboard Events ===
    this.textarea.addEventListener('keydown', (e) => {
      // During IME composition, let browser handle it
      if (this.compositionState.isComposing) {
        return;
      }

      // Arrow keys - cursor movement
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.callbacks.onCursorMove('left', e.shiftKey);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.callbacks.onCursorMove('right', e.shiftKey);
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.callbacks.onCursorMove('home', e.shiftKey);
      } else if (e.key === 'End') {
        e.preventDefault();
        this.callbacks.onCursorMove('end', e.shiftKey);
      }

      // Backspace and Delete
      else if (e.key === 'Backspace') {
        e.preventDefault();
        this.callbacks.onDelete('backspace');
      } else if (e.key === 'Delete') {
        e.preventDefault();
        this.callbacks.onDelete('delete');
      }

      // Enter - finish editing (or insert newline in future multi-line)
      else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.callbacks.onEnter();
      }

      // Escape - cancel editing
      else if (e.key === 'Escape') {
        e.preventDefault();
        this.callbacks.onEscape();
      }

      // Ctrl/Cmd shortcuts
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        this.callbacks.onSelectAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Let browser handle copy, but notify
        this.callbacks.onCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        this.callbacks.onCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Paste is handled by 'paste' event
      }
    });

    // === Clipboard Events ===
    this.textarea.addEventListener('copy', () => {
      // Browser handles copying from textarea
      // We just notify the controller
      this.callbacks.onCopy();
    });

    this.textarea.addEventListener('cut', () => {
      // We handle cut manually in keydown
      this.callbacks.onCut();
    });

    this.textarea.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedText = e.clipboardData?.getData('text/plain') || '';
      if (pastedText) {
        this.callbacks.onPaste(pastedText);
      }
    });
  }

  /**
   * Update textarea content (for copy/cut to work)
   */
  public setTextareaContent(text: string, selectionStart: number, selectionEnd: number): void {
    if (!this.textarea) return;

    this.textarea.value = text;
    this.textarea.setSelectionRange(selectionStart, selectionEnd);
  }
}
