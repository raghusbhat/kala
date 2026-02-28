import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { FiTrash2, FiLink, FiUnlock } from "react-icons/fi";
import PropertySection from "./ui-custom/PropertySection";
import PropertyInput from "./ui-custom/PropertyInput";
import ColorInput from "./ui-custom/ColorInput";
import ShadowControls from "./ui-custom/ShadowControls";
import CornerRadiusControls from "./ui-custom/CornerRadiusControls";
import ApiKeyInput from "./ui-custom/ApiKeyInput";
import { useCanvasStore } from "../lib/store";
import type { Layer, Position, Dimensions, Appearance } from "../types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import React, { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  Send,
  Image,
  X,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Toaster } from "@/components/ui/toaster";
import { useAI } from "../lib/ai/useAI";
import type { ChatMessage } from "../lib/ai/useAI";

interface PropertiesSidebarProps {
  selectedLayer: Layer | null;
  position: Position;
  dimensions: Dimensions;
  appearance: Appearance;
  onPositionChange: (axis: "x" | "y" | "rotation", value: string) => void;
  onDimensionsChange: (dimension: "width" | "height", value: string) => void;
  onAppearanceChange: (
    property: "fill" | "stroke" | "strokeWidth",
    value: string
  ) => void;
  onShadowChange: (
    property: "enabled" | "offsetX" | "offsetY" | "blur" | "spread" | "color",
    value: string | number | boolean
  ) => void;
  onCornerRadiusChange: (
    property:
      | "topLeft"
      | "topRight"
      | "bottomLeft"
      | "bottomRight"
      | "independent"
      | "all",
    value: number | boolean
  ) => void;
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onDeleteObject: () => void;
}

