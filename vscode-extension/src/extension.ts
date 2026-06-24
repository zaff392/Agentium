/**
 * Agentium VS Code Extension
 * Extension principale avec 50 agents IA spécialisés
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

// Types
interface AgentDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  expertise: string[];
  skills: string[];
  triggers: string[];
  icon?: string;
  systemPrompt: string;
}

interface AgentRegistry {
  version: string;
  agents: AgentDefinition[];
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Global state
let agentRegistry: AgentRegistry | null = null;
let chatPanel: vscode.WebviewPanel | undefined;
let conversationHistory: ConversationMessage[] = [];
let statusBarItem: vscode.StatusBarItem;

/**
 * Activation de l'extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Agentium extension is now active!');

  // Charger le registre d'agents
  loadAgentRegistry(context);

  // Créer la status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(hubot) Agentium';
  statusBarItem.tooltip = 'Click to open Agentium chat';
  statusBarItem.command = 'agentium.openChat';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Enregistrer les commandes
  const commands = [
    vscode.commands.registerCommand('agentium.invokeAgent', () => invokeAgentCommand(context)),
    vscode.commands.registerCommand('agentium.listAgents', () => listAgentsCommand()),
    vscode.commands.registerCommand('agentium.openChat', () => openChatPanel(context)),
    vscode.commands.registerCommand('agentium.analyzeCode', () => analyzeCodeCommand(context)),
    vscode.commands.registerCommand('agentium.suggestAgent', () => suggestAgentCommand()),
    vscode.commands.registerCommand('agentium.configure', () => openSettings()),
    vscode.commands.registerCommand('agentium.insertCode', (code: string) => insertCode(code)),
    vscode.commands.registerCommand('agentium.explainCode', () => explainCodeCommand(context)),
  ];

  context.subscriptions.push(...commands);

  // Enregistrer les providers de vues
  const agentsTreeProvider = new AgentsTreeProvider();
  vscode.window.registerTreeDataProvider('agentium.agentsList', agentsTreeProvider);

  const historyTreeProvider = new HistoryTreeProvider();
  vscode.window.registerTreeDataProvider('agentium.history', historyTreeProvider);

  // Provider d'autocomplétion pour @agent
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        if (!linePrefix.endsWith('@')) {
          return undefined;
        }

        if (!agentRegistry) return undefined;

        return agentRegistry.agents.map(agent => {
          const item = new vscode.CompletionItem(agent.name, vscode.CompletionItemKind.Function);
          item.detail = `${agent.icon || '🤖'} ${agent.description}`;
          item.documentation = new vscode.MarkdownString(
            `**${agent.name}** - ${agent.category}\n\n${agent.description}\n\n**Expertise:** ${agent.expertise.join(', ')}`
          );
          item.insertText = agent.name + ' ';
          return item;
        });
      }
    },
    '@'
  );
  context.subscriptions.push(completionProvider);

  // Message de bienvenue au premier lancement
  const hasShownWelcome = context.globalState.get('agentium.welcomeShown');
  if (!hasShownWelcome) {
    showWelcomeMessage();
    context.globalState.update('agentium.welcomeShown', true);
  }
}

/**
 * Désactivation de l'extension
 */
export function deactivate() {
  if (chatPanel) {
    chatPanel.dispose();
  }
}

/**
 * Charge le registre d'agents
 */
function loadAgentRegistry(context: vscode.ExtensionContext) {
  try {
    // Chercher le registre dans plusieurs emplacements
    const possiblePaths = [
      path.join(context.extensionPath, 'agents', 'agents-registry.json'),
      path.join(context.extensionPath, '..', 'agents', 'agents-registry.json'),
      path.join(__dirname, '..', '..', 'agents', 'agents-registry.json'),
    ];

    for (const registryPath of possiblePaths) {
      if (fs.existsSync(registryPath)) {
        const content = fs.readFileSync(registryPath, 'utf-8');
        agentRegistry = JSON.parse(content);
        console.log(`Loaded ${agentRegistry?.agents.length} agents from registry`);
        return;
      }
    }

    // Fallback: registre intégré minimal
    console.warn('Agent registry not found, using built-in minimal registry');
    agentRegistry = getBuiltInRegistry();
  } catch (error) {
    console.error('Error loading agent registry:', error);
    agentRegistry = getBuiltInRegistry();
  }
}

