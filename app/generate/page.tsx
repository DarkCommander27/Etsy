'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { NICHES, getNicheById, NICHE_LIGHT_COLORS, NICHE_TEXT_COLORS } from '@/lib/niches';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

// Friendly content preview — renders AI-generated content as readable cards
function ContentPreview({ content }: { content: Record<string, unknown> }) {
  const c = content;
  const str = (v: unknown) => (v ? String(v) : '');
  const bottomNote = (c.affirmation || c.reminder || c.after_instruction || c.note) as string | undefined;
  return (
    <div className="space-y-3 text-sm">
      {c.title ? (
        <div className="font-bold text-base text-slate-900 dark:text-slate-100">{str(c.title)}</div>
      ) : null}
      {c.subtitle ? (
        <div className="text-slate-500 dark:text-slate-400 italic">{str(c.subtitle)}</div>
      ) : null}
      {c.instructions ? (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-blue-800 dark:text-blue-200 text-xs">
          📋 {str(c.instructions)}
        </div>
      ) : null}
      {Array.isArray(c.top_3_priorities) ? (
        <div>
          <p className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-1">Top 3 Priorities</p>
          {(c.top_3_priorities as string[]).map((p, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
              <span className="text-slate-700 dark:text-slate-300">{p}</span>
            </div>
          ))}
        </div>
      ) : null}
      {Array.isArray(c.time_blocks) ? (
        <div>
          <p className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-1">Schedule</p>
          <div className="grid grid-cols-2 gap-1">
            {(c.time_blocks as Array<{time: string; task: string}>).slice(0, 12).map((b, i) => (
              <div key={i} className="flex gap-2 text-xs py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 w-16 shrink-0">{b.time}</span>
                <span className="text-slate-400 truncate">{b.task || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {Array.isArray(c.sections) ? (
        <div className="space-y-2">
          {(c.sections as Array<{name: string; description?: string; items: string[]}>).map((sec, i) => (
            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{sec.name}</p>
              {sec.description ? <p className="text-xs text-slate-400 mb-2">{sec.description}</p> : null}
              <ul className="space-y-1">
                {(sec.items || []).slice(0, 6).map((item, j) => (
                  <li key={j} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="text-indigo-400 mt-0.5">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      {Array.isArray(c.categories) ? (
        <div className="space-y-2">
          {(c.categories as Array<{name: string; icon?: string; lines?: number}>).map((cat, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span>{cat.icon || '📌'}</span>
              <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{cat.name}</span>
              {cat.lines ? <span className="text-slate-400 text-xs ml-auto">{cat.lines} lines</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      {Array.isArray(c.steps) ? (
        <div className="space-y-2">
          {(c.steps as Array<{number: number; sense: string; icon?: string; instruction: string}>).map((stepItem, i) => (
            <div key={i} className="flex gap-3 items-start p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{stepItem.number}</span>
              <div>
                <p className="font-semibold text-xs text-indigo-600 dark:text-indigo-400">{stepItem.icon} {stepItem.sense}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{stepItem.instruction}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {Array.isArray(c.prompts) ? (
        <div className="space-y-2">
          {(c.prompts as string[]).map((prompt, i) => (
            <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-700 dark:text-slate-300">
              ✏️ {prompt}
            </div>
          ))}
        </div>
      ) : null}
      {Array.isArray(c.columns) ? (
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min((c.columns as unknown[]).length, 4)}, 1fr)` }}>
          {(c.columns as Array<{name: string; prompt: string}>).map((col, i) => (
            <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-center">
              <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">{col.name}</p>
              <p className="text-xs text-slate-400 mt-1">{col.prompt}</p>
            </div>
          ))}
        </div>
      ) : null}
      {bottomNote ? (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950 border-l-4 border-indigo-400 rounded-r-lg text-xs text-indigo-800 dark:text-indigo-200 italic">
          💬 {bottomNote}
        </div>
      ) : null}
    </div>
  );
}

interface EtsyListing {
  title: string;
  tags: string[];
  description: string;
}

function GenerateContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [nicheId, setNicheId] = useState(searchParams.get('niche') || '');
  const [productTypeId, setProductTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [colorSchemeId, setColorSchemeId] = useState('');
  const [pageSize, setPageSize] = useState('letter');
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [qualityInfo, setQualityInfo] = useState<{ score: number; passed: boolean; issues: string[]; warnings: string[] } | null>(null);

  // Step 6 — Etsy listing
  const [etsyListing, setEtsyListing] = useState<EtsyListing | null>(null);
  const [etsyLoading, setEtsyLoading] = useState(false);
  const [etsyPrice, setEtsyPrice] = useState('5.00');
  const [etsyConnected, setEtsyConnected] = useState(false);
  const [etsyPublishing, setEtsyPublishing] = useState(false);
  const [etsyPublished, setEtsyPublished] = useState<{ listing_id: number; url?: string; warning?: string } | null>(null);
  const [etsyError, setEtsyError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const niche = getNicheById(nicheId);
  const product = niche?.products.find((p) => p.id === productTypeId);
  const colorScheme = niche?.colorSchemes.find((c) => c.id === colorSchemeId) || niche?.colorSchemes[0];

  useEffect(() => {
    if (nicheId && searchParams.get('niche')) setStep(2);
    // Check Etsy connection
    fetch('/api/etsy/status').then((r) => r.json()).then(({ connected }) => setEtsyConnected(!!connected)).catch(() => {});
  }, [nicheId, searchParams]);

  // Auto-generate Etsy listing when entering step 6
  useEffect(() => {
    if (step === 6 && !etsyListing && !etsyLoading && nicheId && productTypeId) {
      generateEtsyListing();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function getSettings() {
    try { return JSON.parse(localStorage.getItem('etsygen-settings') || '{}'); }
    catch { return {}; }
  }

  async function generateAIContent() {
    setLoading(true);
    setError('');
    setQualityInfo(null);
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
      setQualityInfo(data.quality || null);
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

  async function generateEtsyListing() {
    setEtsyLoading(true);
    setEtsyError('');
    try {
      const res = await fetch('/api/generate-etsy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheId, productTypeId, productName: title || product?.name, settings: getSettings() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEtsyListing(data.listing);
    } catch (e) {
      setEtsyError(e instanceof Error ? e.message : 'Failed to generate Etsy listing');
    } finally {
      setEtsyLoading(false);
    }
  }

  async function publishToEtsy() {
    if (!etsyListing) return;
    setEtsyPublishing(true);
    setEtsyError('');
    try {
      const s = getSettings();
      let finalContent = content;
      try { finalContent = JSON.parse(editableContent); } catch { /* use original */ }

      const res = await fetch('/api/etsy/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: etsyListing.title,
          description: etsyListing.description,
          tags: etsyListing.tags,
          price: parseFloat(etsyPrice) || 5.0,
          shopId: s.etsyShopId,
          apiKey: s.etsyApiKey,
          pdfOptions: { pageSize, colorScheme, title: title || product?.name, nicheId, productTypeId, content: finalContent },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEtsyPublished({ listing_id: data.listing?.listing_id, warning: data.warning });
    } catch (e) {
      setEtsyError(e instanceof Error ? e.message : 'Failed to publish to Etsy');
    } finally {
      setEtsyPublishing(false);
    }
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const steps = [
    { label: 'Niche', hint: 'Pick a category' },
    { label: 'Product', hint: 'Pick what to make' },
    { label: 'Customize', hint: 'Colors & size' },
    { label: 'Generate', hint: 'AI creates content' },
    { label: 'Review', hint: 'Preview & download' },
    { label: 'List on Etsy', hint: 'Publish it!' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header with progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Generate Product</h1>
          <span className="text-sm text-slate-500 dark:text-slate-400">Step {step} of {steps.length}</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3">
          <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(step / steps.length) * 100}%` }} />
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1 shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline whitespace-nowrap ${step === i + 1 ? 'font-semibold text-indigo-600 dark:text-indigo-400' : step > i + 1 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`w-5 h-px mt-0 mb-3 ${step > i + 1 ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>}

      {/* Step 1: Pick Niche */}
      {step === 1 && (
        <div>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">What kind of products do you make?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Pick the niche that best fits the product you want to create. You can make products from any niche anytime.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {NICHES.map((n) => (
              <button key={n.id} onClick={() => { setNicheId(n.id); setProductTypeId(''); setColorSchemeId(''); setStep(2); }}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-100 ${NICHE_LIGHT_COLORS[n.color]}`}>
                <span className="text-2xl">{n.icon}</span>
                <div>
                  <p className={`font-semibold text-sm ${NICHE_TEXT_COLORS[n.color]}`}>{n.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{n.description}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{n.products.length} products →</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Pick Product Type */}
      {step === 2 && niche && (
        <div>
          <button onClick={() => setStep(1)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back to Niches</button>
          <div className="mb-5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-2 ${NICHE_LIGHT_COLORS[niche.color]}`}>
              <span>{niche.icon}</span>
              <span className={NICHE_TEXT_COLORS[niche.color]}>{niche.name}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Which product do you want to create?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Click any product to start. The AI will generate all the content for you.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {niche.products.map((p) => (
              <button key={p.id} onClick={() => { setProductTypeId(p.id); setTitle(p.name); setColorSchemeId(niche.colorSchemes[0].id); setStep(3); }}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:border-indigo-400 hover:shadow-md hover:scale-[1.02] active:scale-100 transition-all">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{p.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{p.description}</p>
                  <p className="text-xs text-indigo-500 mt-1.5">{p.pages} page{p.pages > 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Customize */}
      {step === 3 && niche && product && (
        <div className="max-w-xl">
          <button onClick={() => setStep(2)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back to Products</button>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customize your {product.icon} {product.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Pick colors, font, and size. The defaults already look great — just click Continue if unsure.</p>
          </div>
          <div className="space-y-5">
            <Input label="Title / Heading (optional — leave as-is for the product name)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={product.name} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color Scheme</label>
              <div className="grid grid-cols-2 gap-2">
                {niche.colorSchemes.map((cs) => (
                  <button key={cs.id} onClick={() => setColorSchemeId(cs.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${colorSchemeId === cs.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-slate-200 dark:border-slate-600'}`}>
                    <div className="flex gap-1">
                      <div className="w-5 h-5 rounded-full border border-slate-200 shadow-sm" style={{ background: cs.primary }} />
                      <div className="w-5 h-5 rounded-full border border-slate-200 shadow-sm" style={{ background: cs.secondary }} />
                      <div className="w-5 h-5 rounded-full border border-slate-200 shadow-sm" style={{ background: cs.accent }} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cs.name}</span>
                    {colorSchemeId === cs.id && <span className="ml-auto text-indigo-600 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <Select label="Page Size" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
              <option value="letter">US Letter (8.5" × 11") — Best for US customers</option>
              <option value="a4">A4 (210mm × 297mm) — Best for international customers</option>
              <option value="a5">A5 (148mm × 210mm) — Compact / journal size</option>
            </Select>
          </div>
          <div className="mt-6">
            <Button onClick={() => setStep(4)} className="w-full" size="lg">Continue → Generate Content with AI</Button>
          </div>
        </div>
      )}

      {/* Step 4: Generate Content */}
      {step === 4 && niche && product && (
        <div className="max-w-xl">
          <button onClick={() => setStep(3)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back to Customize</button>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ready to generate!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">AI will create all the content for your product. This takes about 5–15 seconds. You can review and edit it before downloading.</p>
          </div>
          <Card padding="md" className="mb-6 border-2 border-indigo-100 dark:border-indigo-900">
            <div className="flex items-center gap-4">
              <span className="text-3xl">{product.icon}</span>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">{title || product.name}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{niche.icon} {niche.name}</span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{colorScheme?.name}</span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{pageSize.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </Card>
          <Button onClick={generateAIContent} loading={loading} size="lg" className="w-full">
            {loading ? '✨ Generating your content...' : '✨ Generate Content with AI'}
          </Button>
          {loading && (
            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
              <p className="text-sm text-indigo-700 dark:text-indigo-300 text-center">
                🧠 AI is creating your {product.name}...
              </p>
              <p className="text-xs text-indigo-500 text-center mt-1">This takes about 5–15 seconds. Hang tight!</p>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Review & Export */}
      {step === 5 && content && (
        <div>
          <button onClick={() => setStep(4)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back</button>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">✅ Content generated! Review your product.</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">This is what will be on your PDF. Happy with it? Download the PDF, then continue to create your Etsy listing.</p>
          </div>

          {/* Quality Indicator */}
          {qualityInfo && (
            <Card padding="md" className="mb-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  {qualityInfo.score >= 85 ? (
                    <span className="text-2xl">🌟</span>
                  ) : qualityInfo.score >= 70 ? (
                    <span className="text-2xl">✅</span>
                  ) : (
                    <span className="text-2xl">⚠️</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      Quality Score: {qualityInfo.score}/100
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      qualityInfo.score >= 85
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : qualityInfo.score >= 70
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {qualityInfo.score >= 85 ? 'Excellent' : qualityInfo.score >= 70 ? 'Good' : 'Acceptable'}
                    </span>
                  </div>
                  {qualityInfo.issues.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Issues:</p>
                      <ul className="space-y-1">
                        {qualityInfo.issues.map((issue, i) => (
                          <li key={i} className="text-xs text-red-600 dark:text-red-400 flex gap-1">
                            <span>•</span><span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {qualityInfo.warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Suggestions:</p>
                      <ul className="space-y-1">
                        {qualityInfo.warnings.map((warning, i) => (
                          <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex gap-1">
                            <span>•</span><span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {qualityInfo.score >= 85 && qualityInfo.issues.length === 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✨ Your content meets high-quality standards and is ready for professional use!
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Content Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">📄 Content Preview</h3>
                <button
                  onClick={() => {
                    if (showRawJson) {
                      // Switching from JSON editor → preview: parse and apply changes
                      try {
                        const parsed = JSON.parse(editableContent);
                        setContent(parsed);
                      } catch { /* keep old content if JSON is invalid */ }
                    }
                    setShowRawJson(!showRawJson);
                  }}
                  className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {showRawJson ? '👁️ Preview' : '⚙️ Edit JSON'}
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 max-h-[500px] overflow-y-auto">
                {showRawJson ? (
                  <textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    rows={16}
                    className="w-full bg-transparent text-slate-900 dark:text-slate-100 text-xs p-0 font-mono focus:outline-none"
                    spellCheck={false}
                  />
                ) : (
                  <ContentPreview content={content} />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {showRawJson ? '⚠️ Edit JSON carefully — changes update your PDF.' : 'Looks good? Download your PDF below.'}
              </p>
            </div>
            {/* Export Panel */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">📦 Export Options</h3>
              <Card padding="md" className="mb-4 border-2 border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{product?.icon}</span>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{title || product?.name}</p>
                    <p className="text-xs text-slate-500">{niche?.name} · {pageSize.toUpperCase()}</p>
                  </div>
                </div>
                {colorScheme && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Colors:</span>
                    {[colorScheme.primary, colorScheme.secondary, colorScheme.accent].map((c) => (
                      <div key={c} className="w-5 h-5 rounded-full border border-slate-200 shadow-sm" style={{ background: c }} title={c} />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">{colorScheme.name}</span>
                  </div>
                )}
              </Card>
              <Button onClick={downloadPDF} loading={loading} size="lg" className="w-full mb-3">
                {loading ? '⏳ Generating PDF...' : '⬇️ Download PDF'}
              </Button>
              {pdfUrl && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">✅ PDF downloaded!</p>
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Open PDF in browser →
                  </a>
                </div>
              )}
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg mb-3">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">Next: Create your Etsy listing</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">AI will write your SEO title, 13 tags, and description automatically.</p>
              </div>
              <Button
                onClick={() => setStep(6)}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                Next: Create Etsy Listing →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: List on Etsy */}
      {step === 6 && (
        <div>
          <button onClick={() => setStep(5)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back to PDF</button>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">🛍️ Create Your Etsy Listing</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              AI has written your SEO-optimized title, tags, and description. Review them, set your price, then publish with one click.
            </p>
          </div>

          {etsyError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {etsyError}
              {!etsyConnected && (
                <span> — <a href="/settings" className="underline">Connect Etsy in Settings</a></span>
              )}
            </div>
          )}

          {etsyPublished ? (
            <Card padding="lg" className="text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">Draft Created on Etsy!</p>
              {etsyPublished.warning && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-3 bg-amber-50 dark:bg-amber-950 p-2 rounded">{etsyPublished.warning}</p>
              )}
              <p className="text-slate-500 text-sm mb-4">
                Listing ID: {etsyPublished.listing_id} — Go to your Etsy shop to review and publish.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a
                  href="https://www.etsy.com/your/listings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >
                  View on Etsy →
                </a>
                <button
                  onClick={() => { setStep(1); setNicheId(''); setProductTypeId(''); setContent(null); setEtsyListing(null); setEtsyPublished(null); setPdfUrl(''); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >
                  ✨ Generate Another Product
                </button>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Listing fields */}
              <div className="space-y-4">
                {etsyLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 py-8">
                    <Spinner />
                    <span className="text-sm">Generating SEO-optimized listing…</span>
                  </div>
                ) : etsyListing ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Title <span className="font-normal text-slate-400">({etsyListing.title?.length}/140)</span>
                        </label>
                        <button onClick={() => copyText(etsyListing.title, 'title')}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                          {copied === 'title' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <textarea
                        value={etsyListing.title}
                        onChange={(e) => setEtsyListing({ ...etsyListing, title: e.target.value })}
                        maxLength={140}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Tags <span className="font-normal text-slate-400">({etsyListing.tags?.length}/13)</span>
                        </label>
                        <button onClick={() => copyText(etsyListing.tags?.join(', '), 'tags')}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                          {copied === 'tags' ? '✓ Copied' : 'Copy all'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {etsyListing.tags?.map((tag, i) => (
                          <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                        <button onClick={() => copyText(etsyListing.description, 'desc')}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                          {copied === 'desc' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <textarea
                        value={etsyListing.description}
                        onChange={(e) => setEtsyListing({ ...etsyListing, description: e.target.value })}
                        rows={8}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                ) : (
                  <button onClick={generateEtsyListing}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Regenerate listing
                  </button>
                )}
              </div>

              {/* Publish panel */}
              <div>
                <Card padding="md" className="mb-4">
                  <p className="text-sm font-semibold mb-3">Publish Settings</p>
                  <Input
                    label="Price (USD)"
                    type="number"
                    min="0.20"
                    step="0.50"
                    value={etsyPrice}
                    onChange={(e) => setEtsyPrice(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">Etsy recommends $3–$10 for digital downloads</p>
                </Card>

                {etsyConnected ? (
                  <Button
                    onClick={publishToEtsy}
                    loading={etsyPublishing}
                    disabled={!etsyListing || etsyLoading}
                    size="lg"
                    className="w-full mb-3 bg-orange-500 hover:bg-orange-600 focus:ring-orange-400"
                  >
                    {etsyPublishing ? 'Publishing...' : '🚀 Publish Draft to Etsy'}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-xs">
                      <strong>Etsy not connected.</strong> <a href="/settings" className="underline">Connect in Settings</a> to auto-publish, or copy the listing details and create manually on Etsy.
                    </div>
                    <button
                      onClick={() => copyText(`Title: ${etsyListing?.title}\n\nTags: ${etsyListing?.tags?.join(', ')}\n\nDescription:\n${etsyListing?.description}`, 'all')}
                      className="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copied === 'all' ? '✓ Copied!' : '📋 Copy All Listing Details'}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => { setStep(1); setNicheId(''); setProductTypeId(''); setContent(null); setEtsyListing(null); setEtsyPublished(null); setPdfUrl(''); }}
                  className="w-full text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mt-3 py-2 transition-colors"
                >
                  ✨ Generate Another Product
                </button>
              </div>
            </div>
          )}
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

