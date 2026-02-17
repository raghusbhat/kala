import { Button } from "@/components/ui/button";
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

  // Focus input when editing
  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("layer-id", id);
    // Remove default drag preview image
    const img = new Image();
    img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
    e.dataTransfer.setDragImage(img, 0, 0);
    setSelfDragging(true);
  };

  const handleDragEnd = () => {
    setSelfDragging(false);
  };

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

  const handleDragLeave = () => {
    setDropPos("none");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("layer-id");
    if (onDragLayer) {
      let finalPos: "above" | "below" | "inside" | "none" = dropPos;
      if (finalPos === "inside" && type !== "frame") {
        // Non-frame layers cannot accept inside drops; default to below
        finalPos = "below";
      }
      if (finalPos !== "none") {
        onDragLayer(draggedId, id, finalPos);
      }
    }
    setDropPos("none");
  };

  return (
    <div
      className={`group relative p-2 pr-12 ${dropPos !== 'none' ? 'rounded-none' : 'rounded-md'} w-full
        ${
          selected
            ? "bg-primary/50 text-white"
            : "hover:bg-muted/30 text-gray-300"
        }
        ${dropPos === "above" ? "border-t-2 border-primary" : ""}
        ${dropPos === "below" ? "border-b-2 border-primary" : ""}
        ${selfDragging ? 'opacity-0' : ''}
      `}
      onClick={() => onSelect(id)}
      style={{ position: 'relative' }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-drop-pos={dropPos}
    >
      {/* dotted vertical lines for all ancestor depths */}
      {Array.from({ length: depth }).map((_, idx) => (
        <span
          key={idx}
          className="absolute top-0 bottom-0 border-l border-dotted border-muted-foreground/50 pointer-events-none"
          style={{ left: idx * 12 + 4 }}
        />
      ))}
      <div className="flex items-center gap-2 overflow-visible" style={{ marginLeft: depth * 12, maxWidth: '100%' }}>
        {/* Collapse / expand arrow */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse();
            }}
            className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground hover:text-primary transition cursor-default"
          >
            {collapsed ? <FiChevronRight size={10} /> : <FiChevronDown size={10} />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        {type === "rectangle" && (
          <FiSquare
            className={`h-3.5 w-3.5 ${
              selected ? "text-white" : "text-gray-400"
            }`}
          />
        )}
        {type === "frame" && (
          <FrameIcon
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
        {editing ? (
          <input
            ref={inputRef}
            className={`text-xs w-full px-2 py-1 rounded bg-muted border border-primary outline-none shadow focus:shadow-lg transition-all duration-75 ${
              selected ? "text-white" : "text-gray-900"
            }`}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (editValue !== name) onRename(id, editValue);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditing(false);
                if (editValue !== name) onRename(id, editValue);
              }
              if (e.key === "Escape") {
                setEditing(false);
                setEditValue(name);
              }
            }}
            maxLength={64}
            spellCheck={false}
            style={{ minWidth: 0 }}
          />
        ) : (
          <span
            className={`truncate text-xs ${visible ? "" : "opacity-50"} ${
              selected ? "text-white" : "text-gray-400"
            }`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditing(true);
            }}
            style={{
              border: 'none',
              maxWidth: '100%',
            }}
          >
            {name}
          </span>
        )}
      </div>
      {/* right-side icons */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-muted/30 hover:bg-muted/50 text-white rounded"
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
          className="h-6 w-6 bg-muted/30 hover:bg-muted/50 text-white rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(id);
          }}
        >
          {locked ? <FiLock className="h-3 w-3" /> : <FiUnlock className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
