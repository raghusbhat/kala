import { create } from "zustand";
import type { Path } from "canvaskit-wasm";
import { typedSetter } from "./utils";
import type { SkiaObjectDataForApp } from "../components/CanvasArea";

export type DrawingTool =
  | "none"
  | "select"
  | "rectangle"
  | "ellipse"
  | "line"
  | "pencil"
  | "pen"
  | "text"
  | "frame";

// Define object types
export interface BaseObject {
  type: DrawingTool;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth?: number;
  visible: boolean;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  id?: string;
  // Frame-related properties
  isFrame?: boolean; // Marks this object as a frame (created using the Frame tool)
  parentFrameId?: string; // If this object lives inside a frame, reference its parent frame's id
  childrenIds?: string[]; // If this object is a frame, track ids of its child objects
  name?: string;
  path?: Path;
  text?: string;
  fontSize?: number;
  // Shadow properties
  shadowEnabled?: boolean;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  shadowColor?: string;
  // Corner radius properties
  cornerRadiusTopLeft?: number;
  cornerRadiusTopRight?: number;
  cornerRadiusBottomLeft?: number;
  cornerRadiusBottomRight?: number;
  cornerRadiusIndependent?: boolean;
}

export interface ShapeObject extends BaseObject {
  type: "rectangle" | "ellipse" | "line" | "pencil" | "pen" | "select";
}

export interface TextObject extends BaseObject {
  type: "text";
  id: string;
  text: string;
  fontSize: number;
}

export type CanvasObject =
  | (ShapeObject & {
      type: "rectangle" | "ellipse" | "line" | "pencil" | "pen" | "select";
    })
  | (TextObject & { type: "text" });

// Define the store's state shape
interface CanvasState {
  // Tools
  currentTool: DrawingTool;
  setCurrentTool: (tool: DrawingTool) => void;

  // Canvas view
  scale: number;
  offset: { x: number; y: number };
  setScale: (scale: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;

  // Canvas properties
  canvasBackgroundColor: string;
  setCanvasBackgroundColor: (color: string) => void;

  // Text tool
  textPosition: { x: number; y: number };
  setTextPosition: (position: { x: number; y: number }) => void;

  // Aspect ratio lock
  aspectRatioLocked: boolean;
  setAspectRatioLocked: (locked: boolean) => void;

  // Objects
  objects: CanvasObject[];
  addObject: (object: CanvasObject) => void;
  updateObject: (index: number, object: Partial<CanvasObject>) => void;
  removeObject: (index: number) => void;

  // Object transformations
  rotateObject: (index: number, angle: number) => void;
  scaleObject: (index: number, scaleX: number, scaleY: number) => void;

  // Appearance
  currentColor: string;
  currentStrokeColor: string;
  strokeWidth: number;
  setColor: (color: string) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  toggleObjectVisibility: (index: number) => void;
}

// Create the store
export const useCanvasStore = create<CanvasState>((set) => ({
  // Tools
  currentTool: "none",
  setCurrentTool: (tool) => set({ currentTool: tool }),

  // Canvas view
  scale: 1,
  offset: { x: 0, y: 0 },
  setScale: (scale) => set({ scale }),
  setOffset: (offset) => set({ offset }),

  // Canvas properties
  canvasBackgroundColor: "#1E1E1E",
  setCanvasBackgroundColor: (color) => set({ canvasBackgroundColor: color }),

  // Text tool
  textPosition: { x: 0, y: 0 },
  setTextPosition: (position) => set({ textPosition: typedSetter(position) }),

  // Aspect ratio lock
  aspectRatioLocked: false,
  setAspectRatioLocked: (locked) => set({ aspectRatioLocked: locked }),

  // Objects
  objects: [],
  addObject: (object) =>
    set((state) => {
      // Ensure new objects have default visibility and stroke if not provided
      const objectWithDefaults = {
        ...object,
        id:
          object.id ||
          `obj-${Date.now()}-${Math.round(Math.random() * 100000)}`,
        visible: object.visible !== undefined ? object.visible : true,
        strokeColor: object.strokeColor || "transparent",
        fillColor: object.fillColor || "#FFFFFF",
      } as CanvasObject;
      // Type guard for text object
      if (objectWithDefaults.type === "text") {
        const textObj = objectWithDefaults as TextObject;
        const existingIndex = state.objects.findIndex(
          (obj) => obj.type === "text" && "id" in obj && obj.id === textObj.id
        );
        if (existingIndex >= 0) {
          // Update existing object instead of adding a new one
          const newObjects = [...state.objects];
          newObjects[existingIndex] = { ...textObj };
          return { objects: newObjects };
        }
        return { objects: [...state.objects, textObj] };
      } else {
        // For all other shapes (rectangle, ellipse, line, pencil, pen, select)
        const shapeObj = objectWithDefaults as ShapeObject;
        return { objects: [...state.objects, shapeObj] };
      }
    }),
  updateObject: (index, object) =>
    set((state) => {
      const newObjects = [...state.objects];
      newObjects[index] = { ...newObjects[index], ...object };
      return { objects: newObjects };
    }),
  removeObject: (index) =>
    set((state) => ({
      objects: state.objects.filter((_, i) => i !== index),
    })),

  // Object transformations
  rotateObject: (index, angle) =>
    set((state) => {
      const newObjects = [...state.objects];
      newObjects[index] = { ...newObjects[index], rotation: angle };
      return { objects: newObjects };
    }),
  scaleObject: (index, scaleX, scaleY) =>
    set((state) => {
      const newObjects = [...state.objects];
      newObjects[index] = { ...newObjects[index], scaleX, scaleY };
      return { objects: newObjects };
    }),

  // Appearance
  currentColor: "#FFFFFF",
  currentStrokeColor: "#000000",
  strokeWidth: 2,
  setColor: (color) => set({ currentColor: color }),
  setStrokeColor: (color) => set({ currentStrokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  toggleObjectVisibility: (index) =>
    set((state) => {
      const newObjects = [...state.objects];
      if (newObjects[index]) {
        newObjects[index] = {
          ...newObjects[index],
          visible: !newObjects[index].visible,
        };
      }
      return { objects: newObjects };
    }),
}));

// Utility function to get the path data for a pen object
export const getPenObjectPath = (object: CanvasObject): Path | undefined => {
  if (object.type === "pen" && object.path) {
    return object.path as Path;
  }
  return undefined;
};
