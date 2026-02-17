import { useCanvasStore } from "../store";
import { useLayerStore } from "../useLayerStore";
import type { CanvasObjectSummary } from "./types";

function getObjectSummary(obj: any, layerName: string): CanvasObjectSummary {
  const x = obj.startX ?? 0;
  const y = obj.startY ?? 0;
  const width = Math.abs((obj.endX ?? 0) - (obj.startX ?? 0));
  const height = Math.abs((obj.endY ?? 0) - (obj.startY ?? 0));

  const summary: CanvasObjectSummary = {
    id: obj.id ?? "",
    type: obj.isFrame ? "frame" : (obj.type ?? ""),
    name: obj.name ?? layerName ?? "",
    x,
    y,
    width,
    height,
    fillColor: obj.fillColor ?? "#FFFFFF",
    strokeColor: obj.strokeColor ?? "transparent",
    strokeWidth: obj.strokeWidth ?? 0,
    isFrame: obj.isFrame ?? false,
  };

  if (obj.parentFrameId) {
    summary.parentFrameId = obj.parentFrameId;
  }

  if (obj.type === "text") {
    summary.text = obj.text ?? "";
    summary.fontSize = obj.fontSize ?? 16;
  }

  return summary;
}

export function buildCanvasContext(): string {
  const canvasState = useCanvasStore.getState();
  const layerState = useLayerStore.getState();

  const { objects, canvasBackgroundColor } = canvasState;
  const { layers, selectedLayerId } = layerState;

  // Build name map for quick lookup
  const layerNameMap = new Map<string, string>();
  for (const layer of layers) {
    layerNameMap.set(layer.id, layer.name);
  }

  // All objects: lean summary
  const allSummaries: CanvasObjectSummary[] = objects.map((obj) =>
    getObjectSummary(obj, layerNameMap.get(obj.id ?? "") ?? "")
  );

  // Selected object: full detail
  let selectedDetail: string = "None";
  if (selectedLayerId) {
    const selectedObj = objects.find((o) => o.id === selectedLayerId);
    if (selectedObj) {
      const x = selectedObj.startX ?? 0;
      const y = selectedObj.startY ?? 0;
      const width = Math.abs((selectedObj.endX ?? 0) - (selectedObj.startX ?? 0));
      const height = Math.abs((selectedObj.endY ?? 0) - (selectedObj.startY ?? 0));
      const layerName = layerNameMap.get(selectedLayerId) ?? "";

      selectedDetail = JSON.stringify({
        id: selectedObj.id,
        type: selectedObj.isFrame ? "frame" : selectedObj.type,
        name: selectedObj.name ?? layerName,
        x,
        y,
        width,
        height,
        fillColor: selectedObj.fillColor,
        strokeColor: selectedObj.strokeColor,
        strokeWidth: selectedObj.strokeWidth,
        rotation: selectedObj.rotation ?? 0,
        isFrame: selectedObj.isFrame ?? false,
        parentFrameId: selectedObj.parentFrameId,
        text: (selectedObj as any).text,
        fontSize: (selectedObj as any).fontSize,
        shadowEnabled: selectedObj.shadowEnabled,
        shadowOffsetX: selectedObj.shadowOffsetX,
        shadowOffsetY: selectedObj.shadowOffsetY,
        shadowBlur: selectedObj.shadowBlur,
        shadowColor: selectedObj.shadowColor,
        cornerRadiusTopLeft: selectedObj.cornerRadiusTopLeft,
        cornerRadiusTopRight: selectedObj.cornerRadiusTopRight,
        cornerRadiusBottomLeft: selectedObj.cornerRadiusBottomLeft,
        cornerRadiusBottomRight: selectedObj.cornerRadiusBottomRight,
      }, null, 2);
    }
  }

  const lines: string[] = [
    "=== CANVAS CONTEXT ===",
    `Canvas background: ${canvasBackgroundColor}`,
    `Total objects: ${objects.length}`,
    "",
    "--- All Objects (summary) ---",
  ];

  if (allSummaries.length === 0) {
    lines.push("(canvas is empty)");
  } else {
    for (const s of allSummaries) {
      let line = `[${s.id}] ${s.name} (${s.type}) @ x:${s.x} y:${s.y} ${s.width}×${s.height} fill:${s.fillColor}`;
      if (s.text !== undefined) {
        line += ` text:"${s.text}" fontSize:${s.fontSize}`;
      }
      if (s.parentFrameId) {
        line += ` parentFrame:${s.parentFrameId}`;
      }
      lines.push(line);
    }
  }

  lines.push("");
  lines.push("--- Selected Object (full detail) ---");
  lines.push(selectedDetail);
  lines.push("=== END CANVAS CONTEXT ===");

  return lines.join("\n");
}
