export type Mode = 'long_form' | 'role_play' | 'sexting' | 'texting';

export interface ReferenceChunk {
  id: string;
  triggers: string[];
  content: string;
}

export interface Character {
  id: string;
  user_id: string | null;
  name: string;
  content_md: string;
  voice_card_yaml?: string | null;
  reference_chunks?: ReferenceChunk[];
  tags: string[];
  is_global: boolean;
  is_stock?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  user_id: string | null;
  name: string;
  content_md: string;
  tags: string[];
  is_global: boolean;
  is_stock?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url?: string | null;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  mode: Mode;
  character_id: string | null;
  persona_character_id: string | null;
  scenario_id: string | null;
  model_provider: string;
  model_name: string;
  memory_chunks?: ReferenceChunk[];
  memory_cursor_message_count?: number;
  created_at: string;
  updated_at: string;
  love_interest?: (Pick<Character, 'id' | 'name'> & { content_md?: string; voice_card_yaml?: string | null; reference_chunks?: ReferenceChunk[] }) | null;
  persona?: (Pick<Character, 'id' | 'name'> & { content_md?: string; voice_card_yaml?: string | null; reference_chunks?: ReferenceChunk[] }) | null;
  scenario?: (Pick<Scenario, 'id' | 'name'> & { content_md?: string }) | null;
  last_message?: { content: string; role: string } | null;
  messages?: Message[];
}

export interface ModelOption {
  id: string;
  label: string;
  free: boolean;
  recommended_modes?: Mode[];
  input_token_soft_limit?: number;
  notes?: string;
}

export type ProviderModels = Record<string, ModelOption[]>;

export interface UserSettings {
  model_configs: Record<string, { model: string; temperature?: number }>;
  lmstudio_base_url: string;
  api_keys_configured: string[];
}

export interface ContentAssetSummary {
  key: string;
  source_filename: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface NewChatConfig {
  mode: Mode;
  loveInterestCharacter: Character;
  personaCharacter: Character | null;
  scenario: Scenario | null;
  provider: string;
  model: string;
}
