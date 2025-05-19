import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FiChevronDown } from "react-icons/fi";
import PropertySection from "./ui-custom/PropertySection";
import PropertyInput from "./ui-custom/PropertyInput";
import ColorInput from "./ui-custom/ColorInput";
import type { Layer, Position, Dimensions, Appearance } from "../types";

interface PropertiesSidebarProps {
  selectedLayer: Layer | null;
  position: Position;
  dimensions: Dimensions;
  appearance: Appearance;
  onPositionChange: (axis: "x" | "y" | "rotation", value: string) => void;
  onDimensionsChange: (dimension: "width" | "height", value: string) => void;
  onAppearanceChange: (
    property: "fill" | "stroke" | "strokeWidth",
    value: string
  ) => void;
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
}

export default function PropertiesSidebar({
  selectedLayer,
  position,
  dimensions,
  appearance,
  onPositionChange,
  onDimensionsChange,
  onAppearanceChange,
  onToggleLayerVisibility,
  onToggleLayerLock,
}: PropertiesSidebarProps) {
  return (
    <aside className="w-72 border-l border-border bg-card flex flex-col">
      <div className="p-4 font-medium flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <span>Properties</span>
          {selectedLayer && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs flex items-center gap-1 text-muted-foreground"
            >
              {selectedLayer.name}
              <FiChevronDown className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {selectedLayer ? (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Position section */}
            <PropertySection title="Position">
              <div className="grid grid-cols-2 gap-2">
                <PropertyInput
                  label="X"
                  value={position.x}
                  onChange={(value) => onPositionChange("x", value)}
                  type="number"
                />
                <PropertyInput
                  label="Y"
                  value={position.y}
                  onChange={(value) => onPositionChange("y", value)}
                  type="number"
                />
              </div>
              <div className="mt-2">
                <PropertyInput
                  label="R"
                  value={position.rotation}
                  onChange={(value) => onPositionChange("rotation", value)}
                  type="number"
                />
              </div>
            </PropertySection>

            {/* Layout section */}
            <PropertySection title="Layout">
              <div className="grid grid-cols-2 gap-2">
                <PropertyInput
                  label="W"
                  value={dimensions.width}
                  onChange={(value) => onDimensionsChange("width", value)}
                  type="number"
                />
                <PropertyInput
                  label="H"
                  value={dimensions.height}
                  onChange={(value) => onDimensionsChange("height", value)}
                  type="number"
                />
              </div>
            </PropertySection>

            {/* Appearance section */}
            <PropertySection title="Appearance">
              <ColorInput
                label="Fill"
                value={appearance.fill}
                onChange={(value) => onAppearanceChange("fill", value)}
              />

              <div className="mt-3">
                <ColorInput
                  label="Stroke"
                  value={appearance.stroke}
                  onChange={(value) => onAppearanceChange("stroke", value)}
                />
                <div className="mt-2">
                  <PropertyInput
                    label="W"
                    value={appearance.strokeWidth}
                    onChange={(value) =>
                      onAppearanceChange("strokeWidth", value)
                    }
                    type="number"
                  />
                </div>
              </div>
            </PropertySection>

            {/* Effects section */}
            <PropertySection title="Effects">
              <p className="text-xs text-muted-foreground">
                Drop shadow (coming soon)
              </p>
            </PropertySection>

            {/* Options section */}
            <PropertySection title="Options">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="visible"
                    checked={selectedLayer.visible}
                    onCheckedChange={() =>
                      onToggleLayerVisibility(selectedLayer.id)
                    }
                  />
                  <label htmlFor="visible" className="text-xs cursor-pointer">
                    Visible
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="locked"
                    checked={selectedLayer.locked}
                    onCheckedChange={() => onToggleLayerLock(selectedLayer.id)}
                  />
                  <label htmlFor="locked" className="text-xs cursor-pointer">
                    Locked
                  </label>
                </div>
              </div>
            </PropertySection>
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No element selected</p>
        </div>
      )}
    </aside>
  );
}
