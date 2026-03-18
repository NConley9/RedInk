export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderConfig {
  apiKey?: string;
  model: string;
  baseUrl?: string; // For LM Studio / OpenRouter
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderAdapter {
  name: string;
  stream(
    messages: ChatMessage[],
    systemPrompt: string,
    config: ProviderConfig,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: Error) => void,
  ): Promise<void>;
}
