#!/usr/bin/env node

/**
 * Agentium CLI - Interface en ligne de commande pour tester les agents
 */

import * as readline from 'readline';
import { 
  getAgentManager, 
  getConfigManager, 
  getCollaborationEngine,
  getDatabase,
  getContextAnalyzer,
  VERSION 
} from '../core';

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  agent: (name: string, msg: string) => console.log(`${colors.cyan}@${name}${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`),
};

async function main() {
  // Afficher le banner
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     █████╗  ██████╗ ███████╗███╗   ██╗████████╗██╗██╗   ██╗  ║
║    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██║██║   ██║  ║
║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ██║██║   ██║  ║
║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ██║╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝ ╚═════╝   ║
║                                                              ║
║           🤖 Extension IA Multi-Agents pour IDEs             ║
║                      Version ${VERSION}                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Initialiser les modules
  log.info('Initialisation des modules...');
  
  const configManager = getConfigManager();
  const agentManager = getAgentManager();
  const collaborationEngine = getCollaborationEngine();
  const database = getDatabase();
  const contextAnalyzer = getContextAnalyzer();

  // Afficher les stats
  const stats = agentManager.getStats();
  log.success(`${stats.total} agents chargés (${stats.enabled} activés)`);
  
  const primaryAPI = configManager.getPrimaryAPI();
  log.info(`API primaire: ${primaryAPI.provider} (${primaryAPI.model})`);

  // Afficher les agents disponibles
  log.header('Agents disponibles:');
  const agents = agentManager.listAgents();
  const agentsByCategory: Record<string, string[]> = {};
  
  for (const agent of agents) {
    if (!agentsByCategory[agent.category]) {
      agentsByCategory[agent.category] = [];
    }
    agentsByCategory[agent.category].push(`@${agent.name} ${agent.icon || ''}`);
  }

  for (const [category, names] of Object.entries(agentsByCategory)) {
    console.log(`  ${colors.yellow}${category}${colors.reset}: ${names.join(', ')}`);
  }

  // Commandes disponibles
  log.header('Commandes:');
  console.log(`  ${colors.green}@agent question${colors.reset}  - Invoquer un agent (ex: @react créer un bouton)`);
  console.log(`  ${colors.green}@a+b+c question${colors.reset}  - Collaboration multi-agents`);
  console.log(`  ${colors.green}list${colors.reset}             - Lister tous les agents`);
  console.log(`  ${colors.green}stats${colors.reset}            - Afficher les statistiques`);
  console.log(`  ${colors.green}test${colors.reset}             - Tester la connexion API`);
  console.log(`  ${colors.green}help${colors.reset}             - Afficher l'aide`);
  console.log(`  ${colors.green}exit${colors.reset}             - Quitter`);

  // Interface readline
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `\n${colors.cyan}agentium>${colors.reset} `,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (!input) {
      rl.prompt();
      return;
    }

    try {
      switch (input.toLowerCase()) {
        case 'exit':
        case 'quit':
        case 'q':
          log.info('Au revoir! 👋');
          database.close();
          process.exit(0);
          break;

        case 'help':
        case '?':
          showHelp();
          break;

        case 'list':
          listAgents(agentManager);
          break;

        case 'stats':
          showStats(agentManager, database);
          break;

        case 'test':
          await testConnection(configManager);
          break;

        default:
          // Invocation d'agent
          if (input.startsWith('@')) {
            await handleAgentInvocation(input, agentManager, collaborationEngine, database);
          } else {
            log.error('Commande non reconnue. Tapez "help" pour l\'aide.');
          }
      }
    } catch (error) {
      log.error(`Erreur: ${error}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    log.info('Au revoir! 👋');
    database.close();
    process.exit(0);
  });
}

function showHelp() {
  log.header('Aide Agentium CLI');
  console.log(`
${colors.bright}Syntaxe d'invocation:${colors.reset}
  @agent question           Invoquer un agent unique
  @agent1+agent2 question   Invoquer plusieurs agents (collaboration)

${colors.bright}Exemples:${colors.reset}
  @react créer un composant Button avec TypeScript
  @nodejs+docker créer une API Express avec Dockerfile
  @sql optimiser cette requête SELECT * FROM users WHERE active = true
  @security analyser ce code pour des vulnérabilités

${colors.bright}Commandes système:${colors.reset}
  list    - Liste tous les agents disponibles
  stats   - Affiche les statistiques d'utilisation
  test    - Teste la connexion à l'API
  help    - Affiche cette aide
  exit    - Quitte l'application
`);
}

function listAgents(agentManager: ReturnType<typeof getAgentManager>) {
  log.header('Liste des agents');
  
  const agents = agentManager.listAgents();
  const categories = [...new Set(agents.map(a => a.category))];

  for (const category of categories) {
    console.log(`\n${colors.yellow}━━━ ${category.toUpperCase()} ━━━${colors.reset}`);
    const categoryAgents = agents.filter(a => a.category === category);
    
    for (const agent of categoryAgents) {
      console.log(`  ${colors.cyan}@${agent.name}${colors.reset} ${agent.icon || ''}`);
      console.log(`    ${colors.dim}Expertise: ${agent.expertise.join(', ')}${colors.reset}`);
      console.log(`    ${colors.dim}Triggers: ${agent.triggers.join(', ')}${colors.reset}`);
    }
  }
}

function showStats(
  agentManager: ReturnType<typeof getAgentManager>,
  database: ReturnType<typeof getDatabase>
) {
  log.header('Statistiques');

  const agentStats = agentManager.getStats();
  const dbStats = database.getStats();

  console.log(`${colors.bright}Agents:${colors.reset}`);
  console.log(`  Total: ${agentStats.total}`);
  console.log(`  Activés: ${agentStats.enabled}`);
  
  console.log(`\n${colors.bright}Base de données:${colors.reset}`);
  console.log(`  Conversations: ${dbStats.totalConversations}`);
  console.log(`  Tokens utilisés: ${dbStats.totalTokens.toLocaleString()}`);
  console.log(`  Satisfaction moyenne: ${dbStats.avgSatisfaction.toFixed(1)}/5`);

  if (dbStats.topAgents.length > 0) {
    console.log(`\n${colors.bright}Top agents:${colors.reset}`);
    for (const { agent, count } of dbStats.topAgents.slice(0, 5)) {
      console.log(`  @${agent}: ${count} invocations`);
    }
  }
}

async function testConnection(configManager: ReturnType<typeof getConfigManager>) {
  log.info('Test de connexion API...');
  
  const { getAPIHandler } = await import('../core/api-handler');
  const apiHandler = getAPIHandler(configManager);
  
  const result = await apiHandler.testConnection();
  
  if (result.success) {
    log.success(`Connexion réussie! Latence: ${result.latency}ms`);
  } else {
    log.error(`Échec de connexion: ${result.error}`);
  }
}

async function handleAgentInvocation(
  input: string,
  agentManager: ReturnType<typeof getAgentManager>,
  collaborationEngine: ReturnType<typeof getCollaborationEngine>,
  database: ReturnType<typeof getDatabase>
) {
  const parsed = agentManager.parseInvocation(input);
  
  if (!parsed) {
    log.error('Format invalide. Utilisez: @agent votre question');
    return;
  }

  const { agents, query } = parsed;
  
  console.log(`\n${colors.dim}Traitement en cours...${colors.reset}`);
  const startTime = Date.now();

  if (agents.length > 1) {
    // Collaboration multi-agents
    log.info(`Collaboration: ${agents.map(a => `@${a}`).join(' + ')}`);
    
    const result = await collaborationEngine.collaborate(agents, query);
    
    console.log(`\n${colors.bright}═══ Résultat de la collaboration ═══${colors.reset}\n`);
    console.log(result.mergedResult);
    console.log(`\n${colors.dim}Temps: ${result.totalProcessingTime}ms | Status: ${result.status}${colors.reset}`);

    // Sauvegarder dans l'historique
    database.saveConversation({
      projectPath: process.cwd(),
      agentName: agents.join('+'),
      userInput: query,
      agentResponse: result.mergedResult,
      tokensUsed: result.responses.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
      timestamp: new Date(),
    });
  } else {
    // Agent unique
    const response = await agentManager.invokeAgent({
      agentName: agents[0],
      query,
    });

    console.log(`\n${colors.cyan}@${response.agentName}${colors.reset} ${colors.dim}(${response.provider}, ${response.processingTime}ms)${colors.reset}\n`);
    console.log(response.content);

    // Sauvegarder dans l'historique
    database.saveConversation({
      projectPath: process.cwd(),
      agentName: response.agentName,
      userInput: query,
      agentResponse: response.content,
      tokensUsed: response.tokensUsed || 0,
      timestamp: new Date(),
    });
  }
}

// Exécuter
main().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
