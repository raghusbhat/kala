import {
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  ForwardedRef,
  ReactNode,
} from "react";
import type {
  CanvasKit as CanvasKitType,
  FontMgr,
  Surface,
  Canvas,
  Paint,
  Path,
} from "canvaskit-wasm";
import CanvasKitInit from "canvaskit-wasm";
import "./SkiaCanvas.css";
import { useCanvasStore, type CanvasObject } from "../../lib/store";
import { useTextTool } from "../../lib/useTextTool";
import type { SkiaObjectDataForApp } from "../CanvasArea";
import {
  hexToRgba,
  getObjectCenter,
  getObjectBounds,
  rotatePoint,
  calculateAngle,
  calculateDistance,
  drawFigmaHandle,
} from "./skiaUtils";

let canvasKitPromise: Promise<{ ck: CanvasKitType; fm: FontMgr }> | null = null;
let canvasKitInstance: CanvasKitType | null = null;
let fontManagerInstance: FontMgr | null = null;

export type DrawingTool =
  | "none"
  | "select"
  | "rectangle"
  | "ellipse"
  | "line"
  | "pen"
  | "text";

enum HandlePosition {
  TopLeft = 0,
  TopRight = 1,
  BottomLeft = 2,
  BottomRight = 3,
  Left = 4,
  Top = 5,
  Right = 6,
  Bottom = 7,
  Rotation = 8,
}

const ROTATE_CURSOR =
  'url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path d="M12,2 A10,10 0 0,1 22,12" stroke="%231299E6" stroke-width=2 fill="none"/><polyline points="22,12 20,10 20,14" stroke="%231299E6" stroke-width=2 fill="none"/></svg>") 8 8, auto';

// Cursor styles for different handle positions
const CURSOR_STYLES: Record<HandlePosition, string> = {
  [HandlePosition.TopLeft]: "nwse-resize",
  [HandlePosition.TopRight]: "nesw-resize",
  [HandlePosition.BottomLeft]: "nesw-resize",
  [HandlePosition.BottomRight]: "nwse-resize",
  [HandlePosition.Left]: "ew-resize",
  [HandlePosition.Top]: "ns-resize",
  [HandlePosition.Right]: "ew-resize",
  [HandlePosition.Bottom]: "ns-resize",
  [HandlePosition.Rotation]: ROTATE_CURSOR,
};

interface Handle {
  position: HandlePosition;
  x: number;
  y: number;
  cursor: string;
  action: "scale" | "rotate";
}

interface SkiaCanvasProps {
  onObjectCreated?: (objectData: SkiaObjectDataForApp) => string;
  onObjectSelected?: (objectIndex: number | null) => void;
}

interface SkiaCanvasRefType {
  getObjects: () => SkiaObjectDataForApp[];
  redraw: () => void;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface DrawingState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  canvas: Canvas | null;
  paint: Paint | null;
  path: Path | null;
  selectedObjectIndex: number | null;
  activeHandle: Handle | null;
  initialAngle: number;
  initialDistance: number;
  initialObjectRotation: number;
  initialObjectScale: { x: number; y: number };
  initialHalfDims: { width: number; height: number };
  surface: Surface | null;
  handles?: Handle[];
  dragStartObject: SkiaObjectDataForApp | null;
  dragStartPivotWorld: { x: number; y: number } | null;
  dragStartHandleWorld: { x: number; y: number } | null;
  isObjectDragging: boolean;
  dragStartObjectPosition: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  dragStartMouse: { x: number; y: number } | null;
}

