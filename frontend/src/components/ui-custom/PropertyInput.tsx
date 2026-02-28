import { Input } from "@/components/ui/input";
import { useRef, useState, useEffect } from "react";

interface PropertyInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number";
  className?: string;
  min?: number;
  max?: number;
}

export default function PropertyInput({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  min,
  max,
}: PropertyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState("");

  // Update internal value when external value changes
  useEffect(() => {
    if (value === 0 || value === "0") {
      // If the external value is 0, check if we're currently editing
      // If not, show the value as is
      if (document.activeElement !== inputRef.current) {
        setInternalValue(String(value));
      }
    } else {
      setInternalValue(String(value));
    }
  }, [value]);

  const handleFocus = () => {
    // Auto-select all text when input is focused
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // For number inputs, handle leading zeros and empty values
    if (type === "number") {
      // Allow empty string
      if (newValue === "") {
        setInternalValue("");
        onChange("");
        return;
      }

      // Remove leading zeros but preserve decimal numbers like "0.5"
      if (newValue.match(/^0+\d/) && !newValue.includes(".")) {
        newValue = newValue.replace(/^0+/, "");
      }

      // If after removing leading zeros we have empty string, make it empty
      if (newValue === "") {
        setInternalValue("");
        onChange("");
        return;
      }
    }

    setInternalValue(newValue);
    onChange(newValue);
  };

  const handleBlur = () => {
    // When focus is lost, if the field is empty and it's a number input,
    // we might want to set it to 0, but only if the parent expects it
    if (type === "number" && internalValue === "") {
      // Keep it empty - let the parent decide what to do
      onChange("");
    }
  };

  return (
    <div className="flex items-center">
      <span className="text-xs mr-2">{label}</span>
      <Input
        ref={inputRef}
        type="text" // Use text instead of number to have full control
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`h-7 text-xs ${className}`}
        min={min}
        max={max}
      />
    </div>
  );
}
