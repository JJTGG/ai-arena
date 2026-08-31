export type AIProviderId = "openai" | "google";

export type AIProvider = {
  id: AIProviderId;
  name: string;
  model: string;
};

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIRequest = {
  messages: AIMessage[];
};

export type AIResponse = {
  provider: AIProviderId;
  content: string;
};

export type ComparisonResult = {
  id: string;
  prompt: string;
  responses: AIResponse[];
  createdAt: string;
};