/**
 * Registre intégré minimal en fallback
 */
function getBuiltInRegistry(): AgentRegistry {
  return {
    version: '1.0.0',
    agents: [
      {
        id: 'react',
        name: 'react',
        category: 'frontend',
        description: 'Expert React et écosystème moderne',
        expertise: ['React', 'Hooks', 'TypeScript'],
        skills: ['Components', 'State management'],
        triggers: ['react', 'reactjs'],
        icon: '⚛️',
        systemPrompt: 'Tu es un expert React senior...'
      },
      {
        id: 'python',
        name: 'python',
        category: 'backend',
        description: 'Expert Python fullstack',
        expertise: ['Python', 'Django', 'FastAPI'],
        skills: ['API backend', 'Data processing'],
        triggers: ['python', 'py'],
        icon: '🐍',
        systemPrompt: 'Tu es un expert Python fullstack...'
      }
    ]
  };
}

/**
 * Commande: Invoquer un agent
 */
async function invokeAgentCommand(context: vscode.ExtensionContext) {
  if (!agentRegistry) return;

  // Afficher la liste des agents pour sélection
  const agentItems = agentRegistry.agents.map(agent => ({
    label: `${agent.icon || '🤖'} @${agent.name}`,
    description: agent.category,
    detail: agent.description,
    agent: agent
  }));

  const selected = await vscode.window.showQuickPick(agentItems, {
    placeHolder: 'Sélectionnez un agent...',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (!selected) return;

  // Demander la requête
  const query = await vscode.window.showInputBox({
    placeHolder: `Posez votre question à @${selected.agent.name}...`,
    prompt: `Agent: ${selected.agent.description}`
  });

  if (!query) return;

  // Ouvrir le chat et envoyer la requête
  openChatPanel(context);
  await sendMessage(selected.agent, query, context);
}

/**
 * Commande: Lister tous les agents
 */
function listAgentsCommand() {
  if (!agentRegistry) {
    vscode.window.showErrorMessage('Agent registry not loaded');
    return;
  }

  // Grouper par catégorie
  const byCategory = new Map<string, AgentDefinition[]>();
  for (const agent of agentRegistry.agents) {
    const list = byCategory.get(agent.category) || [];
    list.push(agent);
    byCategory.set(agent.category, list);
  }

  // Créer le contenu markdown
  let markdown = '# Agentium - 50 Agents IA\n\n';
  for (const [category, agents] of byCategory) {
    markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    for (const agent of agents) {
      markdown += `- **@${agent.name}** ${agent.icon || ''} - ${agent.description}\n`;
    }
    markdown += '\n';
  }

  // Afficher dans un nouveau document
  vscode.workspace.openTextDocument({ content: markdown, language: 'markdown' })
    .then(doc => vscode.window.showTextDocument(doc));
}

/**
 * Ouvre le panneau de chat
 */
function openChatPanel(context: vscode.ExtensionContext) {
  if (chatPanel) {
    chatPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  chatPanel = vscode.window.createWebviewPanel(
    'agentiumChat',
    'Agentium Chat',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  chatPanel.webview.html = getChatWebviewContent();

  // Gérer les messages du webview
  chatPanel.webview.onDidReceiveMessage(
    async message => {
      switch (message.command) {
        case 'sendMessage':
          const agent = findAgent(message.agent);
          if (agent) {
            await sendMessage(agent, message.text, context);
          }
          break;
        case 'insertCode':
          insertCode(message.code);
          break;
        case 'copyCode':
          vscode.env.clipboard.writeText(message.code);
          vscode.window.showInformationMessage('Code copied to clipboard!');
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  chatPanel.onDidDispose(() => {
    chatPanel = undefined;
  });

  // Envoyer la liste des agents au webview
  if (agentRegistry) {
    chatPanel.webview.postMessage({
      command: 'setAgents',
      agents: agentRegistry.agents
    });
  }
}

/**
 * Trouve un agent par nom ou trigger
 */
function findAgent(name: string): AgentDefinition | undefined {
  if (!agentRegistry) return undefined;
  const searchName = name.toLowerCase().replace('@', '');
  return agentRegistry.agents.find(
    a => a.name.toLowerCase() === searchName ||
         a.triggers.some(t => t.toLowerCase() === searchName)
  );
}

/**
 * Envoie un message à l'API et met à jour le chat
 */
async function sendMessage(agent: AgentDefinition, query: string, context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('agentium');
  const apiKey = config.get<string>('apiKey') || process.env.GROK_API_KEY || '';
  const provider = config.get<string>('apiProvider') || 'grok';
  const model = config.get<string>('model') || 'grok-2-latest';
  const timeout = config.get<number>('timeout') || 30000;

  if (!apiKey) {
    vscode.window.showErrorMessage(
      'API key not configured. Please set it in Agentium settings.',
      'Open Settings'
    ).then(selection => {
      if (selection === 'Open Settings') {
        openSettings();
      }
    });
    return;
  }

  // Ajouter à l'historique
  conversationHistory.push({ role: 'user', content: query });

  // Notifier le webview que le chargement commence
  chatPanel?.webview.postMessage({
    command: 'loading',
    agent: agent.name
  });

  // Mettre à jour la status bar
  statusBarItem.text = '$(loading~spin) Thinking...';

  try {
    // Obtenir le contexte du fichier actif
    const editor = vscode.window.activeTextEditor;
    let fileContext = '';
    if (editor) {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        fileContext = `\n\nCode sélectionné:\n\`\`\`${editor.document.languageId}\n${editor.document.getText(selection)}\n\`\`\``;
      } else {
        fileContext = `\n\nFichier actuel: ${editor.document.fileName} (${editor.document.languageId})`;
      }
    }

    const messages = [
      { role: 'system', content: agent.systemPrompt + fileContext },
      ...conversationHistory
    ];

    // Appel API selon le provider
    const response = await callAPI(provider, apiKey, model, messages, timeout);

    // Ajouter la réponse à l'historique
    conversationHistory.push({ role: 'assistant', content: response });

    // Envoyer au webview
    chatPanel?.webview.postMessage({
      command: 'response',
      agent: agent.name,
      icon: agent.icon,
      content: response
    });

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    vscode.window.showErrorMessage(`Agentium error: ${errorMessage}`);
    chatPanel?.webview.postMessage({
      command: 'error',
      message: errorMessage
    });
  } finally {
    statusBarItem.text = '$(hubot) Agentium';
  }
}

/**
 * Appel API unifié pour différents providers
 */
async function callAPI(
  provider: string,
  apiKey: string,
  model: string,
  messages: ConversationMessage[],
  timeout: number
): Promise<string> {
  const endpoints: Record<string, string> = {
    grok: 'https://api.x.ai/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages'
  };

  const endpoint = endpoints[provider] || endpoints.grok;

  // Format spécial pour Anthropic
  if (provider === 'anthropic') {
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    const response = await axios.post(
      endpoint,
      {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: systemMessage?.content || '',
        messages: otherMessages.map(m => ({ role: m.role, content: m.content }))
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        timeout
      }
    );

    return response.data.content[0].text;
  }

  // Format OpenAI/Grok
  const response = await axios.post(
    endpoint,
    {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 4000
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * Analyse le code sélectionné
 */
async function analyzeCodeCommand(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('Please select some code to analyze');
    return;
  }

  const selectedCode = editor.document.getText(selection);
  const language = editor.document.languageId;

  // Trouver l'agent approprié
  const agent = suggestAgentForLanguage(language);
  if (!agent) {
    vscode.window.showErrorMessage('No suitable agent found for this language');
    return;
  }

  openChatPanel(context);
  const query = `Analyse ce code ${language} et suggère des améliorations:\n\n\`\`\`${language}\n${selectedCode}\n\`\`\``;
  await sendMessage(agent, query, context);
}

/**
 * Explique le code sélectionné
 */
async function explainCodeCommand(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('Please select some code to explain');
    return;
  }

  const selectedCode = editor.document.getText(editor.selection);
  const language = editor.document.languageId;
  const agent = suggestAgentForLanguage(language);

  if (!agent) return;

  openChatPanel(context);
  const query = `Explique ce code en détail:\n\n\`\`\`${language}\n${selectedCode}\n\`\`\``;
  await sendMessage(agent, query, context);
}

/**
 * Suggère un agent pour le fichier courant
 */
function suggestAgentCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const language = editor.document.languageId;
  const agent = suggestAgentForLanguage(language);

  if (agent) {
    vscode.window.showInformationMessage(
      `Suggested agent for ${language}: @${agent.name} ${agent.icon || ''}`,
      'Use this agent'
    ).then(selection => {
      if (selection) {
        vscode.commands.executeCommand('agentium.invokeAgent');
      }
    });
  } else {
    vscode.window.showInformationMessage(
      `No specific agent for ${language}. Try @codereviewer for general assistance.`
    );
  }
}

/**
 * Suggère un agent basé sur le langage
 */
function suggestAgentForLanguage(language: string): AgentDefinition | undefined {
  if (!agentRegistry) return undefined;

  const languageToAgent: Record<string, string> = {
    'typescript': 'react',
    'typescriptreact': 'react',
    'javascript': 'nodejs',
    'javascriptreact': 'react',
    'python': 'python',
    'java': 'java',
    'csharp': 'csharp',
    'go': 'go',
    'rust': 'rust',
    'php': 'php',
    'ruby': 'ruby',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'dart': 'flutter',
    'vue': 'vue',
    'svelte': 'svelte',
    'css': 'css',
    'scss': 'css',
    'html': 'responsive',
    'sql': 'sql',
    'dockerfile': 'docker',
    'yaml': 'cicd',
    'json': 'nodejs',
    'markdown': 'documentation'
  };

  const agentName = languageToAgent[language];
  if (agentName) {
    return agentRegistry.agents.find(a => a.name === agentName);
  }

  return agentRegistry.agents.find(a => a.name === 'codereviewer');
}

/**
 * Insère du code à la position du curseur
 */
function insertCode(code: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  editor.edit(editBuilder => {
    editBuilder.insert(editor.selection.active, code);
  });
}

/**
 * Ouvre les paramètres de l'extension
 */
function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'agentium');
}

/**
 * Affiche le message de bienvenue
 */
function showWelcomeMessage() {
  vscode.window.showInformationMessage(
    '🤖 Welcome to Agentium! 50 AI agents are ready to help you code.',
    'Open Chat (Ctrl+Shift+A)',
    'View Agents',
    'Configure'
  ).then(selection => {
    switch (selection) {
      case 'Open Chat (Ctrl+Shift+A)':
        vscode.commands.executeCommand('agentium.openChat');
        break;
      case 'View Agents':
        vscode.commands.executeCommand('agentium.listAgents');
        break;
      case 'Configure':
        openSettings();
        break;
    }
  });
}

/**
 * Contenu HTML du webview chat
 */
function getChatWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agentium Chat</title>
  <style>
    :root {
      --bg-primary: #1e1e1e;
      --bg-secondary: #252526;
      --bg-tertiary: #2d2d30;
      --text-primary: #cccccc;
      --text-secondary: #9d9d9d;
      --accent: #007acc;
      --accent-hover: #1a8ad4;
      --border: #3c3c3c;
      --success: #4ec9b0;
      --error: #f14c4c;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header h1 {
      font-size: 14px;
      font-weight: 600;
    }

    .agent-select {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      outline: none;
    }

    .agent-select:hover {
      border-color: var(--button-bg);
    }

    .agent-select:focus-visible {
      border-color: var(--button-bg);
      box-shadow: 0 0 0 1px var(--button-bg);
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 8px;
      line-height: 1.5;
    }

    .message.user {
      background: var(--accent);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .message.assistant {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .message pre {
      background: var(--bg-primary);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 8px 0;
      position: relative;
    }

    .message code {
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
    }

    .code-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
    }

    .code-actions button {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .code-actions button:hover {
      background: var(--accent);
      color: white;
    }

    .input-area {
      padding: 16px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
    }

    .input-wrapper {
      display: flex;
      gap: 8px;
    }

    .input-wrapper textarea {
      flex: 1;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 12px;
      border-radius: 6px;
      font-size: 14px;
      resize: none;
      min-height: 44px;
      max-height: 120px;
    }

    .input-wrapper textarea:focus {
      outline: none;
      border-color: var(--accent);
    }

    .input-wrapper textarea:focus-visible {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }

    .input-wrapper button {
      background: var(--accent);
      border: none;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .input-wrapper button:hover {
      background: var(--accent-hover);
    }

    .input-wrapper button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      font-size: 13px;
    }

    .loading-dots {
      display: flex;
      gap: 4px;
    }

    .loading-dots span {
      width: 6px;
      height: 6px;
      background: var(--accent);
      border-radius: 50%;
      animation: bounce 1.4s infinite both;
    }

    .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
    .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      text-align: center;
      padding: 32px;
    }

    .empty-state h2 {
      font-size: 18px;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .empty-state p {
      font-size: 14px;
      max-width: 300px;
    }

    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .quick-actions button {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .quick-actions button:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 Agentium Chat</h1>
    <select class="agent-select" id="agentSelect" aria-label="Select an agent">
      <option value="">Select an agent...</option>
    </select>
  </div>

  <div class="messages" id="messages">
    <div class="empty-state" id="emptyState">
      <h2>👋 Welcome to Agentium</h2>
      <p>50 AI agents are ready to help you code. Select an agent and start chatting!</p>
      <div class="quick-actions">
        <button onclick="selectAgent('react')">⚛️ React</button>
        <button onclick="selectAgent('python')">🐍 Python</button>
        <button onclick="selectAgent('docker')">🐳 Docker</button>
        <button onclick="selectAgent('sql')">🗄️ SQL</button>
        <button onclick="selectAgent('security')">🛡️ Security</button>
      </div>
    </div>
  </div>

  <div class="input-area">
    <div class="input-wrapper">
      <textarea
        id="input"
        aria-label="Message input"
        placeholder="Type your message... (Use @agent or select from dropdown)"
        rows="1"
        onkeydown="handleKeydown(event)"
      ></textarea>
      <button onclick="send()" id="sendBtn">Send</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let agents = [];
    let isLoading = false;

    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.command) {
        case 'setAgents':
          agents = message.agents;
          populateAgentSelect();
          break;
        case 'loading':
          showLoading(message.agent);
          break;
        case 'response':
          hideLoading();
          addMessage('assistant', message.content, message.agent, message.icon);
          break;
        case 'error':
          hideLoading();
          addMessage('assistant', '❌ Error: ' + message.message);
          break;
      }
    });

    function populateAgentSelect() {
      const select = document.getElementById('agentSelect');
      select.innerHTML = '<option value="">Select an agent...</option>';

      // Group by category
      const byCategory = {};
      agents.forEach(agent => {
        if (!byCategory[agent.category]) byCategory[agent.category] = [];
        byCategory[agent.category].push(agent);
      });

      for (const [category, catAgents] of Object.entries(byCategory)) {
        const group = document.createElement('optgroup');
        group.label = category.charAt(0).toUpperCase() + category.slice(1);
        catAgents.forEach(agent => {
          const option = document.createElement('option');
          option.value = agent.name;
          option.textContent = (agent.icon || '🤖') + ' @' + agent.name;
          group.appendChild(option);
        });
        select.appendChild(group);
      }
    }

    function selectAgent(name) {
      document.getElementById('agentSelect').value = name;
      document.getElementById('input').focus();
    }

    function send() {
      const input = document.getElementById('input');
      const select = document.getElementById('agentSelect');
      const text = input.value.trim();

      if (!text || isLoading) return;

      // Parse @agent from text or use select
      let agent = select.value;
      let query = text;

      const match = text.match(/^@(\w+)\s+(.+)$/s);
      if (match) {
        agent = match[1];
        query = match[2];
      }

      if (!agent) {
        alert('Please select an agent or use @agent syntax');
        return;
      }

      // Hide empty state
      document.getElementById('emptyState')?.remove();

      // Add user message
      addMessage('user', query);

      // Send to extension
      vscode.postMessage({
        command: 'sendMessage',
        agent: agent,
        text: query
      });

      input.value = '';
      input.style.height = 'auto';
    }

    function addMessage(role, content, agent, icon) {
      const messages = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = 'message ' + role;

      if (role === 'assistant' && agent) {
        div.innerHTML = '<div class="message-header">' + (icon || '🤖') + ' @' + agent + '</div>';
      }

      // Process content: convert markdown code blocks
      let processedContent = content;
      processedContent = processedContent.replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        (match, lang, code) => {
          const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return '<pre><code class="language-' + (lang || 'text') + '">' + escapedCode + '</code>' +
            '<div class="code-actions">' +
            '<button onclick="copyCode(this)">Copy</button>' +
            '<button onclick="insertCode(this)">Insert</button>' +
            '</div></pre>';
        }
      );

      // Convert inline code
      processedContent = processedContent.replace(/`([^`]+)`/g, '<code>$1</code>');

      // Convert newlines
      processedContent = processedContent.replace(/\n/g, '<br>');

      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = processedContent;
      div.appendChild(contentDiv);

      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function showLoading(agent) {
      isLoading = true;
      document.getElementById('sendBtn').disabled = true;

      const messages = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = 'message assistant';
      div.id = 'loadingMessage';
      div.innerHTML = '<div class="loading"><div class="loading-dots"><span></span><span></span><span></span></div> @' + agent + ' is thinking...</div>';
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function hideLoading() {
      isLoading = false;
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('loadingMessage')?.remove();
    }

    function copyCode(button) {
      const code = button.parentElement.previousElementSibling.textContent;
      vscode.postMessage({ command: 'copyCode', code: code });
      button.textContent = 'Copied!';
      setTimeout(() => button.textContent = 'Copy', 1500);
    }

    function insertCode(button) {
      const code = button.parentElement.previousElementSibling.textContent;
      vscode.postMessage({ command: 'insertCode', code: code });
    }

    function handleKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    }

    // Auto-resize textarea
    document.getElementById('input').addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  </script>
</body>
</html>`;
}

/**
 * Provider pour la vue arborescente des agents
 */
class AgentsTreeProvider implements vscode.TreeDataProvider<AgentTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<AgentTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: AgentTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AgentTreeItem): Thenable<AgentTreeItem[]> {
    if (!agentRegistry) return Promise.resolve([]);

    if (!element) {
      // Root: return categories
      const categories = [...new Set(agentRegistry.agents.map(a => a.category))];
      return Promise.resolve(
        categories.map(cat => new AgentTreeItem(
          cat.charAt(0).toUpperCase() + cat.slice(1),
          vscode.TreeItemCollapsibleState.Collapsed,
          cat
        ))
      );
    } else {
      // Return agents in category
      const agents = agentRegistry.agents.filter(a => a.category === element.category);
      return Promise.resolve(
        agents.map(agent => new AgentTreeItem(
          `${agent.icon || '🤖'} @${agent.name}`,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          agent
        ))
      );
    }
  }
}

class AgentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly category?: string,
    public readonly agent?: AgentDefinition
  ) {
    super(label, collapsibleState);

    if (agent) {
      this.tooltip = agent.description;
      this.description = agent.category;
      this.command = {
        command: 'agentium.invokeAgent',
        title: 'Invoke Agent'
      };
    }
  }
}

/**
 * Provider pour l'historique
 */
class HistoryTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    const items = conversationHistory
      .filter(m => m.role === 'user')
      .slice(-10)
      .reverse()
      .map((m, i) => {
        const item = new vscode.TreeItem(m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''));
        item.description = 'User message';
        return item;
      });
    return Promise.resolve(items);
  }
}
