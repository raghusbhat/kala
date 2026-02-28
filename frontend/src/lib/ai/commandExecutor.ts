import { useCanvasStore } from "../store";
import { useLayerStore } from "../useLayerStore";
import type {
  AICommand,
  AIResponse,
  CreateShapeCommand,
  CreateTextCommand,
  CreateFrameCommand,
} from "./types";
import type { CanvasObject, ShapeObject, TextObject } from "../store";

// Parses the AI raw text output into a structured AIResponse.
// Falls back to plain text message with empty commands on parse failure.
export function parseAIResponse(rawText: string): AIResponse {
  // Try to extract ```json ... ``` block
  const jsonBlockMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonBlockMatch ? jsonBlockMatch[1] : rawText.trim();

  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        message: typeof parsed.message === "string" ? parsed.message : "Done.",
        commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      };
    }
  } catch {
    // Intentional fallthrough — show raw text in chat
  }

  return { message: rawText, commands: [] };
}

// Creates an object on the canvas — replicates handleSkiaObjectCreated in App.tsx
function createObjectOnCanvas(
  type: "rectangle" | "ellipse" | "text" | "frame",
  data: {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    name?: string;
    text?: string;
    fontSize?: number;
    cornerRadius?: number;
    shadowEnabled?: boolean;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowBlur?: number;
    shadowColor?: string;
  },
  parentId?: string
): string {
  const layerStore = useLayerStore.getState();
  const canvasStore = useCanvasStore.getState();

  const layerId = layerStore.addLayer(type === "frame" ? "frame" : type, parentId);

  // If a custom name was requested, update the layer name
  if (data.name) {
    useLayerStore.getState().updateLayerName(layerId, data.name);
  }

  const layerName = useLayerStore.getState().layers.find((l) => l.id === layerId)?.name ?? "";

  const startX = data.x;
  const startY = data.y;
  const endX = data.x + (data.width ?? 100);
  const endY = data.y + (data.height ?? 100);

  let canvasObject: CanvasObject;

  if (type === "text") {
    const textObj: TextObject = {
      type: "text",
      id: layerId,
      startX,
      startY,
      endX,
      endY,
      fillColor: data.fillColor ?? "#FFFFFF",
      strokeColor: data.strokeColor ?? "transparent",
      strokeWidth: data.strokeWidth ?? 0,
      visible: true,
      text: data.text ?? "Text",
      fontSize: data.fontSize ?? 16,
      name: data.name ?? layerName,
    };
    canvasObject = textObj;
  } else {
    const shapeObj: ShapeObject & { isFrame?: boolean; name?: string; cornerRadiusTopLeft?: number; cornerRadiusTopRight?: number; cornerRadiusBottomLeft?: number; cornerRadiusBottomRight?: number; shadowEnabled?: boolean; shadowOffsetX?: number; shadowOffsetY?: number; shadowBlur?: number; shadowColor?: string } = {
      type: type === "frame" ? "rectangle" : type as "rectangle" | "ellipse",
      id: layerId,
      startX,
      startY,
      endX,
      endY,
      fillColor: data.fillColor ?? (type === "frame" ? "#3C3C3C" : "#FFFFFF"),
      strokeColor: data.strokeColor ?? (type === "frame" ? "#E5E7EB" : "transparent"),
      strokeWidth: data.strokeWidth ?? (type === "frame" ? 1 : 0),
      visible: true,
      isFrame: type === "frame",
      name: data.name ?? layerName,
    };

    // Apply corner radius (uniform for simplicity — all corners same value)
    if (data.cornerRadius !== undefined) {
      shapeObj.cornerRadiusTopLeft = data.cornerRadius;
      shapeObj.cornerRadiusTopRight = data.cornerRadius;
      shapeObj.cornerRadiusBottomLeft = data.cornerRadius;
      shapeObj.cornerRadiusBottomRight = data.cornerRadius;
    }

    // Apply shadow
    if (data.shadowEnabled !== undefined) {
      shapeObj.shadowEnabled = data.shadowEnabled;
    }
    if (data.shadowOffsetX !== undefined) shapeObj.shadowOffsetX = data.shadowOffsetX;
    if (data.shadowOffsetY !== undefined) shapeObj.shadowOffsetY = data.shadowOffsetY;
    if (data.shadowBlur !== undefined) shapeObj.shadowBlur = data.shadowBlur;
    if (data.shadowColor !== undefined) shapeObj.shadowColor = data.shadowColor;

    canvasObject = shapeObj as CanvasObject;
  }

  canvasStore.addObject(canvasObject);

  // Update parent frame's childrenIds
  if (parentId) {
    const parentIndex = canvasStore.objects.findIndex((o) => o.id === parentId);
    if (parentIndex !== -1) {
      const parentObj = canvasStore.objects[parentIndex] as any;
      const currentChildren: string[] = parentObj.childrenIds ?? [];
      if (!currentChildren.includes(layerId)) {
        canvasStore.updateObject(parentIndex, {
          childrenIds: [...currentChildren, layerId],
        } as any);
      }
    }
  }

  return layerId;
}

// Executes the list of AI commands against the canvas stores.
export function executeCommands(commands: AICommand[]): void {
  for (const command of commands) {
    try {
      executeCommand(command);
    } catch (err) {
      console.warn("[Kala AI] Failed to execute command:", command, err);
    }
  }
}

