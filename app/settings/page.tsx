'use client';
import { useState, useEffect } from 'react';
import { PROVIDERS } from '@/lib/ai/providers';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const STORAGE_KEY = 'etsygen-settings';

interface Settings {
  provider: string;
  geminiApiKey: string;
  groqApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  defaultPageSize: string;
  defaultColorScheme: string;
}

const defaults: Settings = {
  provider: 'gemini',
  geminiApiKey: '',
  groqApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  defaultPageSize: 'letter',
  defaultColorScheme: '',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...defaults, ...JSON.parse(stored) });
    } catch { /* ignore */ }
  }, []);

  function set(key: keyof Settings, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Settings</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Configure your AI provider and defaults. Settings are saved locally in your browser.
      </p>

      {/* AI Provider */}
      <Card padding="md" className="mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">AI Provider</h2>
        <Select
          label="Active Provider"
          value={settings.provider}
          onChange={(e) => set('provider', e.target.value)}
          className="mb-4"
        >
          {Object.entries(PROVIDERS).map(([key, p]) => (
            <option key={key} value={key}>{p.name}</option>
          ))}
        </Select>

        <div className="space-y-4">
          <div>
            <Input
              label="Google Gemini API Key"
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => set('geminiApiKey', e.target.value)}
              placeholder="AIza..."
            />
            <p className="text-xs text-slate-400 mt-1">
              Free at{' '}
              <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                ai.google.dev
              </a>
            </p>
          </div>

          <div>
            <Input
              label="Groq API Key"
              type="password"
              value={settings.groqApiKey}
              onChange={(e) => set('groqApiKey', e.target.value)}
              placeholder="gsk_..."
            />
            <p className="text-xs text-slate-400 mt-1">
              Free at{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                console.groq.com
              </a>
            </p>
          </div>

          <div>
            <Input
              label="Ollama URL (local)"
              value={settings.ollamaUrl}
              onChange={(e) => set('ollamaUrl', e.target.value)}
              placeholder="http://localhost:11434"
            />
            <p className="text-xs text-slate-400 mt-1">
              Install free at{' '}
              <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                ollama.com
              </a>
            </p>
          </div>

          <Input
            label="Ollama Model"
            value={settings.ollamaModel}
            onChange={(e) => set('ollamaModel', e.target.value)}
            placeholder="llama3"
          />
        </div>
      </Card>

      {/* Defaults */}
      <Card padding="md" className="mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Default Preferences</h2>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Default Page Size"
            value={settings.defaultPageSize}
            onChange={(e) => set('defaultPageSize', e.target.value)}
          >
            <option value="letter">US Letter</option>
            <option value="a4">A4</option>
            <option value="a5">A5</option>
          </Select>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} size="lg">Save Settings</Button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved!</span>
        )}
      </div>

      {/* Provider Info */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">💡 All providers are free</h3>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>Gemini</strong> — Best quality. Free 1,500 requests/day. Get key at ai.google.dev</li>
          <li>• <strong>Groq</strong> — Ultra fast. Free 14,400 requests/day. Get key at console.groq.com</li>
          <li>• <strong>Ollama</strong> — Fully local & unlimited. Install at ollama.com then run: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">ollama pull llama3</code></li>
        </ul>
      </div>
    </div>
  );
}
