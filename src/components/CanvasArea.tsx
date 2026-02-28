import { useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  FiMove,
  FiSquare,
  FiCircle,
  FiType,
  FiEdit2,
  FiPlus,
  FiMinus,
  FiPenTool,
} from "react-icons/fi";
import { Frame as FrameIcon } from "lucide-react";
import SkiaCanvas, { DrawingTool } from "./SkiaCanvas/SkiaCanvas";
import ToolButton from "./ui-custom/ToolButton";
import FloatingToolbar from "./ui-custom/FloatingToolbar";
import { useCanvasStore } from "../lib/store";
import type { CanvasObject } from "../lib/store";

export type SkiaObjectDataForApp = Omit<CanvasObject, "id"> & {
  text?: string;
  fontSize?: number;
};

interface CanvasAreaProps {
  onObjectCreated?: (objectData: SkiaObjectDataForApp) => string;
  onObjectSelected?: (objectIndex: number | null) => void;
}

export default function CanvasArea({
  onObjectCreated,
  onObjectSelected,
}: CanvasAreaProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const skiaCanvasRef = useRef<any>(null);

  const { currentTool, setCurrentTool, scale, setScale } = useCanvasStore();

  const handleToolChange = (tool: string) => {
    setCurrentTool(tool as DrawingTool);
  };

  const handleZoom = (direction: "in" | "out") => {
    const factor = direction === "in" ? 1.2 : 0.8;
    const newScale = Math.max(0.1, Math.min(scale * factor, 5));
    setScale(newScale);
    if (skiaCanvasRef.current?.redraw) {
      setTimeout(() => skiaCanvasRef.current.redraw(), 0);
    }
  };

  const zoomPercent = Math.round(scale * 100);

  return (
    <main className="flex-1 relative overflow-hidden bg-[hsl(var(--canvas-bg))]">
      <div className="relative w-full h-full" ref={canvasContainerRef}>
        <TooltipProvider>
          <FloatingToolbar>
            {/* Selection tools */}
            <ToolButton
              tool="select"
              currentTool={currentTool}
              icon={FiMove}
              onClick={() => handleToolChange("select")}
              tooltip="Select (V)"
            />
            <ToolButton
              tool="frame"
              currentTool={currentTool}
              icon={FrameIcon as any}
              onClick={() => handleToolChange("frame")}
              tooltip="Frame (F)"
            />

            {/* Divider */}
            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Shape tools */}
            <ToolButton
              tool="rectangle"
              currentTool={currentTool}
              icon={FiSquare}
              onClick={() => handleToolChange("rectangle")}
              tooltip="Rectangle (R)"
            />
            <ToolButton
              tool="ellipse"
              currentTool={currentTool}
              icon={FiCircle}
              onClick={() => handleToolChange("ellipse")}
              tooltip="Ellipse (O)"
            />

            {/* Divider */}
            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Drawing tools */}
            <ToolButton
              tool="pencil"
              currentTool={currentTool}
              icon={FiEdit2}
              onClick={() => handleToolChange("pencil")}
              tooltip="Pencil (B)"
            />
            <ToolButton
              tool="pen"
              currentTool={currentTool}
              icon={FiPenTool}
              onClick={() => handleToolChange("pen")}
              tooltip="Pen (P)"
            />
            <ToolButton
              tool="text"
              currentTool={currentTool}
              icon={FiType}
              onClick={() => handleToolChange("text")}
              tooltip="Text (T)"
            />

            {/* Divider */}
            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Zoom controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleZoom("out")}
                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <FiMinus className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Zoom Out (-)</TooltipContent>
            </Tooltip>

            <span className="text-xs text-muted-foreground tabular-nums w-9 text-center select-none">
              {zoomPercent}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleZoom("in")}
                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <FiPlus className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Zoom In (+)</TooltipContent>
            </Tooltip>
          </FloatingToolbar>
        </TooltipProvider>

        <div className="absolute top-0 left-0 right-0 bottom-0">
          <SkiaCanvas
            ref={skiaCanvasRef}
            onObjectCreated={onObjectCreated}
            onObjectSelected={onObjectSelected}
          />
        </div>
      </div>
    </main>
  );
}
