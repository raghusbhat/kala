import { Checkbox } from "@/components/ui/checkbox";
import PropertyInput from "./PropertyInput";
import ColorInput from "./ColorInput";
import type { Shadow } from "../../types";

interface ShadowControlsProps {
  shadow: Shadow;
  onShadowChange: (
    property: "enabled" | "offsetX" | "offsetY" | "blur" | "spread" | "color",
    value: string | number | boolean
  ) => void;
}

export default function ShadowControls({
  shadow,
  onShadowChange,
}: ShadowControlsProps) {
  // Provide default values if shadow is undefined
  const safeShadow = shadow || {
    enabled: false,
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    spread: 0,
    color: "#000000",
  };

  const handleBlurChange = (value: string) => {
    if (value === "") {
      onShadowChange("blur", 0);
      return;
    }
    const numValue = parseFloat(value);
    const clampedValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
    onShadowChange("blur", clampedValue);
  };

  const handleSpreadChange = (value: string) => {
    if (value === "") {
      onShadowChange("spread", 0);
      return;
    }
    const numValue = parseFloat(value);
    const finalValue = isNaN(numValue) ? 0 : numValue;
    onShadowChange("spread", finalValue);
  };

  return (
    <div className="space-y-4">
      {/* Shadow enabled toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="shadow-enabled"
          checked={safeShadow.enabled}
          onCheckedChange={(checked) =>
            onShadowChange("enabled", checked as boolean)
          }
        />
        <label
          htmlFor="shadow-enabled"
          className="text-xs cursor-pointer font-medium"
        >
          Drop Shadow
        </label>
      </div>

      {/* Shadow controls - only show when enabled */}
      {safeShadow.enabled && (
        <div className="space-y-4 pl-6 border-l border-border/50">
          {/* Position row */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              Position
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PropertyInput
                label="X"
                value={safeShadow.offsetX}
                onChange={(value) =>
                  onShadowChange("offsetX", parseFloat(value) || 0)
                }
                type="number"
                className="flex-1"
              />
              <PropertyInput
                label="Y"
                value={safeShadow.offsetY}
                onChange={(value) =>
                  onShadowChange("offsetY", parseFloat(value) || 0)
                }
                type="number"
                className="flex-1"
              />
            </div>
          </div>

          {/* Effects row */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              Effects
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PropertyInput
                label="Blur"
                value={safeShadow.blur}
                onChange={handleBlurChange}
                type="number"
                min={0}
                className="flex-1"
              />
              <PropertyInput
                label="Spread"
                value={safeShadow.spread}
                onChange={handleSpreadChange}
                type="number"
                className="flex-1"
              />
            </div>
          </div>

          {/* Color row */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              Color
            </div>
            <ColorInput
              label=""
              value={safeShadow.color}
              onChange={(value) => onShadowChange("color", value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
