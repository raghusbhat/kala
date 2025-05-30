import { create } from "zustand";
import type { Layer, Position, Dimensions, Appearance } from "../types";

interface LayerState {
  // Layers
  layers: Layer[];
  selectedLayerId: string | null;

  // Properties for selected layer
  position: Position;
  dimensions: Dimensions;
  appearance: Appearance;

  // Actions
  addLayer: (type: "rectangle" | "ellipse" | "text") => string;
  selectLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  updatePosition: (
    axis: "x" | "y" | "rotation",
    value: string | number
  ) => void;
  updateDimensions: (
    dimension: "width" | "height",
    value: string | number
  ) => void;
  updateAppearance: (
    property: "fill" | "stroke" | "strokeWidth",
    value: string | number
  ) => void;
}

export const useLayerStore = create<LayerState>((set) => ({
  // Initial state
  layers: [],
  selectedLayerId: null,

  position: { x: 0, y: 0, rotation: 0 },
  dimensions: { width: 200, height: 200 },
  appearance: {
    fill: "#FFFFFF",
    stroke: "transparent",
    strokeWidth: 2,
  },

  // Actions
  addLayer: (type) => {
    const newId = `layer-${Date.now()}-${Math.round(Math.random() * 1000)}`;

    set((state) => {
      // Update layer name to be unique
      const layerName = `${type.charAt(0).toUpperCase() + type.slice(1)} ${
        state.layers.length + 1
      }`;

      const newLayer: Layer = {
        id: newId,
        name: layerName,
        type,
        visible: true,
        locked: false,
        selected: true,
      };

      // Update properties based on type
      let newPosition = { ...state.position };
      let newDimensions = { ...state.dimensions };
      let newAppearance = { ...state.appearance };

      if (type === "rectangle") {
        newDimensions = { width: 200, height: 100 };
        newPosition = { x: 150, y: 200, rotation: 0 };
        newAppearance = {
          fill: "#FFFFFF",
          stroke: "transparent",
          strokeWidth: 2,
        };
      } else if (type === "ellipse") {
        newDimensions = { width: 247, height: 233 };
        newPosition = { x: 308, y: 509, rotation: 0 };
        newAppearance = {
          fill: "#FFFFFF",
          stroke: "transparent",
          strokeWidth: 2,
        };
      } else if (type === "text") {
        newDimensions = { width: 120, height: 30 };
        newPosition = { x: 250, y: 300, rotation: 0 };
        newAppearance = {
          fill: "#FFFFFF",
          stroke: "transparent",
          strokeWidth: 0,
        };
      }

      return {
        layers: [
          ...state.layers.map((layer) => ({ ...layer, selected: false })),
          newLayer,
        ],
        selectedLayerId: newId,
        position: newPosition,
        dimensions: newDimensions,
        appearance: newAppearance,
      };
    });

    return newId;
  },

  selectLayer: (id) => {
    set((state) => {
      // If no valid id provided, deselect all
      if (!id) {
        return {
          layers: state.layers.map((l) => ({ ...l, selected: false })),
          selectedLayerId: null,
        };
      }

      // Find the layer
      const layer = state.layers.find((l) => l.id === id);

      // If no layer found, don't change anything
      if (!layer) return state;

      // Update selection without changing properties (they'll be set externally)
      return {
        layers: state.layers.map((l) => ({
          ...l,
          selected: l.id === id,
        })),
        selectedLayerId: id,
      };
    });
  },

  toggleLayerVisibility: (id) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      ),
    }));
  },

  toggleLayerLock: (id) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, locked: !layer.locked } : layer
      ),
    }));
  },

  updatePosition: (axis, value) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;

    set((state) => ({
      position: {
        ...state.position,
        [axis]: isNaN(numValue) ? 0 : numValue,
      },
    }));
  },

  updateDimensions: (dimension, value) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;

    set((state) => ({
      dimensions: {
        ...state.dimensions,
        [dimension]: isNaN(numValue) ? 0 : numValue,
      },
    }));
  },

  updateAppearance: (property, value) => {
    // If it's strokeWidth, convert to number
    if (property === "strokeWidth") {
      const numValue = typeof value === "string" ? parseFloat(value) : value;

      set((state) => ({
        appearance: {
          ...state.appearance,
          strokeWidth: isNaN(numValue) ? 0 : numValue,
        },
      }));
    } else {
      // For fill and stroke properties, keep as string
      set((state) => ({
        appearance: {
          ...state.appearance,
          [property]: value.toString(),
        },
      }));
    }
  },
}));
