/**
 * Tests pour AgentiumDatabase
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentiumDatabase } from '../core/database';

describe('AgentiumDatabase', () => {
  const testDbPath = path.join(os.tmpdir(), `agentium-test-${Date.now()}.db`);
  let database: AgentiumDatabase;

  beforeEach(() => {
    // Supprimer la base de test si elle existe
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    database = new AgentiumDatabase(testDbPath);
  });

  afterEach(() => {
    database.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('conversations', () => {
    test('devrait sauvegarder une conversation', () => {
      const id = database.saveConversation({
        projectPath: '/test/project',
        agentName: 'react',
        userInput: 'créer un bouton',
        agentResponse: 'Voici un bouton React...',
        tokensUsed: 100,
        timestamp: new Date(),
      });

      expect(id).toBeGreaterThan(0);
    });

    test('devrait récupérer l\'historique des conversations', () => {
      database.saveConversation({
        projectPath: '/test/project',
        agentName: 'react',
        userInput: 'question 1',
        agentResponse: 'réponse 1',
        tokensUsed: 50,
        timestamp: new Date(),
      });

      database.saveConversation({
        projectPath: '/test/project',
        agentName: 'nodejs',
        userInput: 'question 2',
        agentResponse: 'réponse 2',
        tokensUsed: 75,
        timestamp: new Date(),
      });

      const history = database.getConversationHistory({ projectPath: '/test/project' });
      expect(history.length).toBe(2);
    });

    test('devrait filtrer par agent', () => {
      database.saveConversation({
        projectPath: '/test/project',
        agentName: 'react',
        userInput: 'q1',
        agentResponse: 'r1',
        tokensUsed: 50,
        timestamp: new Date(),
      });

      database.saveConversation({
        projectPath: '/test/project',
        agentName: 'nodejs',
        userInput: 'q2',
        agentResponse: 'r2',
        tokensUsed: 50,
        timestamp: new Date(),
      });

      const history = database.getConversationHistory({ agentName: 'react' });
      expect(history.length).toBe(1);
      expect(history[0].agentName).toBe('react');
    });

    test('devrait mettre à jour la satisfaction', () => {
      const id = database.saveConversation({
        projectPath: '/test',
        agentName: 'test',
        userInput: 'q',
        agentResponse: 'r',
        tokensUsed: 10,
        timestamp: new Date(),
      });

      const updated = database.updateSatisfaction(id, 5);
      expect(updated).toBe(true);

      const history = database.getConversationHistory();
      expect(history[0].satisfactionRating).toBe(5);
    });
  });

  describe('cache', () => {
    test('devrait mettre en cache une réponse', () => {
      database.cacheResponse('react', 'question test', 'réponse mise en cache');

      const cached = database.getCachedResponse('react', 'question test');
      expect(cached).not.toBeNull();
      expect(cached?.response).toBe('réponse mise en cache');
    });

    test('devrait retourner null pour cache miss', () => {
      const cached = database.getCachedResponse('unknown', 'unknown query');
      expect(cached).toBeNull();
    });

    test('devrait incrémenter le compteur d\'accès', () => {
      database.cacheResponse('test', 'q', 'r');

      database.getCachedResponse('test', 'q');
      const cached = database.getCachedResponse('test', 'q');

      expect(cached?.accessCount).toBe(3); // 1 initial + 2 accès
    });

    test('devrait invalider le cache par agent', () => {
      database.cacheResponse('react', 'q1', 'r1');
      database.cacheResponse('nodejs', 'q2', 'r2');

      database.invalidateCache('react');

      expect(database.getCachedResponse('react', 'q1')).toBeNull();
      expect(database.getCachedResponse('nodejs', 'q2')).not.toBeNull();
    });
  });

  describe('templates', () => {
    test('devrait sauvegarder et récupérer un template', () => {
      database.saveTemplate('my-button', 'react', 'Button component template', ['name', 'variant']);

      const template = database.getTemplate('my-button');
      expect(template).not.toBeNull();
      expect(template?.agentName).toBe('react');
      expect(template?.variables).toContain('name');
    });

    test('devrait lister les templates', () => {
      database.saveTemplate('t1', 'react', 'c1');
      database.saveTemplate('t2', 'nodejs', 'c2');

      const templates = database.listTemplates();
      expect(templates.length).toBe(2);
    });

    test('devrait supprimer un template', () => {
      database.saveTemplate('to-delete', 'test', 'content');

      const deleted = database.deleteTemplate('to-delete');
      expect(deleted).toBe(true);
      expect(database.getTemplate('to-delete')).toBeNull();
    });
  });

  describe('project context', () => {
    test('devrait sauvegarder et récupérer le contexte', () => {
      database.saveProjectContext(
        '/my/project',
        ['react', 'typescript'],
        ['src/', 'public/'],
        { react: '^18.0.0' },
        { naming: 'camelCase' }
      );

      const context = database.getProjectContext('/my/project');
      expect(context).not.toBeNull();
      expect(context?.techStack).toContain('react');
      expect(context?.dependencies.react).toBe('^18.0.0');
    });
  });

  describe('stats', () => {
    test('devrait retourner des statistiques valides', () => {
      database.saveConversation({
        projectPath: '/test',
        agentName: 'react',
        userInput: 'q',
        agentResponse: 'r',
        tokensUsed: 100,
        timestamp: new Date(),
      });

      const stats = database.getStats();

      expect(stats.totalConversations).toBe(1);
      expect(stats.totalTokens).toBe(100);
    });
  });
});
