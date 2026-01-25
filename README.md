# Agentium 🤖

> Extension universelle pour IDEs avec 50 agents IA spécialisés

## 🚀 Vue d'ensemble

Agentium est une extension IA multi-agents qui fournit une assistance contextuelle et experte accessible via une syntaxe simple (`@agent`) directement dans l'environnement de développement.

## ✨ Fonctionnalités

- **50 agents IA spécialisés** - Chacun expert dans un domaine technique spécifique
- **Syntaxe @agent** - Invocation simple et intuitive
- **Collaboration multi-agents** - `@react+typescript+tailwind` pour les tâches complexes
- **API Grok primaire** - Avec fallback automatique vers OpenAI/Anthropic
- **Contexte intelligent** - Détection automatique du langage, framework et erreurs
- **Persistance SQLite** - Historique, cache et contexte projet

## 📦 Installation

```bash
# Cloner le repository
git clone <repo-url>
cd agentium

# Installer les dépendances
npm install

# Build
npm run build

# Lancer le CLI de test
npm run dev
```

## 🛠️ Utilisation

### CLI de test

```bash
npm run dev
```

### Syntaxe d'invocation

```
@agent question             # Agent unique
@agent1+agent2 question     # Multi-agents (collaboration)
```

### Exemples

```
@react créer un composant Button avec TypeScript
@nodejs créer une API REST avec Express
@sql optimiser cette requête SELECT
@docker créer un Dockerfile multi-stage pour Node.js
@security analyser ce code pour des vulnérabilités
```

## 🤖 Agents disponibles (Démo)

| Agent | Catégorie | Expertise |
|-------|-----------|-----------|
| `@nodejs` | Backend | Node.js, Express, Fastify, NestJS |
| `@react` | Frontend | React, Hooks, Context API, TypeScript |
| `@sql` | Database | SQL, PostgreSQL, MySQL, Optimisation |
| `@docker` | DevOps | Docker, Containerisation, Multi-stage builds |
| `@security` | Security | OWASP, Audit, Vulnérabilités |

## 📁 Structure du projet

```
agentium/
├── core/                    # Modules principaux
│   ├── agent-manager.ts     # Gestion des agents
│   ├── api-handler.ts       # Client API unifié + fallback
│   ├── context-analyzer.ts  # Analyse du contexte
│   ├── collaboration-engine.ts # Orchestration multi-agents
│   ├── config-manager.ts    # Configuration
│   ├── database.ts          # Persistance SQLite
│   └── types.ts             # Types TypeScript
├── agents/                  # Définitions des agents
│   ├── backend/
│   ├── frontend/
│   ├── database/
│   ├── devops/
│   └── security/
├── cli/                     # Interface CLI de test
├── tests/                   # Tests unitaires
└── dist/                    # Build TypeScript
```

## ⚙️ Configuration

Le fichier de configuration est créé automatiquement dans `~/.skill-ia-agents/config.json`.

### Variables d'environnement

```bash
GROK_API_KEY=xai-xxxx        # Clé API Grok (primaire)
OPENAI_API_KEY=sk-xxxx       # Clé API OpenAI (fallback)
ANTHROPIC_API_KEY=sk-ant-xxx # Clé API Anthropic (fallback)
```

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Avec couverture
npm run test:coverage
```

## 📊 Architecture

### API Handler
- Grok comme API primaire
- Fallback automatique vers OpenAI/Anthropic en < 2s
- Retry avec backoff exponentiel
- Gestion unifiée des erreurs

### Agent Manager
- Chargement dynamique des agents
- Parsing de la syntaxe @agent
- Support multi-agents (collaboration)

### Collaboration Engine
- Exécution parallèle ou séquentielle
- Fusion intelligente des réponses
- Gestion des timeouts

### Database (SQLite)
- Historique des conversations
- Cache des réponses (TTL configurable)
- Contexte projet persistant
- Templates personnalisés

## 📝 License

MIT

---

Développé avec ❤️ pour améliorer la productivité des développeurs.
