import { useState, useEffect, useRef, useCallback } from "react";
import { useLayerStore } from "./lib/useLayerStore";
import { useCanvasStore } from "./lib/store";
import type { CanvasObject, ShapeObject, TextObject } from "./lib/store";
import Header from "./components/Header";
import LayersSidebar from "./components/LayersSidebar";
import CanvasArea from "./components/CanvasArea";
import type { SkiaObjectDataForApp } from "./components/CanvasArea";
import PropertiesSidebar from "./components/PropertiesSidebar";

function App() {
  const [activeMode, setActiveMode] = useState<"design" | "dev">("design");

  // Use ref to prevent circular updates
  const isUpdatingFromCanvas = useRef(false);

  // Layer store hooks
  const {
    layers,
    selectedLayerId,
    position,
    dimensions,
    appearance,
    addLayer,
    selectLayer,
    deleteLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    updatePosition,
    updateDimensions,
    updateAppearance,
    updateShadow,
    updateCornerRadius,
  } = useLayerStore();

  // Canvas store hooks
  const {
    objects: canvasObjects,
    updateObject: updateCanvasObject,
    addObject: addCanvasObject,
    removeObject: removeCanvasObject,
  } = useCanvasStore();

  const selectedLayer =
    layers.find((layer) => layer.id === selectedLayerId) || null;

  // Handle delete functionality
  const handleDeleteObject = useCallback(() => {
    if (!selectedLayerId) return;

    // Find the canvas object index
    const canvasObjectIndex = canvasObjects.findIndex(
      (obj) => obj.id === selectedLayerId
    );

    if (canvasObjectIndex !== -1) {
      const deletedObject = canvasObjects[canvasObjectIndex];
      console.log(
        `🗑️ Deleted object: ${deletedObject.type} (ID: ${deletedObject.id})`
      );

      // Remove from both stores
      removeCanvasObject(canvasObjectIndex);
      deleteLayer(selectedLayerId);
    }
  }, [selectedLayerId, canvasObjects, removeCanvasObject, deleteLayer]);

  // Add keyboard shortcut for delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle delete when there's a selected object and not in text input
      if (
        ((event.key === "Delete" || event.key === "Backspace") &&
          selectedLayerId &&
          !event.target) ||
        (event.target &&
          !(event.target as HTMLElement).tagName.match(/INPUT|TEXTAREA/))
      ) {
        event.preventDefault();
        handleDeleteObject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDeleteObject, selectedLayerId]);

  // Function to handle object creation initiated from SkiaCanvas
  const handleSkiaObjectCreated = useCallback(
    (skiaData: SkiaObjectDataForApp) => {
      const layerId = addLayer(
        skiaData.type as "rectangle" | "ellipse" | "text"
      );

      let fullCanvasObject: CanvasObject;

      if (skiaData.type === "text") {
        fullCanvasObject = {
          ...skiaData,
          type: "text",
          id: layerId,
          text: skiaData.text || "",
          fontSize: skiaData.fontSize || 20,
        } as TextObject;
      } else {
        fullCanvasObject = {
          ...skiaData,
          type: skiaData.type as
            | "rectangle"
            | "ellipse"
            | "line"
            | "pen"
            | "select",
          id: layerId,
        } as ShapeObject;
      }

      addCanvasObject(fullCanvasObject);
      return layerId;
    },
    [addLayer, addCanvasObject]
  );

  // Function to handle object selection from SkiaCanvas
  const handleSkiaObjectSelected = useCallback(
    (objectIndex: number | null) => {
      if (objectIndex === null) {
        // No object selected
        selectLayer("");
        return;
      }

      const selectedObject = canvasObjects[objectIndex];

      if (!selectedObject || !selectedObject.id) {
        return;
      }

      // Set flag to prevent circular updates
      isUpdatingFromCanvas.current = true;

      // Select the layer in the layer store
      selectLayer(selectedObject.id);

      // Update the layer store properties with the actual object values
      const bounds = {
        startX: selectedObject.startX,
        startY: selectedObject.startY,
        endX: selectedObject.endX,
        endY: selectedObject.endY,
      };

      const position = {
        x: bounds.startX,
        y: bounds.startY,
        rotation: selectedObject.rotation || 0,
      };

      const dimensions = {
        width:
          Math.abs(bounds.endX - bounds.startX) * (selectedObject.scaleX || 1),
        height:
          Math.abs(bounds.endY - bounds.startY) * (selectedObject.scaleY || 1),
      };

      const appearance = {
        fill: selectedObject.fillColor || "#FFFFFF",
        stroke: selectedObject.strokeColor || "transparent",
        strokeWidth: selectedObject.strokeWidth || 0,
      };

      // Update the layer store with actual object properties
      updatePosition("x", position.x);
      updatePosition("y", position.y);
      updatePosition("rotation", position.rotation);
      updateDimensions("width", dimensions.width);
      updateDimensions("height", dimensions.height);
      updateAppearance("fill", appearance.fill);
      updateAppearance("stroke", appearance.stroke);
      updateAppearance("strokeWidth", appearance.strokeWidth);

      // Update shadow properties
      updateShadow("enabled", selectedObject.shadowEnabled || false);
      updateShadow("offsetX", selectedObject.shadowOffsetX ?? 0);
      updateShadow("offsetY", selectedObject.shadowOffsetY ?? 4);
      updateShadow("blur", selectedObject.shadowBlur ?? 8);
      updateShadow("spread", selectedObject.shadowSpread ?? 0);
      updateShadow("color", selectedObject.shadowColor || "#000000");

      // Update corner radius properties
      updateCornerRadius("topLeft", selectedObject.cornerRadiusTopLeft ?? 0);
      updateCornerRadius("topRight", selectedObject.cornerRadiusTopRight ?? 0);
      updateCornerRadius(
        "bottomLeft",
        selectedObject.cornerRadiusBottomLeft ?? 0
      );
      updateCornerRadius(
        "bottomRight",
        selectedObject.cornerRadiusBottomRight ?? 0
      );
      updateCornerRadius(
        "independent",
        selectedObject.cornerRadiusIndependent ?? false
      );

      // Reset flag after a brief delay to allow all updates to complete
      setTimeout(() => {
        isUpdatingFromCanvas.current = false;
      }, 0);
    },
    [
      canvasObjects,
      selectLayer,
      updatePosition,
      updateDimensions,
      updateAppearance,
      updateShadow,
      updateCornerRadius,
    ]
  );

  // Handle position changes from property panel
  const handlePositionChange = useCallback(
    (axis: "x" | "y" | "rotation", value: string) => {
      updatePosition(axis, value);

      // Only update canvas if this is a user input, not a canvas selection update
      if (!isUpdatingFromCanvas.current && selectedLayerId) {
        const canvasObjectIndex = canvasObjects.findIndex(
          (obj) => obj.id === selectedLayerId
        );

        if (canvasObjectIndex !== -1) {
          const currentObj = canvasObjects[canvasObjectIndex];
          const numValue = parseFloat(value);

          if (axis === "x") {
            const width = currentObj.endX - currentObj.startX;
            updateCanvasObject(canvasObjectIndex, {
              startX: numValue,
              endX: numValue + width,
            });
          } else if (axis === "y") {
            const height = currentObj.endY - currentObj.startY;
            updateCanvasObject(canvasObjectIndex, {
              startY: numValue,
              endY: numValue + height,
            });
          } else if (axis === "rotation") {
            updateCanvasObject(canvasObjectIndex, {
              rotation: numValue,
            });
          }
        }
      }
    },
    [updatePosition, selectedLayerId, canvasObjects, updateCanvasObject]
  );

  // Handle dimension changes from property panel
  const handleDimensionsChange = useCallback(
    (dimension: "width" | "height", value: string) => {
      updateDimensions(dimension, value);

      // Only update canvas if this is a user input, not a canvas selection update
      if (!isUpdatingFromCanvas.current && selectedLayerId) {
        const canvasObjectIndex = canvasObjects.findIndex(
          (obj) => obj.id === selectedLayerId
        );

        if (canvasObjectIndex !== -1) {
          const currentObj = canvasObjects[canvasObjectIndex];
          const numValue = parseFloat(value);

          if (dimension === "width") {
            updateCanvasObject(canvasObjectIndex, {
              endX: currentObj.startX + numValue,
            });
          } else if (dimension === "height") {
            updateCanvasObject(canvasObjectIndex, {
              endY: currentObj.startY + numValue,
            });
          }
        }
      }
    },
    [updateDimensions, selectedLayerId, canvasObjects, updateCanvasObject]
  );

  // Wrapper for layer store's updateAppearance to also trigger canvas update
  const handleAppearanceChange = useCallback(
    (property: "fill" | "stroke" | "strokeWidth", value: string | number) => {
      updateAppearance(property, value);

      // Only update canvas if this is a user input, not a canvas selection update
      if (!isUpdatingFromCanvas.current && selectedLayerId) {
        const canvasObjectIndex = canvasObjects.findIndex(
          (obj) => obj.id === selectedLayerId
        );

        if (canvasObjectIndex !== -1) {
          const updates: Partial<CanvasObject> = {};

          if (property === "fill") {
            updates.fillColor = value.toString();
          } else if (property === "stroke") {
            updates.strokeColor = value.toString();
          } else if (property === "strokeWidth") {
            updates.strokeWidth =
              typeof value === "string" ? parseFloat(value) : value;
          }

          updateCanvasObject(canvasObjectIndex, updates);
        }
      }
    },
    [updateAppearance, selectedLayerId, canvasObjects, updateCanvasObject]
  );

  // Handle shadow changes from property panel
  const handleShadowChange = useCallback(
    (
      property: "enabled" | "offsetX" | "offsetY" | "blur" | "spread" | "color",
      value: string | number | boolean
    ) => {
      updateShadow(property, value);

      // Only update canvas if this is a user input, not a canvas selection update
      if (!isUpdatingFromCanvas.current && selectedLayerId) {
        const canvasObjectIndex = canvasObjects.findIndex(
          (obj) => obj.id === selectedLayerId
        );

        if (canvasObjectIndex !== -1) {
          const currentObj = canvasObjects[canvasObjectIndex];
          const updates: Partial<CanvasObject> = {};

          if (property === "enabled") {
            updates.shadowEnabled = value as boolean;

            // When enabling shadow, apply default values if they don't exist
            if (value === true) {
              if (currentObj.shadowOffsetX === undefined)
                updates.shadowOffsetX = 0;
              if (currentObj.shadowOffsetY === undefined)
                updates.shadowOffsetY = 4;
              if (currentObj.shadowBlur === undefined) updates.shadowBlur = 8;
              if (currentObj.shadowSpread === undefined)
                updates.shadowSpread = 0;
              if (!currentObj.shadowColor) updates.shadowColor = "#000000";

              // Also update the layer store with defaults
              if (currentObj.shadowOffsetX === undefined)
                updateShadow("offsetX", 0);
              if (currentObj.shadowOffsetY === undefined)
                updateShadow("offsetY", 4);
              if (currentObj.shadowBlur === undefined) updateShadow("blur", 8);
              if (currentObj.shadowSpread === undefined)
                updateShadow("spread", 0);
              if (!currentObj.shadowColor) updateShadow("color", "#000000");
            }
          } else if (property === "offsetX") {
            updates.shadowOffsetX =
              typeof value === "string" ? parseFloat(value) : (value as number);
          } else if (property === "offsetY") {
            updates.shadowOffsetY =
              typeof value === "string" ? parseFloat(value) : (value as number);
          } else if (property === "blur") {
            updates.shadowBlur =
              typeof value === "string" ? parseFloat(value) : (value as number);
          } else if (property === "spread") {
            updates.shadowSpread =
              typeof value === "string" ? parseFloat(value) : (value as number);
          } else if (property === "color") {
            updates.shadowColor = value.toString();
          }

          updateCanvasObject(canvasObjectIndex, updates);
        }
      }
    },
    [updateShadow, selectedLayerId, canvasObjects, updateCanvasObject]
  );

  // Handle corner radius changes from property panel
  const handleCornerRadiusChange = useCallback(
    (
      property:
        | "topLeft"
        | "topRight"
        | "bottomLeft"
        | "bottomRight"
        | "independent"
        | "all",
      value: number | boolean
    ) => {
      updateCornerRadius(property, value);

      // Only update canvas if this is a user input, not a canvas selection update
      if (!isUpdatingFromCanvas.current && selectedLayerId) {
        const canvasObjectIndex = canvasObjects.findIndex(
          (obj) => obj.id === selectedLayerId
        );

        if (canvasObjectIndex !== -1) {
          const updates: Partial<CanvasObject> = {};

          if (property === "independent") {
            updates.cornerRadiusIndependent = value as boolean;
          } else if (property === "all") {
            // Update all corners to the same value
            const numValue = value as number;
            updates.cornerRadiusTopLeft = numValue;
            updates.cornerRadiusTopRight = numValue;
            updates.cornerRadiusBottomLeft = numValue;
            updates.cornerRadiusBottomRight = numValue;
          } else if (property === "topLeft") {
            updates.cornerRadiusTopLeft = value as number;
          } else if (property === "topRight") {
            updates.cornerRadiusTopRight = value as number;
          } else if (property === "bottomLeft") {
            updates.cornerRadiusBottomLeft = value as number;
          } else if (property === "bottomRight") {
            updates.cornerRadiusBottomRight = value as number;
          }

          updateCanvasObject(canvasObjectIndex, updates);
        }
      }
    },
    [updateCornerRadius, selectedLayerId, canvasObjects, updateCanvasObject]
  );

  const handleLayerVisibilityToggle = useCallback(
    (layerId: string) => {
      toggleLayerVisibility(layerId);
    },
    [toggleLayerVisibility]
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <Header activeMode={activeMode} setActiveMode={setActiveMode} />
      <div className="flex flex-1 overflow-hidden">
        <LayersSidebar
          layers={layers}
          onSelectLayer={selectLayer}
          onToggleLayerVisibility={handleLayerVisibilityToggle}
          onToggleLayerLock={toggleLayerLock}
        />
        <CanvasArea
          onObjectCreated={handleSkiaObjectCreated}
          onObjectSelected={handleSkiaObjectSelected}
        />
        <PropertiesSidebar
          selectedLayer={selectedLayer}
          position={position}
          dimensions={dimensions}
          appearance={appearance}
          onPositionChange={handlePositionChange}
          onDimensionsChange={handleDimensionsChange}
          onAppearanceChange={handleAppearanceChange}
          onToggleLayerVisibility={handleLayerVisibilityToggle}
          onToggleLayerLock={toggleLayerLock}
          onShadowChange={handleShadowChange}
          onCornerRadiusChange={handleCornerRadiusChange}
          onDeleteObject={handleDeleteObject}
        />
      </div>
    </div>
  );
}

export default App;
