/**
 * Tests pour ConfigManager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../core/config-manager';

describe('ConfigManager', () => {
  const testConfigDir = path.join(os.tmpdir(), 'agentium-test-' + Date.now());
  const testConfigPath = path.join(testConfigDir, 'config.json');
  let configManager: ConfigManager;

  beforeEach(() => {
    // Nettoyer avant chaque test
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true });
    }
    configManager = new ConfigManager(testConfigPath);
  });

  afterAll(() => {
    // Nettoyer après tous les tests
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true });
    }
  });

  test('devrait créer une configuration par défaut', () => {
    const config = configManager.getConfig();
    
    expect(config.version).toBe('1.0.0');
    expect(config.apis.primary.provider).toBe('grok');
    expect(config.apis.primary.model).toBe('grok-2-latest');
  });

  test('devrait créer le fichier de configuration', () => {
    expect(fs.existsSync(testConfigPath)).toBe(true);
  });

  test('devrait sauvegarder et charger la configuration', () => {
    configManager.setAPIKey('grok', 'test-key-123');
    
    // Créer une nouvelle instance pour recharger
    const newConfigManager = new ConfigManager(testConfigPath);
    const config = newConfigManager.getConfig();
    
    expect(config.apis.primary.apiKey).toBe('test-key-123');
  });

  test('devrait activer/désactiver un agent', () => {
    expect(configManager.isAgentEnabled('react')).toBe(true); // Par défaut '*' = tous activés
    
    configManager.setAgentEnabled('react', false);
    expect(configManager.isAgentEnabled('react')).toBe(false);
    
    configManager.setAgentEnabled('react', true);
    expect(configManager.isAgentEnabled('react')).toBe(true);
  });

  test('devrait gérer les prompts personnalisés', () => {
    const customPrompt = 'Custom prompt for testing';
    
    configManager.setCustomPrompt('nodejs', customPrompt);
    expect(configManager.getCustomPrompt('nodejs')).toBe(customPrompt);
    
    expect(configManager.getCustomPrompt('unknown')).toBeNull();
  });

  test('devrait obtenir les APIs de fallback', () => {
    const fallbacks = configManager.getFallbackAPIs();
    
    expect(Array.isArray(fallbacks)).toBe(true);
    expect(fallbacks.length).toBeGreaterThan(0);
    expect(fallbacks[0].provider).toBe('openai');
  });

  test('devrait exporter la config sans les clés API', () => {
    configManager.setAPIKey('grok', 'secret-key');
    
    const exported = configManager.exportConfig();
    const parsed = JSON.parse(exported);
    
    expect(parsed.apis.primary.apiKey).toBe('***');
  });

  test('devrait réinitialiser aux valeurs par défaut', () => {
    configManager.setAPIKey('grok', 'custom-key');
    
    // Créer une nouvelle instance pour reset complet
    const newConfigManager = new ConfigManager(testConfigPath);
    newConfigManager.resetToDefaults();
    
    const config = newConfigManager.getConfig();
    expect(config.apis.primary.provider).toBe('grok');
    expect(config.version).toBe('1.0.0');
  });
});
