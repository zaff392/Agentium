/**
 * Context Analyzer - Analyse du contexte de code (détection langage, framework, erreurs)
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeContext, ContextAnalysisResult } from './types';

// Mapping extensions -> langages
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php',
  '.rb': 'ruby',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.sql': 'sql',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.vue': 'vue',
  '.svelte': 'svelte',
};

// Mapping frameworks -> agents suggérés
const FRAMEWORK_AGENTS: Record<string, string[]> = {
  react: ['react', 'typescript', 'tailwind'],
  'react-native': ['reactnative', 'typescript'],
  vue: ['vue', 'typescript'],
  angular: ['angular', 'typescript'],
  svelte: ['svelte', 'typescript'],
  nextjs: ['nextjs', 'react', 'typescript'],
  nuxt: ['vue', 'typescript'],
  express: ['nodejs', 'typescript'],
  nestjs: ['nodejs', 'typescript'],
  fastify: ['nodejs', 'typescript'],
  django: ['python'],
  fastapi: ['python'],
  flask: ['python'],
  spring: ['java'],
  rails: ['ruby'],
  laravel: ['php'],
};

// Patterns de détection de framework
const FRAMEWORK_PATTERNS: { pattern: RegExp; framework: string; file: string }[] = [
  { pattern: /"next":\s*"/, framework: 'nextjs', file: 'package.json' },
  { pattern: /"react":\s*"/, framework: 'react', file: 'package.json' },
  { pattern: /"react-native":\s*"/, framework: 'react-native', file: 'package.json' },
  { pattern: /"vue":\s*"/, framework: 'vue', file: 'package.json' },
  { pattern: /"@angular\/core":\s*"/, framework: 'angular', file: 'package.json' },
  { pattern: /"svelte":\s*"/, framework: 'svelte', file: 'package.json' },
  { pattern: /"express":\s*"/, framework: 'express', file: 'package.json' },
  { pattern: /"@nestjs\/core":\s*"/, framework: 'nestjs', file: 'package.json' },
  { pattern: /"fastify":\s*"/, framework: 'fastify', file: 'package.json' },
  { pattern: /Django/, framework: 'django', file: 'requirements.txt' },
  { pattern: /fastapi/, framework: 'fastapi', file: 'requirements.txt' },
  { pattern: /Flask/, framework: 'flask', file: 'requirements.txt' },
  { pattern: /spring-boot/, framework: 'spring', file: 'pom.xml' },
  { pattern: /rails/, framework: 'rails', file: 'Gemfile' },
  { pattern: /laravel/, framework: 'laravel', file: 'composer.json' },
];

// Patterns d'erreurs courants
const ERROR_PATTERNS: { pattern: RegExp; agent: string; type: string }[] = [
  { pattern: /TypeError|ReferenceError|SyntaxError/i, agent: 'debug', type: 'javascript' },
  { pattern: /IndentationError|NameError|ImportError/i, agent: 'debug', type: 'python' },
  { pattern: /NullPointerException|ClassNotFoundException/i, agent: 'debug', type: 'java' },
  { pattern: /SQL syntax|UNIQUE constraint failed/i, agent: 'sql', type: 'database' },
  { pattern: /CORS|Access-Control/i, agent: 'security', type: 'security' },
  { pattern: /authentication|unauthorized|401/i, agent: 'auth', type: 'auth' },
  { pattern: /docker|container|image/i, agent: 'docker', type: 'devops' },
];

export class ContextAnalyzer {
  /**
   * Détecte le langage à partir d'une extension de fichier
   */
  detectLanguageFromExtension(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_TO_LANGUAGE[ext] || null;
  }

  /**
   * Détecte le langage à partir du contenu du code
   */
  detectLanguageFromContent(code: string): string | null {
    const patterns: { pattern: RegExp; language: string }[] = [
      { pattern: /^import .* from ['"]|^export (default |const |function )/, language: 'javascript' },
      { pattern: /^import \{.*\}|: (string|number|boolean|any)\b/, language: 'typescript' },
      { pattern: /^def\s+\w+\(|^class\s+\w+:|^import\s+\w+/, language: 'python' },
      { pattern: /^package\s+\w+|^public\s+(class|interface)/, language: 'java' },
      { pattern: /^package\s+main|^func\s+\w+\(|^import\s+"/, language: 'go' },
      { pattern: /^fn\s+\w+\(|^use\s+\w+|^let\s+mut/, language: 'rust' },
      { pattern: /^<\?php|^namespace\s+\w+/, language: 'php' },
      { pattern: /^class\s+\w+\s*<|^def\s+\w+|^require\s+['"]/, language: 'ruby' },
      { pattern: /^SELECT|^INSERT|^UPDATE|^DELETE|^CREATE TABLE/i, language: 'sql' },
      { pattern: /^FROM\s+\w+|^RUN\s+|^COPY\s+|^WORKDIR/, language: 'dockerfile' },
    ];

    for (const { pattern, language } of patterns) {
      if (pattern.test(code)) {
        return language;
      }
    }

    return null;
  }

  /**
   * Détecte le framework utilisé dans un projet
   */
  async detectFramework(projectPath: string): Promise<string | null> {
    for (const { pattern, framework, file } of FRAMEWORK_PATTERNS) {
      const filePath = path.join(projectPath, file);
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          if (pattern.test(content)) {
            return framework;
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Analyse les dépendances du projet
   */
  async analyzeDependencies(projectPath: string): Promise<Record<string, string>> {
    const dependencies: Record<string, string> = {};

    // package.json (Node.js)
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        Object.assign(dependencies, pkg.dependencies || {});
        Object.assign(dependencies, pkg.devDependencies || {});
      } catch {
        // Ignore parse errors
      }
    }

    // requirements.txt (Python)
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      try {
        const content = fs.readFileSync(requirementsPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const match = line.match(/^([a-zA-Z0-9_-]+)(==|>=|<=)?(.+)?$/);
          if (match) {
            dependencies[match[1]] = match[3] || '*';
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return dependencies;
  }

  /**
   * Détecte les erreurs dans le texte et suggère des agents
   */
  detectErrors(errorText: string): { agent: string; type: string }[] {
    const results: { agent: string; type: string }[] = [];

    for (const { pattern, agent, type } of ERROR_PATTERNS) {
      if (pattern.test(errorText)) {
        results.push({ agent, type });
      }
    }

    // Toujours suggérer debug pour les erreurs générales
    if (results.length === 0 && /error|exception|failed/i.test(errorText)) {
      results.push({ agent: 'debug', type: 'general' });
    }

    return results;
  }

  /**
   * Suggère des agents pertinents basé sur le contexte
   */
  suggestAgents(context: CodeContext): string[] {
    const suggestions: Set<string> = new Set();

    // Suggestions basées sur le langage
    if (context.language) {
      const langAgentMap: Record<string, string[]> = {
        javascript: ['nodejs', 'react', 'jest'],
        typescript: ['typescript', 'nodejs', 'react'],
        python: ['python'],
        java: ['java'],
        go: ['go'],
        rust: ['rust'],
        php: ['php'],
        ruby: ['ruby'],
        csharp: ['csharp'],
        sql: ['postgresql', 'sql'],
        dockerfile: ['docker'],
      };
      const agents = langAgentMap[context.language] || [];
      agents.forEach(a => suggestions.add(a));
    }

    // Suggestions basées sur le framework
    if (context.framework) {
      const frameworkAgents = FRAMEWORK_AGENTS[context.framework] || [];
      frameworkAgents.forEach(a => suggestions.add(a));
    }

    // Suggestions basées sur les erreurs
    if (context.errors && context.errors.length > 0) {
      for (const error of context.errors) {
        const errorAgents = this.detectErrors(error);
        errorAgents.forEach(({ agent }) => suggestions.add(agent));
      }
    }

    return Array.from(suggestions);
  }

  /**
   * Analyse complète du contexte
   */
  async analyzeContext(
    projectPath?: string,
    currentFile?: string,
    selectedCode?: string,
    errorOutput?: string
  ): Promise<ContextAnalysisResult> {
    let detectedLanguage: string | null = null;
    let detectedFramework: string | null = null;
    const techStack: string[] = [];

    // Détection du langage
    if (currentFile) {
      detectedLanguage = this.detectLanguageFromExtension(currentFile);
    }
    if (!detectedLanguage && selectedCode) {
      detectedLanguage = this.detectLanguageFromContent(selectedCode);
    }

    // Détection du framework
    if (projectPath) {
      detectedFramework = await this.detectFramework(projectPath);
      const deps = await this.analyzeDependencies(projectPath);
      Object.keys(deps).forEach(dep => techStack.push(dep));
    }

    // Construction du contexte
    const context: CodeContext = {
      language: detectedLanguage || undefined,
      framework: detectedFramework || undefined,
      projectPath,
      currentFile,
      selectedCode,
      errors: errorOutput ? [errorOutput] : undefined,
    };

    // Suggestions d'agents
    const suggestedAgents = this.suggestAgents(context);

    // Détermination du type de projet
    let projectType: string | null = null;
    if (detectedFramework) {
      const frontendFrameworks = ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt'];
      const backendFrameworks = ['express', 'nestjs', 'fastify', 'django', 'fastapi', 'flask', 'spring', 'rails', 'laravel'];
      const mobileFrameworks = ['react-native', 'flutter'];

      if (frontendFrameworks.includes(detectedFramework)) {
        projectType = 'frontend';
      } else if (backendFrameworks.includes(detectedFramework)) {
        projectType = 'backend';
      } else if (mobileFrameworks.includes(detectedFramework)) {
        projectType = 'mobile';
      }
    }

    return {
      detectedLanguage,
      detectedFramework,
      suggestedAgents,
      projectType,
      techStack,
    };
  }

  /**
   * Génère un résumé du contexte pour les prompts
   */
  generateContextSummary(context: CodeContext): string {
    const parts: string[] = [];

    if (context.language) {
      parts.push(`Langage: ${context.language}`);
    }
    if (context.framework) {
      parts.push(`Framework: ${context.framework}`);
    }
    if (context.currentFile) {
      parts.push(`Fichier actuel: ${context.currentFile}`);
    }
    if (context.selectedCode) {
      parts.push(`Code sélectionné:\n\`\`\`\n${context.selectedCode}\n\`\`\``);
    }
    if (context.errors && context.errors.length > 0) {
      parts.push(`Erreurs détectées:\n${context.errors.join('\n')}`);
    }

    return parts.join('\n');
  }
}

// Instance singleton
let contextAnalyzerInstance: ContextAnalyzer | null = null;

export function getContextAnalyzer(): ContextAnalyzer {
  if (!contextAnalyzerInstance) {
    contextAnalyzerInstance = new ContextAnalyzer();
  }
  return contextAnalyzerInstance;
}

export default ContextAnalyzer;
