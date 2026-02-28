import React, { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FiSearch } from "react-icons/fi";
import Layer from "./Layer";
import type { Layer as LayerType } from "../types";
import { useLayerStore } from "../lib/useLayerStore";
import { useCanvasStore } from "../lib/store";

interface LayersSidebarProps {
  layers: LayerType[];
  onSelectLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
}

export default function LayersSidebar({
  layers,
  onSelectLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
}: LayersSidebarProps) {
  const { reorderLayers, updateLayerName } = useLayerStore();
  const { objects, updateObject } = useCanvasStore();
  const [search, setSearch] = useState("");

  const handleRename = (id: string, newName: string) => {
    updateLayerName(id, newName);
    const objIdx = objects.findIndex((o) => o.id === id);
    if (objIdx !== -1 && (objects[objIdx] as any).isFrame) {
      updateObject(objIdx, { name: newName });
    }
  };

  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const filteredLayers = search.trim()
    ? layers.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : layers;

  const buildTree = (
    parentId: string | undefined | null,
    depth: number
  ): React.ReactElement[] => {
    return filteredLayers
      .filter((l) => (l.parentId || null) === (parentId || null))
      .map((layer) => {
        const children = layers.filter((c) => (c.parentId || null) === layer.id);
        const hasChildren = children.length > 0;
        const isCollapsed = collapsedMap[layer.id] ?? false;

        return (
          <div key={layer.id}>
            <Layer
              layer={layer}
              depth={depth}
              onSelect={onSelectLayer}
              onToggleVisibility={onToggleLayerVisibility}
              onToggleLock={onToggleLayerLock}
              onDragLayer={(draggedId, targetId, position) =>
                reorderLayers(draggedId, targetId, position)
              }
              onRename={handleRename}
              hasChildren={hasChildren}
              collapsed={isCollapsed}
              toggleCollapse={() => toggleCollapse(layer.id)}
            />
            {!isCollapsed && buildTree(layer.id, depth + 1)}
          </div>
        );
      });
  };

  return (
    <aside className="w-56 border-r border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Layers</span>
      </div>

      {/* Search */}
      <div className="px-2 pb-2 shrink-0">
        <div className="relative">
          <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full h-6 pl-6 pr-2 text-xs bg-muted/50 border border-transparent rounded focus:outline-none focus:border-border text-foreground placeholder:text-muted-foreground/60 transition-colors"
          />
        </div>
      </div>

      <div className="h-px bg-border shrink-0" />

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="py-1 select-none">
          {layers.length > 0 ? (
            buildTree(null, 0)
          ) : (
            <div className="px-3 py-6 text-[11px] text-muted-foreground/60 text-center leading-relaxed">
              No layers yet.
              <br />
              Draw something to begin.
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
