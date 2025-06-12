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
  addLayer: (
    type: "rectangle" | "ellipse" | "text" | "frame",
    parentId?: string | null
  ) => string;
  selectLayer: (id: string) => void;
  deleteLayer: (id: string) => void;
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
  updateShadow: (
    property: "enabled" | "offsetX" | "offsetY" | "blur" | "spread" | "color",
    value: string | number | boolean
  ) => void;
  updateCornerRadius: (
    property:
      | "topLeft"
      | "topRight"
      | "bottomLeft"
      | "bottomRight"
      | "independent"
      | "all",
    value: number | boolean
  ) => void;
  setLayerParent: (childId: string, parentId: string | null) => void;
  updateLayerName: (id: string, newName: string) => void;
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
    shadow: {
      enabled: false,
      offsetX: 0,
      offsetY: 4,
      blur: 8,
      spread: 0,
      color: "#000000",
    },
    cornerRadius: {
      topLeft: 0,
      topRight: 0,
      bottomLeft: 0,
      bottomRight: 0,
      independent: false,
    },
  },

  // Actions
  addLayer: (type, parentId) => {
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
        parentId: parentId || undefined,
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
          shadow: {
            enabled: false,
            offsetX: 0,
            offsetY: 4,
            blur: 8,
            spread: 0,
            color: "#000000",
          },
          cornerRadius: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0,
            independent: false,
          },
        };
      } else if (type === "frame") {
        newDimensions = { width: 400, height: 300 };
        newPosition = { x: 150, y: 200, rotation: 0 };
        newAppearance = {
          fill: "#3C3C3C",
          stroke: "#E5E7EB",
          strokeWidth: 1,
          shadow: {
            enabled: false,
            offsetX: 0,
            offsetY: 4,
            blur: 8,
            spread: 0,
            color: "#000000",
          },
          cornerRadius: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0,
            independent: false,
          },
        };
      } else if (type === "ellipse") {
        newDimensions = { width: 247, height: 233 };
        newPosition = { x: 308, y: 509, rotation: 0 };
        newAppearance = {
          fill: "#FFFFFF",
          stroke: "transparent",
          strokeWidth: 2,
          shadow: {
            enabled: false,
            offsetX: 0,
            offsetY: 4,
            blur: 8,
            spread: 0,
            color: "#000000",
          },
          cornerRadius: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0,
            independent: false,
          },
        };
      } else if (type === "text") {
        newDimensions = { width: 120, height: 30 };
        newPosition = { x: 250, y: 300, rotation: 0 };
        newAppearance = {
          fill: "#FFFFFF",
          stroke: "transparent",
          strokeWidth: 0,
          shadow: {
            enabled: false,
            offsetX: 0,
            offsetY: 4,
            blur: 8,
            spread: 0,
            color: "#000000",
          },
          cornerRadius: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0,
            independent: false,
          },
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

  deleteLayer: (id) => {
    set((state) => {
      const newLayers = state.layers.filter((layer) => layer.id !== id);

      // If the deleted layer was selected, clear selection
      const newSelectedLayerId =
        state.selectedLayerId === id ? null : state.selectedLayerId;

      return {
        layers: newLayers,
        selectedLayerId: newSelectedLayerId,
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

  updateShadow: (property, value) => {
    set((state) => ({
      appearance: {
        ...state.appearance,
        shadow: {
          ...state.appearance.shadow,
          [property]: value,
        },
      },
    }));
  },

  updateCornerRadius: (property, value) => {
    set((state) => {
      const currentCornerRadius = state.appearance.cornerRadius;

      if (property === "independent") {
        return {
          appearance: {
            ...state.appearance,
            cornerRadius: {
              ...currentCornerRadius,
              independent: value as boolean,
            },
          },
        };
      }

      if (property === "all") {
        // Update all corners to the same value
        const numValue = value as number;
        return {
          appearance: {
            ...state.appearance,
            cornerRadius: {
              ...currentCornerRadius,
              topLeft: numValue,
              topRight: numValue,
              bottomLeft: numValue,
              bottomRight: numValue,
            },
          },
        };
      }

      // Update individual corner
      return {
        appearance: {
          ...state.appearance,
          cornerRadius: {
            ...currentCornerRadius,
            [property]: value as number,
          },
        },
      };
    });
  },

  setLayerParent: (childId, parentId) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === childId ? { ...layer, parentId } : layer
      ),
    }));
  },

  updateLayerName: (id, newName) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, name: newName } : layer
      ),
    }));
  },
}));