export default function PropertiesSidebar({
  selectedLayer,
  position,
  dimensions,
  appearance,
  onPositionChange,
  onDimensionsChange,
  onAppearanceChange,
  onShadowChange,
  onCornerRadiusChange,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onDeleteObject,
}: PropertiesSidebarProps) {
  const {
    canvasBackgroundColor,
    setCanvasBackgroundColor,
    aspectRatioLocked,
    setAspectRatioLocked,
    objects: canvasObjects,
    updateObject: updateCanvasObject,
  } = useCanvasStore();

  // Derived: canvas object for the selected layer (for text font props)
  const selectedCanvasObj = selectedLayer
    ? canvasObjects.find((o) => o.id === selectedLayer.id) ?? null
    : null;
  const selectedTextObj =
    selectedCanvasObj?.type === "text" ? selectedCanvasObj : null;

  const [tab, setTab] = React.useState("properties");
  const [chatInput, setChatInput] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "Hi! I'm Kala. Ask me to create shapes, text, frames, or modify objects. Enter your API key below to get started.",
    },
  ]);
  const [selectedModel, setSelectedModel] = React.useState("Gemini");
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(`kala_api_key_Gemini`) ?? ""
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [attachedImages, setAttachedImages] = React.useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverWrapperRef = React.useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hoveredImageIdx, setHoveredImageIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isLoading, send: sendToAI } = useAI();

  // Persist API key per model
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    localStorage.setItem(`kala_api_key_${selectedModel}`, value);
  };

  // Load stored API key when model changes
  useEffect(() => {
    const stored = localStorage.getItem(`kala_api_key_${selectedModel}`) ?? "";
    setApiKey(stored);
  }, [selectedModel]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Calculate current aspect ratio
  const currentAspectRatio = dimensions.width / dimensions.height;

  // Handle width change with aspect ratio lock
  const handleWidthChange = (value: string) => {
    onDimensionsChange("width", value);
    if (aspectRatioLocked && !isNaN(currentAspectRatio)) {
      const newWidth = parseFloat(value);
      const newHeight = newWidth / currentAspectRatio;
      onDimensionsChange("height", newHeight.toFixed(2));
    }
  };

  // Handle height change with aspect ratio lock
  const handleHeightChange = (value: string) => {
    onDimensionsChange("height", value);
    if (aspectRatioLocked && !isNaN(currentAspectRatio)) {
      const newHeight = parseFloat(value);
      const newWidth = newHeight * currentAspectRatio;
      onDimensionsChange("width", newWidth.toFixed(2));
    }
  };

  // Handle paste event for images (multiple)
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData) {
        const files: File[] = [];
        const nonImages: string[] = [];
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.kind === "file") {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (file) files.push(file);
            } else {
              const file = item.getAsFile();
              if (file) nonImages.push(file.name);
            }
          }
        }
        if (nonImages.length > 0) {
          setErrorMessage(
            `Only image files are allowed. The following files are not images: ${nonImages.join(
              ", "
            )}`
          );
          e.preventDefault();
          return;
        }
        setErrorMessage("");
        if (files.length > 0) {
          files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setAttachedImages((prev) => [
                ...prev,
                ev.target?.result as string,
              ]);
            };
            reader.readAsDataURL(file);
          });
          e.preventDefault();
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <aside className="w-72 border-l border-border bg-card flex flex-col shrink-0">
      <Toaster />
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex flex-col flex-1 h-full"
      >
        {/* Tab switcher */}
        <div className="flex items-center border-b border-border shrink-0">
          <TabsList className="flex bg-transparent rounded-none p-0 h-10 gap-0">
            <TabsTrigger
              value="properties"
              className="relative h-full px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground transition-colors bg-transparent hover:text-foreground"
            >
              Inspect
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="relative h-full px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground transition-colors bg-transparent hover:text-foreground"
            >
              AI
            </TabsTrigger>
          </TabsList>
          {selectedLayer && (
            <span className="ml-auto mr-3 text-[11px] text-muted-foreground/60 truncate max-w-[100px]">
              {selectedLayer.name}
            </span>
          )}
        </div>
        <TabsContent value="properties" className="flex-1 p-0 overflow-hidden">
          <div className="flex flex-col flex-1 h-full">
            {selectedLayer ? (
              <TooltipProvider>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-5">
                    {/* Position section */}
                    <PropertySection title="Position">
                      <div className="grid grid-cols-2 gap-2">
                        <PropertyInput
                          label="X"
                          value={position.x}
                          onChange={(value) => onPositionChange("x", value)}
                          type="number"
                        />
                        <PropertyInput
                          label="Y"
                          value={position.y}
                          onChange={(value) => onPositionChange("y", value)}
                          type="number"
                        />
                      </div>
                      <div className="mt-2">
                        <PropertyInput
                          label="R"
                          value={position.rotation}
                          onChange={(value) =>
                            onPositionChange("rotation", value)
                          }
                          type="number"
                        />
                      </div>
                    </PropertySection>

                    {/* Layout section */}
                    <PropertySection title="Layout">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <PropertyInput
                              label="W"
                              value={dimensions.width}
                              onChange={handleWidthChange}
                              type="number"
                            />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setAspectRatioLocked(!aspectRatioLocked)
                                }
                                className={`h-7 w-7 p-0 ${
                                  aspectRatioLocked
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {aspectRatioLocked ? (
                                  <FiLink className="h-3 w-3" />
                                ) : (
                                  <FiUnlock className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {aspectRatioLocked ? "Unlock" : "Lock"} aspect
                                ratio
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="flex-1">
                            <PropertyInput
                              label="H"
                              value={dimensions.height}
                              onChange={handleHeightChange}
                              type="number"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Corner Radius Controls — hide for text */}
                      {selectedLayer.type !== "text" && (
                        <div className="mt-4">
                          <CornerRadiusControls
                            cornerRadius={appearance.cornerRadius}
                            onCornerRadiusChange={onCornerRadiusChange}
                            objectType={
                              selectedLayer.type === "frame"
                                ? "rectangle"
                                : selectedLayer.type
                            }
                          />
                        </div>
                      )}
                    </PropertySection>

                    {/* Appearance section — hide fill/stroke for text (handled in Typography) */}
                    {selectedLayer.type !== "text" && (
                      <PropertySection title="Appearance">
                        <ColorInput
                          label="Fill"
                          value={appearance.fill}
                          onChange={(value) => onAppearanceChange("fill", value)}
                        />

                        <div className="mt-3">
                          <ColorInput
                            label="Stroke"
                            value={appearance.stroke}
                            onChange={(value) =>
                              onAppearanceChange("stroke", value)
                            }
                          />
                          <div className="mt-2">
                            <PropertyInput
                              label="W"
                              value={appearance.strokeWidth}
                              onChange={(value) =>
                                onAppearanceChange("strokeWidth", value)
                              }
                              type="number"
                            />
                          </div>
                        </div>
                      </PropertySection>
                    )}

                    {/* Typography section — only for text layers */}
                    {selectedLayer.type === "text" && selectedTextObj && (
                      <PropertySection title="Typography">
                        {/* Font Family */}
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Font Family</label>
                          <select
                            value={(selectedTextObj as any).fontFamily || "Roboto"}
                            onChange={(e) => {
                              const idx = canvasObjects.findIndex(
                                (o) => o.id === selectedLayer.id
                              );
                              if (idx !== -1)
                                updateCanvasObject(idx, {
                                  fontFamily: e.target.value,
                                } as any);
                            }}
                            className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:border-accent"
                          >
                            {[
                              "Roboto",
                              "Arial",
                              "Helvetica",
                              "Georgia",
                              "Verdana",
                              "Courier New",
                              "Times New Roman",
                            ].map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Font Size & Weight */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Size</label>
                            <input
                              type="number"
                              min={6}
                              max={400}
                              value={(selectedTextObj as any).fontSize || 20}
                              onChange={(e) => {
                                const newSize = Math.max(
                                  6,
                                  parseFloat(e.target.value) || 20
                                );
                                const idx = canvasObjects.findIndex(
                                  (o) => o.id === selectedLayer.id
                                );
                                if (idx !== -1) {
                                  const obj = canvasObjects[idx];
                                  updateCanvasObject(idx, {
                                    fontSize: newSize,
                                    // Update endY so selection handles match the new size
                                    endY: obj.startY + newSize * 1.4,
                                  } as any);
                                }
                              }}
                              className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:border-accent mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Weight</label>
                            <select
                              value={(selectedTextObj as any).fontWeight || 400}
                              onChange={(e) => {
                                const idx = canvasObjects.findIndex(
                                  (o) => o.id === selectedLayer.id
                                );
                                if (idx !== -1)
                                  updateCanvasObject(idx, {
                                    fontWeight: parseInt(e.target.value),
                                  } as any);
                              }}
                              className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:border-accent mt-1"
                            >
                              <option value={300}>Light 300</option>
                              <option value={400}>Regular 400</option>
                              <option value={500}>Medium 500</option>
                              <option value={600}>SemiBold 600</option>
                              <option value={700}>Bold 700</option>
                              <option value={900}>Black 900</option>
                            </select>
                          </div>
                        </div>

                        {/* Font Style */}
                        <div className="mt-2">
                          <label className="text-xs text-muted-foreground block mb-1">Style</label>
                          <div className="flex gap-1">
                            {(
                              [
                                { label: "I", value: "normal", title: "Normal" },
                                { label: "I", value: "italic", title: "Italic" },
                              ] as { label: string; value: string; title: string }[]
                            ).map(({ label, value, title }) => {
                              const current =
                                (selectedTextObj as any).fontStyle || "normal";
                              return (
                                <button
                                  key={value}
                                  title={title}
                                  onClick={() => {
                                    const idx = canvasObjects.findIndex(
                                      (o) => o.id === selectedLayer.id
                                    );
                                    if (idx !== -1)
                                      updateCanvasObject(idx, {
                                        fontStyle: value,
                                      } as any);
                                  }}
                                  className={`flex-1 text-xs py-1 rounded border transition-colors ${
                                    current === value
                                      ? "bg-accent text-accent-foreground border-accent"
                                      : "bg-background text-muted-foreground border-border hover:border-accent"
                                  } ${value === "italic" ? "italic" : ""}`}
                                >
                                  {title}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Text Color (mirrors fill color for text) */}
                        <div className="mt-2">
                          <ColorInput
                            label="Color"
                            value={appearance.fill}
                            onChange={(value) => onAppearanceChange("fill", value)}
                          />
                        </div>
                      </PropertySection>
                    )}

                    {/* Effects section */}
                    <PropertySection title="Effects">
                      <ShadowControls
                        shadow={
                          appearance.shadow || {
                            enabled: false,
                            offsetX: 0,
                            offsetY: 4,
                            blur: 8,
                            spread: 0,
                            color: "#000000",
                          }
                        }
                        onShadowChange={onShadowChange}
                      />
                    </PropertySection>

                    {/* Options section */}
                    <PropertySection title="Options">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="visible"
                              checked={selectedLayer.visible}
                              onCheckedChange={() =>
                                onToggleLayerVisibility(selectedLayer.id)
                              }
                            />
                            <label
                              htmlFor="visible"
                              className="text-xs cursor-pointer"
                            >
                              Visible
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="locked"
                              checked={selectedLayer.locked}
                              onCheckedChange={() =>
                                onToggleLayerLock(selectedLayer.id)
                              }
                            />
                            <label
                              htmlFor="locked"
                              className="text-xs cursor-pointer"
                            >
                              Locked
                            </label>
                          </div>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={onDeleteObject}
                                className="h-6 w-6 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <FiTrash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete object (Delete)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </PropertySection>
                  </div>
                </ScrollArea>
              </TooltipProvider>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                  {/* Canvas Properties */}
                  <PropertySection title="Canvas">
                    <ColorInput
                      label="Background"
                      value={canvasBackgroundColor}
                      onChange={setCanvasBackgroundColor}
                    />
                  </PropertySection>
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>
        <TabsContent value="ai" className="flex flex-col flex-1 p-0 overflow-hidden">
          <TooltipProvider>
            <div className="flex flex-col flex-1 h-full overflow-hidden">
              {/* API Key input */}
              <div className="px-3 pt-3 pb-2 shrink-0 border-b border-border">
                <ApiKeyInput
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  label={`${selectedModel} API Key`}
                  placeholder={`Enter your ${selectedModel} API key...`}
                />
              </div>
              <ScrollArea className="flex-1 px-3 py-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex w-full mb-3 ${
                      msg.role === "ai" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-xs whitespace-pre-line ${
                        msg.role === "ai"
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent text-accent-foreground"
                      }`}
                      style={{ wordBreak: "break-word" }}
                    >
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="inline-block w-1 h-3 ml-0.5 bg-current rounded-sm animate-pulse opacity-60" />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <form
                className="relative z-10 flex flex-col gap-1.5 bg-muted rounded-xl mx-2 mb-3 p-2.5 border border-border/60 shrink-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isLoading) return;
                  if (!chatInput.trim() && attachedImages.length === 0) return;

                  const userText = chatInput.trim();
                  const imagesCopy = [...attachedImages];
                  const historyCopy = [...messages];

                  // Append user message immediately
                  const withUser: ChatMessage[] = [
                    ...messages,
                    { role: "user", content: userText },
                  ];
                  setMessages(withUser);
                  setChatInput("");
                  setAttachedImages([]);
                  setErrorMessage("");

                  // Send to AI (streaming bubble will be appended inside sendToAI)
                  sendToAI(
                    userText,
                    imagesCopy,
                    historyCopy,
                    selectedModel,
                    apiKey,
                    (updater) => setMessages(updater)
                  );
                }}
              >
                {errorMessage && (
                  <div
                    className="text-xs text-red-500 mb-1 font-medium flex items-center gap-2"
                    data-testid="error-msg"
                  >
                    <span className="flex-1">{errorMessage}</span>
                    <button
                      type="button"
                      aria-label="Close error message"
                      className="ml-2 text-red-400 hover:text-red-600 focus:outline-none text-base font-bold px-1"
                      onClick={() => setErrorMessage("")}
                    >
                      ×
                    </button>
                  </div>
                )}
                {attachedImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-x-2 gap-y-1 mb-1 w-full max-w-xs">
                    {attachedImages.slice(0, 7).map((img, idx) => {
                      // For a 4-column grid, last in row is idx % 4 === 3
                      const isLastInRow = idx % 4 === 3;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-foreground/5 border border-white/5 rounded px-0.5 py-2 gap-2 w-14 h-6 relative"
                          onMouseEnter={() => setHoveredImageIdx(idx)}
                          onMouseLeave={() => setHoveredImageIdx(null)}
                        >
                          {/* Hover preview popup */}
                          {hoveredImageIdx === idx && (
                            <div
                              className={`absolute z-50 bottom-full mb-2 p-1 bg-background border border-border rounded shadow-lg ${
                                isLastInRow
                                  ? "right-0"
                                  : "left-1/2 -translate-x-1/2"
                              }`}
                              style={{ minWidth: 128, minHeight: 128 }}
                            >
                              <img
                                src={img}
                                alt="preview"
                                className="w-32 h-32 object-contain rounded"
                                style={{ pointerEvents: "none" }}
                              />
                            </div>
                          )}
                          <img
                            src={img}
                            alt="attachment"
                            className="w-5 h-5 rounded border border-foreground/5 object-cover"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 p-0 ml-1 hover:text-red-500 hover:bg-transparent"
                            onClick={() =>
                              setAttachedImages(
                                attachedImages.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                    {attachedImages.length > 7 && (
                      <div
                        ref={popoverWrapperRef}
                        onMouseEnter={() => setPopoverOpen(true)}
                        onMouseLeave={() => setPopoverOpen(false)}
                        className="relative"
                      >
                        <Popover
                          open={popoverOpen}
                          onOpenChange={setPopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <div className="flex items-center justify-center bg-foreground/5 border border-white/5 rounded px-0.5 py-2 w-14 h-6 text-xs text-muted-foreground font-medium cursor-pointer select-none">
                              +{attachedImages.length - 7}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            side="top"
                            className="p-2 bg-background rounded shadow-lg border border-border w-48 min-w-[8rem]"
                          >
                            <ul className="flex flex-col gap-2">
                              {attachedImages.slice(7).map((img, idx) => {
                                let name = `Image ${idx + 8}`;
                                if (
                                  img.startsWith("data:") &&
                                  img.includes(";name=")
                                ) {
                                  name = img.split(";name=")[1].split(";")[0];
                                }
                                return (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2 bg-foreground/5 border border-white/5 rounded px-2 py-1 min-h-[2.5rem]"
                                  >
                                    <img
                                      src={img}
                                      alt="attachment"
                                      className="w-8 h-8 rounded border border-foreground/5 object-cover"
                                    />
                                    <span
                                      className="w-full text-xs truncate"
                                      style={{ lineHeight: "1.2" }}
                                      title={name}
                                    >
                                      {name}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                )}
                <div className="relative w-full">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Describe what to create or modify..."
                    className="w-full min-h-[40px] max-h-[160px] resize-none bg-transparent border-none focus:ring-0 focus:outline-none text-xs text-foreground placeholder:text-muted-foreground/50 py-1 px-0 disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
                    autoFocus={tab === "ai"}
                    disabled={isLoading}
                    style={{ overflowY: "auto" }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = Math.min(el.scrollHeight, 180) + "px";
                      }
                    }}
                    onInput={(e) => {
                      const input = e.currentTarget;
                      input.style.height = "auto";
                      input.style.height =
                        Math.min(input.scrollHeight, 180) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                        e.preventDefault();
                        e.currentTarget.form?.dispatchEvent(
                          new Event("submit", {
                            cancelable: true,
                            bubbles: true,
                          })
                        );
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-1 rounded px-1 py-0.5">
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium hover:text-foreground h-6 px-1.5"
                          >
                            {selectedModel}
                            <ChevronUp className="w-2.5 h-2.5 ml-0.5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                    </Tooltip>
                    <DropdownMenuContent align="start" side="top" className="text-xs">
                      {["Gemini", "GPT-4", "Claude"].map((model) => (
                        <DropdownMenuItem
                          key={model}
                          className="text-xs"
                          onClick={() => setSelectedModel(model)}
                        >
                          {model}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        tabIndex={-1}
                      >
                        <Image className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach image</TooltipContent>
                  </Tooltip>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.gif"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const nonImages = files.filter(
                        (file) => !file.type.startsWith("image/")
                      );
                      if (nonImages.length > 0) {
                        setErrorMessage(
                          `Only image files are allowed. The following files are not images: ${nonImages
                            .map((f) => f.name)
                            .join(", ")}`
                        );
                        return;
                      }
                      setErrorMessage("");
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setAttachedImages((prev) => [
                            ...prev,
                            ev.target?.result as string,
                          ]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                    onClick={() => setErrorMessage("")}
                  />
                  <div className="flex-1" />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || (!chatInput.trim() && attachedImages.length === 0)}
                    className="h-6 w-6 bg-accent text-accent-foreground hover:bg-accent/90 rounded flex items-center justify-center p-0 disabled:opacity-40"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TooltipProvider>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