const SkiaCanvas = forwardRef<SkiaCanvasRefType, SkiaCanvasProps>(
  (
    { onObjectCreated, onObjectSelected },
    ref: ForwardedRef<SkiaCanvasRefType>
  ): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const {
      textareaRef,
      textToolActiveRef,
      clickedPositionRef,
      showTextInput,
      setShowTextInput,
      activateTextTool,
    } = useTextTool();

    const {
      objects: storeObjects,
      currentTool,
      scale,
      offset,
      currentColor,
      currentStrokeColor,
      strokeWidth,
      // Actions
      setCurrentTool,
      addObject,
      updateObject,
      rotateObject,
      scaleObject,
      setOffset: setOffsetAction,
      setScale: setScaleAction,
    } = useCanvasStore();

    // Manage object selection locally in this component
    const [selectedObjectIndex, setSelectedObjectIndex] = useState<
      number | null
    >(null);

    // Notify parent component when selection changes
    useEffect(() => {
      if (onObjectSelected) {
        onObjectSelected(selectedObjectIndex);
      }
    }, [selectedObjectIndex, onObjectSelected]);

    if (!updateObject) {
      return null;
    }

    const [ck, setCk] = useState<CanvasKitType | null>(canvasKitInstance);
    const [fontMgr, setFontMgr] = useState<FontMgr | null>(fontManagerInstance);

    const [isDrawing, setIsDrawing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState<CanvasSize>({
      width: 0,
      height: 0,
    });

    const drawingStateRef = useRef<DrawingState>({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      canvas: null,
      paint: null,
      path: null,
      selectedObjectIndex: null,
      activeHandle: null,
      initialAngle: 0,
      initialDistance: 0,
      initialObjectRotation: 0,
      initialObjectScale: { x: 1, y: 1 },
      initialHalfDims: { width: 0, height: 0 },
      surface: null,
      handles: undefined,
      dragStartObject: null,
      dragStartPivotWorld: null,
      dragStartHandleWorld: null,
      isObjectDragging: false,
      dragStartObjectPosition: null,
      dragStartMouse: null,
    });

    const [hoveredObjectIndex, setHoveredObjectIndex] = useState<number | null>(
      null
    );

    const drawSelectionHandlesInternal = useCallback(
      (canvas: Canvas, localCk: CanvasKitType, obj: SkiaObjectDataForApp) => {
        if (!obj || obj.type === "select" || !localCk) return [];
        const rotation = obj.rotation || 0;
        const center = getObjectCenter(obj);
        const bounds = getObjectBounds(obj);
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        const width = bounds.width * scaleX;
        const height = bounds.height * scaleY;
        const handleSize = 8; // Size of the handle in pixels
        // const handleHitRadius = 6; // Hit detection radius (not currently used)
        const rotateHandleOffset = 36;

        const blue = localCk.Color(0, 153, 255, 1.0);
        const white = localCk.Color(255, 255, 255, 1.0);
        const shadow = localCk.Color(0, 0, 0, Math.round(0.15 * 255));

        // Draw the selection rectangle (now solid blue)
        const rectPaint = new localCk.Paint();
        rectPaint.setAntiAlias(true);
        rectPaint.setColor(blue);
        rectPaint.setStyle(localCk.PaintStyle.Stroke);
        rectPaint.setStrokeWidth(1.5); // Keep stroke width consistent
        // const dashEffectInstance = localCk.PathEffect?.MakeDash?.([4, 2], 0); // Removed for solid line
        // if (dashEffectInstance) rectPaint.setPathEffect(dashEffectInstance);

        canvas.save();
        canvas.translate(center.x, center.y);
        canvas.rotate(rotation, 0, 0);

        // Draw the selection rectangle
        canvas.drawRect(
          localCk.LTRBRect(-width / 2, -height / 2, width / 2, height / 2),
          rectPaint
        );
        rectPaint.delete();

        // Create handles for corners and edges
        const handles: Handle[] = [
          // Corner handles
          {
            position: HandlePosition.TopLeft,
            x: -width / 2,
            y: -height / 2,
            cursor: "nwse-resize",
            action: "scale" as const,
          },
          {
            position: HandlePosition.TopRight,
            x: width / 2,
            y: -height / 2,
            cursor: "nesw-resize",
            action: "scale" as const,
          },
          {
            position: HandlePosition.BottomLeft,
            x: -width / 2,
            y: height / 2,
            cursor: "nesw-resize",
            action: "scale" as const,
          },
          {
            position: HandlePosition.BottomRight,
            x: width / 2,
            y: height / 2,
            cursor: "nwse-resize",
            action: "scale" as const,
          },
          // Edge handles
          {
            position: HandlePosition.Left,
            x: -width / 2,
            y: 0,
            cursor: "ew-resize",
            action: "scale" as const,
          },
          {
            position: HandlePosition.Top,
            x: 0,
            y: -height / 2,
            cursor: "ns-resize",
            action: "scale" as const,
          },
          {
            position: HandlePosition.Right,
            x: width / 2,
            y: 0,
            cursor: "ew-resize",
            action: "scale" as const,
          },
          {
            position: HandlePosition.Bottom,
            x: 0,
            y: height / 2,
            cursor: "ns-resize",
            action: "scale" as const,
          },
        ];

        // Make corner handles slightly larger
        const cornerHandleSize = handleSize * 1.5;

        // Draw each handle
        handles.forEach((handle) => {
          const isCorner = handle.position <= HandlePosition.BottomRight;
          const size = isCorner ? cornerHandleSize : handleSize;

          // Draw the handle (only draw corner handles, edge handles are invisible but hittable)
          if (isCorner) {
            drawFigmaHandle(
              canvas as any,
              localCk,
              handle.x,
              handle.y,
              size / 2,
              blue,
              white,
              shadow
            );
          }

          // Update handle coordinates to be in canvas space
          const rotatedPoint = rotatePoint(handle.x, handle.y, 0, 0, rotation);
          handle.x = center.x + rotatedPoint.x;
          handle.y = center.y + rotatedPoint.y;

          // Update cursor based on handle position
          handle.cursor = CURSOR_STYLES[handle.position];
        });

        // Draw rotation handle line
        const linePaint = new localCk.Paint();
        linePaint.setAntiAlias(true);
        linePaint.setColor(blue);
        linePaint.setStyle(localCk.PaintStyle.Stroke);
        linePaint.setStrokeWidth(1.5);
        canvas.drawLine(
          0,
          -height / 2,
          0,
          -height / 2 - rotateHandleOffset,
          linePaint
        );
        linePaint.delete();

        // Draw rotation handle
        const rotHandleBaseX = 0;
        const rotHandleBaseY = -height / 2 - rotateHandleOffset;
        drawFigmaHandle(
          canvas as any,
          localCk,
          rotHandleBaseX,
          rotHandleBaseY,
          handleSize / 2,
          blue,
          white,
          shadow
        );

        // Add rotation handle to the handles array
        const rotatedRotHandlePoint = rotatePoint(
          rotHandleBaseX,
          rotHandleBaseY,
          0,
          0,
          rotation
        );
        handles.push({
          position: HandlePosition.Rotation,
          x: center.x + rotatedRotHandlePoint.x,
          y: center.y + rotatedRotHandlePoint.y,
          cursor: ROTATE_CURSOR,
          action: "rotate",
        });

        canvas.restore();
        return handles;
      },
      [ck]
    );

    const hitTestHandles = (
      x: number,
      y: number,
      handles: Handle[] | undefined
    ) => {
      if (!handles) return null;
      const threshold = 14;
      for (const handle of handles) {
        if (calculateDistance(x, y, handle.x, handle.y) <= threshold)
          return handle;
      }
      return null;
    };

    const redraw = useCallback(() => {
      if (
        !ck ||
        !drawingStateRef.current.canvas ||
        !drawingStateRef.current.surface
      )
        return;

      const canvas = drawingStateRef.current.canvas;
      canvas.clear(ck.BLACK);

      canvas.save(); // Global transform save
      canvas.translate(offset.x, offset.y);
      canvas.scale(scale, scale);

      const renderedTextIds = new Set<string>();
      let activeSelectionHandles: Handle[] | undefined;

      storeObjects.forEach((obj, index) => {
        if (obj.visible === false) return;
        if (obj.type === "text" && obj.id && renderedTextIds.has(obj.id))
          return;
        if (obj.type === "text" && obj.id) renderedTextIds.add(obj.id);

        const fillPaint = new ck.Paint();
        fillPaint.setAntiAlias(true);
        if (obj.fillColor && obj.fillColor !== "transparent") {
          const { r, g, b, a } = hexToRgba(obj.fillColor);
          fillPaint.setColor(ck.Color4f(r, g, b, a));
        } else {
          fillPaint.setColor(ck.Color4f(0, 0, 0, 0));
        }
        fillPaint.setStyle(ck.PaintStyle.Fill);

        const strokePaint = new ck.Paint();
        strokePaint.setAntiAlias(true);
        if (obj.strokeColor && obj.strokeColor !== "transparent") {
          const { r, g, b, a } = hexToRgba(obj.strokeColor);
          strokePaint.setColor(ck.Color4f(r, g, b, a));
        } else {
          strokePaint.setColor(ck.Color4f(0, 0, 0, 0));
        }
        if (obj.strokeWidth) strokePaint.setStrokeWidth(obj.strokeWidth);
        strokePaint.setStyle(ck.PaintStyle.Stroke);

        canvas.save(); // Object's local transform save
        const objRot = obj.rotation || 0;
        const objSX = obj.scaleX || 1;
        const objSY = obj.scaleY || 1;

        if (objRot !== 0 || objSX !== 1 || objSY !== 1) {
          const cx = (obj.startX + obj.endX) / 2;
          const cy = (obj.startY + obj.endY) / 2;
          canvas.translate(cx, cy);
          if (objRot !== 0) canvas.rotate(objRot, 0, 0);
          if (objSX !== 1 || objSY !== 1) canvas.scale(objSX, objSY);
          canvas.translate(-cx, -cy);
        }

        const rectBounds = ck.LTRBRect(
          obj.startX,
          obj.startY,
          obj.endX,
          obj.endY
        );

        // Draw the main object
        if (obj.type === "rectangle") {
          if (fillPaint.getColor()[3] > 0.001)
            canvas.drawRect(rectBounds, fillPaint);
          if (strokePaint.getColor()[3] > 0.001 && (obj.strokeWidth || 0) > 0)
            canvas.drawRect(rectBounds, strokePaint);
        } else if (obj.type === "ellipse") {
          if (fillPaint.getColor()[3] > 0.001)
            canvas.drawOval(rectBounds, fillPaint);
          if (strokePaint.getColor()[3] > 0.001 && (obj.strokeWidth || 0) > 0)
            canvas.drawOval(rectBounds, strokePaint);
        } else if (obj.type === "pen" && obj.path) {
          strokePaint.setStrokeJoin(ck.StrokeJoin.Round);
          strokePaint.setStrokeCap(ck.StrokeCap.Round);
          const {
            r: sr,
            g: sg,
            b: sb,
            a: sa,
          } = hexToRgba(obj.strokeColor || currentColor); // Use object's stroke or current
          strokePaint.setColor(ck.Color4f(sr, sg, sb, sa));
          canvas.drawPath(obj.path, strokePaint);
        } else if (obj.type === "text" && obj.text && fontMgr) {
          fillPaint.setStyle(ck.PaintStyle.Fill);
          try {
            const typeface = fontMgr.matchFamilyStyle("Roboto", {
              weight: ck.FontWeight.Normal,
              width: ck.FontWidth.Normal,
              slant: ck.FontSlant.Upright,
            });
            if (!typeface) throw new Error("Roboto typeface not found");
            const font = new ck.Font(typeface, obj.fontSize || 20);
            canvas.drawText(
              obj.text,
              obj.startX,
              obj.startY + (obj.fontSize || 20) * 0.75,
              fillPaint,
              font
            );
            font.delete();
          } catch (e) {
            console.warn("Failed to load font:", e);
          }
        }

        // Draw hover highlight (only if not selected, to avoid double borders/visuals)
        if (
          currentTool === "select" &&
          index === hoveredObjectIndex &&
          index !== selectedObjectIndex
        ) {
          const hoverPaint = new ck.Paint();
          hoverPaint.setAntiAlias(true);
          hoverPaint.setColor(ck.Color4f(0.3, 0.7, 1.0, 0.4)); // Light blue, semi-transparent
          hoverPaint.setStyle(ck.PaintStyle.Stroke);
          hoverPaint.setStrokeWidth(1.5);
          const dashEffect = ck.PathEffect.MakeDash?.([3, 3], 0);
          if (dashEffect) {
            hoverPaint.setPathEffect(dashEffect);
          }

          if (obj.type === "rectangle") {
            canvas.drawRect(rectBounds, hoverPaint);
          } else if (obj.type === "ellipse") {
            canvas.drawOval(rectBounds, hoverPaint);
          } else if (obj.type === "pen") {
            // For pen, draw highlight around its original bounding box for consistency
            canvas.drawRect(rectBounds, hoverPaint);
          } else if (obj.type === "text" && obj.text && fontMgr) {
            const fs = obj.fontSize || 20;
            const typeface = fontMgr.matchFamilyStyle("Roboto", {});
            if (typeface) {
              const font = new ck.Font(typeface, fs);
              const glyphIDs = font.getGlyphIDs(obj.text);
              const glyphWidths = font.getGlyphWidths(glyphIDs);
              const textWidth = glyphWidths.reduce((sum, w) => sum + w, 0);
              font.delete();
              const textHoverRect = ck.LTRBRect(
                obj.startX - 2, // Padding
                obj.startY - fs * 0.2 - 2, // Approx top relative to startY
                obj.startX + textWidth + 2, // Approx right
                obj.startY + fs * 0.8 + 2 // Approx bottom relative to startY
              );
              canvas.drawRect(textHoverRect, hoverPaint);
            }
          }
          hoverPaint.delete();
          dashEffect?.delete();
        }

        canvas.restore(); // Restore object local transform
        fillPaint.delete();
        strokePaint.delete();
      });

      // 2. Draw Hover Highlight (if any, and not also selected)
      // This highlight is drawn in world space (scaled by canvas view)
      // around the object's transformed bounding box.
      if (
        hoveredObjectIndex !== null &&
        hoveredObjectIndex !== selectedObjectIndex &&
        (currentTool === "none" || currentTool === "select")
      ) {
        const obj = storeObjects[hoveredObjectIndex];
        if (obj) {
          canvas.save(); // Save before this specific highlight's transform
          const center = getObjectCenter(obj);
          const bounds = getObjectBounds(obj);
          const objRot = obj.rotation || 0;
          const objScaleX = obj.scaleX || 1;
          const objScaleY = obj.scaleY || 1;

          canvas.translate(center.x, center.y);
          canvas.rotate(objRot, 0, 0);

          const highlightWidth = bounds.width * objScaleX;
          const highlightHeight = bounds.height * objScaleY;

          const hoverPaint = new ck.Paint();
          hoverPaint.setColor(ck.Color(0, 153, 255, 1.0)); // Solid Blue (same as selection handles for consistency)
          hoverPaint.setStyle(ck.PaintStyle.Stroke);
          hoverPaint.setStrokeWidth(1.5 / scale); // Consistent stroke width on screen
          hoverPaint.setAntiAlias(true);

          canvas.drawRect(
            ck.LTRBRect(
              -highlightWidth / 2,
              -highlightHeight / 2,
              highlightWidth / 2,
              highlightHeight / 2
            ),
            hoverPaint
          );
          hoverPaint.delete();
          canvas.restore(); // Restore from this highlight's transform
        }
      }

      // 3. Draw Selection Handles (for selected object)
      if (selectedObjectIndex !== null) {
        const selectedObj = storeObjects[selectedObjectIndex];
        if (selectedObj) {
          activeSelectionHandles = drawSelectionHandlesInternal(
            canvas,
            ck,
            selectedObj
          );
        }
      }
      drawingStateRef.current.handles = activeSelectionHandles;

      canvas.restore(); // Global transform restore

      // 4. Live drawing preview (if any)
      if (isDrawing && drawingStateRef.current.activeHandle === null) {
        canvas.save(); // Save for preview, applying global transform
        canvas.translate(offset.x, offset.y);
        canvas.scale(scale, scale);

        const lfP = new ck.Paint();
        lfP.setAntiAlias(true);
        const { r: fr, g: fg, b: fb, a: fa } = hexToRgba(currentColor);
        lfP.setColor(ck.Color4f(fr, fg, fb, fa));
        const lsP = new ck.Paint();
        lsP.setAntiAlias(true);
        const { r: sr, g: sg, b: sb, a: sa } = hexToRgba(currentStrokeColor); // Use currentStrokeColor for preview stroke
        lsP.setColor(ck.Color4f(sr, sg, sb, sa));
        lsP.setStrokeWidth(strokeWidth);
        lsP.setStyle(ck.PaintStyle.Stroke);
        const { startX, startY, currentX, currentY } = drawingStateRef.current;
        const lrB = ck.LTRBRect(startX, startY, currentX, currentY);
        switch (currentTool) {
          case "rectangle":
            if (fa > 0.001) canvas.drawRect(lrB, lfP);
            if (sa > 0.001 && strokeWidth > 0) canvas.drawRect(lrB, lsP);
            break;
          case "ellipse":
            if (fa > 0.001) canvas.drawOval(lrB, lfP);
            if (sa > 0.001 && strokeWidth > 0) canvas.drawOval(lrB, lsP);
            break;
          case "line":
            // For line, only stroke makes sense for preview.
            // Use currentStrokeColor for line preview
            lsP.setColor(ck.Color4f(sr, sg, sb, sa));
            canvas.drawLine(startX, startY, currentX, currentY, lsP);
            break;
          case "pen":
            if (drawingStateRef.current.path) {
              lsP.setStrokeJoin(ck.StrokeJoin.Round);
              lsP.setStrokeCap(ck.StrokeCap.Round);
              // Pen preview uses currentStrokeColor
              lsP.setColor(ck.Color4f(sr, sg, sb, sa));
              canvas.drawPath(drawingStateRef.current.path, lsP);
            }
            break;
        }
        lfP.delete();
        lsP.delete();
        canvas.restore();
      }

      drawingStateRef.current.surface!.flush();
    }, [
      ck,
      fontMgr,
      scale,
      offset,
      canvasSize, // Though canvasSize doesn't directly affect drawing logic, surface creation depends on it.
      storeObjects,
      currentTool,
      currentColor,
      currentStrokeColor,
      strokeWidth,
      isDrawing,
      hoveredObjectIndex, // Removed from here, handled by its own useEffect
      drawSelectionHandlesInternal,
      selectedObjectIndex,
    ]);

    useLayoutEffect(() => {
      if (ck && drawingStateRef.current.canvas) {
        redraw();
      }
    }, [
      ck,
      fontMgr,
      redraw,
      storeObjects,
      offset,
      scale,
      currentTool,
      selectedObjectIndex,
      isDragging,
    ]);

    useEffect(() => {
      textToolActiveRef.current = currentTool === "text";
      if (currentTool !== "text" && textareaRef.current) {
        if (document.body.contains(textareaRef.current))
          document.body.removeChild(textareaRef.current);
        textareaRef.current = null;
        setShowTextInput(false);
      }
    }, [currentTool, setShowTextInput, textareaRef, textToolActiveRef]);

    useEffect(() => {
      if (canvasRef.current) {
        let cursor: string;
        if (currentTool === "none" || currentTool === "select")
          cursor = "default";
        else if (currentTool === "text") cursor = "text";
        else cursor = "crosshair";
        canvasRef.current.style.cursor = cursor;
      }
    }, [currentTool]);

    useImperativeHandle(ref, () => ({
      getObjects: () => storeObjects,
      redraw,
    }));

    useLayoutEffect(() => {
      if (!containerRef.current) return;
      const updateSize = () => {
        if (containerRef.current) {
          const { width, height } =
            containerRef.current.getBoundingClientRect();
          if (
            width > 0 &&
            height > 0 &&
            (width !== canvasSize.width || height !== canvasSize.height)
          ) {
            setCanvasSize({ width, height });
            // Sync canvas element size to container for correct pixel rendering
            if (canvasRef.current) {
              canvasRef.current.width = Math.floor(width);
              canvasRef.current.height = Math.floor(height);
            }
          }
        }
      };
      updateSize();
      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(containerRef.current);
      window.addEventListener("resize", updateSize);
      return () => {
        if (containerRef.current)
          resizeObserver.unobserve(containerRef.current);
        window.removeEventListener("resize", updateSize);
      };
    }, [canvasSize.width, canvasSize.height]);

    useEffect(() => {
      const init = async () => {
        if (canvasKitInstance && fontManagerInstance) {
          setCk(canvasKitInstance);
          setFontMgr(fontManagerInstance);
          return;
        }
        if (!canvasKitPromise) {
          canvasKitPromise = (async () => {
            try {
              const loadedCK = await CanvasKitInit({
                locateFile: (file) => `/canvaskit/${file}`,
              }).catch(() => {
                return CanvasKitInit({
                  locateFile: (file) =>
                    `https://unpkg.com/canvaskit-wasm@0.38.0/bin/${file}`,
                });
              });
              const fontData = await fetch(
                "https://storage.googleapis.com/skia-cdn/misc/Roboto-Regular.ttf"
              ).then((res) => res.arrayBuffer());
              const loadedFM = loadedCK.FontMgr.FromData(fontData);
              if (!loadedFM) {
                throw new Error("Font manager creation failed");
              }
              canvasKitInstance = loadedCK;
              fontManagerInstance = loadedFM;
              return { ck: loadedCK, fm: loadedFM };
            } catch (error) {
              canvasKitPromise = null;
              throw error;
            }
          })();
        } else {
        }
        try {
          const { ck: resolvedCK, fm: resolvedFM } = await canvasKitPromise;
          setCk(resolvedCK);
          setFontMgr(resolvedFM);
        } catch (error) {}
      };
      init();
    }, []);

    useEffect(() => {
      if (
        currentTool === "select" &&
        storeObjects.length > 0 &&
        selectedObjectIndex === null &&
        ck
      ) {
        // Problematic auto-selection: If the user explicitly deselects all items
        // (selectedObjectIndex becomes null) while the tool is still "select",
        // this would immediately re-select the last object. This is not desired.
        // Selection should primarily be driven by explicit user clicks.
        // setSelectedObjectIndex(storeObjects.length - 1);
      }
    }, [
      currentTool,
      storeObjects,
      redraw,
      ck,
      selectedObjectIndex,
      setSelectedObjectIndex,
    ]);

    useEffect(() => {
      if (
        !ck ||
        !canvasRef.current ||
        canvasSize.width === 0 ||
        canvasSize.height === 0
      )
        return;

      const oldSurface = drawingStateRef.current.surface;
      if (oldSurface) {
        oldSurface.delete();
      }

      drawingStateRef.current.canvas = null;

      const surface = ck.MakeCanvasSurface(canvasRef.current);
      if (!surface) {
        return;
      }
      const canvas = surface.getCanvas();
      if (!canvas) {
        surface.delete();
        return;
      }

      drawingStateRef.current.surface = surface;
      drawingStateRef.current.canvas = canvas;

      canvas.clear(ck.BLACK);
      surface.flush();
      redraw();
      surface.flush(); // initial flush after clear

      return () => {
        if (drawingStateRef.current.surface === surface) {
          surface.delete();
          drawingStateRef.current.surface = null;
          drawingStateRef.current.canvas = null;
        }
      };
    }, [ck, canvasSize, redraw]);

    useLayoutEffect(() => {
      if (ck && drawingStateRef.current.canvas) {
        redraw();
      }
    }, [ck, scale, offset, redraw]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (
        showTextInput ||
        textareaRef.current ||
        !ck ||
        !drawingStateRef.current.canvas
      )
        return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left,
        mouseY = e.clientY - rect.top;
      const worldX = (mouseX - offset.x) / scale,
        worldY = (mouseY - offset.y) / scale;

      const state = drawingStateRef.current;

      if (e.buttons === 4 || e.metaKey) {
        setIsDragging(true);
        setDragStart({ x: mouseX, y: mouseY });
        return;
      }

      if (currentTool === "text") {
        activateTextTool(mouseX, mouseY, worldX, worldY, handleTextSubmit);
        return;
      }

      if (currentTool === "select" || currentTool === "none") {
        if (state.activeHandle) {
          return;
        }

        let hitIndex = -1;
        for (let i = storeObjects.length - 1; i >= 0; i--) {
          const obj = storeObjects[i] as SkiaObjectDataForApp;
          if (obj.visible === false) continue;

          const center = getObjectCenter(obj);
          const bounds = getObjectBounds(obj);
          const rot = obj.rotation || 0;
          const sX = obj.scaleX || 1;
          const sY = obj.scaleY || 1;
          let isHit = false;

          let localMouseX = worldX - center.x;
          let localMouseY = worldY - center.y;

          if (rot !== 0) {
            const p = rotatePoint(localMouseX, localMouseY, 0, 0, -rot);
            localMouseX = p.x;
            localMouseY = p.y;
          }

          const unscaledLocalMouseX = localMouseX / sX;
          const unscaledLocalMouseY = localMouseY / sY;

          const unscaledHalfWidth = bounds.width / 2;
          const unscaledHalfHeight = bounds.height / 2;

          if (obj.type === "rectangle" || obj.type === "pen") {
            isHit =
              Math.abs(unscaledLocalMouseX) <= unscaledHalfWidth &&
              Math.abs(unscaledLocalMouseY) <= unscaledHalfHeight;
          } else if (obj.type === "ellipse") {
            if (
              Math.abs(unscaledLocalMouseX) <= unscaledHalfWidth &&
              Math.abs(unscaledLocalMouseY) <= unscaledHalfHeight
            ) {
              const normX = unscaledLocalMouseX / unscaledHalfWidth;
              const normY = unscaledLocalMouseY / unscaledHalfHeight;
              isHit = normX * normX + normY * normY <= 1;
            }
          } else if (obj.type === "text" && obj.text && ck && fontMgr) {
            const tPt =
              rot !== 0
                ? rotatePoint(worldX, worldY, center.x, center.y, -rot)
                : { x: worldX, y: worldY };
            const fs = obj.fontSize || 20;
            const typeface = fontMgr.matchFamilyStyle("Roboto", {});
            if (typeface) {
              const font = new ck.Font(typeface, fs);
              const glyphIDs = font.getGlyphIDs(obj.text);
              const glyphWidths = font.getGlyphWidths(glyphIDs);
              const fontForMeasure = new ck.Font(typeface, obj.fontSize || 20);
              const unscaledGlyphIDs = fontForMeasure.getGlyphIDs(obj.text);
              const unscaledGlyphWidths =
                fontForMeasure.getGlyphWidths(unscaledGlyphIDs);
              const unscaledTextWidth = unscaledGlyphWidths.reduce(
                (sum, w) => sum + w,
                0
              );
              fontForMeasure.delete();
              font.delete();

              const scaledTextWidth = unscaledTextWidth * sX;
              const scaledTextHeight = (obj.fontSize || 20) * sY;

              const textRectLeft = obj.startX;
              const textRectTop = obj.startY;
              const textRectRight = obj.startX + scaledTextWidth;
              const textRectBottom = obj.startY + scaledTextHeight;

              isHit =
                tPt.x >= textRectLeft &&
                tPt.x <= textRectRight &&
                tPt.y >= textRectTop &&
                tPt.y <= textRectBottom;
            }
          }

          if (isHit) {
            hitIndex = i;
            break;
          }
        }

        if (hitIndex !== -1) {
          if (selectedObjectIndex !== hitIndex) {
            setSelectedObjectIndex(hitIndex);
            state.activeHandle = null;
          }
          state.isObjectDragging = true;
          const objToDrag = storeObjects[hitIndex];
          state.dragStartObjectPosition = {
            startX: objToDrag.startX,
            startY: objToDrag.startY,
            endX: objToDrag.endX,
            endY: objToDrag.endY,
          };
          state.dragStartMouse = { x: worldX, y: worldY };

          // Also preserve the current scale values for dragging
          state.dragStartObject = {
            ...objToDrag,
            scaleX: objToDrag.scaleX || 1,
            scaleY: objToDrag.scaleY || 1,
          };

          if (currentTool === "none") {
            setCurrentTool("select");
          }
          setHoveredObjectIndex(null);
        } else {
          if (selectedObjectIndex !== null) {
            setSelectedObjectIndex(null);
            state.activeHandle = null;
          }
          state.isObjectDragging = false;
        }
        redraw();
        setIsDrawing(false);
        return;
      }

      Object.assign(state, {
        startX: worldX,
        startY: worldY,
        currentX: worldX,
        currentY: worldY,
      });
      if (currentTool === "pen") {
        const path = new ck.Path();
        path.moveTo(worldX, worldY);
        state.path = path;
      }
      state.activeHandle = null;
      setIsDrawing(true);
      redraw();
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ck || !drawingStateRef.current.canvas) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left,
        mouseY = e.clientY - rect.top;
      const worldX = (mouseX - offset.x) / scale,
        worldY = (mouseY - offset.y) / scale;
      const state = drawingStateRef.current;

      if (isDragging) {
        setOffsetAction({
          x: offset.x + (mouseX - dragStart.x),
          y: offset.y + (mouseY - dragStart.y),
        });
        setDragStart({ x: mouseX, y: mouseY });

        // Force immediate redraw for smoother panning
        requestAnimationFrame(redraw);
        return;
      }

      if (
        state.isObjectDragging &&
        selectedObjectIndex !== null &&
        state.dragStartObjectPosition &&
        state.dragStartMouse
      ) {
        const dx = worldX - state.dragStartMouse.x;
        const dy = worldY - state.dragStartMouse.y;

        const newStartX = state.dragStartObjectPosition.startX + dx;
        const newStartY = state.dragStartObjectPosition.startY + dy;
        const newEndX = state.dragStartObjectPosition.endX + dx;
        const newEndY = state.dragStartObjectPosition.endY + dy;

        if (selectedObjectIndex !== null) {
          const currentObject = storeObjects[selectedObjectIndex];
          updateObject(selectedObjectIndex, {
            startX: newStartX,
            startY: newStartY,
            endX: newEndX,
            endY: newEndY,
            scaleX: currentObject.scaleX || 1,
            scaleY: currentObject.scaleY || 1,
          });
        }
        redraw();
        return;
      }

      if (
        !isDrawing &&
        !state.activeHandle &&
        (currentTool === "select" || currentTool === "none")
      ) {
        let foundHoverIdx = -1;
        for (let i = storeObjects.length - 1; i >= 0; i--) {
          const obj = storeObjects[i] as SkiaObjectDataForApp;
          if (obj.visible === false) continue;

          const center = getObjectCenter(obj);
          const bounds = getObjectBounds(obj);
          const rot = obj.rotation || 0;
          const sX = obj.scaleX || 1;
          const sY = obj.scaleY || 1;
          let isHit = false;

          let localMouseX = worldX - center.x;
          let localMouseY = worldY - center.y;

          if (rot !== 0) {
            const p = rotatePoint(localMouseX, localMouseY, 0, 0, -rot);
            localMouseX = p.x;
            localMouseY = p.y;
          }

          const unscaledLocalMouseX = localMouseX / sX;
          const unscaledLocalMouseY = localMouseY / sY;

          const unscaledHalfWidth = bounds.width / 2;
          const unscaledHalfHeight = bounds.height / 2;

          if (obj.type === "rectangle" || obj.type === "pen") {
            isHit =
              Math.abs(unscaledLocalMouseX) <= unscaledHalfWidth &&
              Math.abs(unscaledLocalMouseY) <= unscaledHalfHeight;
          } else if (obj.type === "ellipse") {
            if (
              Math.abs(unscaledLocalMouseX) <= unscaledHalfWidth &&
              Math.abs(unscaledLocalMouseY) <= unscaledHalfHeight
            ) {
              const normX = unscaledLocalMouseX / unscaledHalfWidth;
              const normY = unscaledLocalMouseY / unscaledHalfHeight;
              isHit = normX * normX + normY * normY <= 1;
            }
          } else if (obj.type === "text" && obj.text && ck && fontMgr) {
            const tPt =
              rot !== 0
                ? rotatePoint(worldX, worldY, center.x, center.y, -rot)
                : { x: worldX, y: worldY };
            const fs = obj.fontSize || 20;
            const typeface = fontMgr.matchFamilyStyle("Roboto", {});
            if (typeface) {
              const fontForMeasure = new ck.Font(typeface, fs);
              const unscaledGlyphIDs = fontForMeasure.getGlyphIDs(obj.text);
              const unscaledGlyphWidths =
                fontForMeasure.getGlyphWidths(unscaledGlyphIDs);
              const unscaledTextWidth = unscaledGlyphWidths.reduce(
                (sum, w) => sum + w,
                0
              );
              fontForMeasure.delete();

              const scaledTextWidth = unscaledTextWidth * sX;
              const scaledTextHeight = fs * sY;

              const textRectLeft = obj.startX;
              const textRectTop = obj.startY;
              const textRectRight = obj.startX + scaledTextWidth;
              const textRectBottom = obj.startY + scaledTextHeight;

              isHit =
                tPt.x >= textRectLeft &&
                tPt.x <= textRectRight &&
                tPt.y >= textRectTop &&
                tPt.y <= textRectBottom;
            }
          }

          if (isHit) {
            foundHoverIdx = i;
            break;
          }
        }
        if (hoveredObjectIndex !== foundHoverIdx) {
          setHoveredObjectIndex(foundHoverIdx !== -1 ? foundHoverIdx : null);
        }
      } else if (isDrawing && !state.activeHandle) {
        state.currentX = worldX;
        state.currentY = worldY;
        if (currentTool === "pen" && state.path) {
          state.path.lineTo(worldX, worldY);
        }
        redraw();
      }
    };

    const handleMouseUp = () => {
      if (showTextInput || textareaRef.current || !ck) return;

      const state = drawingStateRef.current;

      // Always reset drag state to prevent getting stuck
      const wasDragging = isDragging;
      setIsDragging(false);

      // Also check and clear any active handle state as backup
      if (state.activeHandle) {
        state.activeHandle = null;
        state.dragStartObject = null;
        state.dragStartPivotWorld = null;
        state.dragStartHandleWorld = null;

        if (canvasRef.current) {
          canvasRef.current.style.cursor =
            currentTool === "select" || currentTool === "none"
              ? "default"
              : "crosshair";
        }
        redraw();
        return;
      }

      if (currentTool === "text") {
        setIsDrawing(false);
        return;
      }

      if (wasDragging) {
        redraw();
        return;
      }

      if (state.isObjectDragging) {
        state.isObjectDragging = false;
        state.dragStartObjectPosition = null;
        state.dragStartMouse = null;
        redraw();
        return;
      }

      if (isDrawing) {
        let endX = state.currentX;
        let endY = state.currentY;
        let isClickToCreate = false;

        if (
          currentTool === "rectangle" &&
          state.startX === state.currentX &&
          state.startY === state.currentY
        ) {
          const defaultSize = 100;
          endX = state.startX + defaultSize;
          endY = state.startY + defaultSize;
          isClickToCreate = true;
        }

        if (isDrawing || isClickToCreate) {
          const baseObjectProperties: Omit<
            SkiaObjectDataForApp,
            "type" | "endX" | "endY" | "path" | "text" | "id" | "fontSize"
          > = {
            startX: state.startX,
            startY: state.startY,
            visible: true,
            fillColor: currentColor,
            strokeColor: currentStrokeColor,
            strokeWidth: strokeWidth,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          };
          let completeObjectData: SkiaObjectDataForApp | null = null;
          if (
            currentTool === "rectangle" ||
            currentTool === "ellipse" ||
            currentTool === "line"
          ) {
            completeObjectData = {
              ...baseObjectProperties,
              type: currentTool,
              endX,
              endY,
            } as SkiaObjectDataForApp;
          } else if (currentTool === "pen" && state.path) {
            const pathCopy = state.path.copy();
            completeObjectData = {
              ...baseObjectProperties,
              type: "pen",
              endX,
              endY,
              path: pathCopy,
            } as SkiaObjectDataForApp;
            state.path.delete();
            state.path = null;
          }

          if (completeObjectData) {
            if (
              completeObjectData.type === "line" ||
              completeObjectData.type === "pen"
            ) {
              completeObjectData.fillColor = "transparent";
            }
            if (completeObjectData.type === "pen") {
              completeObjectData.strokeColor = currentStrokeColor;
            }

            if (onObjectCreated) {
              const layerId = onObjectCreated(completeObjectData);
              console.log(
                `[SkiaCanvas] Created object: ${completeObjectData.type}`
              );
            } else {
              const id = `${Date.now()}-${Math.random()}`;
              const objWithId = { ...completeObjectData, id };
              console.log(`[SkiaCanvas] Added object: ${objWithId.type}`);
              addObject(objWithId as any);
            }
            setCurrentTool("select");
          }
        }

        setIsDrawing(false);
        redraw();
        return;
      }

      setIsDrawing(false);
      if (
        canvasRef.current &&
        (currentTool === "select" || currentTool === "none") &&
        !state.activeHandle
      ) {
        canvasRef.current.style.cursor = "default";
      }
      redraw();
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!ck) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Zooming
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(scale * zoomFactor, 20));
        const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
        const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);
        setScaleAction(newScale);
        setOffsetAction({ x: newOffsetX, y: newOffsetY });
      } else {
        // Panning (standard wheel behavior):
        // When you scroll up/down, the content should move up/down
        // When deltaY is positive (scroll down), content moves up (negative offset change)
        // When deltaY is negative (scroll up), content moves down (positive offset change)
        setOffsetAction({
          x: offset.x - e.deltaX, // When scrolling right, content moves left
          y: offset.y - e.deltaY, // When scrolling down, content moves up
        });
      }
      // Force redraw after wheel event
      requestAnimationFrame(redraw);
    };

    const handleTextSubmit = (textValue: string) => {
      if (!ck || !textValue.trim() || !clickedPositionRef.current) return;
      const { x: worldX, y: worldY } = clickedPositionRef.current;
      const fontSize = 20;
      const textObjectData = {
        type: "text",
        startX: worldX,
        startY: worldY,
        endX: worldX,
        endY: worldY + fontSize,
        text: textValue,
        fontSize,
        fillColor: currentColor,
        strokeColor: "transparent",
        strokeWidth: 0,
        visible: true,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      } as SkiaObjectDataForApp;
      if (onObjectCreated) {
        const layerId = onObjectCreated(textObjectData);
      }
      setCurrentTool("none");
      setShowTextInput(false);
      if (textareaRef.current && document.body.contains(textareaRef.current)) {
        document.body.removeChild(textareaRef.current);
      }
      textareaRef.current = null;
    };

    useEffect(() => {
      return () => {
        if (drawingStateRef.current.path) drawingStateRef.current.path.delete();
        if (
          textareaRef.current &&
          document.body.contains(textareaRef.current)
        ) {
          try {
            document.body.removeChild(textareaRef.current);
          } catch (e) {
            /*ignore*/
          }
          textareaRef.current = null;
        }
      };
    }, [textareaRef]);

    useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || !ck || !storeObjects) return;

      const toCanvasCoords = (e: PointerEvent) => {
        const rect = canvasEl.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left - offset.x) / scale,
          y: (e.clientY - rect.top - offset.y) / scale,
        };
      };

      const onPointerDown = (e: PointerEvent) => {
        if (!ck || currentTool !== "select") return;
        const { x, y } = toCanvasCoords(e);
        const state = drawingStateRef.current;
        if (selectedObjectIndex !== null && state.handles) {
          const activeHandle = hitTestHandles(x, y, state.handles);
          if (activeHandle) {
            e.preventDefault();
            e.stopPropagation();
            state.activeHandle = activeHandle;
            state.isObjectDragging = false;
            if (canvasRef.current)
              canvasRef.current.style.cursor = activeHandle.cursor;
            const selectedObject = storeObjects[selectedObjectIndex];
            const center = getObjectCenter(selectedObject);
            if (activeHandle.action === "rotate") {
              state.initialAngle = calculateAngle(center.x, center.y, x, y);
              state.initialObjectRotation = selectedObject.rotation || 0;
              state.dragStartObject = null;
              state.dragStartPivotWorld = null;
              state.dragStartHandleWorld = null;
            } else if (activeHandle.action === "scale") {
              state.dragStartObject = JSON.parse(
                JSON.stringify(selectedObject)
              );
              const oppositeHandlePos = getOppositeHandlePosition(
                activeHandle.position
              );
              state.dragStartPivotWorld = getWorldCoordinatesOfHandle(
                oppositeHandlePos,
                selectedObject
              );
              state.dragStartHandleWorld = getWorldCoordinatesOfHandle(
                activeHandle.position,
                selectedObject
              );

              state.initialObjectScale = {
                x: selectedObject.scaleX || 1,
                y: selectedObject.scaleY || 1,
              };
            }
            return;
          }
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!ck) return;
        const state = drawingStateRef.current;
        const coords = toCanvasCoords(e);
        const x = coords.x;
        const y = coords.y;
        if (
          currentTool === "select" &&
          state.handles &&
          canvasEl &&
          !state.activeHandle
        ) {
          const hover = hitTestHandles(x, y, state.handles);
          if (hover) {
            canvasEl.style.cursor =
              hover.action === "rotate" ? ROTATE_CURSOR : hover.cursor;
          } else {
            canvasEl.style.cursor = "default";
          }
        }
        if (!state.activeHandle || selectedObjectIndex === null) return;
        e.preventDefault();
        e.stopPropagation();
        const selectedIdx = selectedObjectIndex;
        const selectedObject = storeObjects[selectedIdx];
        const center = getObjectCenter(selectedObject);

        if (state.activeHandle.action === "rotate") {
          const currentAngle = calculateAngle(center.x, center.y, x, y);
          const angleDiff = currentAngle - state.initialAngle;
          const newRotation = state.initialObjectRotation + angleDiff;
          rotateObject(selectedIdx, newRotation);
        } else if (state.activeHandle.action === "scale") {
          if (
            !state.dragStartObject ||
            !state.dragStartPivotWorld ||
            !state.dragStartHandleWorld
          )
            return;

          const originalObj = state.dragStartObject;
          const pivotWorld = state.dragStartPivotWorld;

          const originalBounds = getObjectBounds(originalObj);
          const originalCenter = getObjectCenter(originalObj);
          const objectRotation = originalObj.rotation || 0;

          const cursorRelativeToOriginalCenter = {
            x: x - originalCenter.x,
            y: y - originalCenter.y,
          };
          const pivotRelativeToOriginalCenter = {
            x: pivotWorld.x - originalCenter.x,
            y: pivotWorld.y - originalCenter.y,
          };

          const unrotatedCursor = rotatePoint(
            cursorRelativeToOriginalCenter.x,
            cursorRelativeToOriginalCenter.y,
            0,
            0,
            -objectRotation
          );
          const unrotatedPivot = rotatePoint(
            pivotRelativeToOriginalCenter.x,
            pivotRelativeToOriginalCenter.y,
            0,
            0,
            -objectRotation
          );

          const handleNormVec = getNormalizedHandleVector(
            state.activeHandle.position
          );

          let newScaleX = originalObj.scaleX || 1;
          let newScaleY = originalObj.scaleY || 1;

          const minDimension = 10;

          if (handleNormVec.x !== 0) {
            const currentProjectedDistX = unrotatedCursor.x - unrotatedPivot.x;
            const originalProjectedDistX =
              originalBounds.width *
              handleNormVec.x *
              (originalObj.scaleX || 1);
            if (Math.abs(originalProjectedDistX) > 1e-6) {
              newScaleX =
                currentProjectedDistX /
                (originalBounds.width * handleNormVec.x);
            }
            if (
              originalBounds.width * newScaleX * scale < minDimension &&
              newScaleX > 0
            )
              newScaleX = minDimension / scale / originalBounds.width;
            if (
              originalBounds.width * newScaleX * scale > -minDimension &&
              newScaleX < 0
            )
              newScaleX = -minDimension / scale / originalBounds.width;
          }

          if (handleNormVec.y !== 0) {
            const currentProjectedDistY = unrotatedCursor.y - unrotatedPivot.y;
            const originalProjectedDistY =
              originalBounds.height *
              handleNormVec.y *
              (originalObj.scaleY || 1);
            if (Math.abs(originalProjectedDistY) > 1e-6) {
              newScaleY =
                currentProjectedDistY /
                (originalBounds.height * handleNormVec.y);
            }
            if (
              originalBounds.height * newScaleY * scale < minDimension &&
              newScaleY > 0
            )
              newScaleY = minDimension / scale / originalBounds.height;
            if (
              originalBounds.height * newScaleY * scale > -minDimension &&
              newScaleY < 0
            )
              newScaleY = -minDimension / scale / originalBounds.height;
          }

          const minScaleFactor = 0.01;
          newScaleX =
            Math.abs(newScaleX) < minScaleFactor
              ? Math.sign(newScaleX) * minScaleFactor
              : newScaleX;
          newScaleY =
            Math.abs(newScaleY) < minScaleFactor
              ? Math.sign(newScaleY) * minScaleFactor
              : newScaleY;

          if (e.shiftKey && isCornerScaleHandle(state.activeHandle.position)) {
            const originalAspectRatio =
              originalBounds.width / originalBounds.height;
            if (handleNormVec.x !== 0 && handleNormVec.y !== 0) {
              const currentTotalWidth = Math.abs(
                unrotatedCursor.x - unrotatedPivot.x
              );
              const originalTotalWidth = Math.abs(
                originalBounds.width *
                  (originalObj.scaleX || 1) *
                  handleNormVec.x
              );
              const scaleBasedOnX = Math.abs(
                currentTotalWidth /
                  (originalBounds.width * Math.abs(handleNormVec.x))
              );

              const currentTotalHeight = Math.abs(
                unrotatedCursor.y - unrotatedPivot.y
              );
              const originalTotalHeight = Math.abs(
                originalBounds.height *
                  (originalObj.scaleY || 1) *
                  handleNormVec.y
              );
              const scaleBasedOnY = Math.abs(
                currentTotalHeight /
                  (originalBounds.height * Math.abs(handleNormVec.y))
              );

              const changeX = Math.abs(newScaleX / (originalObj.scaleX || 1));
              const changeY = Math.abs(newScaleY / (originalObj.scaleY || 1));

              if (changeX > changeY) {
                newScaleY =
                  Math.sign(newScaleY) *
                  Math.abs(
                    ((newScaleX / originalAspectRatio) *
                      originalBounds.height) /
                      originalBounds.width
                  );
              } else {
                newScaleX =
                  Math.sign(newScaleX) *
                  Math.abs(
                    (newScaleY * originalAspectRatio * originalBounds.width) /
                      originalBounds.height
                  );
              }
            }
          } else if (!isCornerScaleHandle(state.activeHandle.position)) {
            if (handleNormVec.x === 0) newScaleX = originalObj.scaleX || 1;
            if (handleNormVec.y === 0) newScaleY = originalObj.scaleY || 1;
          }

          const newScaledHalfWidth = (originalBounds.width / 2) * newScaleX;
          const newScaledHalfHeight = (originalBounds.height / 2) * newScaleY;

          const pivotRelativeToNewCenterUnrotated = {
            x:
              getNormalizedHandleVector(
                getOppositeHandlePosition(state.activeHandle.position)
              ).x * newScaledHalfWidth,
            y:
              getNormalizedHandleVector(
                getOppositeHandlePosition(state.activeHandle.position)
              ).y * newScaledHalfHeight,
          };

          const pivotRelativeToNewCenterRotated = rotatePoint(
            pivotRelativeToNewCenterUnrotated.x,
            pivotRelativeToNewCenterUnrotated.y,
            0,
            0,
            objectRotation
          );

          const newWorldCenterX =
            pivotWorld.x - pivotRelativeToNewCenterRotated.x;
          const newWorldCenterY =
            pivotWorld.y - pivotRelativeToNewCenterRotated.y;

          // Calculate the new position while preserving original dimensions
          // We need to update the object's center position based on how the scale affects it
          const originalObjCenter = getObjectCenter(originalObj);
          const centerOffsetX = newWorldCenterX - originalObjCenter.x;
          const centerOffsetY = newWorldCenterY - originalObjCenter.y;

          // Update only scale and center offset, keep original dimensions
          updateObject(selectedIdx, {
            startX: originalObj.startX + centerOffsetX,
            startY: originalObj.startY + centerOffsetY,
            endX: originalObj.endX + centerOffsetX,
            endY: originalObj.endY + centerOffsetY,
            scaleX: newScaleX,
            scaleY: newScaleY,
          });

          // Force redraw for immediate feedback
          requestAnimationFrame(redraw);
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        const state = drawingStateRef.current;
        if (state.activeHandle) {
          // Clear all scaling-related state when pointer is released
          state.activeHandle = null;
          state.dragStartObject = null;
          state.dragStartPivotWorld = null;
          state.dragStartHandleWorld = null;

          if (canvasRef.current) {
            canvasRef.current.style.cursor = "default";
          }

          redraw();
        }
      };

      canvasEl.addEventListener("pointerdown", onPointerDown);
      canvasEl.addEventListener("pointermove", onPointerMove);
      canvasEl.addEventListener("pointerup", onPointerUp);

      return () => {
        canvasEl.removeEventListener("pointerdown", onPointerDown);
        canvasEl.removeEventListener("pointermove", onPointerMove);
        canvasEl.removeEventListener("pointerup", onPointerUp);
      };
    }, [
      ck,
      currentTool,
      storeObjects,
      updateObject,
      scale,
      offset,
      selectedObjectIndex,
      setSelectedObjectIndex,
      rotateObject,
      scaleObject,
    ]);

    const getNormalizedHandleVector = (
      position: HandlePosition
    ): { x: number; y: number } => {
      switch (position) {
        case HandlePosition.TopLeft:
          return { x: -1, y: -1 };
        case HandlePosition.Top:
          return { x: 0, y: -1 };
        case HandlePosition.TopRight:
          return { x: 1, y: -1 };
        case HandlePosition.Left:
          return { x: -1, y: 0 };
        case HandlePosition.Right:
          return { x: 1, y: 0 };
        case HandlePosition.BottomLeft:
          return { x: -1, y: 1 };
        case HandlePosition.Bottom:
          return { x: 0, y: 1 };
        case HandlePosition.BottomRight:
          return { x: 1, y: 1 };
        default:
          return { x: 0, y: 0 };
      }
    };

    const getOppositeHandlePosition = (
      position: HandlePosition
    ): HandlePosition => {
      switch (position) {
        case HandlePosition.TopLeft:
          return HandlePosition.BottomRight;
        case HandlePosition.Top:
          return HandlePosition.Bottom;
        case HandlePosition.TopRight:
          return HandlePosition.BottomLeft;
        case HandlePosition.Left:
          return HandlePosition.Right;
        case HandlePosition.Right:
          return HandlePosition.Left;
        case HandlePosition.BottomLeft:
          return HandlePosition.TopRight;
        case HandlePosition.Bottom:
          return HandlePosition.Top;
        case HandlePosition.BottomRight:
          return HandlePosition.TopLeft;
        default:
          return position;
      }
    };

    const isCornerScaleHandle = (position: HandlePosition): boolean => {
      return (
        position === HandlePosition.TopLeft ||
        position === HandlePosition.TopRight ||
        position === HandlePosition.BottomLeft ||
        position === HandlePosition.BottomRight
      );
    };

    const getWorldCoordinatesOfHandle = (
      handlePosition: HandlePosition,
      object: SkiaObjectDataForApp,
      objectRotation: number = object.rotation || 0,
      objectScaleX: number = object.scaleX || 1,
      objectScaleY: number = object.scaleY || 1
    ): { x: number; y: number } => {
      const bounds = getObjectBounds(object);
      const objectCenter = getObjectCenter(object);
      const halfWidth = (bounds.width / 2) * objectScaleX;
      const halfHeight = (bounds.height / 2) * objectScaleY;
      const normVec = getNormalizedHandleVector(handlePosition);
      const localX = normVec.x * halfWidth;
      const localY = normVec.y * halfHeight;
      const rotatedHandlePoint = rotatePoint(
        localX,
        localY,
        0,
        0,
        objectRotation
      );
      return {
        x: objectCenter.x + rotatedHandlePoint.x,
        y: objectCenter.y + rotatedHandlePoint.y,
      };
    };

    const handleCanvasMouseLeave = useCallback(() => {
      const state = drawingStateRef.current;
      if (currentTool === "select") {
        // Only clear hover and active handle states, but keep the selection
        state.activeHandle = null;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = "default";
        }
        setHoveredObjectIndex(null);
        redraw();
      }
    }, [currentTool, redraw]);

    return (
      <div className="skia-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onMouseLeave={handleCanvasMouseLeave}
          style={{
            cursor: isDragging
              ? "grabbing"
              : drawingStateRef.current.activeHandle
              ? drawingStateRef.current.activeHandle.cursor
              : currentTool === "select"
              ? "default"
              : "crosshair",
            touchAction: "none",
          }}
        />
      </div>
    );
  }
);

export default SkiaCanvas;
