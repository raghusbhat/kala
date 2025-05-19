import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

export type SkiaObjectDataForApp = Omit<CanvasObject, "id"> & { text?: string; fontSize?: number };

interface CanvasAreaProps {
  onObjectCreated: (objectData: SkiaObjectDataForApp) => string;
}

export default function CanvasArea({ onObjectCreated }: CanvasAreaProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const { currentTool, setCurrentTool } = useCanvasStore();

  const handleToolChange = (tool: string) => {
    setCurrentTool(tool as DrawingTool);
  };

  const handleZoom = (_direction: "in" | "out") => {
    // Zoom direction: in or out
  };

  return (
    <main className="flex-1 relative overflow-hidden bg-[hsl(var(--canvas-bg))]">
      <div className="relative w-full h-full" ref={canvasContainerRef}>
        {/* Floating toolbar */}
        <FloatingToolbar>
          <ToolButton
            tool="select"
            currentTool={currentTool}
            icon={FiMove}
            onClick={() => handleToolChange("select")}
          />
          <ToolButton
            tool="rectangle"
            currentTool={currentTool}
            icon={FiSquare}
            onClick={() => handleToolChange("rectangle")}
          />
          <ToolButton
            tool="ellipse"
            currentTool={currentTool}
            icon={FiCircle}
            onClick={() => handleToolChange("ellipse")}
          />
          <ToolButton
            tool="pen"
            currentTool={currentTool}
            icon={FiEdit2}
            onClick={() => handleToolChange("pen")}
          />
          <ToolButton
            tool="text"
            currentTool={currentTool}
            icon={FiType}
            onClick={() => handleToolChange("text")}
          />
          <Separator orientation="vertical" className="h-6" />
          <Button variant="secondary" size="icon">
            <FiMaximize className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="secondary"
            size="icon"
            onClick={() => handleZoom("in")}
          >
            <FiPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => handleZoom("out")}
          >
            <FiMinus className="h-4 w-4" />
          </Button>
        </FloatingToolbar>

        <div className="absolute top-0 left-0 right-0 bottom-0">
          <SkiaCanvas onObjectCreated={onObjectCreated} />
        </div>
      </div>
    </main>
  );
}
