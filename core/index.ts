/**
 * Agentium Core - Module principal
 */

// Types
export * from './types';

// Modules
export { ConfigManager, getConfigManager } from './config-manager';
export { APIHandler, getAPIHandler } from './api-handler';
export { AgentManager, getAgentManager } from './agent-manager';
export { ContextAnalyzer, getContextAnalyzer } from './context-analyzer';
export { CollaborationEngine, getCollaborationEngine } from './collaboration-engine';
export { AgentiumDatabase, getDatabase } from './database';

// Version
export const VERSION = '1.0.0';
