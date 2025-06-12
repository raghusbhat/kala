import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  const { setLayerParent } = useLayerStore();
  const { objects, updateObject } = useCanvasStore();
  const { updateLayerName } = useLayerStore();

  const handleRename = (id: string, newName: string) => {
    updateLayerName(id, newName);
    // If this is a frame, update the canvas object name too
    const objIdx = objects.findIndex((o) => o.id === id);
    if (objIdx !== -1 && (objects[objIdx] as any).isFrame) {
      updateObject(objIdx, { name: newName });
    }
  };

  // Build hierarchical tree
  const buildTree = (
    parentId: string | undefined | null,
    depth: number
  ): JSX.Element[] => {
    return layers
      .filter((l) => (l.parentId || null) === (parentId || null))
      .map((layer) => (
        <div key={layer.id}>
          <Layer
            layer={layer}
            depth={depth}
            onSelect={onSelectLayer}
            onToggleVisibility={onToggleLayerVisibility}
            onToggleLock={onToggleLayerLock}
            onDragLayer={(draggedId, targetId) =>
              setLayerParent(draggedId, targetId)
            }
            onRename={handleRename}
          />
          {buildTree(layer.id, depth + 1)}
        </div>
      ));
  };

  return (
    <aside className="w-56 border-r border-border bg-card flex flex-col">
      <div className="p-4 font-medium flex items-center justify-between">
        <span>Layers</span>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <FiSearch className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search layers..." className="pl-7 h-8 text-xs" />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2">
          {layers.length > 0 ? (
            buildTree(null, 0)
          ) : (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No layers yet. Draw something using the tools above.
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
