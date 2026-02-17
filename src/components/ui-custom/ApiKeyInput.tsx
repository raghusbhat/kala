import React, { useState } from "react";
import { Eye, EyeOff, Key } from "lucide-react";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function ApiKeyInput({
  value,
  onChange,
  placeholder = "Enter API key...",
  label = "API Key",
}: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1 mb-2">
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        <Key className="w-3 h-3" />
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 pr-8 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={visible ? "Hide API key" : "Show API key"}
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
