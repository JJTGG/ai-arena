import { openAIAdapter } from "../../lib/ai/adapters/openai";
import { googleAdapter } from "../../lib/ai/adapters/google";
import { runArena } from "../../lib/ai/arena";
import type {
  AIMessage,
  AIProviderId,
  AIResponse,
} from "../../lib/ai/types";
import { recordUsage } from "../../lib/ai/usage";
import ProviderSelector from "../components/provider-selector";
import ChatInput from "../components/chat-input";
import ResponseCard from "../components/response-card";