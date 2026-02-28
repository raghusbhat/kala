import {
  FiSquare,
  FiCircle,
  FiType,
  FiEye,
  FiEyeOff,
  FiLock,
  FiUnlock,
  FiChevronRight,
  FiChevronDown,
  FiEdit2,
} from "react-icons/fi";
import type { Layer as LayerType } from "../types";
import { Frame as FrameIcon } from "lucide-react";
import { useState, useRef } from "react";
import React from "react";

interface LayerProps {
  layer: LayerType;
  depth?: number;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDragLayer?: (
    draggedId: string,
    targetId: string | null,
    position: "above" | "below" | "inside"
  ) => void;
  onRename: (id: string, newName: string) => void;
  hasChildren: boolean;
  collapsed: boolean;
  toggleCollapse: () => void;
}

export default function Layer({
  layer,
  depth = 0,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDragLayer,
  onRename,
  hasChildren,
  collapsed,
  toggleCollapse,
}: LayerProps) {
  const { id, name, type, visible, locked, selected } = layer;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropPos, setDropPos] = useState<"none" | "above" | "below" | "inside">("none");
  const [selfDragging, setSelfDragging] = useState(false);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("layer-id", id);
    const img = new Image();
    img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
    e.dataTransfer.setDragImage(img, 0, 0);
    setSelfDragging(true);
  };

  const handleDragEnd = () => setSelfDragging(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const threshold = rect.height / 3;
    let pos: "above" | "below" | "inside";
    if (y < threshold) pos = "above";
    else if (y > rect.height - threshold) pos = "below";
    else pos = "inside";
    setDropPos(pos);
  };

  const handleDragLeave = () => setDropPos("none");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("layer-id");
    if (onDragLayer) {
      let finalPos: "above" | "below" | "inside" | "none" = dropPos;
      if (finalPos === "inside" && type !== "frame") finalPos = "below";
      if (finalPos !== "none") onDragLayer(draggedId, id, finalPos);
    }
    setDropPos("none");
  };

  const iconClass = `h-3 w-3 shrink-0 ${selected ? "text-accent" : "text-muted-foreground"}`;

  return (
    <div
      className={[
        "group relative flex items-center h-7 px-2 cursor-pointer select-none transition-colors",
        selected ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        dropPos === "above" ? "border-t border-accent" : "",
        dropPos === "below" ? "border-b border-accent" : "",
        dropPos === "inside" ? "bg-accent/5" : "",
        selfDragging ? "opacity-30" : "",
      ].filter(Boolean).join(" ")}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelect(id)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Expand/collapse toggle */}
      <span className="w-3.5 shrink-0 flex items-center justify-center mr-1">
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapse(); }}
            className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed
              ? <FiChevronRight size={9} />
              : <FiChevronDown size={9} />
            }
          </button>
        ) : null}
      </span>

      {/* Type icon */}
      {type === "rectangle" && <FiSquare className={iconClass} />}
      {type === "frame" && <FrameIcon className={iconClass} />}
      {type === "ellipse" && <FiCircle className={iconClass} />}
      {type === "text" && <FiType className={iconClass} />}
      {type === "pencil" && <FiEdit2 className={iconClass} />}
      {type === "pen" && <FiEdit2 className={iconClass} />}

      {/* Name */}
      <div className="flex-1 min-w-0 ml-1.5">
        {editing ? (
          <input
            ref={inputRef}
            className="w-full text-xs bg-muted border border-accent rounded px-1 py-0.5 outline-none text-foreground"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (editValue !== name) onRename(id, editValue);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setEditing(false); if (editValue !== name) onRename(id, editValue); }
              if (e.key === "Escape") { setEditing(false); setEditValue(name); }
            }}
            maxLength={64}
            spellCheck={false}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`truncate text-xs block ${!visible ? "opacity-40" : ""}`}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {name}
          </span>
        )}
      </div>

      {/* Right-side action buttons — show on hover */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(id); }}
        >
          {visible
            ? <FiEye className="h-3 w-3" />
            : <FiEyeOff className="h-3 w-3" />
          }
        </button>
        <button
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); onToggleLock(id); }}
        >
          {locked
            ? <FiLock className="h-3 w-3" />
            : <FiUnlock className="h-3 w-3" />
          }
        </button>
      </div>
    </div>
  );
}
