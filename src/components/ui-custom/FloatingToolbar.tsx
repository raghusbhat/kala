import { ReactNode } from "react";

interface FloatingToolbarProps {
  children: ReactNode;
}

export default function FloatingToolbar({ children }: FloatingToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-0.5 bg-card border border-border rounded-lg px-1.5 py-1 shadow-lg shadow-black/40">
      {children}
    </div>
  );
}
