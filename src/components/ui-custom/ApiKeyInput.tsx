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
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest flex items-center gap-1">
        <Key className="w-2.5 h-2.5" />
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs bg-background border border-border rounded px-2 py-1.5 pr-7 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent/50 transition-colors"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          tabIndex={-1}
          aria-label={visible ? "Hide API key" : "Show API key"}
        >
          {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
