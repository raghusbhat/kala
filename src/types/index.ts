// Layer interface for the application
export interface Layer {
  id: string;
  name: string;
  type: "rectangle" | "ellipse" | "text";
  visible: boolean;
  locked: boolean;
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

export interface Appearance {
  fill: string;
  stroke: string;
  strokeWidth: number;
}
