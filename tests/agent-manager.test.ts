/**
 * Tests pour AgentManager
 */

import * as path from 'path';
import { AgentManager } from '../core/agent-manager';
import { AgentDefinition } from '../core/types';

// Mock des dépendances
jest.mock('../core/api-handler', () => ({
  getAPIHandler: () => ({
    chat: jest.fn().mockResolvedValue({
      success: true,
      provider: 'mock',
      content: 'Mocked response',
      latency: 100,
    }),
  }),
}));

jest.mock('../core/config-manager', () => ({
  getConfigManager: () => ({
    isAgentEnabled: jest.fn().mockReturnValue(true),
    getCustomPrompt: jest.fn().mockReturnValue(null),
    get: jest.fn().mockReturnValue({ maxAgents: 5, timeout: 60000 }),
  }),
}));

describe('AgentManager', () => {
  let agentManager: AgentManager;
  const agentsDir = path.join(__dirname, '..', 'agents');

  beforeEach(() => {
    agentManager = new AgentManager(agentsDir);
  });

  describe('registerAgent', () => {
    test('devrait enregistrer un nouvel agent', () => {
      const testAgent: AgentDefinition = {
        name: 'test-agent',
        category: 'misc',
        expertise: ['testing'],
        competencies: ['unit tests'],
        triggers: ['test', 'testing'],
        systemPrompt: 'You are a test agent.',
      };

      agentManager.registerAgent(testAgent);

      const agent = agentManager.getAgent('test-agent');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('test-agent');
    });

    test('devrait enregistrer les triggers comme aliases', () => {
      const testAgent: AgentDefinition = {
        name: 'myagent',
        category: 'misc',
        expertise: [],
        competencies: [],
        triggers: ['my', 'mine'],
        systemPrompt: 'Test prompt',
      };

      agentManager.registerAgent(testAgent);

      expect(agentManager.getAgent('my')).toBeDefined();
      expect(agentManager.getAgent('mine')).toBeDefined();
      expect(agentManager.getAgent('my')?.name).toBe('myagent');
    });
  });

  describe('parseInvocation', () => {
    test('devrait parser une invocation simple', () => {
      const result = agentManager.parseInvocation('@react créer un bouton');

      expect(result).not.toBeNull();
      expect(result?.agents).toEqual(['react']);
      expect(result?.query).toBe('créer un bouton');
    });

    test('devrait parser une invocation multi-agents', () => {
      const result = agentManager.parseInvocation('@react+typescript+tailwind créer un composant');

      expect(result).not.toBeNull();
      expect(result?.agents).toEqual(['react', 'typescript', 'tailwind']);
      expect(result?.query).toBe('créer un composant');
    });

    test('devrait retourner null pour format invalide', () => {
      expect(agentManager.parseInvocation('invalid input')).toBeNull();
      expect(agentManager.parseInvocation('@ missing agent')).toBeNull();
    });
  });

  describe('listAgents', () => {
    test('devrait retourner une liste d\'agents', () => {
      const agents = agentManager.listAgents();

      expect(Array.isArray(agents)).toBe(true);
      // Vérifier que nos agents de démo sont chargés
      const agentNames = agents.map(a => a.name);
      expect(agentNames).toContain('nodejs');
      expect(agentNames).toContain('react');
    });
  });

  describe('listAgentsByCategory', () => {
    test('devrait filtrer par catégorie', () => {
      const backendAgents = agentManager.listAgentsByCategory('backend');

      expect(backendAgents.every(a => a.category === 'backend')).toBe(true);
    });
  });

  describe('searchAgents', () => {
    test('devrait rechercher par mot-clé', () => {
      const results = agentManager.searchAgents('node');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(a => a.name === 'nodejs')).toBe(true);
    });

    test('devrait rechercher dans l\'expertise', () => {
      const results = agentManager.searchAgents('Docker');

      expect(results.some(a => a.name === 'docker')).toBe(true);
    });
  });

  describe('getStats', () => {
    test('devrait retourner des statistiques valides', () => {
      const stats = agentManager.getStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.enabled).toBe('number');
      expect(typeof stats.byCategory).toBe('object');
    });
  });
});
