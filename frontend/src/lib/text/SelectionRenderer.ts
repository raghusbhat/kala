import type { Canvas, CanvasKit, Font } from 'canvaskit-wasm';
import type { TextObject } from './types';

/**
 * Renders text selection highlight
 */
export class SelectionRenderer {
  /**
   * Render selection highlight rectangle
   */
  public render(
    canvas: Canvas,
    ck: CanvasKit,
    textObj: TextObject,
    font: Font
  ): void {
    // No selection - nothing to render
    if (textObj.selectionStart === null || textObj.selectionEnd === null) {
      return;
    }

    // Normalize selection (ensure start <= end)
    const selStart = Math.min(textObj.selectionStart, textObj.selectionEnd);
    const selEnd = Math.max(textObj.selectionStart, textObj.selectionEnd);

    // Empty selection - nothing to render
    if (selStart === selEnd) {
      return;
    }

    // Calculate selection bounds
    const textBeforeSelection = textObj.text.substring(0, selStart);
    const selectedText = textObj.text.substring(selStart, selEnd);

    // Measure text before selection
    let selectionStartX = textObj.startX;
    if (textBeforeSelection.length > 0) {
      const beforeGlyphs = font.getGlyphIDs(textBeforeSelection);
      const beforeWidths = font.getGlyphWidths(beforeGlyphs);
      selectionStartX += beforeWidths.reduce((sum, w) => sum + w, 0);
    }

    // Measure selected text
    const selectedGlyphs = font.getGlyphIDs(selectedText);
    const selectedWidths = font.getGlyphWidths(selectedGlyphs);
    const selectionWidth = selectedWidths.reduce((sum, w) => sum + w, 0);

    // Get font metrics for selection height
    const metrics = font.getMetrics();
    const ascent = metrics.ascent; // Negative
    const descent = metrics.descent; // Positive

    const selectionY = textObj.startY - ascent; // Baseline - ascent = top
    const selectionHeight = descent - ascent;

    // Create paint for selection background
    const selectionPaint = new ck.Paint();
    // iOS-style selection color: blue with transparency
    selectionPaint.setColor(ck.Color(0, 122, 255, 0.3 * 255)); // RGBA
    selectionPaint.setStyle(ck.PaintStyle.Fill);
    selectionPaint.setAntiAlias(true);

    try {
      // Draw selection rectangle
      const rect = ck.LTRBRect(
        selectionStartX,
        selectionY,
        selectionStartX + selectionWidth,
        selectionY + selectionHeight
      );

      canvas.drawRect(rect, selectionPaint);
    } finally {
      selectionPaint.delete();
    }
  }
}
