import type { Canvas, CanvasKit, FontMgr } from 'canvaskit-wasm';
import type { TextObject } from './types';
import { CursorRenderer } from './CursorRenderer';
import { SelectionRenderer } from './SelectionRenderer';

/**
 * Main text rendering coordinator
 * Handles text, selection, and cursor rendering
 */
export class TextRenderer {
  private cursorRenderer: CursorRenderer;
  private selectionRenderer: SelectionRenderer;

  constructor() {
    this.cursorRenderer = new CursorRenderer();
    this.selectionRenderer = new SelectionRenderer();
  }

  /**
   * Start cursor blinking for the editing text
   */
  public startCursorBlinking(onRedrawNeeded: () => void): void {
    this.cursorRenderer.startBlinking(onRedrawNeeded);
  }

  /**
   * Stop cursor blinking
   */
  public stopCursorBlinking(): void {
    this.cursorRenderer.stopBlinking();
  }

  /**
   * Render a text object on the canvas
   */
  public render(
    canvas: Canvas,
    ck: CanvasKit,
    textObj: TextObject,
    fontMgr: FontMgr
  ): void {
    // Get typeface for this font
    const typeface = fontMgr.matchFamilyStyle(textObj.fontFamily, {
      weight: textObj.fontWeight as any,
      width: ck.FontWidth.Normal,
      slant: textObj.fontStyle === 'italic' ? ck.FontSlant.Italic : ck.FontSlant.Upright,
    });

    if (!typeface) {
      console.warn(`[TextRenderer] Typeface not found: ${textObj.fontFamily}`);
      return;
    }

    // Create font object
    const font = new ck.Font(typeface, textObj.fontSize);
    font.setSubpixel(true);

    // Create paint for text
    const textPaint = new ck.Paint();
    textPaint.setColor(ck.parseColorString(textObj.fillColor));
    textPaint.setStyle(ck.PaintStyle.Fill);
    textPaint.setAntiAlias(true);

    try {
      const metrics = font.getMetrics();
      const ascent = metrics.ascent; // Negative value
      const descent = metrics.descent; // Positive value
      const baselineY = textObj.startY - ascent;

      // 1. Render selection background (if editing)
      if (textObj.isEditing) {
        this.selectionRenderer.render(canvas, ck, textObj, font);
      }

      // 3. Render text
      if (textObj.text.length > 0) {
        canvas.drawText(
          textObj.text,
          textObj.startX,
          baselineY,
          textPaint,
          font
        );
      }

      // 4. Render cursor (if editing)
      if (textObj.isEditing) {
        this.cursorRenderer.render(canvas, ck, textObj, font);
      }

    } finally {
      // Clean up Skia objects to prevent memory leaks
      font.delete();
      textPaint.delete();
    }
  }

  /**
   * Calculate text width for a given text object
   */
  public measureTextWidth(
    ck: CanvasKit,
    textObj: TextObject,
    fontMgr: FontMgr
  ): number {
    const typeface = fontMgr.matchFamilyStyle(textObj.fontFamily, {
      weight: textObj.fontWeight as any,
    });

    if (!typeface) return 0;

    const font = new ck.Font(typeface, textObj.fontSize);

    try {
      if (textObj.text.length === 0) return 0;

      const glyphIDs = font.getGlyphIDs(textObj.text);
      const glyphWidths = font.getGlyphWidths(glyphIDs);
      return glyphWidths.reduce((sum, w) => sum + w, 0);
    } finally {
      font.delete();
    }
  }

  /**
   * Get cursor position in screen coordinates
   * Returns { x, y } for positioning the hidden textarea
   */
  public getCursorScreenPosition(
    ck: CanvasKit,
    textObj: TextObject,
    fontMgr: FontMgr,
    scale: number,
    offset: { x: number; y: number }
  ): { x: number; y: number } {
    const typeface = fontMgr.matchFamilyStyle(textObj.fontFamily, {
      weight: textObj.fontWeight as any,
    });

    if (!typeface) {
      return {
        x: textObj.startX * scale + offset.x,
        y: textObj.startY * scale + offset.y,
      };
    }

    const font = new ck.Font(typeface, textObj.fontSize);

    try {
      // Calculate cursor X position
      const textBeforeCursor = textObj.text.substring(0, textObj.cursorPosition);
      let cursorWorldX = textObj.startX;

      if (textBeforeCursor.length > 0) {
        const glyphIDs = font.getGlyphIDs(textBeforeCursor);
        const glyphWidths = font.getGlyphWidths(glyphIDs);
        cursorWorldX += glyphWidths.reduce((sum, w) => sum + w, 0);
      }

      // Convert world coordinates to screen coordinates
      const cursorScreenX = cursorWorldX * scale + offset.x;
      const cursorScreenY = textObj.startY * scale + offset.y;

      return { x: cursorScreenX, y: cursorScreenY };
    } finally {
      font.delete();
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.cursorRenderer.stopBlinking();
  }
}
