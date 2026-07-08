/**
 * Config Manager - Gestion de la configuration (~/.skill-ia-agents/config.json)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentiumConfig, APIProviderConfig } from './types';

const CONFIG_DIR = path.join(os.homedir(), '.skill-ia-agents');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Configuration par défaut
const DEFAULT_CONFIG: AgentiumConfig = {
  version: '1.0.0',
  apis: {
    primary: {
      provider: 'grok',
      apiKey: process.env.GROK_API_KEY || '',
      model: 'grok-2-latest',
      endpoint: 'https://api.x.ai/v1',
      timeout: 30000,
      enabled: true,
    },
    fallbacks: [
      {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4-turbo',
        endpoint: 'https://api.openai.com/v1',
        timeout: 30000,
        enabled: true,
      },
      {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: 'claude-3-5-sonnet-20241022',
        endpoint: 'https://api.anthropic.com/v1',
        timeout: 30000,
        enabled: true,
      },
    ],
  },
  agents: {
    enabled: ['*'],
    disabled: [],
    customPrompts: {},
  },
  ui: {
    theme: 'auto',
    position: 'right',
    autoSuggest: true,
    inlineCompletion: true,
  },
  collaboration: {
    maxAgents: 5,
    timeout: 60000,
  },
  cache: {
    enabled: true,
    ttl: 3600,
  },
};

export class ConfigManager {
  private config: AgentiumConfig;
  private configPath: string;

  constructor(customPath?: string) {
    this.configPath = customPath || CONFIG_FILE;
    this.config = this.loadConfig();
  }

  /**
   * Charge la configuration depuis le fichier ou crée la config par défaut
   */
  private loadConfig(): AgentiumConfig {
    try {
      // Créer le répertoire si nécessaire
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Charger la config existante ou créer la config par défaut
      if (fs.existsSync(this.configPath)) {
        const rawConfig = fs.readFileSync(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(rawConfig);
        // Merge avec la config par défaut pour les nouvelles propriétés
        return this.mergeConfigs(DEFAULT_CONFIG, loadedConfig);
      } else {
        this.saveConfig(DEFAULT_CONFIG);
        return { ...DEFAULT_CONFIG };
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la config:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Merge deux configurations (deep merge)
   */
  private mergeConfigs(base: AgentiumConfig, override: Partial<AgentiumConfig>): AgentiumConfig {
    return {
      ...base,
      ...override,
      apis: {
        ...base.apis,
        ...override.apis,
        primary: { ...base.apis.primary, ...override.apis?.primary },
        fallbacks: override.apis?.fallbacks || base.apis.fallbacks,
      },
      agents: { ...base.agents, ...override.agents },
      ui: { ...base.ui, ...override.ui },
      collaboration: { ...base.collaboration, ...override.collaboration },
      cache: { ...base.cache, ...override.cache },
    };
  }

  /**
   * Sauvegarde la configuration dans le fichier
   */
  saveConfig(config?: AgentiumConfig): void {
    try {
      const configToSave = config || this.config;
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2), 'utf-8');
      if (config) {
        this.config = config;
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la config:', error);
      throw error;
    }
  }

  /**
   * Obtient la configuration complète
   */
  getConfig(): AgentiumConfig {
    return { ...this.config };
  }

  /**
   * Obtient la configuration de l'API primaire
   */
  getPrimaryAPI(): APIProviderConfig {
    return { ...this.config.apis.primary };
  }

  /**
   * Obtient les configurations des APIs de fallback
   */
  getFallbackAPIs(): APIProviderConfig[] {
    return this.config.apis.fallbacks.filter(api => api.enabled);
  }

  /**
   * Définit la clé API pour un provider
   */
  setAPIKey(provider: string, apiKey: string): void {
    if (this.config.apis.primary.provider === provider) {
      this.config.apis.primary.apiKey = apiKey;
    } else {
      const fallback = this.config.apis.fallbacks.find(f => f.provider === provider);
      if (fallback) {
        fallback.apiKey = apiKey;
      }
    }
    this.saveConfig();
  }

  /**
   * Active/désactive un agent
   */
  setAgentEnabled(agentName: string, enabled: boolean): void {
    if (enabled) {
      this.config.agents.disabled = this.config.agents.disabled.filter(a => a !== agentName);
      if (!this.config.agents.enabled.includes(agentName) && !this.config.agents.enabled.includes('*')) {
        this.config.agents.enabled.push(agentName);
      }
    } else {
      if (!this.config.agents.disabled.includes(agentName)) {
        this.config.agents.disabled.push(agentName);
      }
    }
    this.saveConfig();
  }

  /**
   * Vérifie si un agent est activé
   */
  isAgentEnabled(agentName: string): boolean {
    if (this.config.agents.disabled.includes(agentName)) {
      return false;
    }
    return this.config.agents.enabled.includes('*') || this.config.agents.enabled.includes(agentName);
  }

  /**
   * Définit un prompt personnalisé pour un agent
   */
  setCustomPrompt(agentName: string, prompt: string): void {
    this.config.agents.customPrompts[agentName] = prompt;
    this.saveConfig();
  }

  /**
   * Obtient le prompt personnalisé d'un agent (ou null si non défini)
   */
  getCustomPrompt(agentName: string): string | null {
    return this.config.agents.customPrompts[agentName] || null;
  }

  /**
   * Met à jour une valeur de configuration
   */
  set<K extends keyof AgentiumConfig>(key: K, value: AgentiumConfig[K]): void {
    this.config[key] = value;
    this.saveConfig();
  }

  /**
   * Obtient une valeur de configuration
   */
  get<K extends keyof AgentiumConfig>(key: K): AgentiumConfig[K] {
    return this.config[key];
  }

  /**
   * Réinitialise la configuration aux valeurs par défaut
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  /**
   * Exporte la configuration (sans les clés API)
   */
  exportConfig(): string {
    const exportableConfig = { ...this.config };
    exportableConfig.apis.primary.apiKey = '***';
    exportableConfig.apis.fallbacks = exportableConfig.apis.fallbacks.map(f => ({
      ...f,
      apiKey: '***',
    }));
    return JSON.stringify(exportableConfig, null, 2);
  }

  /**
   * Importe une configuration
   */
  importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      // Préserver les clés API existantes
      if (importedConfig.apis?.primary?.apiKey === '***') {
        importedConfig.apis.primary.apiKey = this.config.apis.primary.apiKey;
      }
      if (importedConfig.apis?.fallbacks) {
        importedConfig.apis.fallbacks = importedConfig.apis.fallbacks.map((f: APIProviderConfig, i: number) => ({
          ...f,
          apiKey: f.apiKey === '***' ? this.config.apis.fallbacks[i]?.apiKey || '' : f.apiKey,
        }));
      }
      this.config = this.mergeConfigs(DEFAULT_CONFIG, importedConfig);
      this.saveConfig();
    } catch (error) {
      throw new Error(`Erreur lors de l'import de la configuration: ${error}`);
    }
  }
}

// Instance singleton
let configManagerInstance: ConfigManager | null = null;

export function getConfigManager(customPath?: string): ConfigManager {
  if (!configManagerInstance || customPath) {
    configManagerInstance = new ConfigManager(customPath);
  }
  return configManagerInstance;
}

export default ConfigManager;
