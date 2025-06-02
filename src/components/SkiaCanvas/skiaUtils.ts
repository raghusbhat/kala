import type { CanvasKit as CanvasKitType } from "canvaskit-wasm";

// It's good practice to define types for complex parameters if they are reused
// For now, keeping them as basic types or 'any' if they are directly passed to CanvasKit

export function hexToRgba(hex: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  // Handle transparent color
  if (hex === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Handle rgba() format
  if (hex.startsWith("rgba(")) {
    const match = hex.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255,
        a: parseFloat(match[4]),
      };
    }
  }

  // Remove # if present
  hex = hex.replace("#", "");

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  return { r, g, b, a: 1.0 };
}

export const getObjectCenter = (obj: {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}) => {
  const centerX = (obj.startX + obj.endX) / 2;
  const centerY = (obj.startY + obj.endY) / 2;
  return { x: centerX, y: centerY };
};

export const getObjectBounds = (obj: {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}) => {
  const width = Math.abs(obj.endX - obj.startX);
  const height = Math.abs(obj.endY - obj.startY);
  return { width, height };
};

export const rotatePoint = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angleInDegrees: number
) => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  const cos = Math.cos(angleInRadians);
  const sin = Math.sin(angleInRadians);
  const translatedX = x - centerX;
  const translatedY = y - centerY;
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;
  return {
    x: rotatedX + centerX,
    y: rotatedY + centerY,
  };
};

export const calculateAngle = (
  cx: number,
  cy: number,
  px: number,
  py: number
) => {
  const x = px - cx;
  const y = py - cy;
  return Math.atan2(y, x) * (180 / Math.PI);
};

export const calculateDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// More aligned placeholder types for CanvasKit objects used by drawFigmaHandle
// Ideally, these would be imported directly from "canvaskit-wasm" if skiaUtils grows further.
interface UtilCanvasKitPaint {
  setAntiAlias: (aa: boolean) => void;
  setColor: (color: any) => void;
  getColor: () => any;
  setStyle: (style: any) => void;
  setStrokeWidth: (width: number) => void;
  delete: () => void;
  // Add other methods if used by utils here, e.g., getColor(), but drawFigmaHandle does not use it.
}

interface UtilCanvasKitCanvas {
  drawCircle: (
    x: number,
    y: number,
    radius: number,
    paint: UtilCanvasKitPaint
  ) => void;
  drawRect: (rect: any, paint: UtilCanvasKitPaint) => void;
  // Add other drawing methods if other utils need them
}

interface UtilCanvasKitType {
  Paint: new () => UtilCanvasKitPaint;
  PaintStyle: { Fill: any; Stroke: any }; // Simplified
  Color4f: (r: number, g: number, b: number, a: number) => any;
  LTRBRect: (left: number, top: number, right: number, bottom: number) => any;
}

export const drawFigmaHandle = (
  canvas: UtilCanvasKitCanvas, // Use the util-specific interface
  canvasKit: UtilCanvasKitType, // Use the util-specific interface
  x: number,
  y: number,
  radius: number,
  blue: any,
  white: any,
  shadow: any
) => {
  // draw square handle with subtle border
  const fillPaint = new canvasKit.Paint();
  fillPaint.setAntiAlias(true);
  fillPaint.setColor(white);
  fillPaint.setStyle(canvasKit.PaintStyle.Fill);
  canvas.drawRect(
    canvasKit.LTRBRect(x - radius, y - radius, x + radius, y + radius),
    fillPaint
  );
  fillPaint.delete();

  const borderPaint = new canvasKit.Paint();
  borderPaint.setAntiAlias(true);
  borderPaint.setColor(blue);
  borderPaint.setStyle(canvasKit.PaintStyle.Stroke);
  borderPaint.setStrokeWidth(1);
  canvas.drawRect(
    canvasKit.LTRBRect(x - radius, y - radius, x + radius, y + radius),
    borderPaint
  );
  borderPaint.delete();
};

// drawSelectionHandles could also be moved here later
