import { Button } from "@/components/ui/button";
import type { DrawingTool } from "../SkiaCanvas/SkiaCanvas";
import { IconType } from "react-icons";

interface ToolButtonProps {
  tool: DrawingTool;
  currentTool: DrawingTool;
  icon: IconType;
  onClick: () => void;
}

export default function ToolButton({
  tool,
  currentTool,
  icon: Icon,
  onClick,
}: ToolButtonProps) {
  return (
    <Button
      variant={currentTool === tool ? "default" : "secondary"}
      size="icon"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
