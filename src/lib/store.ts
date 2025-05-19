import { create } from "zustand";
import type { DrawingTool } from "../components/SkiaCanvas/SkiaCanvas";
import { typedSetter } from "./utils";

// Define object types
export interface BaseObject {
  type: DrawingTool;
  startX: number;
  startY: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth?: number;
  visible: boolean;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  id?: string;
}

export interface ShapeObject extends BaseObject {
  type: "rectangle" | "ellipse" | "line" | "pen" | "select";
  endX: number;
  endY: number;
  path?: any;
}

export interface TextObject extends BaseObject {
  type: "text";
  id: string;
  text: string;
  fontSize: number;
  endX: number;
  endY: number;
}

export type CanvasObject = ShapeObject | TextObject;

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

  // Text tool
  textPosition: { x: number; y: number };
  setTextPosition: (position: { x: number; y: number }) => void;

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
  setOffset: (offset) => set({ offset: typedSetter(offset) }),

  // Text tool
  textPosition: { x: 0, y: 0 },
  setTextPosition: (position) => set({ textPosition: typedSetter(position) }),

  // Objects
  objects: [],
  addObject: (object) =>
    set((state) => {
      // Ensure new objects have default visibility and stroke if not provided
      const objectWithDefaults = {
        ...object,
        visible: object.visible !== undefined ? object.visible : true,
        strokeColor: object.strokeColor || "transparent",
        fillColor: object.fillColor || "#FFFFFF",
      };
      // For text objects, check if we already have an object with the same ID
      if (object.type === "text" && "id" in object) {
        const textObj = object as TextObject;
        const existingIndex = state.objects.findIndex(
          (obj) => obj.type === "text" && "id" in obj && obj.id === textObj.id
        );

        if (existingIndex >= 0) {
          // Update existing object instead of adding a new one
          const newObjects = [...state.objects];
          newObjects[existingIndex] = { ...textObj };
          return { objects: newObjects };
        }
      }

      return { objects: [...state.objects, objectWithDefaults] };
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
