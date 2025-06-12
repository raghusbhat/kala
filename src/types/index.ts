// Layer interface for the application
export interface Layer {
  id: string;
  name: string;
  type: "rectangle" | "ellipse" | "text" | "frame";
  visible: boolean;
  locked: boolean;
  parentId?: string;
  selected?: boolean;
}

// Position and dimensions interfaces
export interface Position {
  x: number;
  y: number;
  rotation: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Shadow {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
}

export interface CornerRadius {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
  independent: boolean; // Whether individual corners are being controlled
}

export interface Appearance {
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadow: Shadow;
  cornerRadius: CornerRadius;
}
