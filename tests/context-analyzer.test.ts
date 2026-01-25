/**
 * Tests pour ContextAnalyzer
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ContextAnalyzer } from '../core/context-analyzer';

describe('ContextAnalyzer', () => {
  let analyzer: ContextAnalyzer;
  const testProjectDir = path.join(os.tmpdir(), 'agentium-test-project-' + Date.now());

  beforeAll(() => {
    analyzer = new ContextAnalyzer();
    
    // Créer un projet de test
    fs.mkdirSync(testProjectDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true });
    }
  });

  describe('detectLanguageFromExtension', () => {
    test('devrait détecter JavaScript', () => {
      expect(analyzer.detectLanguageFromExtension('app.js')).toBe('javascript');
      expect(analyzer.detectLanguageFromExtension('component.jsx')).toBe('javascript');
    });

    test('devrait détecter TypeScript', () => {
      expect(analyzer.detectLanguageFromExtension('app.ts')).toBe('typescript');
      expect(analyzer.detectLanguageFromExtension('component.tsx')).toBe('typescript');
    });

    test('devrait détecter Python', () => {
      expect(analyzer.detectLanguageFromExtension('main.py')).toBe('python');
    });

    test('devrait détecter SQL', () => {
      expect(analyzer.detectLanguageFromExtension('schema.sql')).toBe('sql');
    });

    test('devrait retourner null pour extension inconnue', () => {
      expect(analyzer.detectLanguageFromExtension('file.xyz')).toBeNull();
    });
  });

  describe('detectLanguageFromContent', () => {
    test('devrait détecter JavaScript/TypeScript', () => {
      const jsCode = "import React from 'react';";
      expect(analyzer.detectLanguageFromContent(jsCode)).toBe('javascript');
      
      const tsCode = 'const name: string = "test";';
      expect(analyzer.detectLanguageFromContent(tsCode)).toBe('typescript');
    });

    test('devrait détecter Python', () => {
      const pyCode = 'def hello():\n    print("Hello")';
      expect(analyzer.detectLanguageFromContent(pyCode)).toBe('python');
    });

    test('devrait détecter SQL', () => {
      const sqlCode = 'SELECT * FROM users WHERE active = true';
      expect(analyzer.detectLanguageFromContent(sqlCode)).toBe('sql');
    });

    test('devrait détecter Dockerfile', () => {
      const dockerCode = 'FROM node:18-alpine\nRUN npm install';
      expect(analyzer.detectLanguageFromContent(dockerCode)).toBe('dockerfile');
    });
  });

  describe('detectFramework', () => {
    test('devrait détecter React depuis package.json', async () => {
      const packageJson = {
        dependencies: {
          'react': '^18.0.0',
          'react-dom': '^18.0.0',
        },
      };
      
      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const framework = await analyzer.detectFramework(testProjectDir);
      expect(framework).toBe('react');
    });

    test('devrait détecter Next.js depuis package.json', async () => {
      const packageJson = {
        dependencies: {
          'next': '^14.0.0',
          'react': '^18.0.0',
        },
      };
      
      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const framework = await analyzer.detectFramework(testProjectDir);
      expect(framework).toBe('nextjs');
    });
  });

  describe('detectErrors', () => {
    test('devrait détecter une erreur JavaScript', () => {
      const error = 'TypeError: Cannot read property "x" of undefined';
      const results = analyzer.detectErrors(error);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].agent).toBe('debug');
    });

    test('devrait détecter une erreur SQL', () => {
      const error = 'SQL syntax error near "SELECT"';
      const results = analyzer.detectErrors(error);
      
      expect(results.some(r => r.agent === 'sql')).toBe(true);
    });

    test('devrait détecter une erreur de sécurité CORS', () => {
      const error = 'Access-Control-Allow-Origin header missing';
      const results = analyzer.detectErrors(error);
      
      expect(results.some(r => r.agent === 'security')).toBe(true);
    });
  });

  describe('suggestAgents', () => {
    test('devrait suggérer nodejs pour JavaScript', () => {
      const suggestions = analyzer.suggestAgents({ language: 'javascript' });
      expect(suggestions).toContain('nodejs');
    });

    test('devrait suggérer react pour framework React', () => {
      const suggestions = analyzer.suggestAgents({ framework: 'react' });
      expect(suggestions).toContain('react');
    });

    test('devrait suggérer debug pour erreurs', () => {
      const suggestions = analyzer.suggestAgents({
        errors: ['TypeError: undefined is not a function'],
      });
      expect(suggestions).toContain('debug');
    });
  });
});
