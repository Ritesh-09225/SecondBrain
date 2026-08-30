export type ReflectionMode = 
  | "reflect"      // Deep, empathetic inquiry and philosophical perspective
  | "summarize"    // Executive key takeaways & bulleted summary
  | "brainstorm"   // Actionable next steps, ideas, and creative paths
  | "reframe";     // Cognitive reframing and positive perspective shifts

export interface JournalMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  mode?: ReflectionMode;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  category?: string;
  mood?: string;
  createdAt: number;
  updatedAt: number;
  messages: JournalMessage[];
  summary?: string;
  keyTakeaways?: string[];
  actionItems?: string[];
}

export interface ReflectionRequestPayload {
  prompt: string;
  mode?: ReflectionMode;
  contextHistory?: Array<{
    role: "user" | "model";
    content: string;
  }>;
  title?: string;
}

export interface ReflectionResponsePayload {
  reply: string;
  suggestedTitle?: string;
  summary?: string;
  modelUsed: string;
}
