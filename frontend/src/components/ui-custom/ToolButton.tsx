import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DrawingTool } from "../SkiaCanvas/SkiaCanvas";
import { IconType } from "react-icons";

interface ToolButtonProps {
  tool: DrawingTool;
  currentTool: DrawingTool;
  icon: IconType;
  onClick: () => void;
  tooltip: string;
}

export default function ToolButton({
  tool,
  currentTool,
  icon: Icon,
  onClick,
  tooltip,
}: ToolButtonProps) {
  const isActive = currentTool === tool;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
            isActive
              ? "bg-accent/15 text-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
