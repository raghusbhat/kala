import { create } from "zustand";
import type { Layer, Position, Dimensions, Appearance } from "../types";
import { useCanvasStore } from "./store";

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
  reorderLayers: (
    draggedId: string,
    targetId: string | null,
    position: "above" | "below" | "inside"
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

  reorderLayers: (draggedId, targetId, position) => {
    set((state) => {
      const layers: Layer[] = [...state.layers];
      const draggedIndex = layers.findIndex((l) => l.id === draggedId);
      if (draggedIndex === -1) return { layers: state.layers };

      const prevParentId: string | null = layers[draggedIndex].parentId ?? null;

      const draggedLayer: Layer = { ...layers[draggedIndex] };
      layers.splice(draggedIndex, 1);

      const isDescendant = (id: string, ancestorId: string): boolean => {
        let cur: Layer | undefined = layers.find((l) => l.id === id);
        // Walk up the tree
        while (cur) {
          if (cur.parentId === ancestorId) return true;
          if (!cur.parentId) return false;
          cur = layers.find((l) => l.id === cur!.parentId);
        }
        return false;
      };

      if (position === "inside" && targetId) {
        // Nest inside target frame
        draggedLayer.parentId = targetId;
        const targetIdx = layers.findIndex((l) => l.id === targetId);
        let insertIdx = targetIdx + 1;
        // Insert after all existing descendants of target
        for (let i = targetIdx + 1; i < layers.length; i++) {
          if (isDescendant(layers[i].id, targetId)) {
            insertIdx = i + 1;
          } else {
            break;
          }
        }
        layers.splice(insertIdx, 0, draggedLayer);
      } else if (targetId) {
        const targetIdx = layers.findIndex((l) => l.id === targetId);
        if (targetIdx === -1) return { layers: state.layers };

        // Same parent as target
        draggedLayer.parentId = layers[targetIdx].parentId ?? null;
        const insertIdx = position === "above" ? targetIdx : targetIdx + 1;
        layers.splice(insertIdx, 0, draggedLayer);
      } else {
        // Drop to root (no parent)
        draggedLayer.parentId = null;
        layers.push(draggedLayer);
      }

      // Sync with canvas store
      const canvas = useCanvasStore.getState();
      const objIdx = canvas.objects.findIndex((o) => o.id === draggedId);
      if (objIdx !== -1) {
        canvas.updateObject(objIdx, {
          parentFrameId: draggedLayer.parentId ?? undefined,
        } as any);
      }

      // Update childrenIds on frames
      const updateFrameChildren = (
        frameId: string | null,
        childId: string,
        add: boolean
      ) => {
        if (!frameId) return;
        const frameIdx = canvas.objects.findIndex((o) => o.id === frameId);
        if (frameIdx === -1) return;
        const frameObj = canvas.objects[frameIdx] as any;
        const currentChildren: string[] = frameObj.childrenIds || [];
        let newChildren: string[];
        if (add) {
          if (!currentChildren.includes(childId))
            newChildren = [...currentChildren, childId];
          else newChildren = currentChildren;
        } else {
          newChildren = currentChildren.filter((id) => id !== childId);
        }
        canvas.updateObject(frameIdx, { childrenIds: newChildren } as any);
      };

      if (prevParentId !== draggedLayer.parentId) {
        updateFrameChildren(prevParentId, draggedId, false);
        updateFrameChildren(draggedLayer.parentId ?? null, draggedId, true);
      }

      return { layers };
    });
  },
}));
