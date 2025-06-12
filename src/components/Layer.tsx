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
import { Frame as FrameIcon } from "lucide-react";
import { useState, useRef } from "react";
import React from "react";

interface LayerProps {
  layer: LayerType;
  depth?: number;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDragLayer?: (draggedId: string, targetId: string | null) => void;
  onRename: (id: string, newName: string) => void;
}

export default function Layer({
  layer,
  depth = 0,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDragLayer,
  onRename,
}: LayerProps) {
  const { id, name, type, visible, locked, selected } = layer;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing
  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("layer-id", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("layer-id");
    if (onDragLayer) {
      const targetId = type === "frame" ? id : null;
      onDragLayer(draggedId, targetId);
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-md cursor-pointer
        ${
          selected
            ? "bg-primary/10 text-white"
            : "hover:bg-secondary text-gray-400"
        }`}
      onClick={() => onSelect(id)}
      style={{ marginLeft: depth * 12 }}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2">
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
            className={`text-xs ${visible ? "" : "opacity-50"} ${
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
              cursor: "text",
              border: "none",
              background: "none",
              padding: 0,
            }}
          >
            {name}
          </span>
        )}
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
