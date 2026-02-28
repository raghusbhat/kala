import type { Canvas, CanvasKit, Font } from 'canvaskit-wasm';
import type { TextObject } from './types';

/**
 * Renders the blinking text cursor
 */
export class CursorRenderer {
  private blinkVisible: boolean = true;
  private blinkInterval: number | null = null;
  private onRedrawNeeded: () => void = () => {};

  /**
   * Start cursor blinking animation
   */
  public startBlinking(onRedrawNeeded: () => void): void {
    this.onRedrawNeeded = onRedrawNeeded;
    this.blinkVisible = true;

    // Blink every 500ms (standard cursor blink rate)
    this.blinkInterval = setInterval(() => {
      this.blinkVisible = !this.blinkVisible;
      this.onRedrawNeeded();
    }, 500);
  }

  /**
   * Stop cursor blinking
   */
  public stopBlinking(): void {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }
    this.blinkVisible = true;
  }

  /**
   * Render the cursor at the current cursor position
   */
  public render(
    canvas: Canvas,
    ck: CanvasKit,
    textObj: TextObject,
    font: Font
  ): void {
    // Don't render if blinking hasn't been started yet
    if (this.blinkInterval === null) return;

    // Don't render if not visible in blink cycle
    if (!this.blinkVisible) return;

    // Calculate cursor X position by measuring text before cursor
    const textBeforeCursor = textObj.text.substring(0, textObj.cursorPosition);

    let cursorX = textObj.startX;

    if (textBeforeCursor.length > 0) {
      const glyphIDs = font.getGlyphIDs(textBeforeCursor);
      const glyphWidths = font.getGlyphWidths(glyphIDs);
      const widthBeforeCursor = glyphWidths.reduce((sum, width) => sum + width, 0);
      cursorX += widthBeforeCursor;
    }

    // Get font metrics for cursor height
    const metrics = font.getMetrics();
    const ascent = metrics.ascent; // Negative value (e.g., -18)
    const descent = metrics.descent; // Positive value (e.g., 5)

    // Calculate cursor Y positions
    // baselineY is where the text baseline is drawn
    const baselineY = textObj.startY - ascent; // ascent is negative, so this moves down

    // Cursor should span from top of text to bottom of text
    const cursorTop = baselineY + ascent; // ascent is negative, so this goes UP from baseline
    const cursorBottom = baselineY + descent; // descent is positive, so this goes DOWN from baseline

    // Create paint for cursor
    const cursorPaint = new ck.Paint();
    cursorPaint.setColor(ck.parseColorString('#007AFF')); // iOS-style blue
    cursorPaint.setStyle(ck.PaintStyle.Stroke);
    cursorPaint.setStrokeWidth(2);
    cursorPaint.setAntiAlias(true);

    try {
      // Draw cursor line from top to bottom of text
      canvas.drawLine(
        cursorX,
        cursorTop,
        cursorX,
        cursorBottom,
        cursorPaint
      );
    } finally {
      cursorPaint.delete();
    }
  }
}
