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
  console.log("🏗️ App component rendering");

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
    toggleLayerVisibility,
    toggleLayerLock,
    updatePosition,
    updateDimensions,
    updateAppearance,
  } = useLayerStore();

  console.log("📊 Layer store state:", {
    layersCount: layers.length,
    selectedLayerId,
    position,
    dimensions,
    appearance,
  });

  // Canvas store hooks
  const {
    objects: canvasObjects,
    updateObject: updateCanvasObject,
    addObject: addCanvasObject,
  } = useCanvasStore();

  console.log("🎨 Canvas store state:", {
    objectsCount: canvasObjects.length,
    objects: canvasObjects,
  });

  const selectedLayer =
    layers.find((layer) => layer.id === selectedLayerId) || null;

  console.log("🎯 Selected layer:", selectedLayer);

  // Function to handle object creation initiated from SkiaCanvas
  const handleSkiaObjectCreated = useCallback(
    (skiaData: SkiaObjectDataForApp) => {
      console.log("SkiaCanvas created an object, App.tsx received:", skiaData);
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
      console.log(
        `Created layer ${layerId} and added to canvas store`,
        fullCanvasObject
      );
      return layerId;
    },
    [addLayer, addCanvasObject]
  );

  // Function to handle object selection from SkiaCanvas
  const handleSkiaObjectSelected = useCallback(
    (objectIndex: number | null) => {
      console.log(
        "🎯 handleSkiaObjectSelected called with index:",
        objectIndex
      );

      if (objectIndex === null) {
        console.log(
          "📤 No object selected, calling selectLayer with empty string"
        );
        // No object selected
        selectLayer("");
        return;
      }

      const selectedObject = canvasObjects[objectIndex];
      console.log("🔍 Selected object:", selectedObject);

      if (!selectedObject || !selectedObject.id) {
        console.log("❌ No selected object or no ID, returning");
        return;
      }

      // Set flag to prevent circular updates
      console.log("🚩 Setting isUpdatingFromCanvas flag to true");
      isUpdatingFromCanvas.current = true;

      // Select the layer in the layer store
      console.log("📋 Calling selectLayer with ID:", selectedObject.id);
      selectLayer(selectedObject.id);

      // Update the layer store properties with the actual object values
      const bounds = {
        startX: selectedObject.startX,
        startY: selectedObject.startY,
        endX: selectedObject.endX,
        endY: selectedObject.endY,
      };
      console.log("📐 Calculated bounds:", bounds);

      const position = {
        x: bounds.startX,
        y: bounds.startY,
        rotation: selectedObject.rotation || 0,
      };
      console.log("📍 Calculated position:", position);

      const dimensions = {
        width:
          Math.abs(bounds.endX - bounds.startX) * (selectedObject.scaleX || 1),
        height:
          Math.abs(bounds.endY - bounds.startY) * (selectedObject.scaleY || 1),
      };
      console.log("📏 Calculated dimensions:", dimensions);

      const appearance = {
        fill: selectedObject.fillColor || "#FFFFFF",
        stroke: selectedObject.strokeColor || "transparent",
        strokeWidth: selectedObject.strokeWidth || 0,
      };
      console.log("🎨 Calculated appearance:", appearance);

      // Update the layer store with actual object properties
      console.log("🔄 Starting layer store updates...");
      console.log("📍 Updating position x:", position.x);
      updatePosition("x", position.x);
      console.log("📍 Updating position y:", position.y);
      updatePosition("y", position.y);
      console.log("📍 Updating rotation:", position.rotation);
      updatePosition("rotation", position.rotation);
      console.log("📏 Updating width:", dimensions.width);
      updateDimensions("width", dimensions.width);
      console.log("📏 Updating height:", dimensions.height);
      updateDimensions("height", dimensions.height);
      console.log("🎨 Updating fill:", appearance.fill);
      updateAppearance("fill", appearance.fill);
      console.log("🎨 Updating stroke:", appearance.stroke);
      updateAppearance("stroke", appearance.stroke);
      console.log("🎨 Updating strokeWidth:", appearance.strokeWidth);
      updateAppearance("strokeWidth", appearance.strokeWidth);

      // Reset flag after a brief delay to allow all updates to complete
      console.log("⏱️ Setting timeout to reset flag");
      setTimeout(() => {
        console.log("🚩 Resetting isUpdatingFromCanvas flag to false");
        isUpdatingFromCanvas.current = false;
      }, 0);

      console.log("✅ handleSkiaObjectSelected completed");
    },
    [
      canvasObjects,
      selectLayer,
      updatePosition,
      updateDimensions,
      updateAppearance,
    ]
  );

  // Handle position changes from property panel
  const handlePositionChange = useCallback(
    (axis: "x" | "y" | "rotation", value: string) => {
      console.log(
        `🎛️ handlePositionChange called: ${axis} = ${value}, isUpdatingFromCanvas: ${isUpdatingFromCanvas.current}`
      );

      updatePosition(axis, value);

      // Only update canvas if this is a user input, not a canvas selection update
      if (!isUpdatingFromCanvas.current && selectedLayerId) {
        console.log(
          "🎯 Updating canvas object position for selectedLayerId:",
          selectedLayerId
        );

        const canvasObjectIndex = canvasObjects.findIndex(
          (obj) => obj.id === selectedLayerId
        );

        console.log("📍 Found canvas object at index:", canvasObjectIndex);

        if (canvasObjectIndex !== -1) {
          const currentObj = canvasObjects[canvasObjectIndex];
          const numValue = parseFloat(value);

          console.log("📊 Current object:", currentObj);
          console.log("🔢 Parsed value:", numValue);

          if (axis === "x") {
            const width = currentObj.endX - currentObj.startX;
            console.log("📐 Updating X position, width:", width);
            updateCanvasObject(canvasObjectIndex, {
              startX: numValue,
              endX: numValue + width,
            });
          } else if (axis === "y") {
            const height = currentObj.endY - currentObj.startY;
            console.log("📐 Updating Y position, height:", height);
            updateCanvasObject(canvasObjectIndex, {
              startY: numValue,
              endY: numValue + height,
            });
          } else if (axis === "rotation") {
            console.log("🔄 Updating rotation to:", numValue);
            updateCanvasObject(canvasObjectIndex, {
              rotation: numValue,
            });
          }
        }
      } else if (isUpdatingFromCanvas.current) {
        console.log(
          "🚫 Skipping canvas update because isUpdatingFromCanvas is true"
        );
      } else if (!selectedLayerId) {
        console.log("🚫 Skipping canvas update because no selectedLayerId");
      }

      console.log("✅ handlePositionChange completed");
    },
    [updatePosition, selectedLayerId, canvasObjects, updateCanvasObject]
  );

  // Handle dimension changes from property panel
  const handleDimensionsChange = useCallback(
    (dimension: "width" | "height", value: string) => {
      console.log(
        `📏 handleDimensionsChange called: ${dimension} = ${value}, isUpdatingFromCanvas: ${isUpdatingFromCanvas.current}`
      );

      updateDimensions(dimension, value);

      // Only update canvas if this is a user input, not a canvas selection update
      if (!isUpdatingFromCanvas.current && selectedLayerId) {
        console.log(
          "🎯 Updating canvas object dimensions for selectedLayerId:",
          selectedLayerId
        );

        const canvasObjectIndex = canvasObjects.findIndex(
          (obj) => obj.id === selectedLayerId
        );

        console.log("📍 Found canvas object at index:", canvasObjectIndex);

        if (canvasObjectIndex !== -1) {
          const currentObj = canvasObjects[canvasObjectIndex];
          const numValue = parseFloat(value);

          console.log("📊 Current object:", currentObj);
          console.log("🔢 Parsed value:", numValue);

          if (dimension === "width") {
            console.log("📐 Updating width");
            updateCanvasObject(canvasObjectIndex, {
              endX: currentObj.startX + numValue,
            });
          } else if (dimension === "height") {
            console.log("📐 Updating height");
            updateCanvasObject(canvasObjectIndex, {
              endY: currentObj.startY + numValue,
            });
          }
        }
      } else if (isUpdatingFromCanvas.current) {
        console.log(
          "🚫 Skipping canvas update because isUpdatingFromCanvas is true"
        );
      } else if (!selectedLayerId) {
        console.log("🚫 Skipping canvas update because no selectedLayerId");
      }

      console.log("✅ handleDimensionsChange completed");
    },
    [updateDimensions, selectedLayerId, canvasObjects, updateCanvasObject]
  );

  // Wrapper for layer store's updateAppearance to also trigger canvas update
  const handleAppearanceChange = useCallback(
    (property: "fill" | "stroke" | "strokeWidth", value: string | number) => {
      console.log(
        `🎨 handleAppearanceChange called: ${property} = ${value}, isUpdatingFromCanvas: ${isUpdatingFromCanvas.current}`
      );

      updateAppearance(property, value);

      // Only update canvas if this is a user input, not a canvas selection update
      if (!isUpdatingFromCanvas.current && selectedLayerId) {
        console.log(
          "🎯 Updating canvas object appearance for selectedLayerId:",
          selectedLayerId
        );

        const canvasObjectIndex = canvasObjects.findIndex(
          (obj) => obj.id === selectedLayerId
        );

        console.log("📍 Found canvas object at index:", canvasObjectIndex);

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

          console.log("🔄 Updating canvas object with:", updates);
          updateCanvasObject(canvasObjectIndex, updates);
        }
      } else if (isUpdatingFromCanvas.current) {
        console.log(
          "🚫 Skipping canvas update because isUpdatingFromCanvas is true"
        );
      } else if (!selectedLayerId) {
        console.log("🚫 Skipping canvas update because no selectedLayerId");
      }

      console.log("✅ handleAppearanceChange completed");
    },
    [updateAppearance, selectedLayerId, canvasObjects, updateCanvasObject]
  );

  const handleLayerVisibilityToggle = useCallback(
    (layerId: string) => {
      console.log("👁️ handleLayerVisibilityToggle called with:", layerId);
      toggleLayerVisibility(layerId);
    },
    [toggleLayerVisibility]
  );

  console.log("🔄 About to return JSX, preparing render");

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
        />
      </div>
    </div>
  );
}

export default App;
