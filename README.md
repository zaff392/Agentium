# 🤖 Agentium - 50 AI Agents for Developers

[![npm version](https://cmustrudel.github.io/assets/img/project/portfolio/portfolio.006.jpeg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Agentium** est une extension universelle pour IDEs intégrant **50 agents IA spécialisés**, chacun expert dans un domaine technique spécifique du développement logiciel. Accessible via une syntaxe simple `@agent` directement dans votre environnement de développement.

```bash
# Installation en une ligne
npx skill-ia-agents setup
```

---

## ✨ Fonctionnalités

- 🎯 **50 agents spécialisés** - Expert React, Python, Docker, SQL, Security et bien plus
- ⚡ **Installation rapide** - Une seule commande pour tout configurer
- 🔄 **Multi-providers** - Grok (principal), OpenAI, Anthropic en fallback
- 💬 **Chat intégré** - Panneau de conversation dans VS Code
- 🤝 **Collaboration multi-agents** - `@react+tailwind+jest` pour des tâches complexes
- 📝 **Contexte intelligent** - Détection automatique du langage et framework
- 🎨 **VS Code Extension** - Interface native avec raccourcis clavier

---

## 🚀 Quick Start

### 1. Installation

```bash
# Installation avec npm
npx skill-ia-agents setup

# Ou installation globale
npm install -g skill-ia-agents
skill-ia-agents setup
```

### 2. Configuration de l'API

Configurez votre clé API Grok (ou OpenAI/Anthropic) :

```bash
# Via variable d'environnement
export GROK_API_KEY="xai-xxx"

# Ou dans le fichier de config
# ~/.skill-ia-agents/config.json
```

### 3. Utilisation

Dans VS Code, ouvrez le chat avec **Ctrl+Shift+A** (ou **Cmd+Shift+A** sur Mac) puis :

```
@react créer un composant Button avec TypeScript et variants
@python optimiser cette fonction avec async/await
@docker créer un Dockerfile multi-stage pour Node.js
@security analyser ce code pour les vulnérabilités OWASP
```

---

## 📚 Les 50 Agents

### Backend (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@nodejs` | Node.js, Express, NestJS | `@nodejs créer une API REST avec Express` |
| `@python` | Python, Django, FastAPI | `@python API FastAPI avec authentification JWT` |
| `@java` | Java, Spring Boot | `@java microservice Spring Boot avec JPA` |
| `@csharp` | C#, .NET Core, ASP.NET | `@csharp endpoint ASP.NET Core avec EF` |
| `@go` | Go, Goroutines, Gin | `@go service concurrent haute performance` |

### Frontend (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@react` | React, Hooks, TypeScript | `@react composant modal accessible` |
| `@vue` | Vue 3, Composition API | `@vue store Pinia avec TypeScript` |
| `@angular` | Angular 17+, RxJS, Signals | `@angular service avec observables` |
| `@svelte` | Svelte, SvelteKit | `@svelte composant avec transitions` |
| `@nextjs` | Next.js 14+, App Router | `@nextjs page avec Server Components` |

### Mobile (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@reactnative` | React Native, Expo | `@reactnative écran avec navigation` |
| `@flutter` | Flutter, Dart, BLoC | `@flutter widget avec state management` |
| `@swift` | Swift, SwiftUI, iOS | `@swift vue SwiftUI avec Core Data` |
| `@kotlin` | Kotlin, Jetpack Compose | `@kotlin composable avec ViewModel` |
| `@ionic` | Ionic, Capacitor | `@ionic app hybride avec plugins natifs` |

### Database (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@sql` | SQL, PostgreSQL, MySQL | `@sql optimiser cette requête avec indexes` |
| `@mongodb` | MongoDB, Aggregation | `@mongodb pipeline d'agrégation complexe` |
| `@redis` | Redis, Caching | `@redis stratégie de cache avec TTL` |
| `@elasticsearch` | Elasticsearch, Search | `@elasticsearch requête full-text avec fuzzy` |
| `@graphql` | GraphQL, Apollo | `@graphql schema avec mutations et subscriptions` |

### DevOps/Cloud (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@docker` | Docker, Compose | `@docker Dockerfile multi-stage optimisé` |
| `@kubernetes` | K8s, Helm | `@kubernetes deployment avec HPA` |
| `@aws` | AWS, Lambda, CDK | `@aws architecture serverless avec CDK` |
| `@azure` | Azure, Functions | `@azure Function avec Managed Identity` |
| `@cicd` | GitHub Actions, GitLab CI | `@cicd pipeline avec tests et deploy` |

### Testing/Quality (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@unittest` | Jest, pytest, JUnit | `@unittest tests unitaires avec mocks` |
| `@e2e` | Playwright, Cypress | `@e2e tests E2E avec Page Objects` |
| `@performance` | k6, Lighthouse | `@performance load test avec k6` |
| `@accessibility` | WCAG, ARIA | `@accessibility audit ce formulaire` |
| `@codereviewer` | Code review, SOLID | `@codereviewer analyser ce code` |

### UI/UX (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@css` | CSS3, Grid, Flexbox | `@css layout responsive avec Grid` |
| `@tailwind` | Tailwind CSS | `@tailwind card component avec variants` |
| `@animation` | Framer Motion, GSAP | `@animation transition de page fluide` |
| `@responsive` | Responsive design | `@responsive menu mobile avec breakpoints` |
| `@designsystem` | Design tokens, Storybook | `@designsystem tokens couleurs et typography` |

### API/Integration (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@rest` | REST API, OpenAPI | `@rest design API RESTful avec versioning` |
| `@websocket` | WebSocket, Socket.io | `@websocket chat temps réel scalable` |
| `@grpc` | gRPC, Protocol Buffers | `@grpc service avec streaming` |
| `@oauth` | OAuth2, JWT | `@oauth flow PKCE avec refresh tokens` |
| `@webhook` | Webhooks, Events | `@webhook système avec retry et signatures` |

### Security (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@security` | OWASP, Audit | `@security audit ce code pour XSS et CSRF` |
| `@crypto` | Cryptographie, TLS | `@crypto encryption AES avec key management` |
| `@pentest` | Penetration testing | `@pentest test cette API pour BOLA` |
| `@compliance` | GDPR, SOC2 | `@compliance checklist RGPD pour ce projet` |
| `@auth` | Authentication, MFA | `@auth système login avec MFA` |

### Misc (5 agents)
| Agent | Expertise | Exemple |
|-------|-----------|---------|
| `@git` | Git, workflows | `@git stratégie de branching GitFlow` |
| `@regex` | Expressions régulières | `@regex pattern pour email validation` |
| `@documentation` | Technical writing | `@documentation README pour ce projet` |
| `@refactoring` | Clean Code, patterns | `@refactoring améliorer cette fonction` |
| `@debugger` | Debugging, profiling | `@debugger analyser cette stack trace` |

---

## 🔧 Configuration

### Fichier de configuration

```json
// ~/.skill-ia-agents/config.json
{
  "version": "1.0.0",
  "apis": {
    "primary": {
      "provider": "grok",
      "apiKey": "xai-xxx",
      "model": "grok-2-latest",
      "timeout": 30000
    },
    "fallbacks": [
      {
        "provider": "openai",
        "apiKey": "sk-xxx",
        "model": "gpt-4-turbo",
        "enabled": true
      },
      {
        "provider": "anthropic",
        "apiKey": "sk-ant-xxx",
        "model": "claude-3-5-sonnet-20241022",
        "enabled": true
      }
    ]
  },
  "agents": {
    "enabled": ["*"],
    "disabled": [],
    "customPrompts": {}
  },
  "ui": {
    "theme": "auto",
    "autoSuggest": true
  }
}
```

### Variables d'environnement

```bash
# API Keys
export GROK_API_KEY="xai-xxx"
export OPENAI_API_KEY="sk-xxx"
export ANTHROPIC_API_KEY="sk-ant-xxx"
```

### Commandes CLI

```bash
# Lister les agents
skill-ia-agents list

# Afficher la config
skill-ia-agents config

# Tester la connexion API
skill-ia-agents test

# Réinstaller
skill-ia-agents setup
```

---

## ⌨️ Raccourcis VS Code

| Raccourci | Action |
|-----------|--------|
| `Ctrl+Shift+A` | Ouvrir le panneau de chat |
| `Ctrl+Shift+I` | Invoquer un agent |
| `Ctrl+Shift+E` | Analyser le code sélectionné |

---

## 🤝 Collaboration Multi-Agents

Combinez plusieurs agents pour des tâches complexes :

```
@react+typescript+tailwind créer un formulaire de contact avec validation

@nodejs+docker+cicd pipeline complète pour déployer une API

@security+codereviewer audit de sécurité avec recommandations
```

Le moteur de collaboration :
1. Analyse la requête et décompose en sous-tâches
2. Assigne chaque sous-tâche à l'agent expert
3. Coordonne les réponses pour la cohérence
4. Fusionne le résultat final

---

## 📁 Structure du Projet

```
agentium/
├── agents/
│   └── agents-registry.json    # Définition des 50 agents
├── core/
│   ├── agent-manager.ts        # Gestionnaire d'agents
│   ├── api-handler.ts          # Gestion multi-API
│   ├── context-analyzer.ts     # Analyse du contexte
│   ├── collaboration-engine.ts # Orchestration multi-agents
│   ├── config-manager.ts       # Configuration
│   ├── database.ts             # Persistance SQLite
│   └── types.ts                # Types TypeScript
├── cli/
│   └── index.ts                # Interface CLI
├── install/
│   └── setup.js                # Script d'installation
├── vscode-extension/
│   ├── package.json            # Manifest extension
│   └── src/extension.ts        # Code extension VS Code
└── tests/
    └── ...                     # Tests unitaires
```

---

## 🔄 API Fallback

Agentium gère automatiquement les erreurs API :

1. **Grok** (principal) - API xAI
2. **OpenAI** (fallback 1) - GPT-4 Turbo
3. **Anthropic** (fallback 2) - Claude 3.5 Sonnet

En cas d'erreur (timeout, rate limit, 5xx), basculement automatique en < 2 secondes.

---

## 🛠️ Développement

```bash
# Cloner le repo
git clone https://github.com/agentium/agentium.git
cd agentium

# Installer les dépendances
npm install

# Build
npm run build

# Tests
npm test

# Dev mode
npm run dev
```

---

## 📝 Créer un Agent Custom

```json
// Dans agents-registry.json, ajouter :
{
  "id": "myagent",
  "name": "myagent",
  "category": "misc",
  "description": "Mon agent custom",
  "expertise": ["MyFramework", "MyTech"],
  "skills": ["Custom skill 1", "Custom skill 2"],
  "triggers": ["myagent", "ma"],
  "icon": "🚀",
  "systemPrompt": "Tu es un expert en MyFramework..."
}
```

---

## 🐛 Troubleshooting

### L'extension ne se charge pas
```bash
# Réinstaller
npx skill-ia-agents setup --ide=vscode
```

### Erreur API
```bash
# Vérifier la connexion
skill-ia-agents test

# Vérifier la clé API
echo $GROK_API_KEY
```

### Logs
```bash
# VS Code: Developer Tools > Console
# Fichier de log: ~/.skill-ia-agents/logs/
```

---

## 📄 License

MIT © Agentium Team

---

## 🙏 Contribuer

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

1. Fork le repo
2. Créer une branche (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Ouvrir une Pull Request

---

## 📞 Support

- 📖 [Documentation](https://github.com/agentium/agentium/wiki)
- 🐛 [Issues](https://github.com/agentium/agentium/issues)
- 💬 [Discussions](https://github.com/agentium/agentium/discussions)

---

**Made with ❤️ for developers by developers**
