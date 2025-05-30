import { Button } from "@/components/ui/button";
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={
            currentTool === tool
              ? "bg-primary/20 text-primary hover:bg-primary/30"
              : "hover:bg-muted"
          }
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
