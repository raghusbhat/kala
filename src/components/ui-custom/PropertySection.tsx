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
      <h3 className="text-xs font-medium text-muted-foreground mb-2">
        {title.toUpperCase()}
      </h3>
      {children}
    </div>
  );
}