function executeCommand(command: AICommand): void {
  const canvasStore = useCanvasStore.getState();
  const layerStore = useLayerStore.getState();

  switch (command.action) {
    case "create_shape": {
      const cmd = command as CreateShapeCommand;
      createObjectOnCanvas(cmd.shape, {
        x: cmd.x,
        y: cmd.y,
        width: cmd.width,
        height: cmd.height,
        fillColor: cmd.fillColor,
        strokeColor: cmd.strokeColor,
        strokeWidth: cmd.strokeWidth,
        name: cmd.name,
        cornerRadius: cmd.cornerRadius,
        shadowEnabled: cmd.shadowEnabled,
        shadowOffsetX: cmd.shadowOffsetX,
        shadowOffsetY: cmd.shadowOffsetY,
        shadowBlur: cmd.shadowBlur,
        shadowColor: cmd.shadowColor,
      });
      break;
    }

    case "create_text": {
      const cmd = command as CreateTextCommand;
      createObjectOnCanvas("text", {
        x: cmd.x,
        y: cmd.y,
        width: cmd.width ?? 120,
        height: cmd.height ?? 30,
        fillColor: cmd.fillColor,
        name: cmd.name,
        text: cmd.text,
        fontSize: cmd.fontSize,
      });
      break;
    }

    case "create_frame": {
      const cmd = command as CreateFrameCommand;
      createObjectOnCanvas("frame", {
        x: cmd.x,
        y: cmd.y,
        width: cmd.width,
        height: cmd.height,
        fillColor: cmd.fillColor,
        strokeColor: cmd.strokeColor,
        name: cmd.name,
      });
      break;
    }

    case "modify_object": {
      const { id, changes } = command;
      const objects = useCanvasStore.getState().objects;
      const objIndex = objects.findIndex((o) => o.id === id);

      if (objIndex === -1) {
        console.warn(`[Kala AI] modify_object: object with id "${id}" not found`);
        break;
      }

      const currentObj = objects[objIndex];
      const updates: Record<string, any> = {};

      if (changes.fillColor !== undefined) updates.fillColor = changes.fillColor;
      if (changes.strokeColor !== undefined) updates.strokeColor = changes.strokeColor;
      if (changes.strokeWidth !== undefined) updates.strokeWidth = changes.strokeWidth;
      if (changes.rotation !== undefined) updates.rotation = changes.rotation;
      if (changes.text !== undefined) updates.text = changes.text;
      if (changes.fontSize !== undefined) updates.fontSize = changes.fontSize;
      if (changes.shadowEnabled !== undefined) updates.shadowEnabled = changes.shadowEnabled;
      if (changes.shadowOffsetX !== undefined) updates.shadowOffsetX = changes.shadowOffsetX;
      if (changes.shadowOffsetY !== undefined) updates.shadowOffsetY = changes.shadowOffsetY;
      if (changes.shadowBlur !== undefined) updates.shadowBlur = changes.shadowBlur;
      if (changes.shadowColor !== undefined) updates.shadowColor = changes.shadowColor;

      // Handle corner radius (uniform via cornerRadius or individual)
      if (changes.cornerRadius !== undefined) {
        updates.cornerRadiusTopLeft = changes.cornerRadius;
        updates.cornerRadiusTopRight = changes.cornerRadius;
        updates.cornerRadiusBottomLeft = changes.cornerRadius;
        updates.cornerRadiusBottomRight = changes.cornerRadius;
      }
      if (changes.cornerRadiusTopLeft !== undefined) updates.cornerRadiusTopLeft = changes.cornerRadiusTopLeft;
      if (changes.cornerRadiusTopRight !== undefined) updates.cornerRadiusTopRight = changes.cornerRadiusTopRight;
      if (changes.cornerRadiusBottomLeft !== undefined) updates.cornerRadiusBottomLeft = changes.cornerRadiusBottomLeft;
      if (changes.cornerRadiusBottomRight !== undefined) updates.cornerRadiusBottomRight = changes.cornerRadiusBottomRight;

      // Position/dimension changes require translating x/y/width/height → startX/startY/endX/endY
      const currentStartX = currentObj.startX;
      const currentStartY = currentObj.startY;
      const currentWidth = currentObj.endX - currentObj.startX;
      const currentHeight = currentObj.endY - currentObj.startY;

      const newX = changes.x !== undefined ? changes.x : currentStartX;
      const newY = changes.y !== undefined ? changes.y : currentStartY;
      const newWidth = changes.width !== undefined ? changes.width : currentWidth;
      const newHeight = changes.height !== undefined ? changes.height : currentHeight;

      if (
        changes.x !== undefined ||
        changes.y !== undefined ||
        changes.width !== undefined ||
        changes.height !== undefined
      ) {
        updates.startX = newX;
        updates.startY = newY;
        updates.endX = newX + newWidth;
        updates.endY = newY + newHeight;
      }

      canvasStore.updateObject(objIndex, updates as Partial<CanvasObject>);

      // Update layer name if changed
      if (changes.name !== undefined) {
        layerStore.updateLayerName(id, changes.name);
      }
      break;
    }

    case "delete_object": {
      const { id } = command;
      const objects = useCanvasStore.getState().objects;
      const objIndex = objects.findIndex((o) => o.id === id);

      if (objIndex === -1) {
        console.warn(`[Kala AI] delete_object: object with id "${id}" not found`);
        break;
      }

      canvasStore.removeObject(objIndex);
      layerStore.deleteLayer(id);
      break;
    }

    case "select_object": {
      const { id } = command;
      layerStore.selectLayer(id);
      break;
    }

    case "set_canvas_background": {
      const { color } = command;
      canvasStore.setCanvasBackgroundColor(color);
      break;
    }

    default:
      console.warn("[Kala AI] Unknown command action:", (command as any).action);
  }
}
