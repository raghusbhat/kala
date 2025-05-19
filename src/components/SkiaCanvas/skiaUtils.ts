import type { CanvasKit as CanvasKitType } from "canvaskit-wasm";

// It's good practice to define types for complex parameters if they are reused
// For now, keeping them as basic types or 'any' if they are directly passed to CanvasKit

export const hexToRgba = (hex: string, defaultAlpha = 1) => {
  if (hex === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const sanitizedHex = hex.replace("#", "");
  let r, g, b, a;

  if (sanitizedHex.length === 8) {
    r = parseInt(sanitizedHex.substring(0, 2), 16) / 255;
    g = parseInt(sanitizedHex.substring(2, 4), 16) / 255;
    b = parseInt(sanitizedHex.substring(4, 6), 16) / 255;
    a = parseInt(sanitizedHex.substring(6, 8), 16) / 255;
  } else if (sanitizedHex.length === 6) {
    r = parseInt(sanitizedHex.substring(0, 2), 16) / 255;
    g = parseInt(sanitizedHex.substring(2, 4), 16) / 255;
    b = parseInt(sanitizedHex.substring(4, 6), 16) / 255;
    a = defaultAlpha;
  } else {
    console.warn(`Invalid hex color: ${hex}, returning transparent black`);
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return { r, g, b, a };
};

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
  // Add other drawing methods if other utils need them
}

interface UtilCanvasKitType {
  Paint: new () => UtilCanvasKitPaint;
  PaintStyle: { Fill: any; Stroke: any }; // Simplified
  Color4f: (r: number, g: number, b: number, a: number) => any;
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
  const shadowPaint = new canvasKit.Paint();
  shadowPaint.setAntiAlias(true);
  shadowPaint.setColor(shadow);
  canvas.drawCircle(x, y, radius + 3, shadowPaint);
  shadowPaint.delete();

  const fillPaint = new canvasKit.Paint();
  fillPaint.setAntiAlias(true);
  fillPaint.setColor(white);
  fillPaint.setStyle(canvasKit.PaintStyle.Fill);
  canvas.drawCircle(x, y, radius, fillPaint);
  fillPaint.delete();

  const borderPaint = new canvasKit.Paint();
  borderPaint.setAntiAlias(true);
  borderPaint.setColor(blue);
  borderPaint.setStyle(canvasKit.PaintStyle.Stroke);
  borderPaint.setStrokeWidth(2);
  canvas.drawCircle(x, y, radius, borderPaint);
  borderPaint.delete();
};

// drawSelectionHandles could also be moved here later
