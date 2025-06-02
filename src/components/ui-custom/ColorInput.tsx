import { useState, useEffect, useRef } from "react";
import { FiEyeOff } from "react-icons/fi";
import { HexColorPicker, HexColorInput } from "react-colorful";

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
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle color value updates
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Opacity utilities
  const hexToRgba = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0, a: 1 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 1,
    };
  };

  const handleColorChange = (hex: string) => {
    setInternalValue(hex);
    onChange(hex);
  };

  const handleOpacityChange = (val: number) => {
    const opacity = Math.max(0, Math.min(1, val / 100));
    const rgba = hexToRgba(internalValue);
    const newColor = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${opacity})`;
    onChange(newColor);
  };

  const handleSwatchClick = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const popupWidth = 300; // Approximate popup width
    const popupHeight = 400; // Approximate popup height

    // Calculate initial position (left of the swatch)
    let newX = rect.left - popupWidth - 8;
    let newY = rect.top;

    // Viewport boundary checking
    if (newX < 8) newX = rect.right + 8;
    if (newY + popupHeight > window.innerHeight - 8) {
      newY = window.innerHeight - popupHeight - 8;
    }
    if (newY < 8) newY = 8;

    setPosition({ x: newX, y: newY });
    setIsOpen(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isHeaderClick = target.closest(".color-picker-header");

    if (!isHeaderClick) return;

    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const newX = dragStart.startX + deltaX;
    const newY = dragStart.startY + deltaY;

    // Viewport boundary checking
    const popupWidth = 300;
    const popupHeight = 400;
    const clampedPosition = {
      x: Math.max(8, Math.min(window.innerWidth - popupWidth - 8, newX)),
      y: Math.max(8, Math.min(window.innerHeight - popupHeight - 8, newY)),
    };

    setPosition(clampedPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        popupRef.current &&
        buttonRef.current &&
        !popupRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // Add a small delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Extract color and opacity
  const currentColor = internalValue.startsWith("rgba")
    ? internalValue.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
      )?.[0] || internalValue
    : internalValue;

  const isTransparent = value === "transparent";
  const displayColor = isTransparent ? "#000000" : internalValue || "#000000";

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs text-muted-foreground min-w-[30px]">
          {label}
        </span>
      )}

      <div className="flex items-center gap-2 flex-1">
        <button
          ref={buttonRef}
          onClick={handleSwatchClick}
          className="w-8 h-6 border border-border rounded flex-shrink-0 relative overflow-hidden"
          style={{
            backgroundColor: isTransparent ? "transparent" : displayColor,
          }}
        >
          {isTransparent && (
            <div className="absolute inset-0 flex items-center justify-center">
              <FiEyeOff className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </button>

        <div className="flex-1">
          <HexColorInput
            color={displayColor}
            onChange={handleColorChange}
            className="w-full h-6 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="#000000"
          />
        </div>
      </div>

      {isOpen && (
        <div
          ref={popupRef}
          className="fixed z-[1000] bg-popover border border-border rounded-lg shadow-lg p-3"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: "300px",
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Draggable header */}
          <div className="color-picker-header cursor-move h-4 mb-3 flex items-center justify-center">
            <div className="w-8 h-1 bg-border rounded-full"></div>
          </div>

          <div className="space-y-4">
            <HexColorPicker
              color={displayColor}
              onChange={handleColorChange}
              style={{ width: "100%", height: "200px" }}
            />

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Hex</label>
                <HexColorInput
                  color={displayColor}
                  onChange={handleColorChange}
                  className="w-full px-2 py-1 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">
                  Opacity %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={100}
                  onChange={(e) => handleOpacityChange(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <button
              onClick={() => onChange("transparent")}
              className="w-full px-3 py-2 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded flex items-center justify-center gap-2 transition-colors"
            >
              <FiEyeOff className="w-3 h-3" />
              Transparent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
