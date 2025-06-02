import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { FiChevronDown, FiTrash2, FiLink, FiUnlock } from "react-icons/fi";
import PropertySection from "./ui-custom/PropertySection";
import PropertyInput from "./ui-custom/PropertyInput";
import ColorInput from "./ui-custom/ColorInput";
import ShadowControls from "./ui-custom/ShadowControls";
import CornerRadiusControls from "./ui-custom/CornerRadiusControls";
import { useCanvasStore } from "../lib/store";
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
  onShadowChange: (
    property: "enabled" | "offsetX" | "offsetY" | "blur" | "spread" | "color",
    value: string | number | boolean
  ) => void;
  onCornerRadiusChange: (
    property:
      | "topLeft"
      | "topRight"
      | "bottomLeft"
      | "bottomRight"
      | "independent"
      | "all",
    value: number | boolean
  ) => void;
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onDeleteObject: () => void;
}

export default function PropertiesSidebar({
  selectedLayer,
  position,
  dimensions,
  appearance,
  onPositionChange,
  onDimensionsChange,
  onAppearanceChange,
  onShadowChange,
  onCornerRadiusChange,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onDeleteObject,
}: PropertiesSidebarProps) {
  const {
    canvasBackgroundColor,
    setCanvasBackgroundColor,
    aspectRatioLocked,
    setAspectRatioLocked,
  } = useCanvasStore();

  // Calculate current aspect ratio
  const currentAspectRatio = dimensions.width / dimensions.height;

  // Handle width change with aspect ratio lock
  const handleWidthChange = (value: string) => {
    onDimensionsChange("width", value);
    if (aspectRatioLocked && !isNaN(currentAspectRatio)) {
      const newWidth = parseFloat(value);
      const newHeight = newWidth / currentAspectRatio;
      onDimensionsChange("height", newHeight.toFixed(2));
    }
  };

  // Handle height change with aspect ratio lock
  const handleHeightChange = (value: string) => {
    onDimensionsChange("height", value);
    if (aspectRatioLocked && !isNaN(currentAspectRatio)) {
      const newHeight = parseFloat(value);
      const newWidth = newHeight * currentAspectRatio;
      onDimensionsChange("width", newWidth.toFixed(2));
    }
  };

  return (
    <aside className="w-72 border-l border-border bg-card flex flex-col">
      <div className="p-4 font-medium flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <span>Properties</span>
          {selectedLayer ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs flex items-center gap-1 text-muted-foreground"
            >
              {selectedLayer.name}
              <FiChevronDown className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs flex items-center gap-1 text-muted-foreground"
            >
              Canvas
              <FiChevronDown className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {selectedLayer ? (
        <TooltipProvider>
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <PropertyInput
                        label="W"
                        value={dimensions.width}
                        onChange={handleWidthChange}
                        type="number"
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setAspectRatioLocked(!aspectRatioLocked)
                          }
                          className={`h-7 w-7 p-0 ${
                            aspectRatioLocked
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {aspectRatioLocked ? (
                            <FiLink className="h-3 w-3" />
                          ) : (
                            <FiUnlock className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {aspectRatioLocked ? "Unlock" : "Lock"} aspect ratio
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex-1">
                      <PropertyInput
                        label="H"
                        value={dimensions.height}
                        onChange={handleHeightChange}
                        type="number"
                      />
                    </div>
                  </div>
                </div>

                {/* Corner Radius Controls */}
                <div className="mt-4">
                  <CornerRadiusControls
                    cornerRadius={appearance.cornerRadius}
                    onCornerRadiusChange={onCornerRadiusChange}
                    objectType={selectedLayer.type}
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
                <ShadowControls
                  shadow={
                    appearance.shadow || {
                      enabled: false,
                      offsetX: 0,
                      offsetY: 4,
                      blur: 8,
                      spread: 0,
                      color: "#000000",
                    }
                  }
                  onShadowChange={onShadowChange}
                />
              </PropertySection>

              {/* Options section */}
              <PropertySection title="Options">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="visible"
                        checked={selectedLayer.visible}
                        onCheckedChange={() =>
                          onToggleLayerVisibility(selectedLayer.id)
                        }
                      />
                      <label
                        htmlFor="visible"
                        className="text-xs cursor-pointer"
                      >
                        Visible
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="locked"
                        checked={selectedLayer.locked}
                        onCheckedChange={() =>
                          onToggleLayerLock(selectedLayer.id)
                        }
                      />
                      <label
                        htmlFor="locked"
                        className="text-xs cursor-pointer"
                      >
                        Locked
                      </label>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onDeleteObject}
                          className="h-6 w-6 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <FiTrash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete object (Delete)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </PropertySection>
            </div>
          </ScrollArea>
        </TooltipProvider>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Canvas Properties */}
            <PropertySection title="Canvas">
              <ColorInput
                label="Background"
                value={canvasBackgroundColor}
                onChange={setCanvasBackgroundColor}
              />
            </PropertySection>
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}
