/**
 * API Handler - Client API unifié avec Grok comme primaire et fallback automatique
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { APIProviderConfig, APICallResult, ConversationMessage } from './types';
import { getConfigManager, ConfigManager } from './config-manager';

// Interface pour les réponses des différentes APIs
interface ChatCompletionRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
  usage?: { total_tokens: number };
}

export class APIHandler {
  private configManager: ConfigManager;
  private currentProvider: string;
  private axiosInstances: Map<string, AxiosInstance> = new Map();
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(configManager?: ConfigManager) {
    this.configManager = configManager || getConfigManager();
    this.currentProvider = this.configManager.getPrimaryAPI().provider;
    this.initializeAxiosInstances();
  }

  /**
   * Initialise les instances Axios pour chaque provider
   */
  private initializeAxiosInstances(): void {
    const primary = this.configManager.getPrimaryAPI();
    const fallbacks = this.configManager.getFallbackAPIs();

    const allProviders = [primary, ...fallbacks];

    for (const provider of allProviders) {
      if (!provider.enabled || !provider.apiKey) continue;

      const instance = axios.create({
        baseURL: provider.endpoint,
        timeout: provider.timeout,
        headers: this.getHeaders(provider),
      });

      this.axiosInstances.set(provider.provider, instance);
    }
  }

  /**
   * Retourne les headers appropriés selon le provider
   */
  private getHeaders(config: APIProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (config.provider) {
      case 'grok':
      case 'openai':
      case 'mistral':
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        break;
      case 'anthropic':
        headers['x-api-key'] = config.apiKey || '';
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'google':
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        break;
    }

    return headers;
  }

  /**
   * Formate la requête selon le provider
   */
  private formatRequest(
    provider: string,
    model: string,
    messages: ConversationMessage[],
    systemPrompt: string
  ): { endpoint: string; body: any } {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    switch (provider) {
      case 'anthropic':
        return {
          endpoint: '/messages',
          body: {
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
          },
        };
      case 'google':
        return {
          endpoint: `/models/${model}:generateContent`,
          body: {
            contents: formattedMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          },
        };
      default: // grok, openai, mistral - format OpenAI compatible
        return {
          endpoint: '/chat/completions',
          body: {
            model,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 4096,
          },
        };
    }
  }

  /**
   * Parse la réponse selon le provider
   */
  private parseResponse(provider: string, data: any): { content: string; tokensUsed?: number } {
    switch (provider) {
      case 'anthropic':
        return {
          content: data.content?.[0]?.text || '',
          tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
        };
      case 'google':
        return {
          content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          tokensUsed: data.usageMetadata?.totalTokenCount,
        };
      default: // grok, openai, mistral
        return {
          content: data.choices?.[0]?.message?.content || '',
          tokensUsed: data.usage?.total_tokens,
        };
    }
  }

  /**
   * Effectue un appel API avec un provider spécifique
   */
  private async callProvider(
    providerConfig: APIProviderConfig,
    messages: ConversationMessage[],
    systemPrompt: string
  ): Promise<APICallResult> {
    const startTime = Date.now();
    const instance = this.axiosInstances.get(providerConfig.provider);

    if (!instance) {
      return {
        success: false,
        provider: providerConfig.provider,
        error: `Provider ${providerConfig.provider} non configuré`,
        latency: 0,
      };
    }

    const { endpoint, body } = this.formatRequest(
      providerConfig.provider,
      providerConfig.model,
      messages,
      systemPrompt
    );

    try {
      const response = await instance.post(endpoint, body);
      const parsed = this.parseResponse(providerConfig.provider, response.data);

      return {
        success: true,
        provider: providerConfig.provider,
        content: parsed.content,
        tokensUsed: parsed.tokensUsed,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        success: false,
        provider: providerConfig.provider,
        error: axiosError.message || 'Erreur inconnue',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Effectue un appel API avec retry et fallback automatique
   */
  async chat(
    messages: ConversationMessage[],
    systemPrompt: string,
    preferredProvider?: string
  ): Promise<APICallResult> {
    const primary = this.configManager.getPrimaryAPI();
    const fallbacks = this.configManager.getFallbackAPIs();

    // Construire la liste des providers à essayer
    let providers: APIProviderConfig[] = [];

    if (preferredProvider) {
      const preferred = [primary, ...fallbacks].find(p => p.provider === preferredProvider);
      if (preferred && preferred.enabled && preferred.apiKey) {
        providers.push(preferred);
      }
    }

    // Ajouter le primary s'il n'est pas déjà en premier
    if (primary.enabled && primary.apiKey && !providers.includes(primary)) {
      providers.push(primary);
    }

    // Ajouter les fallbacks
    for (const fallback of fallbacks) {
      if (fallback.enabled && fallback.apiKey && !providers.includes(fallback)) {
        providers.push(fallback);
      }
    }

    if (providers.length === 0) {
      return {
        success: false,
        provider: 'none',
        error: 'Aucun provider API configuré avec une clé valide',
        latency: 0,
      };
    }

    // Essayer chaque provider avec retry
    for (const providerConfig of providers) {
      for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
        const result = await this.callProvider(providerConfig, messages, systemPrompt);

        if (result.success) {
          this.currentProvider = providerConfig.provider;
          return result;
        }

        // Si erreur de rate limit ou timeout, attendre avant retry
        if (result.error?.includes('429') || result.error?.includes('timeout')) {
          await this.sleep(this.retryDelay * (attempt + 1));
          continue;
        }

        // Erreur d'authentification ou autre erreur critique -> passer au fallback
        break;
      }

      console.log(`Fallback: ${providerConfig.provider} a échoué, passage au provider suivant...`);
    }

    return {
      success: false,
      provider: 'all',
      error: 'Tous les providers ont échoué',
      latency: 0,
    };
  }

  /**
   * Appel simple avec texte uniquement
   */
  async chatSimple(userMessage: string, systemPrompt: string): Promise<APICallResult> {
    const messages: ConversationMessage[] = [
      { role: 'user', content: userMessage, timestamp: new Date() },
    ];
    return this.chat(messages, systemPrompt);
  }

  /**
   * Obtient le provider actuellement utilisé
   */
  getCurrentProvider(): string {
    return this.currentProvider;
  }

  /**
   * Teste la connexion à un provider
   */
  async testConnection(provider?: string): Promise<{ success: boolean; latency: number; error?: string }> {
    const providerConfig = provider
      ? [this.configManager.getPrimaryAPI(), ...this.configManager.getFallbackAPIs()].find(
          p => p.provider === provider
        )
      : this.configManager.getPrimaryAPI();

    if (!providerConfig) {
      return { success: false, latency: 0, error: 'Provider non trouvé' };
    }

    const result = await this.callProvider(
      providerConfig,
      [{ role: 'user', content: 'Hello', timestamp: new Date() }],
      'Respond with "OK" only.'
    );

    return {
      success: result.success,
      latency: result.latency,
      error: result.error,
    };
  }

  /**
   * Liste les providers disponibles et leur statut
   */
  listProviders(): { provider: string; enabled: boolean; hasApiKey: boolean; isCurrent: boolean }[] {
    const primary = this.configManager.getPrimaryAPI();
    const fallbacks = this.configManager.getFallbackAPIs();

    return [primary, ...fallbacks].map(p => ({
      provider: p.provider,
      enabled: p.enabled,
      hasApiKey: !!p.apiKey,
      isCurrent: p.provider === this.currentProvider,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Réinitialise au provider primaire
   */
  resetToDefault(): void {
    this.currentProvider = this.configManager.getPrimaryAPI().provider;
  }
}

// Instance singleton
let apiHandlerInstance: APIHandler | null = null;

export function getAPIHandler(configManager?: ConfigManager): APIHandler {
  if (!apiHandlerInstance) {
    apiHandlerInstance = new APIHandler(configManager);
  }
  return apiHandlerInstance;
}

export default APIHandler;
