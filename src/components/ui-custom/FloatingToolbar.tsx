import { ReactNode } from "react";

interface FloatingToolbarProps {
  children: ReactNode;
}

export default function FloatingToolbar({ children }: FloatingToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] rounded-lg p-1.5 flex gap-1 items-center bg-background/95 backdrop-blur-sm shadow-xl border border-border/50">
      {children}
    </div>
  );
}
