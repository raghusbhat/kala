import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FiCornerUpLeft,
  FiCornerUpRight,
  FiCornerDownLeft,
  FiCornerDownRight,
  FiLink,
} from "react-icons/fi";
import PropertyInput from "./PropertyInput";
import type { CornerRadius } from "../../types";

interface CornerRadiusControlsProps {
  cornerRadius: CornerRadius;
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
  objectType: "rectangle" | "ellipse" | "text";
}

export default function CornerRadiusControls({
  cornerRadius,
  onCornerRadiusChange,
  objectType,
}: CornerRadiusControlsProps) {
  // Corner radius only applies to rectangles
  if (objectType !== "rectangle") {
    return null;
  }

  // Provide default values if cornerRadius is undefined
  const safeCornerRadius = cornerRadius || {
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0,
    independent: false,
  };

  const handleUniformChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, numValue);
    onCornerRadiusChange("all", clampedValue);
  };

  const handleCornerChange = (
    corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight",
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, numValue);
    onCornerRadiusChange(corner, clampedValue);
  };

  const toggleIndependent = () => {
    onCornerRadiusChange("independent", !safeCornerRadius.independent);
  };

  // Calculate the uniform value (average of all corners when not independent)
  const uniformValue = safeCornerRadius.independent
    ? safeCornerRadius.topLeft
    : (safeCornerRadius.topLeft +
        safeCornerRadius.topRight +
        safeCornerRadius.bottomLeft +
        safeCornerRadius.bottomRight) /
      4;

  const isAllSame =
    !safeCornerRadius.independent &&
    safeCornerRadius.topLeft === safeCornerRadius.topRight &&
    safeCornerRadius.topRight === safeCornerRadius.bottomLeft &&
    safeCornerRadius.bottomLeft === safeCornerRadius.bottomRight;

  return (
    <div className="space-y-4">
      {/* Main corner radius control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium">
            Corner Radius
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleIndependent}
            className={`h-6 w-6 p-0 ${
              safeCornerRadius.independent
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <FiLink className="h-3 w-3" />
          </Button>
        </div>

        {!safeCornerRadius.independent ? (
          // Uniform corner radius
          <PropertyInput
            label=""
            value={isAllSame ? safeCornerRadius.topLeft : uniformValue}
            onChange={handleUniformChange}
            type="number"
            min={0}
            className="flex-1"
          />
        ) : (
          // Individual corner controls
          <div className="space-y-3">
            {/* Top corners */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FiCornerUpLeft className="h-3 w-3" />
                  <span>TL</span>
                </div>
                <PropertyInput
                  label=""
                  value={safeCornerRadius.topLeft}
                  onChange={(value) => handleCornerChange("topLeft", value)}
                  type="number"
                  min={0}
                  className="flex-1"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FiCornerUpRight className="h-3 w-3" />
                  <span>TR</span>
                </div>
                <PropertyInput
                  label=""
                  value={safeCornerRadius.topRight}
                  onChange={(value) => handleCornerChange("topRight", value)}
                  type="number"
                  min={0}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Bottom corners */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FiCornerDownLeft className="h-3 w-3" />
                  <span>BL</span>
                </div>
                <PropertyInput
                  label=""
                  value={safeCornerRadius.bottomLeft}
                  onChange={(value) => handleCornerChange("bottomLeft", value)}
                  type="number"
                  min={0}
                  className="flex-1"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FiCornerDownRight className="h-3 w-3" />
                  <span>BR</span>
                </div>
                <PropertyInput
                  label=""
                  value={safeCornerRadius.bottomRight}
                  onChange={(value) => handleCornerChange("bottomRight", value)}
                  type="number"
                  min={0}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
