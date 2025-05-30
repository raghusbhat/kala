import { useRef } from "react";
import { Button } from "@/components/ui/button";
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
  FiMaximize,
  FiPlus,
  FiMinus,
} from "react-icons/fi";
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

    // Force redraw after scale change
    if (skiaCanvasRef.current?.redraw) {
      setTimeout(() => skiaCanvasRef.current.redraw(), 0);
    }
  };

  return (
    <main className="flex-1 relative overflow-hidden bg-[hsl(var(--canvas-bg))]">
      <div className="relative w-full h-full" ref={canvasContainerRef}>
        {/* Floating toolbar */}
        <TooltipProvider>
          <FloatingToolbar>
            <ToolButton
              tool="select"
              currentTool={currentTool}
              icon={FiMove}
              onClick={() => handleToolChange("select")}
              tooltip="Select Tool (V)"
            />
            <ToolButton
              tool="rectangle"
              currentTool={currentTool}
              icon={FiSquare}
              onClick={() => handleToolChange("rectangle")}
              tooltip="Rectangle Tool (R)"
            />
            <ToolButton
              tool="ellipse"
              currentTool={currentTool}
              icon={FiCircle}
              onClick={() => handleToolChange("ellipse")}
              tooltip="Ellipse Tool (O)"
            />
            <ToolButton
              tool="pen"
              currentTool={currentTool}
              icon={FiEdit2}
              onClick={() => handleToolChange("pen")}
              tooltip="Pen Tool (P)"
            />
            <ToolButton
              tool="text"
              currentTool={currentTool}
              icon={FiType}
              onClick={() => handleToolChange("text")}
              tooltip="Text Tool (T)"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <FiMaximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fit to Screen</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom("in")}
                >
                  <FiPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In (+)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom("out")}
                >
                  <FiMinus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out (-)</p>
              </TooltipContent>
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
