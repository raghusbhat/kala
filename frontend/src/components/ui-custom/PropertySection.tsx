import { ReactNode } from "react";

interface PropertySectionProps {
  title: string;
  children: ReactNode;
}

export default function PropertySection({
  title,
  children,
}: PropertySectionProps) {
  return (
    <div>
      <h3 className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest mb-2.5">
        {title}
      </h3>
      {children}
    </div>
  );
}
