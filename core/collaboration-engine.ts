/**
 * Collaboration Engine - Orchestration multi-agents pour tâches complexes
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CollaborationTask,
  SubTask,
  AgentResponse,
  CodeContext,
} from './types';
import { getAgentManager, AgentManager } from './agent-manager';
import { getConfigManager, ConfigManager } from './config-manager';

// Types de collaboration
export type CollaborationType = 'sequential' | 'parallel' | 'pipeline';

// Configuration d'une collaboration
export interface CollaborationConfig {
  type: CollaborationType;
  timeout: number;
  maxAgents: number;
  mergeStrategy: 'concat' | 'smart' | 'review';
}

// Résultat de collaboration
export interface CollaborationResult {
  taskId: string;
  agents: string[];
  responses: AgentResponse[];
  mergedResult: string;
  totalProcessingTime: number;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export class CollaborationEngine {
  private agentManager: AgentManager;
  private configManager: ConfigManager;
  private activeTasks: Map<string, CollaborationTask> = new Map();
  private defaultConfig: CollaborationConfig;

  constructor(agentManager?: AgentManager, configManager?: ConfigManager) {
    this.agentManager = agentManager || getAgentManager();
    this.configManager = configManager || getConfigManager();
    
    const collabConfig = this.configManager.get('collaboration');
    this.defaultConfig = {
      type: 'parallel',
      timeout: collabConfig.timeout,
      maxAgents: collabConfig.maxAgents,
      mergeStrategy: 'smart',
    };
  }

  /**
   * Analyse une requête pour déterminer les sous-tâches
   */
  private analyzeTaskForAgents(agents: string[], query: string): SubTask[] {
    // Pour chaque agent, créer une sous-tâche spécialisée
    const subtasks: SubTask[] = [];

    for (const agentName of agents) {
      const agent = this.agentManager.getAgent(agentName);
      if (!agent) continue;

      // Adapter la tâche selon l'expertise de l'agent
      let taskDescription = query;
      
      // Ajouter des instructions spécifiques selon l'agent
      const taskEnhancements: Record<string, string> = {
        typescript: 'Focus on TypeScript types, interfaces, and type safety.',
        react: 'Focus on React component structure, hooks, and best practices.',
        tailwind: 'Focus on Tailwind CSS classes and responsive design.',
        jest: 'Focus on Jest test cases with good coverage.',
        nodejs: 'Focus on Node.js backend code with proper error handling.',
        docker: 'Focus on Dockerfile best practices and multi-stage builds.',
        security: 'Focus on security best practices and potential vulnerabilities.',
        sql: 'Focus on SQL queries optimization and database design.',
      };

      if (taskEnhancements[agentName]) {
        taskDescription = `${query}\n\n${taskEnhancements[agentName]}`;
      }

      subtasks.push({
        agentName,
        task: taskDescription,
        status: 'pending',
      });
    }

    return subtasks;
  }

  /**
   * Exécute les sous-tâches en parallèle
   */
  private async executeParallel(
    subtasks: SubTask[],
    context?: CodeContext,
    timeout: number = 60000
  ): Promise<AgentResponse[]> {
    const promises = subtasks.map(async (subtask) => {
      subtask.status = 'in_progress';
      
      try {
        const response = await Promise.race([
          this.agentManager.invokeAgent({
            agentName: subtask.agentName,
            query: subtask.task,
            context,
          }),
          new Promise<AgentResponse>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]);

        subtask.status = 'completed';
        subtask.result = response.content;
        return response;
      } catch (error) {
        subtask.status = 'failed';
        return {
          agentName: subtask.agentName,
          content: `❌ Erreur: ${error}`,
          provider: 'none',
          processingTime: 0,
          timestamp: new Date(),
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Exécute les sous-tâches séquentiellement
   */
  private async executeSequential(
    subtasks: SubTask[],
    context?: CodeContext
  ): Promise<AgentResponse[]> {
    const responses: AgentResponse[] = [];
    let previousContext = context;

    for (const subtask of subtasks) {
      subtask.status = 'in_progress';

      try {
        // Enrichir le contexte avec les résultats précédents
        const enrichedQuery = responses.length > 0
          ? `${subtask.task}\n\nContexte des réponses précédentes:\n${responses.map(r => `@${r.agentName}: ${r.content.substring(0, 500)}...`).join('\n')}`
          : subtask.task;

        const response = await this.agentManager.invokeAgent({
          agentName: subtask.agentName,
          query: enrichedQuery,
          context: previousContext,
        });

        subtask.status = 'completed';
        subtask.result = response.content;
        responses.push(response);
      } catch (error) {
        subtask.status = 'failed';
        responses.push({
          agentName: subtask.agentName,
          content: `❌ Erreur: ${error}`,
          provider: 'none',
          processingTime: 0,
          timestamp: new Date(),
        });
      }
    }

    return responses;
  }

  /**
   * Fusionne les réponses de plusieurs agents
   */
  private mergeResponses(
    responses: AgentResponse[],
    strategy: 'concat' | 'smart' | 'review'
  ): string {
    if (responses.length === 0) {
      return 'Aucune réponse des agents.';
    }

    if (responses.length === 1) {
      return responses[0].content;
    }

    switch (strategy) {
      case 'concat':
        return responses
          .map(r => `## 🤖 @${r.agentName}\n\n${r.content}`)
          .join('\n\n---\n\n');

      case 'smart':
        return this.smartMerge(responses);

      case 'review':
        // Dans une vraie implémentation, on demanderait à @codereview de valider
        return this.smartMerge(responses);

      default:
        return responses[0].content;
    }
  }

  /**
   * Fusion intelligente des réponses
   */
  private smartMerge(responses: AgentResponse[]): string {
    const sections: string[] = [];
    const codeBlocksByType: Map<string, string[]> = new Map();

    // Collecter les blocs de code par type
    for (const response of responses) {
      if (response.codeBlocks) {
        for (const block of response.codeBlocks) {
          const key = block.filename || block.language;
          if (!codeBlocksByType.has(key)) {
            codeBlocksByType.set(key, []);
          }
          codeBlocksByType.get(key)!.push(block.code);
        }
      }
    }

    // Header avec les agents impliqués
    sections.push(`# 🤝 Résultat collaboratif\n\n**Agents impliqués:** ${responses.map(r => `@${r.agentName}`).join(', ')}\n`);

    // Résumé de chaque agent (extraire les premières lignes non-code)
    sections.push('## 📋 Résumé des contributions\n');
    for (const response of responses) {
      const summary = response.content
        .split('```')[0]
        .trim()
        .split('\n')
        .slice(0, 3)
        .join('\n');
      sections.push(`### @${response.agentName}\n${summary}\n`);
    }

    // Code consolidé
    if (codeBlocksByType.size > 0) {
      sections.push('## 💻 Code généré\n');
      for (const [fileOrLang, codes] of codeBlocksByType) {
        // Prendre le code le plus complet ou le dernier
        const bestCode = codes.reduce((a, b) => (b.length > a.length ? b : a), '');
        const lang = fileOrLang.includes('.') ? this.getLangFromFilename(fileOrLang) : fileOrLang;
        const filename = fileOrLang.includes('.') ? fileOrLang : '';
        
        sections.push(`\`\`\`${lang}${filename ? ` // ${filename}` : ''}\n${bestCode}\n\`\`\`\n`);
      }
    }

    // Instructions finales combinées
    const nonCodeInstructions = responses
      .map(r => {
        const parts = r.content.split('```');
        return parts.length > 1 ? parts[parts.length - 1].trim() : '';
      })
      .filter(Boolean);

    if (nonCodeInstructions.length > 0) {
      sections.push('## 📝 Instructions\n' + nonCodeInstructions.join('\n\n'));
    }

    return sections.join('\n');
  }

  private getLangFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const extMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      sql: 'sql',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      dockerfile: 'dockerfile',
    };
    return extMap[ext] || ext;
  }

  /**
   * Exécute une collaboration multi-agents
   */
  async collaborate(
    agents: string[],
    query: string,
    context?: CodeContext,
    config?: Partial<CollaborationConfig>
  ): Promise<CollaborationResult> {
    const startTime = Date.now();
    const taskId = uuidv4();
    const mergedConfig = { ...this.defaultConfig, ...config };

    // Vérifier le nombre max d'agents
    if (agents.length > mergedConfig.maxAgents) {
      return {
        taskId,
        agents,
        responses: [],
        mergedResult: `❌ Trop d'agents demandés. Maximum: ${mergedConfig.maxAgents}`,
        totalProcessingTime: Date.now() - startTime,
        status: 'failed',
        errors: [`Limite de ${mergedConfig.maxAgents} agents dépassée`],
      };
    }

    // Créer la tâche
    const subtasks = this.analyzeTaskForAgents(agents, query);
    const task: CollaborationTask = {
      id: taskId,
      agents,
      query,
      subtasks,
      status: 'in_progress',
    };

    this.activeTasks.set(taskId, task);

    // Exécuter selon le type de collaboration
    let responses: AgentResponse[];
    const errors: string[] = [];

    try {
      switch (mergedConfig.type) {
        case 'parallel':
          responses = await this.executeParallel(subtasks, context, mergedConfig.timeout);
          break;
        case 'sequential':
          responses = await this.executeSequential(subtasks, context);
          break;
        case 'pipeline':
          // Pour le pipeline, on utilise séquentiel avec contexte enrichi
          responses = await this.executeSequential(subtasks, context);
          break;
        default:
          responses = await this.executeParallel(subtasks, context, mergedConfig.timeout);
      }

      // Collecter les erreurs
      for (const response of responses) {
        if (response.content.startsWith('❌')) {
          errors.push(`@${response.agentName}: ${response.content}`);
        }
      }

      // Fusionner les réponses
      const mergedResult = this.mergeResponses(responses, mergedConfig.mergeStrategy);

      // Mettre à jour le statut
      task.status = errors.length === 0 ? 'completed' : errors.length === responses.length ? 'failed' : 'completed';
      task.result = mergedResult;

      return {
        taskId,
        agents,
        responses,
        mergedResult,
        totalProcessingTime: Date.now() - startTime,
        status: errors.length === 0 ? 'success' : errors.length < responses.length ? 'partial' : 'failed',
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      task.status = 'failed';
      return {
        taskId,
        agents,
        responses: [],
        mergedResult: `❌ Erreur de collaboration: ${error}`,
        totalProcessingTime: Date.now() - startTime,
        status: 'failed',
        errors: [String(error)],
      };
    } finally {
      // Nettoyer la tâche après un délai
      setTimeout(() => this.activeTasks.delete(taskId), 60000);
    }
  }

  /**
   * Obtient le statut d'une tâche en cours
   */
  getTaskStatus(taskId: string): CollaborationTask | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * Liste les tâches actives
   */
  listActiveTasks(): CollaborationTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Annule une tâche en cours
   */
  cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (task && task.status === 'in_progress') {
      task.status = 'failed';
      return true;
    }
    return false;
  }
}

// Instance singleton
let collaborationEngineInstance: CollaborationEngine | null = null;

export function getCollaborationEngine(): CollaborationEngine {
  if (!collaborationEngineInstance) {
    collaborationEngineInstance = new CollaborationEngine();
  }
  return collaborationEngineInstance;
}

export default CollaborationEngine;
