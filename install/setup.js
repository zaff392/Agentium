#!/usr/bin/env node

/**
 * Agentium Installation Script
 * Script d'installation universel pour Agentium
 * 
 * Usage: npx skill-ia-agents setup
 *        npx skill-ia-agents setup --ide=vscode
 *        npx skill-ia-agents setup --api-key=xai-xxx
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Configuration
const CONFIG_DIR = path.join(os.homedir(), '.skill-ia-agents');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const PACKAGE_ROOT = path.join(__dirname, '..');

// Configuration par défaut
const DEFAULT_CONFIG = {
  version: '1.0.0',
  apis: {
    primary: {
      provider: 'grok',
      apiKey: '',
      model: 'grok-2-latest',
      endpoint: 'https://api.x.ai/v1/chat/completions',
      timeout: 30000,
      enabled: true
    },
    fallbacks: [
      {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4-turbo',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        timeout: 30000,
        enabled: false
      },
      {
        provider: 'anthropic',
        apiKey: '',
        model: 'claude-3-5-sonnet-20241022',
        endpoint: 'https://api.anthropic.com/v1/messages',
        timeout: 30000,
        enabled: false
      }
    ]
  },
  agents: {
    enabled: ['*'],
    disabled: [],
    customPrompts: {}
  },
  ui: {
    theme: 'auto',
    position: 'right',
    autoSuggest: true,
    inlineCompletion: true
  },
  collaboration: {
    maxAgents: 5,
    timeout: 60000
  },
  cache: {
    enabled: true,
    ttl: 3600
  }
};

// Chemins des extensions VS Code par OS
const VSCODE_EXTENSION_PATHS = {
  win32: [
    path.join(os.homedir(), '.vscode', 'extensions'),
    path.join(os.homedir(), '.vscode-insiders', 'extensions'),
    path.join(process.env.APPDATA || '', 'Code', 'User', 'extensions'),
  ],
  darwin: [
    path.join(os.homedir(), '.vscode', 'extensions'),
    path.join(os.homedir(), '.vscode-insiders', 'extensions'),
  ],
  linux: [
    path.join(os.homedir(), '.vscode', 'extensions'),
    path.join(os.homedir(), '.vscode-server', 'extensions'),
    path.join(os.homedir(), '.vscode-insiders', 'extensions'),
  ]
};

// Utilitaires
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.blue}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function showBanner() {
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║                                                                ║
║     ${colors.bright}🤖 AGENTIUM - 50 AI Agents for Developers${colors.cyan}                ║
║                                                                ║
║     ${colors.reset}${colors.cyan}Universal IDE Extension with Specialized AI Agents        ║
║                                                                ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

function showSuccessBanner() {
  console.log(`
${colors.green}╔══════════════════════════════════════════════════════════════╗
║                                                                ║
║   ${colors.bright}✓ Agentium installed successfully!${colors.green}                        ║
║                                                                ║
║   ${colors.reset}${colors.green}50 AI agents are ready to help you code.                   ║
║                                                                ║
║   ${colors.cyan}Quick start:${colors.green}                                                ║
║   • Open VS Code and press ${colors.bright}Ctrl+Shift+A${colors.green} to open chat        ║
║   • Type ${colors.bright}@react${colors.green} to invoke the React agent                   ║
║   • Try ${colors.bright}@python${colors.green}, ${colors.bright}@docker${colors.green}, ${colors.bright}@security${colors.green} and more!              ║
║                                                                ║
║   ${colors.cyan}Documentation:${colors.green} https://github.com/agentium/agentium        ║
║                                                                ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

// Détection de l'OS
function detectOS() {
  const platform = os.platform();
  const osInfo = {
    platform,
    name: 'Unknown',
    version: os.release(),
    arch: os.arch(),
    homeDir: os.homedir()
  };

  switch (platform) {
    case 'win32':
      osInfo.name = 'Windows';
      break;
    case 'darwin':
      osInfo.name = 'macOS';
      break;
    case 'linux':
      osInfo.name = 'Linux';
      // Essayer de détecter la distribution
      try {
        if (fs.existsSync('/etc/os-release')) {
          const release = fs.readFileSync('/etc/os-release', 'utf8');
          const match = release.match(/PRETTY_NAME="([^"]+)"/);
          if (match) osInfo.name = match[1];
        }
      } catch (e) {}
      break;
  }

  return osInfo;
}

// Détection des IDEs installés
function detectIDEs() {
  const ides = [];
  const platform = os.platform();

  // VS Code
  const vscodePaths = {
    win32: ['C:\\Program Files\\Microsoft VS Code\\Code.exe', 'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'],
    darwin: ['/Applications/Visual Studio Code.app'],
    linux: ['/usr/share/code', '/usr/bin/code', '/snap/bin/code']
  };

  for (const vscodePath of (vscodePaths[platform] || [])) {
    if (fs.existsSync(vscodePath)) {
      ides.push({ name: 'VS Code', path: vscodePath, type: 'vscode' });
      break;
    }
  }

  // Vérifier si code est dans le PATH
  try {
    execSync('code --version', { stdio: 'pipe' });
    if (!ides.find(i => i.type === 'vscode')) {
      ides.push({ name: 'VS Code', path: 'code', type: 'vscode' });
    }
  } catch (e) {}

  // Cursor
  const cursorPaths = {
    win32: [path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Cursor', 'Cursor.exe')],
    darwin: ['/Applications/Cursor.app'],
    linux: ['/usr/bin/cursor', path.join(os.homedir(), '.local', 'bin', 'cursor')]
  };

  for (const cursorPath of (cursorPaths[platform] || [])) {
    if (fs.existsSync(cursorPath)) {
      ides.push({ name: 'Cursor', path: cursorPath, type: 'cursor' });
      break;
    }
  }

  return ides;
}

// Vérification de Node.js
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  
  if (major < 18) {
    logError(`Node.js 18+ required. Current version: ${version}`);
    return false;
  }
  
  logSuccess(`Node.js ${version} detected`);
  return true;
}

// Création du répertoire de configuration
function createConfigDirectory() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    logSuccess(`Created config directory: ${CONFIG_DIR}`);
  }
}

// Création du fichier de configuration
function createConfig(apiKey = '') {
  const config = { ...DEFAULT_CONFIG };
  
  if (apiKey) {
    config.apis.primary.apiKey = apiKey;
  }

  // Vérifier si une config existe déjà
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      // Merger avec la config existante
      config.apis.primary.apiKey = existingConfig.apis?.primary?.apiKey || apiKey;
      logSuccess('Existing configuration found and merged');
    } catch (e) {
      logWarning('Could not read existing config, creating new one');
    }
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  logSuccess(`Configuration saved to: ${CONFIG_FILE}`);
  
  return config;
}

// Installation de l'extension VS Code
async function installVSCodeExtension() {
  const platform = os.platform();
  const extensionPaths = VSCODE_EXTENSION_PATHS[platform] || VSCODE_EXTENSION_PATHS.linux;
  
  let installed = false;
  
  for (const extPath of extensionPaths) {
    if (fs.existsSync(path.dirname(extPath)) || extPath.includes('.vscode')) {
      try {
        const targetDir = path.join(extPath, 'agentium-vscode-1.0.0');
        const sourceDir = path.join(PACKAGE_ROOT, 'vscode-extension');
        
        // Créer le dossier extensions s'il n'existe pas
        if (!fs.existsSync(extPath)) {
          fs.mkdirSync(extPath, { recursive: true });
        }
        
        // Copier l'extension
        if (fs.existsSync(sourceDir)) {
          copyDirectory(sourceDir, targetDir);
          
          // Copier aussi le registre d'agents
          const agentsRegistrySource = path.join(PACKAGE_ROOT, 'agents', 'agents-registry.json');
          const agentsRegistryTarget = path.join(targetDir, 'agents', 'agents-registry.json');
          
          if (fs.existsSync(agentsRegistrySource)) {
            fs.mkdirSync(path.dirname(agentsRegistryTarget), { recursive: true });
            fs.copyFileSync(agentsRegistrySource, agentsRegistryTarget);
          }
          
          logSuccess(`Extension installed to: ${targetDir}`);
          installed = true;
          break;
        }
      } catch (e) {
        logWarning(`Could not install to ${extPath}: ${e.message}`);
      }
    }
  }
  
  // Essayer avec la commande code
  if (!installed) {
    try {
      const vsixPath = path.join(PACKAGE_ROOT, 'vscode-extension');
      if (fs.existsSync(vsixPath)) {
        execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
        logSuccess('Extension installed via VS Code CLI');
        installed = true;
      }
    } catch (e) {
      logWarning('Could not install via VS Code CLI');
    }
  }
  
  return installed;
}

// Copie récursive de répertoire
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Installation des dépendances npm
function installDependencies() {
  try {
    log('Installing npm dependencies...', 'cyan');
    execSync('npm install', { cwd: PACKAGE_ROOT, stdio: 'inherit' });
    logSuccess('Dependencies installed');
    return true;
  } catch (e) {
    logError(`Failed to install dependencies: ${e.message}`);
    return false;
  }
}

// Test de connexion API
async function testAPIConnection(apiKey, provider = 'grok') {
  if (!apiKey) {
    logWarning('No API key provided, skipping connection test');
    return true;
  }

  try {
    const axios = require('axios');
    const endpoints = {
      grok: 'https://api.x.ai/v1/models',
      openai: 'https://api.openai.com/v1/models',
    };

    const endpoint = endpoints[provider] || endpoints.grok;
    
    const response = await axios.get(endpoint, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 10000
    });

    if (response.status === 200) {
      logSuccess(`API connection successful (${provider})`);
      return true;
    }
  } catch (e) {
    if (e.response?.status === 401) {
      logError('Invalid API key');
    } else {
      logWarning(`Could not verify API connection: ${e.message}`);
    }
  }
  return false;
}

// Interface readline pour les prompts
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function askQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

// Parser les arguments CLI
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ide: null,
    apiKey: null,
    skipPrompts: false,
    help: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--skip-prompts' || arg === '-y') {
      options.skipPrompts = true;
    } else if (arg.startsWith('--ide=')) {
      options.ide = arg.split('=')[1];
    } else if (arg.startsWith('--api-key=')) {
      options.apiKey = arg.split('=')[1];
    }
  }

  return options;
}

// Afficher l'aide
function showHelp() {
  console.log(`
${colors.bright}Agentium Setup${colors.reset}

Usage: npx skill-ia-agents setup [options]

Options:
  --ide=<ide>       Target IDE (vscode, cursor, all)
  --api-key=<key>   Set API key during installation
  --skip-prompts    Skip interactive prompts
  -y                Same as --skip-prompts
  --help, -h        Show this help message

Examples:
  npx skill-ia-agents setup
  npx skill-ia-agents setup --ide=vscode
  npx skill-ia-agents setup --api-key=xai-xxx --skip-prompts
`);
}

// Afficher les agents disponibles
function showAgentsList() {
  const registryPath = path.join(PACKAGE_ROOT, 'agents', 'agents-registry.json');
  
  if (!fs.existsSync(registryPath)) {
    logWarning('Agent registry not found');
    return;
  }

  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    
    console.log(`\n${colors.bright}Available Agents (${registry.agents.length}):${colors.reset}\n`);
    
    const byCategory = {};
    for (const agent of registry.agents) {
      if (!byCategory[agent.category]) byCategory[agent.category] = [];
      byCategory[agent.category].push(agent);
    }

    for (const [category, agents] of Object.entries(byCategory)) {
      console.log(`${colors.cyan}${category.toUpperCase()}${colors.reset}`);
      for (const agent of agents) {
        console.log(`  ${agent.icon || '🤖'} @${agent.name.padEnd(15)} ${colors.yellow}${agent.description}${colors.reset}`);
      }
      console.log();
    }
  } catch (e) {
    logError(`Error reading registry: ${e.message}`);
  }
}

// Main installation function
async function main() {
  showBanner();
  
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const rl = createPrompt();
  
  try {
    // Étape 1: Détection système
    logStep('1/6', 'Detecting system...');
    
    const osInfo = detectOS();
    logSuccess(`Detected: ${osInfo.name} ${osInfo.version} (${osInfo.arch})`);
    
    if (!checkNodeVersion()) {
      process.exit(1);
    }

    // Étape 2: Détection des IDEs
    logStep('2/6', 'Detecting installed IDEs...');
    
    const ides = detectIDEs();
    if (ides.length === 0) {
      logWarning('No supported IDE detected');
      logWarning('You can still use Agentium via CLI: npx agentium');
    } else {
      for (const ide of ides) {
        logSuccess(`Found: ${ide.name}`);
      }
    }

    // Étape 3: Installation des dépendances
    logStep('3/6', 'Installing dependencies...');
    
    // Les dépendances sont déjà gérées par npm lors de l'installation du package
    logSuccess('Dependencies ready');

    // Étape 4: Configuration
    logStep('4/6', 'Setting up configuration...');
    
    createConfigDirectory();
    
    let apiKey = options.apiKey || process.env.GROK_API_KEY || '';
    
    if (!apiKey && !options.skipPrompts) {
      console.log(`\n${colors.cyan}API Configuration${colors.reset}`);
      console.log('Agentium uses Grok API by default. You can also configure OpenAI or Anthropic as fallback.');
      console.log('Get your Grok API key at: https://console.x.ai\n');
      
      apiKey = await askQuestion(rl, 'Enter your Grok API key (or press Enter to skip): ');
    }

    const config = createConfig(apiKey);

    // Étape 5: Installation de l'extension VS Code
    logStep('5/6', 'Installing VS Code extension...');
    
    const vscodeInstalled = await installVSCodeExtension();
    if (!vscodeInstalled) {
      logWarning('VS Code extension could not be auto-installed');
      logWarning('You can install it manually from the VS Code marketplace');
    }

    // Étape 6: Vérification
    logStep('6/6', 'Verifying installation...');
    
    // Vérifier le fichier de config
    if (fs.existsSync(CONFIG_FILE)) {
      logSuccess('Configuration file created');
    }

    // Tester la connexion API si une clé est fournie
    if (apiKey) {
      await testAPIConnection(apiKey);
    }

    // Afficher le message de succès
    showSuccessBanner();

    // Afficher la liste des agents
    if (!options.skipPrompts) {
      const showAgents = await askQuestion(rl, 'Would you like to see the list of available agents? (y/n): ');
      if (showAgents.toLowerCase() === 'y') {
        showAgentsList();
      }
    }

  } catch (error) {
    logError(`Installation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Commandes CLI supplémentaires
const command = process.argv[2];

switch (command) {
  case 'setup':
  case 'install':
  case undefined:
    main();
    break;
    
  case 'list':
  case 'list-agents':
    showAgentsList();
    break;
    
  case 'config':
    if (fs.existsSync(CONFIG_FILE)) {
      console.log(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } else {
      logError('No configuration found. Run setup first.');
    }
    break;
    
  case 'test':
    (async () => {
      const apiKey = process.env.GROK_API_KEY || '';
      if (apiKey) {
        await testAPIConnection(apiKey);
      } else {
        logError('GROK_API_KEY environment variable not set');
      }
    })();
    break;
    
  case '--help':
  case '-h':
    showHelp();
    break;
    
  default:
    log(`Unknown command: ${command}`, 'red');
    showHelp();
    process.exit(1);
}
