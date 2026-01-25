/**
 * Database - Persistance SQLite (historique, cache, contexte)
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { ConversationEntry, CacheEntry } from './types';

const DB_DIR = path.join(os.homedir(), '.skill-ia-agents');
const DB_PATH = path.join(DB_DIR, 'agentium.db');

export class AgentiumDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || DB_PATH;
    
    // Créer le répertoire si nécessaire
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.initializeTables();
  }

  /**
   * Initialise les tables de la base de données
   */
  private initializeTables(): void {
    // Table des conversations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_path TEXT,
        agent_name TEXT NOT NULL,
        user_input TEXT NOT NULL,
        agent_response TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        satisfaction_rating INTEGER,
        context_hash TEXT
      )
    `);

    // Index pour recherche rapide
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_name);
      CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_path);
      CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
    `);

    // Table de cache des réponses
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS response_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT UNIQUE NOT NULL,
        agent_name TEXT NOT NULL,
        response TEXT NOT NULL,
        context_metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 1,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index pour le cache
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cache_hash ON response_cache(query_hash);
      CREATE INDEX IF NOT EXISTS idx_cache_agent ON response_cache(agent_name);
    `);

    // Table du contexte projet
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_context (
        project_path TEXT PRIMARY KEY,
        tech_stack TEXT,
        file_structure TEXT,
        dependencies TEXT,
        conventions TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des templates utilisateur
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS custom_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        agent_name TEXT NOT NULL,
        template_content TEXT NOT NULL,
        variables TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Ajoute une entrée de conversation
   */
  saveConversation(entry: ConversationEntry): number {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (project_path, agent_name, user_input, agent_response, tokens_used, timestamp, satisfaction_rating, context_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.projectPath,
      entry.agentName,
      entry.userInput,
      entry.agentResponse,
      entry.tokensUsed,
      entry.timestamp.toISOString(),
      entry.satisfactionRating || null,
      entry.contextHash || null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Récupère l'historique des conversations
   */
  getConversationHistory(options?: {
    projectPath?: string;
    agentName?: string;
    limit?: number;
    offset?: number;
  }): ConversationEntry[] {
    let query = 'SELECT * FROM conversations WHERE 1=1';
    const params: any[] = [];

    if (options?.projectPath) {
      query += ' AND project_path = ?';
      params.push(options.projectPath);
    }

    if (options?.agentName) {
      query += ' AND agent_name = ?';
      params.push(options.agentName);
    }

    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      projectPath: row.project_path,
      agentName: row.agent_name,
      userInput: row.user_input,
      agentResponse: row.agent_response,
      tokensUsed: row.tokens_used,
      timestamp: new Date(row.timestamp),
      satisfactionRating: row.satisfaction_rating,
      contextHash: row.context_hash,
    }));
  }

  /**
   * Met à jour la satisfaction d'une conversation
   */
  updateSatisfaction(id: number, rating: number): boolean {
    const stmt = this.db.prepare('UPDATE conversations SET satisfaction_rating = ? WHERE id = ?');
    const result = stmt.run(rating, id);
    return result.changes > 0;
  }

  /**
   * Supprime les anciennes conversations
   */
  pruneConversations(daysOld: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM conversations 
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `);
    const result = stmt.run(daysOld);
    return result.changes;
  }

  // ==================== CACHE ====================

  /**
   * Génère un hash pour une requête
   */
  private hashQuery(agentName: string, query: string, context?: string): string {
    const data = `${agentName}:${query}:${context || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Récupère une réponse du cache
   */
  getCachedResponse(agentName: string, query: string, context?: string): CacheEntry | null {
    const hash = this.hashQuery(agentName, query, context);

    const row = this.db.prepare(`
      SELECT * FROM response_cache WHERE query_hash = ?
    `).get(hash) as any;

    if (!row) {
      return null;
    }

    // Mettre à jour le compteur d'accès
    this.db.prepare(`
      UPDATE response_cache 
      SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP 
      WHERE query_hash = ?
    `).run(hash);

    return {
      id: row.id,
      queryHash: row.query_hash,
      agentName: row.agent_name,
      response: row.response,
      contextMetadata: row.context_metadata,
      createdAt: new Date(row.created_at),
      accessCount: row.access_count + 1,
      lastAccessed: new Date(),
    };
  }

  /**
   * Sauvegarde une réponse dans le cache
   */
  cacheResponse(agentName: string, query: string, response: string, context?: string, metadata?: string): void {
    const hash = this.hashQuery(agentName, query, context);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO response_cache (query_hash, agent_name, response, context_metadata, created_at, access_count, last_accessed)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
    `);

    stmt.run(hash, agentName, response, metadata || null);
  }

  /**
   * Invalide le cache pour un agent
   */
  invalidateCache(agentName?: string): number {
    if (agentName) {
      const result = this.db.prepare('DELETE FROM response_cache WHERE agent_name = ?').run(agentName);
      return result.changes;
    }

    const result = this.db.prepare('DELETE FROM response_cache').run();
    return result.changes;
  }

  /**
   * Nettoie le cache ancien
   */
  pruneCache(ttlSeconds: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM response_cache 
      WHERE created_at < datetime('now', '-' || ? || ' seconds')
    `);
    const result = stmt.run(ttlSeconds);
    return result.changes;
  }

  // ==================== CONTEXTE PROJET ====================

  /**
   * Sauvegarde le contexte d'un projet
   */
  saveProjectContext(
    projectPath: string,
    techStack: string[],
    fileStructure: string[],
    dependencies: Record<string, string>,
    conventions?: Record<string, string>
  ): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO project_context (project_path, tech_stack, file_structure, dependencies, conventions, last_updated)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      projectPath,
      JSON.stringify(techStack),
      JSON.stringify(fileStructure),
      JSON.stringify(dependencies),
      JSON.stringify(conventions || {})
    );
  }

  /**
   * Récupère le contexte d'un projet
   */
  getProjectContext(projectPath: string): {
    techStack: string[];
    fileStructure: string[];
    dependencies: Record<string, string>;
    conventions: Record<string, string>;
    lastUpdated: Date;
  } | null {
    const row = this.db.prepare('SELECT * FROM project_context WHERE project_path = ?').get(projectPath) as any;

    if (!row) {
      return null;
    }

    return {
      techStack: JSON.parse(row.tech_stack || '[]'),
      fileStructure: JSON.parse(row.file_structure || '[]'),
      dependencies: JSON.parse(row.dependencies || '{}'),
      conventions: JSON.parse(row.conventions || '{}'),
      lastUpdated: new Date(row.last_updated),
    };
  }

  // ==================== TEMPLATES ====================

  /**
   * Sauvegarde un template personnalisé
   */
  saveTemplate(name: string, agentName: string, content: string, variables?: string[]): number {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO custom_templates (name, agent_name, template_content, variables, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(name, agentName, content, JSON.stringify(variables || []));
    return result.lastInsertRowid as number;
  }

  /**
   * Récupère un template
   */
  getTemplate(name: string): { agentName: string; content: string; variables: string[] } | null {
    const row = this.db.prepare('SELECT * FROM custom_templates WHERE name = ?').get(name) as any;

    if (!row) {
      return null;
    }

    return {
      agentName: row.agent_name,
      content: row.template_content,
      variables: JSON.parse(row.variables || '[]'),
    };
  }

  /**
   * Liste tous les templates
   */
  listTemplates(): { name: string; agentName: string }[] {
    const rows = this.db.prepare('SELECT name, agent_name FROM custom_templates ORDER BY name').all() as any[];
    return rows.map(row => ({ name: row.name, agentName: row.agent_name }));
  }

  /**
   * Supprime un template
   */
  deleteTemplate(name: string): boolean {
    const result = this.db.prepare('DELETE FROM custom_templates WHERE name = ?').run(name);
    return result.changes > 0;
  }

  // ==================== STATISTIQUES ====================

  /**
   * Obtient les statistiques d'utilisation
   */
  getStats(): {
    totalConversations: number;
    totalTokens: number;
    topAgents: { agent: string; count: number }[];
    avgSatisfaction: number;
    cacheHitRate: number;
  } {
    const totalConv = this.db.prepare('SELECT COUNT(*) as count FROM conversations').get() as any;
    const totalTok = this.db.prepare('SELECT COALESCE(SUM(tokens_used), 0) as total FROM conversations').get() as any;
    const topAgents = this.db.prepare(`
      SELECT agent_name as agent, COUNT(*) as count 
      FROM conversations 
      GROUP BY agent_name 
      ORDER BY count DESC 
      LIMIT 10
    `).all() as any[];
    const avgSat = this.db.prepare(`
      SELECT COALESCE(AVG(satisfaction_rating), 0) as avg 
      FROM conversations 
      WHERE satisfaction_rating IS NOT NULL
    `).get() as any;
    const cacheStats = this.db.prepare(`
      SELECT COALESCE(SUM(access_count), 0) as total_hits, COUNT(*) as entries 
      FROM response_cache
    `).get() as any;

    return {
      totalConversations: totalConv.count,
      totalTokens: totalTok.total,
      topAgents: topAgents.map(row => ({ agent: row.agent, count: row.count })),
      avgSatisfaction: avgSat.avg,
      cacheHitRate: cacheStats.entries > 0 ? cacheStats.total_hits / cacheStats.entries : 0,
    };
  }

  /**
   * Ferme la connexion à la base
   */
  close(): void {
    this.db.close();
  }
}

// Instance singleton
let databaseInstance: AgentiumDatabase | null = null;

export function getDatabase(dbPath?: string): AgentiumDatabase {
  if (!databaseInstance) {
    databaseInstance = new AgentiumDatabase(dbPath);
  }
  return databaseInstance;
}

export default AgentiumDatabase;
