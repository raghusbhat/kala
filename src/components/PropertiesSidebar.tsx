import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { FiChevronDown, FiTrash2, FiLink, FiUnlock } from "react-icons/fi";
import PropertySection from "./ui-custom/PropertySection";
import PropertyInput from "./ui-custom/PropertyInput";
import ColorInput from "./ui-custom/ColorInput";
import ShadowControls from "./ui-custom/ShadowControls";
import CornerRadiusControls from "./ui-custom/CornerRadiusControls";
import { useCanvasStore } from "../lib/store";
import type { Layer, Position, Dimensions, Appearance } from "../types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Paperclip,
  ChevronDown,
  ChevronUp,
  Send,
  Image,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

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
  } = useCanvasStore();

  const [tab, setTab] = React.useState("properties");
  const [chatInput, setChatInput] = React.useState("");
  const [messages, setMessages] = React.useState([
    {
      role: "ai",
      content:
        "Hi! Ask me anything about the selected object or request a drawing.",
    },
  ]);
  const [selectedModel, setSelectedModel] = React.useState("Gemini");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [attachedImages, setAttachedImages] = React.useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverWrapperRef = React.useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hoveredImageIdx, setHoveredImageIdx] = useState<number | null>(null);

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
    <aside className="w-72 border-l border-border bg-card flex flex-col">
      <Toaster />
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex flex-col flex-1 h-full"
      >
        <TabsList className="w-full flex justify-center bg-transparent border-none rounded-none mt-1 mb-2 gap-1 px-2">
          <TabsTrigger
            value="properties"
            className="flex-1 h-8 px-2 text-xs font-medium rounded-md transition-all data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground"
          >
            Properties
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="flex-1 h-8 px-2 text-xs font-medium rounded-md transition-all data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground"
          >
            AI
          </TabsTrigger>
        </TabsList>
        <TabsContent value="properties" className="flex-1 p-0">
          <div className="flex flex-col flex-1">
            <div className="p-4 font-medium flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <span>Properties</span>
                {selectedLayer ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs flex items-center gap-1 text-muted-foreground"
                  >
                    {selectedLayer.name}
                    <FiChevronDown className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs flex items-center gap-1 text-muted-foreground"
                  >
                    Canvas
                    <FiChevronDown className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <Separator />
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

                      {/* Corner Radius Controls */}
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
                    </PropertySection>

                    {/* Appearance section */}
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
        <TabsContent value="ai" className="flex flex-col flex-1 p-0">
          <TooltipProvider>
            <div className="flex flex-col flex-1 h-full">
              <ScrollArea className="flex-1 px-3 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex w-full ${
                      msg.role === "ai" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm whitespace-pre-line shadow-sm border ${
                        {
                          ai: "bg-muted text-muted-foreground border-border rounded-bl-md",
                          user: "bg-accent text-accent-foreground border-accent rounded-br-md",
                        }[msg.role]
                      } ${msg.role === "ai" ? "text-left" : "text-right"}`}
                      style={{ wordBreak: "break-word" }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </ScrollArea>
              <form
                className="relative z-10 flex flex-col gap-1 bg-[hsl(240,6%,16%)] shadow-2xl rounded-xl mx-2 mt-4 mb-4 p-3 border border-[hsl(240,6%,28%)] transition-all"
                style={{ boxShadow: "0 4px 16px 0 rgba(30,30,40,0.55)" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim() && attachedImages.length === 0) return;
                  setMessages([
                    ...messages,
                    { role: "user", content: chatInput },
                  ]);
                  setChatInput("");
                  setAttachedImages([]);
                  setErrorMessage("");
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
                    placeholder="Plan, search, build anything"
                    className="w-full min-h-[48px] max-h-[180px] resize-none bg-background border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-lg pr-3 transition-all text-sm py-2 px-3"
                    autoFocus={tab === "ai"}
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
                      if (e.key === "Enter" && !e.shiftKey) {
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
                <div className="flex items-center gap-1 bg-foreground/5 border border-foreground/5 rounded-md px-2 py-0.5">
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1 text-xs text-muted-foreground font-medium bg-transparent hover:bg-transparent focus:bg-transparent px-2 py-1 h-7"
                          >
                            {selectedModel}
                            <ChevronUp className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                    </Tooltip>
                    <DropdownMenuContent align="start" side="top">
                      {["Gemini", "GPT-4", "Claude"].map((model) => (
                        <DropdownMenuItem
                          key={model}
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
                        className="h-10 w-10 text-foreground/70 hover:text-foreground bg-transparent hover:bg-transparent focus:bg-transparent"
                        onClick={() => fileInputRef.current?.click()}
                        tabIndex={-1}
                      >
                        <Image className="w-5 h-5" />
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
                    disabled={!chatInput.trim() && attachedImages.length === 0}
                    className="h-8 w-8 bg-accent text-accent-foreground hover:bg-accent/90 rounded-md flex items-center justify-center ml-2 p-0"
                  >
                    <Send className="w-4 h-4 mx-auto" />
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
