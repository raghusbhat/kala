import { Input } from "@/components/ui/input";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorInput({
  label,
  value,
  onChange,
}: ColorInputProps) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(value.startsWith("#") ? value : "#ffffff");
  const [opacity, setOpacity] = useState(100);

  // Update color and propagate hex+opacity
  const handleColorChange = (hex: string) => {
    setColor(hex);
    let hexWithAlpha = hex;
    if (opacity < 100) {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, "0");
      hexWithAlpha = hex + alpha;
    }
    onChange(hexWithAlpha);
  };

  // Update opacity and propagate
  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    let hexWithAlpha = color;
    if (val < 100) {
      const alpha = Math.round((val / 100) * 255)
        .toString(16)
        .padStart(2, "0");
      hexWithAlpha = color + alpha;
    }
    onChange(hexWithAlpha);
  };

  // Position the popup to the left of the right sidebar (fixed position)
  const popupStyle = {
    position: "fixed" as const,
    right: 30, // adjust as needed for your sidebar width
    top: 0, // adjust as needed for vertical alignment
    zIndex: 9999,
    minWidth: 288,
    background: "#18181b",
    borderRadius: 12,
    boxShadow: "0 4px 32px 0 rgba(0,0,0,0.25)",
    border: "1px solid #232329",
    padding: 0,
    color: "#fff",
  };

  return (
    <div>
      <p className="text-xs mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div
              className="w-6 h-6 rounded border border-border cursor-pointer"
              style={{
                backgroundColor:
                  value === "transparent" ? "transparent" : value,
              }}
              onClick={() => setOpen(true)}
            />
          </PopoverTrigger>
          {open && (
            <PopoverContent
              className="p-0"
              sideOffset={8}
              asChild
              style={popupStyle}
            >
              <div className="w-72 select-none">
                <div
                  className="color-picker-header p-2 border-b font-semibold text-xs bg-zinc-900 text-white rounded-t flex items-center"
                  style={{ userSelect: "none" }}
                >
                  Color Picker
                </div>
                <div className="p-4 bg-zinc-900 rounded-b">
                  <HexColorPicker
                    color={color}
                    onChange={handleColorChange}
                    style={{
                      width: "100%",
                      height: 160,
                      borderRadius: 8,
                      background: "#232329",
                    }}
                  />
                  <div className="flex items-center mt-4 gap-2">
                    <span className="text-xs text-zinc-300">Hex</span>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="border border-zinc-700 bg-zinc-800 text-xs font-mono rounded px-2 py-1 w-24 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="ml-2 text-xs text-zinc-300">Opacity</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={opacity}
                      onChange={(e) =>
                        handleOpacityChange(Number(e.target.value))
                      }
                      className="ml-2 accent-primary w-24"
                    />
                    <span className="ml-2 text-xs w-8 text-zinc-300">
                      {opacity}%
                    </span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          )}
        </Popover>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs font-mono"
        />
      </div>
    </div>
  );
}
