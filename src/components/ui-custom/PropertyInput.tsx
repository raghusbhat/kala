import { Input } from "@/components/ui/input";

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
  return (
    <div className="flex items-center">
      <span className="text-xs mr-2">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-7 text-xs ${className}`}
        min={min}
        max={max}
      />
    </div>
  );
}
