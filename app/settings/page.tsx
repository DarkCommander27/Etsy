'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PROVIDERS } from '@/lib/ai/providers';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const STORAGE_KEY = 'etsygen-settings';

interface Settings {
  provider: string;
  geminiApiKey: string;
  geminiModel: string;
  groqApiKey: string;
  openaiApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  defaultPageSize: string;
  defaultColorScheme: string;
  etsyShopId: string;
  etsyApiKey: string;
}

const defaults: Settings = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  groqApiKey: '',
  openaiApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  defaultPageSize: 'letter',
  defaultColorScheme: '',
  etsyShopId: '',
  etsyApiKey: '',
};

function SettingsContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [saved, setSaved] = useState(false);
  const [etsyConnected, setEtsyConnected] = useState(false);
  const [etsyError, setEtsyError] = useState('');
  const [etsySuccess, setEtsySuccess] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...defaults, ...JSON.parse(stored) });
    } catch { /* ignore */ }

    // Check Etsy connection status
    fetch('/api/etsy/status')
      .then((r) => r.json())
      .then(({ connected }) => setEtsyConnected(!!connected))
      .catch(() => {});

    // Handle OAuth callback results
    const error = searchParams.get('etsy_error');
    const connected = searchParams.get('etsy_connected');
    if (error) setEtsyError(decodeURIComponent(error));
    if (connected === '1') {
      setEtsyConnected(true);
      setEtsySuccess('✅ Etsy connected successfully!');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function connectEtsy() {
    // Save settings first so shop ID is persisted
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.location.href = '/api/etsy/connect';
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Settings</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Configure your AI provider and Etsy connection. Saved locally in your browser.
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

          <Input
            label="Gemini Model"
            value={settings.geminiModel}
            onChange={(e) => set('geminiModel', e.target.value)}
            placeholder="gemini-2.0-flash"
          />

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
              label="OpenAI API Key (for listing images)"
              type="password"
              value={settings.openaiApiKey}
              onChange={(e) => set('openaiApiKey', e.target.value)}
              placeholder="sk-..."
            />
            <p className="text-xs text-slate-400 mt-1">
              Needed for automated Etsy listing image generation. Get one at{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                platform.openai.com
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

      {/* Etsy Connection */}
      <Card padding="md" className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Etsy Connection</h2>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${etsyConnected ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
            {etsyConnected ? '● Connected' : '○ Not connected'}
          </span>
        </div>

        {etsyError && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs">
            {etsyError}
          </div>
        )}
        {etsySuccess && (
          <div className="mb-3 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-xs">
            {etsySuccess}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Input
              label="Etsy API Key (keystring)"
              type="password"
              value={settings.etsyApiKey}
              onChange={(e) => set('etsyApiKey', e.target.value)}
              placeholder="Your Etsy app keystring"
            />
            <p className="text-xs text-slate-400 mt-1">
              Create a free app at{' '}
              <a href="https://www.etsy.com/developers/register" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                etsy.com/developers
              </a>
              {' '}· Set redirect URI to <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">http://localhost:3000/api/etsy/callback</code>
            </p>
          </div>
          <div>
            <Input
              label="Etsy Shop ID"
              value={settings.etsyShopId}
              onChange={(e) => set('etsyShopId', e.target.value)}
              placeholder="Your shop ID (found in Etsy shop URL)"
            />
            <p className="text-xs text-slate-400 mt-1">
              Find it at etsy.com/your-shop — it&apos;s the name in your shop URL
            </p>
          </div>

          <div className="flex gap-3 items-center pt-1">
            <Button onClick={connectEtsy} variant="secondary">
              🔗 {etsyConnected ? 'Reconnect Etsy' : 'Connect Etsy'}
            </Button>
            {etsyConnected && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Ready to publish listings!
              </span>
            )}
          </div>
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
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">💡 All AI providers are free</h3>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>Gemini</strong> — Best quality. Free 1,500 requests/day. Get key at ai.google.dev</li>
          <li>• <strong>Groq</strong> — Ultra fast. Free 14,400 requests/day. Get key at console.groq.com</li>
          <li>• <strong>Ollama</strong> — Fully local & unlimited. Install at ollama.com then run: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">ollama pull llama3</code></li>
        </ul>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
