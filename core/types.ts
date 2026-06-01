/**
 * Types centraux pour Agentium
 */

// Configuration API Provider
export interface APIProviderConfig {
  provider: 'grok' | 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama';
  apiKey?: string;
  model: string;
  endpoint: string;
  timeout: number;
  enabled: boolean;
}

// Configuration globale
export interface AgentiumConfig {
  version: string;
  apis: {
    primary: APIProviderConfig;
    fallbacks: APIProviderConfig[];
  };
  agents: {
    enabled: string[];
    disabled: string[];
    customPrompts: Record<string, string>;
  };
  ui: {
    theme: 'auto' | 'light' | 'dark';
    position: 'left' | 'right';
    autoSuggest: boolean;
    inlineCompletion: boolean;
  };
  collaboration: {
    maxAgents: number;
    timeout: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

// Catégories d'agents
export type AgentCategory =
  | 'backend'
  | 'frontend'
  | 'mobile'
  | 'database'
  | 'devops'
  | 'testing'
  | 'ui-ux'
  | 'api'
  | 'security'
  | 'misc';

// Définition d'un agent
export interface AgentDefinition {
  name: string;
  category: AgentCategory;
  expertise: string[];
  competencies: string[];
  systemPrompt: string;
  triggers: string[];
  icon?: string;
}

// Message de conversation
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Requête vers un agent
export interface AgentRequest {
  agentName: string;
  query: string;
  context?: CodeContext;
  conversationHistory?: ConversationMessage[];
}

// Réponse d'un agent
export interface AgentResponse {
  agentName: string;
  content: string;
  codeBlocks?: CodeBlock[];
  provider: string;
  tokensUsed?: number;
  processingTime: number;
  timestamp: Date;
}

// Bloc de code dans une réponse
export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  action?: 'insert' | 'replace' | 'create';
}

// Contexte de code analysé
export interface CodeContext {
  language?: string;
  framework?: string;
  projectPath?: string;
  currentFile?: string;
  selectedCode?: string;
  dependencies?: Record<string, string>;
  errors?: string[];
  fileStructure?: string[];
}

// Résultat d'analyse de contexte
export interface ContextAnalysisResult {
  detectedLanguage: string | null;
  detectedFramework: string | null;
  suggestedAgents: string[];
  projectType: string | null;
  techStack: string[];
}

// Tâche de collaboration
export interface CollaborationTask {
  id: string;
  agents: string[];
  query: string;
  subtasks: SubTask[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

export interface SubTask {
  agentName: string;
  task: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  dependsOn?: string[];
}

// Résultat d'appel API
export interface APICallResult {
  success: boolean;
  provider: string;
  content?: string;
  error?: string;
  tokensUsed?: number;
  latency: number;
}

// Entry de conversation DB
export interface ConversationEntry {
  id?: number;
  projectPath: string;
  agentName: string;
  userInput: string;
  agentResponse: string;
  tokensUsed: number;
  timestamp: Date;
  satisfactionRating?: number;
  contextHash?: string;
}

// Entry de cache DB
export interface CacheEntry {
  id?: number;
  queryHash: string;
  agentName: string;
  response: string;
  contextMetadata: string;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
}
