/**
 * Agent Manager - Gestion des agents, chargement dynamique, invocation via syntaxe @agent
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AgentDefinition,
  AgentRequest,
  AgentResponse,
  CodeContext,
  ConversationMessage,
  AgentCategory,
} from './types';
import { getAPIHandler, APIHandler } from './api-handler';
import { getConfigManager, ConfigManager } from './config-manager';
import { getContextAnalyzer, ContextAnalyzer } from './context-analyzer';

// Regex pour parser les invocations @agent
const AGENT_INVOCATION_REGEX = /^@(\w+(?:\+\w+)*)\s+(.+)$/s;
const MULTI_AGENT_SEPARATOR = '+';

// Interface pour le registre d'agents JSON
interface AgentRegistryEntry {
  id: string;
  name: string;
  category: AgentCategory;
  description: string;
  expertise: string[];
  skills: string[];
  triggers: string[];
  icon?: string;
  systemPrompt: string;
}

interface AgentRegistry {
  version: string;
  lastUpdated: string;
  categories: AgentCategory[];
  agents: AgentRegistryEntry[];
}

export class AgentManager {
  private agents: Map<string, AgentDefinition> = new Map();
  private apiHandler: APIHandler;
  private configManager: ConfigManager;
  private contextAnalyzer: ContextAnalyzer;
  private agentsDirectory: string;
  private registryPath: string;

  constructor(
    agentsDir?: string,
    apiHandler?: APIHandler,
    configManager?: ConfigManager,
    contextAnalyzer?: ContextAnalyzer
  ) {
    this.agentsDirectory = agentsDir || path.join(__dirname, '..', 'agents');
    this.registryPath = path.join(this.agentsDirectory, 'agents-registry.json');
    this.apiHandler = apiHandler || getAPIHandler();
    this.configManager = configManager || getConfigManager();
    this.contextAnalyzer = contextAnalyzer || getContextAnalyzer();
    this.loadAgents();
  }

  /**
   * Charge tous les agents - priorité au registre JSON, fallback sur fichiers individuels
   */
  private loadAgents(): void {
    // Essayer de charger depuis le registre JSON d'abord
    if (this.loadFromRegistry()) {
      console.log(`✅ ${this.agents.size} agents chargés depuis le registre`);
      return;
    }

    // Fallback: charger depuis les fichiers individuels
    console.log('📁 Chargement depuis les fichiers individuels...');
    this.loadFromIndividualFiles();
  }

  /**
   * Charge les agents depuis le fichier agents-registry.json
   */
  private loadFromRegistry(): boolean {
    try {
      if (!fs.existsSync(this.registryPath)) {
        console.log('⚠️ Registre agents-registry.json non trouvé');
        return false;
      }

      const registryContent = fs.readFileSync(this.registryPath, 'utf-8');
      const registry: AgentRegistry = JSON.parse(registryContent);

      if (!registry.agents || !Array.isArray(registry.agents)) {
        console.error('❌ Format de registre invalide: agents manquants');
        return false;
      }

      for (const entry of registry.agents) {
        const agent = this.convertRegistryEntryToAgent(entry);
        if (agent) {
          this.registerAgent(agent);
        }
      }

      return this.agents.size > 0;
    } catch (err) {
      console.error('❌ Erreur lors du chargement du registre:', err);
      return false;
    }
  }

  /**
   * Convertit une entrée du registre en AgentDefinition
   */
  private convertRegistryEntryToAgent(entry: AgentRegistryEntry): AgentDefinition | null {
    if (!entry.name || !entry.systemPrompt) {
      console.warn(`⚠️ Agent invalide dans le registre: ${entry.id || 'unknown'}`);
      return null;
    }

    return {
      name: entry.name,
      category: entry.category,
      expertise: entry.expertise || [],
      competencies: entry.skills || [],
      systemPrompt: entry.systemPrompt,
      triggers: entry.triggers || [entry.name],
      icon: entry.icon,
    };
  }

  /**
   * Charge les agents depuis les fichiers individuels (fallback)
   */
  private loadFromIndividualFiles(): void {
    const categories: AgentCategory[] = [
      'backend', 'frontend', 'mobile', 'database', 'devops',
      'testing', 'ui-ux', 'api', 'security', 'misc'
    ];

    for (const category of categories) {
      const categoryPath = path.join(this.agentsDirectory, category);

      if (!fs.existsSync(categoryPath)) {
        continue;
      }

      try {
        const files = fs.readdirSync(categoryPath);
        for (const file of files) {
          if (file.endsWith('.ts') || file.endsWith('.js')) {
            try {
              const agentPath = path.join(categoryPath, file);
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const agentModule = require(agentPath);
              const agent: AgentDefinition = agentModule.default || agentModule;

              if (agent.name && agent.systemPrompt) {
                this.registerAgent(agent);
              }
            } catch (err) {
              console.error(`Erreur lors du chargement de l'agent ${file}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`Erreur lors de la lecture du dossier ${categoryPath}:`, err);
      }
    }
  }

  /**
   * Recharge les agents depuis le registre
   */
  reloadAgents(): boolean {
    this.agents.clear();
    this.loadAgents();
    return this.agents.size > 0;
  }

  /**
   * Enregistre un nouvel agent
   */
  registerAgent(agent: AgentDefinition): void {
    this.agents.set(agent.name.toLowerCase(), agent);

    // Enregistrer aussi les triggers comme aliases
    if (agent.triggers) {
      for (const trigger of agent.triggers) {
        if (trigger.toLowerCase() !== agent.name.toLowerCase()) {
          this.agents.set(trigger.toLowerCase(), agent);
        }
      }
    }
  }

  /**
   * Désenregistre un agent
   */
  unregisterAgent(agentName: string): boolean {
    const agent = this.agents.get(agentName.toLowerCase());
    if (agent) {
      this.agents.delete(agent.name.toLowerCase());
      if (agent.triggers) {
        for (const trigger of agent.triggers) {
          this.agents.delete(trigger.toLowerCase());
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Obtient un agent par son nom
   */
  getAgent(agentName: string): AgentDefinition | undefined {
    return this.agents.get(agentName.toLowerCase());
  }

  /**
   * Liste tous les agents disponibles
   */
  listAgents(): AgentDefinition[] {
    const uniqueAgents = new Map<string, AgentDefinition>();
    for (const agent of this.agents.values()) {
      uniqueAgents.set(agent.name, agent);
    }
    return Array.from(uniqueAgents.values());
  }

  /**
   * Liste les agents par catégorie
   */
  listAgentsByCategory(category: AgentCategory): AgentDefinition[] {
    return this.listAgents().filter(agent => agent.category === category);
  }

  /**
   * Parse une commande d'invocation @agent
   */
  parseInvocation(input: string): { agents: string[]; query: string } | null {
    const match = input.trim().match(AGENT_INVOCATION_REGEX);
    if (!match) {
      return null;
    }

    const agentsPart = match[1];
    const query = match[2].trim();
    const agents = agentsPart.split(MULTI_AGENT_SEPARATOR).map(a => a.toLowerCase());

    return { agents, query };
  }

  /**
   * Invoque un agent unique
   */
  async invokeAgent(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const agentName = request.agentName.toLowerCase().replace('@', '');
    const agent = this.getAgent(agentName);

    if (!agent) {
      return {
        agentName,
        content: `❌ Agent @${agentName} non trouvé. Utilisez 'list' pour voir les agents disponibles.`,
        provider: 'none',
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    // Vérifier si l'agent est activé
    if (!this.configManager.isAgentEnabled(agentName)) {
      return {
        agentName,
        content: `❌ Agent @${agentName} est désactivé dans la configuration.`,
        provider: 'none',
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    // Construire le prompt système
    let systemPrompt = this.configManager.getCustomPrompt(agentName) || agent.systemPrompt;

    // Ajouter le contexte si disponible
    if (request.context) {
      const contextSummary = this.contextAnalyzer.generateContextSummary(request.context);
      if (contextSummary) {
        systemPrompt += `\n\nContexte actuel:\n${contextSummary}`;
      }
    }

    // Préparer les messages
    const messages: ConversationMessage[] = request.conversationHistory || [];
    messages.push({
      role: 'user',
      content: request.query,
      timestamp: new Date(),
    });

    // Appeler l'API
    const apiResult = await this.apiHandler.chat(messages, systemPrompt);

    // Extraire les blocs de code de la réponse
    const codeBlocks = this.extractCodeBlocks(apiResult.content || '');

    return {
      agentName,
      content: apiResult.content || 'Aucune réponse reçue.',
      codeBlocks,
      provider: apiResult.provider,
      tokensUsed: apiResult.tokensUsed,
      processingTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Invoque un agent via la syntaxe @agent query
   */
  async invoke(input: string, context?: CodeContext): Promise<AgentResponse | AgentResponse[]> {
    const parsed = this.parseInvocation(input);

    if (!parsed) {
      // Essayer de détecter un agent pertinent depuis le contexte
      if (context) {
        const analysis = await this.contextAnalyzer.analyzeContext(
          context.projectPath,
          context.currentFile,
          context.selectedCode
        );

        if (analysis.suggestedAgents.length > 0) {
          return this.invokeAgent({
            agentName: analysis.suggestedAgents[0],
            query: input,
            context,
          });
        }
      }

      return {
        agentName: 'system',
        content: '❌ Format invalide. Utilisez: @agent votre question\nExemple: @react créer un composant Button',
        provider: 'none',
        processingTime: 0,
        timestamp: new Date(),
      };
    }

    const { agents, query } = parsed;

    // Multi-agents: déléguer au collaboration engine
    if (agents.length > 1) {
      // Pour l'instant, invoquer séquentiellement
      // TODO: Utiliser le collaboration engine pour une vraie orchestration
      const responses: AgentResponse[] = [];
      for (const agentName of agents) {
        const response = await this.invokeAgent({
          agentName,
          query,
          context,
        });
        responses.push(response);
      }
      return responses;
    }

    // Agent unique
    return this.invokeAgent({
      agentName: agents[0],
      query,
      context,
    });
  }

  /**
   * Extrait les blocs de code d'une réponse markdown
   */
  private extractCodeBlocks(content: string): { language: string; code: string; filename?: string }[] {
    const codeBlockRegex = /```(\w+)?(?:\s*\/\/\s*(.+))?\n([\s\S]*?)```/g;
    const blocks: { language: string; code: string; filename?: string }[] = [];

    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        filename: match[2]?.trim(),
        code: match[3].trim(),
      });
    }

    return blocks;
  }

  /**
   * Recherche des agents par mot-clé
   */
  searchAgents(keyword: string): AgentDefinition[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.listAgents().filter(agent =>
      agent.name.toLowerCase().includes(lowerKeyword) ||
      agent.expertise.some(e => e.toLowerCase().includes(lowerKeyword)) ||
      agent.competencies.some(c => c.toLowerCase().includes(lowerKeyword)) ||
      agent.triggers.some(t => t.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * Obtient les statistiques des agents
   */
  getStats(): { total: number; byCategory: Record<AgentCategory, number>; enabled: number } {
    const agents = this.listAgents();
    const byCategory: Record<string, number> = {};
    let enabled = 0;

    for (const agent of agents) {
      byCategory[agent.category] = (byCategory[agent.category] || 0) + 1;
      if (this.configManager.isAgentEnabled(agent.name)) {
        enabled++;
      }
    }

    return {
      total: agents.length,
      byCategory: byCategory as Record<AgentCategory, number>,
      enabled,
    };
  }

  /**
   * Obtient le registre brut pour inspection
   */
  getRegistry(): AgentRegistry | null {
    try {
      if (!fs.existsSync(this.registryPath)) {
        return null;
      }
      const content = fs.readFileSync(this.registryPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Obtient les catégories disponibles
   */
  getCategories(): AgentCategory[] {
    const categories = new Set<AgentCategory>();
    for (const agent of this.listAgents()) {
      categories.add(agent.category);
    }
    return Array.from(categories);
  }
}

// Instance singleton
let agentManagerInstance: AgentManager | null = null;

export function getAgentManager(agentsDir?: string): AgentManager {
  if (!agentManagerInstance) {
    agentManagerInstance = new AgentManager(agentsDir);
  }
  return agentManagerInstance;
}

export function resetAgentManager(): void {
  agentManagerInstance = null;
}

export default AgentManager;
