import { useState, useEffect } from "react";
import { useLayerStore } from "./lib/useLayerStore";
import { useCanvasStore } from "./lib/store";
import type { CanvasObject } from "./lib/store";
import Header from "./components/Header";
import LayersSidebar from "./components/LayersSidebar";
import CanvasArea from "./components/CanvasArea";
import type { SkiaObjectDataForApp } from "./components/CanvasArea";
import PropertiesSidebar from "./components/PropertiesSidebar";

function App() {
  const [activeMode, setActiveMode] = useState<"design" | "dev">("design");

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

  // Canvas store hooks
  const {
    objects: canvasObjects,
    updateObject: updateCanvasObject,
    addObject: addCanvasObject,
  } = useCanvasStore();

  const selectedLayer =
    layers.find((layer) => layer.id === selectedLayerId) || null;

  // Function to handle object creation initiated from SkiaCanvas
  const handleSkiaObjectCreated = (skiaData: SkiaObjectDataForApp) => {
    console.log("SkiaCanvas created an object, App.tsx received:", skiaData);
    const layerId = addLayer(skiaData.type as "rectangle" | "ellipse" | "text");
    const fullCanvasObject: CanvasObject = { ...skiaData, id: layerId };
    addCanvasObject(fullCanvasObject);
    console.log(
      `Created layer ${layerId} and added to canvas store`,
      fullCanvasObject
    );
    return layerId;
  };

  // Sync LayerStore changes to CanvasStore
  useEffect(() => {
    if (selectedLayerId && selectedLayer) {
      const canvasObjectIndex = canvasObjects.findIndex(
        (obj) => obj.id === selectedLayerId
      );

      if (canvasObjectIndex !== -1) {
        const updates: Partial<any> = {};
        let changed = false;

        // Sync appearance (fill, stroke, strokeWidth)
        if (appearance.fill !== canvasObjects[canvasObjectIndex].fillColor) {
          updates.fillColor = appearance.fill;
          changed = true;
        }
        if (
          appearance.stroke !== canvasObjects[canvasObjectIndex].strokeColor
        ) {
          updates.strokeColor = appearance.stroke;
          changed = true;
        }
        if (
          appearance.strokeWidth !==
          canvasObjects[canvasObjectIndex].strokeWidth
        ) {
          updates.strokeWidth = appearance.strokeWidth;
          changed = true;
        }

        // Sync visibility
        if (
          selectedLayer.visible !== canvasObjects[canvasObjectIndex].visible
        ) {
          updates.visible = selectedLayer.visible;
          changed = true;
        }

        // Sync position and dimensions (more complex, needs mapping layer props to canvas props)
        // For now, let's assume startX/Y, endX/Y are primarily driven by SkiaCanvas interactions
        // and PropertiesSidebar updates x,y,w,h which might need a more elaborate sync logic
        // if they are to directly manipulate Skia object coordinates.
        // Example for position.x (needs selectedLayer to store its own x,y,w,h)
        // if (position.x !== canvasObjects[canvasObjectIndex].startX) { /* ... */ }

        if (changed) {
          updateCanvasObject(canvasObjectIndex, updates);
        }
      }
    }
  }, [
    selectedLayerId,
    selectedLayer,
    appearance,
    position,
    dimensions,
    layers,
    canvasObjects,
    updateCanvasObject,
  ]);

  // Wrapper for layer store's updateAppearance to also trigger canvas update via useEffect
  const handleAppearanceChange = (
    property: "fill" | "stroke" | "strokeWidth",
    value: string | number
  ) => {
    updateAppearance(property, value);
  };

  const handleLayerVisibilityToggle = (layerId: string) => {
    toggleLayerVisibility(layerId);
  };

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
        <CanvasArea onObjectCreated={handleSkiaObjectCreated} />
        <PropertiesSidebar
          selectedLayer={selectedLayer}
          position={position}
          dimensions={dimensions}
          appearance={appearance}
          onPositionChange={updatePosition}
          onDimensionsChange={updateDimensions}
          onAppearanceChange={handleAppearanceChange}
          onToggleLayerVisibility={handleLayerVisibilityToggle}
          onToggleLayerLock={toggleLayerLock}
        />
      </div>
    </div>
  );
}

export default App;
