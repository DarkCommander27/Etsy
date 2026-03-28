'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { NICHES, getNicheById, NICHE_LIGHT_COLORS, NICHE_TEXT_COLORS } from '@/lib/niches';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

const FONTS = ['Clean Sans-Serif', 'Friendly Rounded', 'Professional Serif', 'Handwritten'];
const PAGE_SIZES = ['letter', 'a4', 'a5'];

function GenerateContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [nicheId, setNicheId] = useState(searchParams.get('niche') || '');
  const [productTypeId, setProductTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [colorSchemeId, setColorSchemeId] = useState('');
  const [pageSize, setPageSize] = useState('letter');
  const [font, setFont] = useState(FONTS[0]);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [editableContent, setEditableContent] = useState('');

  const niche = getNicheById(nicheId);
  const product = niche?.products.find((p) => p.id === productTypeId);
  const colorScheme = niche?.colorSchemes.find((c) => c.id === colorSchemeId) || niche?.colorSchemes[0];

  useEffect(() => {
    if (nicheId && searchParams.get('niche')) setStep(2);
  }, [nicheId, searchParams]);

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem('etsygen-settings') || '{}');
    } catch { return {}; }
  }

  async function generateAIContent() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheId, productTypeId, customTitle: title, settings: getSettings() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContent(data.content);
      setEditableContent(JSON.stringify(data.content, null, 2));
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF() {
    setLoading(true);
    setError('');
    try {
      let finalContent = content;
      try { finalContent = JSON.parse(editableContent); } catch { /* use original */ }
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheId, productTypeId, title: title || product?.name, colorScheme, pageSize, content: finalContent }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || product?.name || 'product').replace(/\s+/g, '-')}.pdf`;
      a.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  }

  const steps = ['Niche', 'Product', 'Customize', 'Generate', 'Export'];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Generate Product</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{s}</span>
            {i < steps.length - 1 && <div className="w-6 h-px bg-slate-300 dark:bg-slate-600" />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>}

      {/* Step 1: Pick Niche */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Step 1: Choose a Niche</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {NICHES.map((n) => (
              <button key={n.id} onClick={() => { setNicheId(n.id); setProductTypeId(''); setColorSchemeId(''); setStep(2); }}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${NICHE_LIGHT_COLORS[n.color]}`}>
                <span className="text-2xl">{n.icon}</span>
                <div>
                  <p className={`font-semibold text-sm ${NICHE_TEXT_COLORS[n.color]}`}>{n.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.products.length} products</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Pick Product Type */}
      {step === 2 && niche && (
        <div>
          <button onClick={() => setStep(1)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back</button>
          <h2 className="text-lg font-semibold mb-4">Step 2: Choose a Product — <span className={NICHE_TEXT_COLORS[niche.color]}>{niche.icon} {niche.name}</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {niche.products.map((p) => (
              <button key={p.id} onClick={() => { setProductTypeId(p.id); setTitle(p.name); setColorSchemeId(niche.colorSchemes[0].id); setStep(3); }}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:border-indigo-400 hover:shadow-md transition-all">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{p.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.description}</p>
                  <p className="text-xs text-indigo-500 mt-1">{p.pages} page{p.pages > 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Customize */}
      {step === 3 && niche && product && (
        <div className="max-w-xl">
          <button onClick={() => setStep(2)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back</button>
          <h2 className="text-lg font-semibold mb-4">Step 3: Customize — {product.icon} {product.name}</h2>
          <div className="space-y-5">
            <Input label="Title / Heading" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={product.name} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color Scheme</label>
              <div className="grid grid-cols-2 gap-2">
                {niche.colorSchemes.map((cs) => (
                  <button key={cs.id} onClick={() => setColorSchemeId(cs.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${colorSchemeId === cs.id ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-600'}`}>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: cs.primary }} />
                      <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: cs.background }} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cs.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <Select label="Font Style" value={font} onChange={(e) => setFont(e.target.value)}>
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
            <Select label="Page Size" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </Select>
          </div>
          <div className="mt-6">
            <Button onClick={() => setStep(4)} className="w-full" size="lg">Continue to Generate →</Button>
          </div>
        </div>
      )}

      {/* Step 4: Generate Content */}
      {step === 4 && niche && product && (
        <div className="max-w-xl">
          <button onClick={() => setStep(3)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back</button>
          <h2 className="text-lg font-semibold mb-2">Step 4: Generate AI Content</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Click below to have AI generate the content for your <strong>{product.name}</strong>. You can edit it in the next step.
          </p>
          <Card padding="md" className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{niche.icon}</span>
              <div>
                <p className="font-semibold">{title || product.name}</p>
                <p className="text-xs text-slate-500">{niche.name} · {colorScheme?.name} · {pageSize.toUpperCase()}</p>
              </div>
            </div>
          </Card>
          <Button onClick={generateAIContent} loading={loading} size="lg" className="w-full">
            {loading ? 'Generating...' : '✨ Generate Content with AI'}
          </Button>
          {loading && <p className="text-sm text-slate-500 mt-2 text-center">This may take a few seconds…</p>}
        </div>
      )}

      {/* Step 5: Preview & Export */}
      {step === 5 && content && (
        <div>
          <button onClick={() => setStep(4)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back</button>
          <h2 className="text-lg font-semibold mb-4">Step 5: Preview & Export</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Generated Content (editable)</h3>
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                rows={16}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs p-3 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Export</h3>
              <Card padding="md" className="mb-4">
                <p className="text-sm font-medium mb-1">{title || product?.name}</p>
                <p className="text-xs text-slate-500">{niche?.name} · {colorScheme?.name} · {pageSize.toUpperCase()}</p>
                {colorScheme && (
                  <div className="flex gap-2 mt-3">
                    {[colorScheme.primary, colorScheme.secondary, colorScheme.accent].map((c) => (
                      <div key={c} className="w-6 h-6 rounded-full border border-slate-200" style={{ background: c }} title={c} />
                    ))}
                  </div>
                )}
              </Card>
              <Button onClick={downloadPDF} loading={loading} size="lg" className="w-full mb-3">
                ⬇️ Download PDF
              </Button>
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  Open PDF in new tab
                </a>
              )}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Next steps:</p>
                <a href="/etsy-helper" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline block">
                  → Generate Etsy listing (title, tags, description)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="p-6 flex items-center gap-2"><Spinner /><span>Loading…</span></div>}>
      <GenerateContent />
    </Suspense>
  );
}
