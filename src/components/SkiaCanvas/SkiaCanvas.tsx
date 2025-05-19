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
import { useCanvasStore } from "../../lib/store";
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
  TopCenter = 1,
  TopRight = 2,
  MiddleRight = 3,
  BottomRight = 4,
  BottomCenter = 5,
  BottomLeft = 6,
  MiddleLeft = 7,
  Rotation = 8,
}

interface Handle {
  position: HandlePosition;
  x: number;
  y: number;
  cursor: string;
  action: "scale" | "rotate";
}

interface SkiaCanvasProps {
  onObjectCreated?: (objectData: SkiaObjectDataForApp) => string;
}

interface SkiaCanvasRefType {
  getObjects: () => SkiaObjectDataForApp[];
  redraw: () => void;
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
  surface: Surface | null;
  handles?: Handle[];
}

const SkiaCanvas = forwardRef<SkiaCanvasRefType, SkiaCanvasProps>(
  ({ onObjectCreated }, ref: ForwardedRef<SkiaCanvasRefType>): ReactNode => {
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
      currentTool,
      scale,
      offset,
      setOffset,
      setScale,
      currentColor,
      currentStrokeColor,
      strokeWidth,
      objects: storeObjects,
      addObject,
      rotateObject,
      scaleObject,
      setCurrentTool,
    } = useCanvasStore();

    const [ck, setCk] = useState<CanvasKitType | null>(canvasKitInstance);
    const [fontMgr, setFontMgr] = useState<FontMgr | null>(fontManagerInstance);

    const [isDrawing, setIsDrawing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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
      surface: null,
      handles: undefined,
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
        const handleRadius = 7;
        const rotateHandleOffset = 36;

        const blue = localCk.Color(0, 153, 255, 1.0);
        const white = localCk.Color(255, 255, 255, 1.0);
        const shadow = localCk.Color(0, 0, 0, Math.round(0.15 * 255));

        const rectPaint = new localCk.Paint();
        rectPaint.setAntiAlias(true);
        rectPaint.setColor(blue);
        rectPaint.setStyle(localCk.PaintStyle.Stroke);
        rectPaint.setStrokeWidth(1.5);
        const dashEffectInstance = localCk.PathEffect?.MakeDash?.([8, 4], 0);
        if (dashEffectInstance) rectPaint.setPathEffect(dashEffectInstance);

        canvas.save();
        canvas.translate(center.x, center.y);
        canvas.rotate(rotation, 0, 0);

        canvas.drawRect(
          localCk.LTRBRect(-width / 2, -height / 2, width / 2, height / 2),
          rectPaint
        );
        rectPaint.delete();

        const positions = [
          {
            x: -width / 2,
            y: -height / 2,
            cursor: "nwse-resize",
            posEnum: HandlePosition.TopLeft,
          },
          {
            x: 0,
            y: -height / 2,
            cursor: "ns-resize",
            posEnum: HandlePosition.TopCenter,
          },
          {
            x: width / 2,
            y: -height / 2,
            cursor: "nesw-resize",
            posEnum: HandlePosition.TopRight,
          },
          {
            x: width / 2,
            y: 0,
            cursor: "ew-resize",
            posEnum: HandlePosition.MiddleRight,
          },
          {
            x: width / 2,
            y: height / 2,
            cursor: "nwse-resize",
            posEnum: HandlePosition.BottomRight,
          },
          {
            x: 0,
            y: height / 2,
            cursor: "ns-resize",
            posEnum: HandlePosition.BottomCenter,
          },
          {
            x: -width / 2,
            y: height / 2,
            cursor: "nesw-resize",
            posEnum: HandlePosition.BottomLeft,
          },
          {
            x: -width / 2,
            y: 0,
            cursor: "ew-resize",
            posEnum: HandlePosition.MiddleLeft,
          },
        ];

        const handles: Handle[] = [];

        positions.forEach((pos) => {
          drawFigmaHandle(
            canvas as any,
            localCk,
            pos.x,
            pos.y,
            handleRadius,
            blue,
            white,
            shadow
          );
          const rotatedHandlePoint = rotatePoint(pos.x, pos.y, 0, 0, rotation);
          handles.push({
            position: pos.posEnum,
            x: center.x + rotatedHandlePoint.x,
            y: center.y + rotatedHandlePoint.y,
            cursor: pos.cursor,
            action: "scale",
          });
        });

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

        const rotHandleBaseX = 0;
        const rotHandleBaseY = -height / 2 - rotateHandleOffset;
        drawFigmaHandle(
          canvas as any,
          localCk,
          rotHandleBaseX,
          rotHandleBaseY,
          handleRadius,
          blue,
          white,
          shadow
        );
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
          cursor: "grab",
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
      console.group(`[TextFlow] [SkiaCanvas] redraw start: ${storeObjects.length} objects`);
      console.log(`offset:`, offset, `scale:`, scale);
      console.log(`storeObjects:`, storeObjects);
      if (
        !ck ||
        !drawingStateRef.current.canvas ||
        !drawingStateRef.current.surface
      )
        return;

      const canvas = drawingStateRef.current.canvas;
      console.log(`[TextFlow] [SkiaCanvas] canvas and surface ready, clearing...`);
      canvas.clear(ck.BLACK);
      console.log(`[TextFlow] [SkiaCanvas] canvas.clear done`);
      canvas.save();
      canvas.translate(offset.x, offset.y);
      canvas.scale(scale, scale);
      console.log(`[TextFlow] [SkiaCanvas] starting draw loop`);
      const renderedTextIds = new Set<string>();
      let activeSelectionHandles: Handle[] | undefined;

      storeObjects.forEach((obj, index) => {
        console.log(`[TextFlow] [SkiaCanvas] draw obj[${index}]:`, obj);
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

        canvas.save();
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

        if (index === drawingStateRef.current.selectedObjectIndex) {
          const hlPaint = new ck.Paint();
          hlPaint.setAntiAlias(true);
          hlPaint.setColor(ck.Color4f(0.0, 0.6, 1.0, 0.2));
          const pad = 4;
          const hlRect = ck.LTRBRect(
            obj.startX - pad,
            obj.startY - pad,
            obj.endX + pad,
            obj.endY + pad
          );

          if (obj.type === "rectangle" || obj.type === "ellipse") {
            hlPaint.setStyle(ck.PaintStyle.Fill);
            if (obj.type === "rectangle") canvas.drawRect(hlRect, hlPaint);
            else canvas.drawOval(hlRect, hlPaint);
          } else if (obj.type === "pen" && obj.path) {
            hlPaint.setStyle(ck.PaintStyle.Stroke);
            hlPaint.setStrokeWidth((obj.strokeWidth || 2) + 4);
            canvas.drawPath(obj.path, hlPaint);
          } else if (obj.type === "text" && obj.text) {
            hlPaint.setStyle(ck.PaintStyle.Fill);
            const fs = obj.fontSize || 20;
            const tw = obj.text.length * fs * 0.6;
            const tHLRect = ck.LTRBRect(
              obj.startX - pad,
              obj.startY - pad - fs * 0.2,
              obj.startX + tw + pad,
              obj.startY + fs * 0.8 + pad
            );
            canvas.drawRect(tHLRect, hlPaint);
          }
          hlPaint.delete();

          if (currentTool === "select") {
            activeSelectionHandles = drawSelectionHandlesInternal(
              canvas,
              ck,
              obj
            );
          }
        }

        if (obj.type === "rectangle") {
          if (fillPaint.getColor()[3] > 0.001)
            canvas.drawRect(rectBounds, fillPaint);
          if (strokePaint.getColor()[3] > 0.001 && (obj.strokeWidth || 0) > 0)
            canvas.drawRect(rectBounds, strokePaint);
        } else if (obj.type === "ellipse") {
          // fill ellipse
          if (fillPaint.getColor()[3] > 0.001)
            canvas.drawOval(rectBounds, fillPaint);
          // stroke ellipse
          if (strokePaint.getColor()[3] > 0.001 && (obj.strokeWidth || 0) > 0)
            canvas.drawOval(rectBounds, strokePaint);
        } else if (obj.type === "pen" && obj.path) {
          strokePaint.setStrokeJoin(ck.StrokeJoin.Round);
          strokePaint.setStrokeCap(ck.StrokeCap.Round);
          // override strokeColor to currentColor for visibility
          const { r: sr, g: sg, b: sb, a: sa } = hexToRgba(currentColor);
          strokePaint.setColor(ck.Color4f(sr, sg, sb, sa));
          canvas.drawPath(obj.path, strokePaint);
        } else if (obj.type === "text" && obj.text) {
          console.log(`[TextFlow] [SkiaCanvas] draw text id=${obj.id}`, obj.text);
          fillPaint.setStyle(ck.PaintStyle.Fill);
          if (!fontMgr) {
            console.error(`[TextFlow] [SkiaCanvas] fontMgr not ready, skip draw id=${obj.id}`);
          } else {
            try {
              const typeface = fontMgr.matchFamilyStyle("Roboto", { weight: ck.FontWeight.Normal, width: ck.FontWidth.Normal, slant: ck.FontSlant.Upright });
              if (!typeface) throw new Error("Roboto typeface not found");
              const font = new ck.Font(typeface, obj.fontSize || 20);
              canvas.drawText(obj.text, obj.startX, obj.startY + (obj.fontSize || 20) * 0.75, fillPaint, font);
              font.delete();
            } catch (e) {
              console.error(`[TextFlow] [SkiaCanvas] drawText error id=${obj.id}:`, e);
            }
          }
        }

        // Only show hover highlight in select mode
        if (
          currentTool === "select" &&
          index === hoveredObjectIndex &&
          index !== drawingStateRef.current.selectedObjectIndex
        ) {
          const hvP = new ck.Paint();
          hvP.setAntiAlias(true);
          hvP.setColor(ck.Color4f(0.0, 0.6, 1.0, 0.08));
          hvP.setStyle(ck.PaintStyle.Fill);
          if (obj.type === "rectangle") canvas.drawRect(rectBounds, hvP);
          else if (obj.type === "ellipse") canvas.drawOval(rectBounds, hvP);
          hvP.delete();
        }

        canvas.restore();
        fillPaint.delete();
        strokePaint.delete();
      });

      if (isDrawing && drawingStateRef.current.activeHandle === null) {
        const lfP = new ck.Paint();
        lfP.setAntiAlias(true);
        const { r: fr, g: fg, b: fb, a: fa } = hexToRgba(currentColor);
        lfP.setColor(ck.Color4f(fr, fg, fb, fa));
        lfP.setStyle(ck.PaintStyle.Fill);
        const lsP = new ck.Paint();
        lsP.setAntiAlias(true);
        const { r: sr, g: sg, b: sb, a: sa } = hexToRgba(currentColor);
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
            // ellipse preview
            if (fa > 0.001) canvas.drawOval(lrB, lfP);
            if (sa > 0.001 && strokeWidth > 0) canvas.drawOval(lrB, lsP);
            break;
          case "line":
            canvas.drawLine(startX, startY, currentX, currentY, lsP);
            break;
          case "pen":
            if (drawingStateRef.current.path) {
              lsP.setStrokeJoin(ck.StrokeJoin.Round);
              lsP.setStrokeCap(ck.StrokeCap.Round);
              // pen preview uses currentColor
              const { r: pr, g: pg, b: pb, a: pa } = hexToRgba(currentColor);
              lsP.setColor(ck.Color4f(pr, pg, pb, pa));
              canvas.drawPath(drawingStateRef.current.path, lsP);
            }
            break;
        }
        lfP.delete();
        lsP.delete();
      }

      canvas.restore();
      console.log(`[TextFlow] [SkiaCanvas] canvas.restore done, flushing...`);
      drawingStateRef.current.surface!.flush();
      console.log(`[TextFlow] [SkiaCanvas] redraw complete`);
      console.groupEnd();
    }, [
      ck,
      fontMgr,
      scale,
      offset,
      canvasSize,
      storeObjects,
      currentTool,
      currentColor,
      currentStrokeColor,
      strokeWidth,
      isDrawing,
      hoveredObjectIndex,
      drawSelectionHandlesInternal,
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
              }).catch(() =>
                CanvasKitInit({
                  locateFile: (file) =>
                    `https://unpkg.com/canvaskit-wasm@0.38.0/bin/${file}`,
                })
              );
              const fontData = await fetch(
                "https://storage.googleapis.com/skia-cdn/misc/Roboto-Regular.ttf"
              ).then((res) => res.arrayBuffer());
              const loadedFM = loadedCK.FontMgr.FromData(fontData);
              if (!loadedFM) throw new Error("Font manager creation failed");
              canvasKitInstance = loadedCK;
              fontManagerInstance = loadedFM;
              return { ck: loadedCK, fm: loadedFM };
            } catch (error) {
              console.error("Global CK/FM init failed:", error);
              canvasKitPromise = null;
              throw error;
            }
          })();
        }
        try {
          const { ck: resolvedCK, fm: resolvedFM } = await canvasKitPromise;
          setCk(resolvedCK);
          setFontMgr(resolvedFM);
        } catch (error) {
          /* Already logged */
        }
      };
      init();
    }, []);

    useEffect(() => {
      if (
        currentTool === "select" &&
        storeObjects.length > 0 &&
        drawingStateRef.current.selectedObjectIndex === null &&
        ck
      ) {
        drawingStateRef.current.selectedObjectIndex = storeObjects.length - 1;
        redraw();
      }
    }, [currentTool, storeObjects, redraw, ck]);

    useEffect(() => {
      if (
        !ck ||
        !canvasRef.current ||
        canvasSize.width === 0 ||
        canvasSize.height === 0
      )
        return;

      const oldSurface = drawingStateRef.current.surface;
      if (oldSurface) oldSurface.delete();

      drawingStateRef.current.canvas = null;

      const surface = ck.MakeCanvasSurface(canvasRef.current);
      if (!surface) {
        console.error("Could not make SkSurface from canvas element");
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
        console.log(`[TextFlow] [SkiaCanvas] Effect redraw, count: ${storeObjects.length}, tool: ${currentTool}`);
      }
    }, [ck, fontMgr, redraw, storeObjects, offset, scale, currentTool]);

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

      if (e.buttons === 4 || e.metaKey) {
        setIsDragging(true);
        setDragStart({ x: mouseX, y: mouseY });
        return;
      }
      const state = drawingStateRef.current;
      Object.assign(state, {
        startX: worldX,
        startY: worldY,
        currentX: worldX,
        currentY: worldY,
      });

      if (currentTool === "text") {
        console.log("[TextFlow] [SkiaCanvas] handleMouseDown for text at", { worldX, worldY });
        activateTextTool(mouseX, mouseY, worldX, worldY, handleTextSubmit);
        return;
      }

      if (currentTool === "select" && state.selectedObjectIndex !== null && state.handles) {
        const activeHandle = hitTestHandles(worldX, worldY, state.handles);
        if (activeHandle) {
          state.activeHandle = activeHandle;
          if (canvasRef.current) canvasRef.current.style.cursor = activeHandle.cursor;
          const selectedObject = storeObjects[state.selectedObjectIndex];
          const center = getObjectCenter(selectedObject);
          if (activeHandle.action === "rotate") {
            state.initialAngle = calculateAngle(center.x, center.y, worldX, worldY);
            state.initialObjectRotation = selectedObject.rotation || 0;
          } else if (activeHandle.action === "scale") {
            state.initialDistance = calculateDistance(center.x, center.y, worldX, worldY);
            state.initialObjectScale = {
              x: selectedObject.scaleX || 1,
              y: selectedObject.scaleY || 1,
            };
          }
          setIsDrawing(true);
          return;
        }
      }
      if (currentTool === "select") {
        let hitIndex = -1;
        for (let i = storeObjects.length - 1; i >= 0; i--) {
          const obj = storeObjects[i] as SkiaObjectDataForApp;
          if (obj.visible === false) continue;
          const center = getObjectCenter(obj),
            bounds = getObjectBounds(obj);
          const rot = obj.rotation || 0,
            sX = obj.scaleX || 1,
            sY = obj.scaleY || 1;
          const tPt =
            rot !== 0
              ? rotatePoint(worldX, worldY, center.x, center.y, -rot)
              : { x: worldX, y: worldY };
          let isHit = false;
          const hW = (bounds.width * sX) / 2,
            hH = (bounds.height * sY) / 2;
          if (obj.type === "rectangle" || obj.type === "ellipse") {
            isHit =
              tPt.x >= center.x - hW &&
              tPt.x <= center.x + hW &&
              tPt.y >= center.y - hH &&
              tPt.y <= center.y + hH;
            if (isHit && obj.type === "ellipse") {
              const nX = (tPt.x - center.x) / hW,
                nY = (tPt.y - center.y) / hH;
              isHit = nX * nX + nY * nY <= 1;
            }
          }
          if (isHit) {
            hitIndex = i;
            break;
          }
        }
        state.selectedObjectIndex = hitIndex !== -1 ? hitIndex : null;
        setIsDrawing(hitIndex !== -1);
        redraw();
        return;
      }
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
        setOffset({
          x: offset.x + (mouseX - dragStart.x),
          y: offset.y + (mouseY - dragStart.y),
        });
        setDragStart({ x: mouseX, y: mouseY });
        return;
      }
      if (isDrawing && !state.activeHandle) {
        state.currentX = worldX;
        state.currentY = worldY;
        if (currentTool === "pen" && state.path) {
          state.path.lineTo(worldX, worldY);
        }
        redraw();
      } else if (!isDrawing && !state.activeHandle) {
        let foundHoverIdx = -1;
        for (let i = storeObjects.length - 1; i >= 0; i--) {
          const obj = storeObjects[i] as SkiaObjectDataForApp;
          if (obj.visible === false) continue;
          const center = getObjectCenter(obj),
            bounds = getObjectBounds(obj);
          const rot = obj.rotation || 0,
            sX = obj.scaleX || 1,
            sY = obj.scaleY || 1;
          const tPt =
            rot !== 0
              ? rotatePoint(worldX, worldY, center.x, center.y, -rot)
              : { x: worldX, y: worldY };
          let isHit = false;
          const hW = (bounds.width * sX) / 2,
            hH = (bounds.height * sY) / 2;
          if (obj.type === "rectangle" || obj.type === "ellipse") {
            isHit =
              tPt.x >= center.x - hW &&
              tPt.x <= center.x + hW &&
              tPt.y >= center.y - hH &&
              tPt.y <= center.y + hH;
            if (isHit && obj.type === "ellipse") {
              const nX = (tPt.x - center.x) / hW,
                nY = (tPt.y - center.y) / hH;
              isHit = nX * nX + nY * nY <= 1;
            }
          }
          if (isHit) {
            foundHoverIdx = i;
            break;
          }
        }
        if (hoveredObjectIndex !== foundHoverIdx)
          setHoveredObjectIndex(foundHoverIdx !== -1 ? foundHoverIdx : null);
      }
    };

    const handleMouseUp = () => {
      if (showTextInput || textareaRef.current || !ck) return;
      if (isDragging) {
        setIsDragging(false);
        return;
      }
      const state = drawingStateRef.current;
      if (!isDrawing && currentTool !== "text" && !state.activeHandle) return;
      if (currentTool === "text") {
        setIsDrawing(false);
        return;
      }
      if (currentTool === "select" && !state.activeHandle) {
        setIsDrawing(false);
        redraw();
        return;
      }

      let endX = state.currentX,
        endY = state.currentY;
      let isClickToCreate = false;
      if (
        currentTool === "rectangle" &&
        state.startX === state.currentX &&
        state.startY === state.currentY &&
        !state.activeHandle
      ) {
        const defaultSize = 100;
        endX = state.startX + defaultSize;
        endY = state.startY + defaultSize;
        isClickToCreate = true;
      }

      const isTransforming = currentTool === "select" && state.activeHandle;

      if ((isDrawing || isClickToCreate) && !isTransforming) {
        const baseObjectProperties: Omit<
          SkiaObjectDataForApp,
          "type" | "endX" | "endY" | "path" | "text" | "id" | "fontSize"
        > = {
          startX: state.startX,
          startY: state.startY,
          visible: true,
          fillColor: currentColor,
          strokeColor: currentColor,
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
        if (completeObjectData?.type === "line")
          completeObjectData.fillColor = "transparent";
        if (completeObjectData) {
          if (onObjectCreated) {
            onObjectCreated(completeObjectData);
          } else {
            const id = `${Date.now()}`;
            const obj = { ...completeObjectData, id };
            addObject(obj as any);
          }
          setCurrentTool("none");
        }
      }

      setIsDrawing(false);
      if (state.activeHandle && canvasRef.current) {
        canvasRef.current.style.cursor =
          currentTool === "select" ? "default" : "crosshair";
      }
      state.activeHandle = null;
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!ck) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(scale * zoomFactor, 20));
        const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
        const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);
        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
      } else {
        setOffset({ x: offset.x - e.deltaX, y: offset.y - e.deltaY });
      }
    };

    const handleTextSubmit = (textValue: string) => {
      // [TextFlow] submit text
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
      console.log(`[TextFlow] [SkiaCanvas] Submitting text: "${textValue}" at world (${worldX}, ${worldY})`);
      if (onObjectCreated) {
        const layerId = onObjectCreated(textObjectData);
        console.log(`[TextFlow] [SkiaCanvas] Created layerId: ${layerId}`);
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
        if (state.selectedObjectIndex !== null && state.handles) {
          const activeHandle = hitTestHandles(x, y, state.handles);
          if (activeHandle) {
            e.preventDefault();
            e.stopPropagation();
            state.activeHandle = activeHandle;
            if (canvasRef.current)
              canvasRef.current.style.cursor = activeHandle.cursor;
            const selectedObject = storeObjects[state.selectedObjectIndex];
            const center = getObjectCenter(selectedObject);
            if (activeHandle.action === "rotate") {
              state.initialAngle = calculateAngle(
                center.x,
                center.y,
                x,
                y
              );
              state.initialObjectRotation = selectedObject.rotation || 0;
            } else if (activeHandle.action === "scale") {
              state.initialDistance = calculateDistance(
                center.x,
                center.y,
                x,
                y
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
        if (!state.activeHandle || state.selectedObjectIndex === null) return;
        e.preventDefault();
        e.stopPropagation();
        const { x, y } = toCanvasCoords(e);
        const selectedIdx = state.selectedObjectIndex;
        const selectedObject = storeObjects[selectedIdx];
        const center = getObjectCenter(selectedObject);

        if (state.activeHandle.action === "rotate") {
          const currentAngle = calculateAngle(center.x, center.y, x, y);
          const angleDiff = currentAngle - state.initialAngle;
          rotateObject(selectedIdx, state.initialObjectRotation + angleDiff);
        } else if (state.activeHandle.action === "scale") {
          const currentDistance = calculateDistance(center.x, center.y, x, y);
          if (state.initialDistance === 0) return;
          const scaleFactor = currentDistance / state.initialDistance;
          scaleObject(
            selectedIdx,
            state.initialObjectScale.x * scaleFactor,
            state.initialObjectScale.y * scaleFactor
          );
        }
        redraw();
      };

      const onPointerUp = (e: PointerEvent) => {
        const state = drawingStateRef.current;
        if (state.activeHandle) {
          e.preventDefault();
          e.stopPropagation();
          state.activeHandle = null;
          if (canvasRef.current && currentTool === "select")
            canvasRef.current.style.cursor = "default";
          redraw();
        }
      };

      canvasEl.addEventListener("pointerdown", onPointerDown, {
        capture: true,
        passive: false,
      });
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp, { passive: false });
      return () => {
        canvasEl.removeEventListener("pointerdown", onPointerDown, {
          capture: true,
        });
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };
    }, [
      ck,
      storeObjects,
      scale,
      offset,
      rotateObject,
      scaleObject,
      redraw,
      currentTool,
      hitTestHandles,
    ]);

    return (
      <div className="skia-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
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
