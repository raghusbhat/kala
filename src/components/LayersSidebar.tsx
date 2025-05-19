import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FiSearch } from "react-icons/fi";
import Layer from "./Layer";
import type { Layer as LayerType } from "../types";

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
            layers.map((layer) => (
              <Layer
                key={layer.id}
                layer={layer}
                onSelect={onSelectLayer}
                onToggleVisibility={onToggleLayerVisibility}
                onToggleLock={onToggleLayerLock}
              />
            ))
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
