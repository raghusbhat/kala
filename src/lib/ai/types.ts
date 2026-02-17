// AI Command Schema Types

export type AICommandType =
  | "create_shape"
  | "create_text"
  | "create_frame"
  | "modify_object"
  | "delete_object"
  | "select_object"
  | "set_canvas_background";

export interface CreateShapeCommand {
  action: "create_shape";
  shape: "rectangle" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  name?: string;
  shadowEnabled?: boolean;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowColor?: string;
}

export interface CreateTextCommand {
  action: "create_text";
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fillColor?: string;
  fontSize?: number;
  name?: string;
}

export interface CreateFrameCommand {
  action: "create_frame";
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  strokeColor?: string;
  name?: string;
}

export interface ModifyObjectCommand {
  action: "modify_object";
  id: string;
  changes: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    name?: string;
    text?: string;
    fontSize?: number;
    rotation?: number;
    shadowEnabled?: boolean;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowBlur?: number;
    shadowColor?: string;
    cornerRadius?: number;
    cornerRadiusTopLeft?: number;
    cornerRadiusTopRight?: number;
    cornerRadiusBottomLeft?: number;
    cornerRadiusBottomRight?: number;
  };
}

export interface DeleteObjectCommand {
  action: "delete_object";
  id: string;
}

export interface SelectObjectCommand {
  action: "select_object";
  id: string;
}

export interface SetCanvasBackgroundCommand {
  action: "set_canvas_background";
  color: string;
}

export type AICommand =
  | CreateShapeCommand
  | CreateTextCommand
  | CreateFrameCommand
  | ModifyObjectCommand
  | DeleteObjectCommand
  | SelectObjectCommand
  | SetCanvasBackgroundCommand;

export interface AIResponse {
  message: string;
  commands: AICommand[];
}

// Provider types
export interface AIMessage {
  role: "user" | "assistant";
  content: string | AIMessageContent[];
}

export interface AIMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface AIRequestOptions {
  apiKey: string;
  model: string;
  system: string;
  messages: AIMessage[];
}

export interface AIStreamCallbacks {
  onToken: (chunk: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export interface AIProvider {
  id: string;
  name: string;
  defaultModel: string;
  availableModels: string[];
  sendMessage(options: AIRequestOptions, callbacks: AIStreamCallbacks): Promise<void>;
}

// Canvas context types for AI
export interface CanvasObjectSummary {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  isFrame: boolean;
  parentFrameId?: string;
  text?: string;
  fontSize?: number;
}
