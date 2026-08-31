export type AIProviderId = "openai" | "google";

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIRequest = {
  message: string;
  history: AIMessage[];
};

export type AIResponse = {
  provider: AIProviderId;
  model: string;
  content: string;
};

export type AIProvider = {
  id: AIProviderId;
  name: string;
  model: string;
};