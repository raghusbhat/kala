import { Button } from "@/components/ui/button";
import {
  FiSquare,
  FiCircle,
  FiType,
  FiEye,
  FiEyeOff,
  FiLock,
  FiUnlock,
} from "react-icons/fi";
import type { Layer as LayerType } from "../types";

interface LayerProps {
  layer: LayerType;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}

export default function Layer({
  layer,
  onSelect,
  onToggleVisibility,
  onToggleLock,
}: LayerProps) {
  const { id, name, type, visible, locked, selected } = layer;

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-md cursor-pointer
        ${
          selected
            ? "bg-primary/10 text-white"
            : "hover:bg-secondary text-gray-400"
        }`}
      onClick={() => onSelect(id)}
    >
      <div className="flex items-center gap-2">
        {type === "rectangle" && (
          <FiSquare
            className={`h-3.5 w-3.5 ${
              selected ? "text-white" : "text-gray-400"
            }`}
          />
        )}
        {type === "ellipse" && (
          <FiCircle
            className={`h-3.5 w-3.5 ${
              selected ? "text-white" : "text-gray-400"
            }`}
          />
        )}
        {type === "text" && (
          <FiType
            className={`h-3.5 w-3.5 ${
              selected ? "text-white" : "text-gray-400"
            }`}
          />
        )}
        <span
          className={`text-xs ${visible ? "" : "opacity-50"} ${
            selected ? "text-white" : "text-gray-400"
          }`}
        >
          {name}
        </span>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(id);
          }}
        >
          {visible ? (
            <FiEye className="h-3 w-3" />
          ) : (
            <FiEyeOff className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(id);
          }}
        >
          {locked ? (
            <FiLock className="h-3 w-3" />
          ) : (
            <FiUnlock className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
