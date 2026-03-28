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
  const [font, setFont] = useState(FONTS[0]);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [editableContent, setEditableContent] = useState('');

  // Step 6 — Etsy listing
  const [etsyListing, setEtsyListing] = useState<EtsyListing | null>(null);
  const [etsyLoading, setEtsyLoading] = useState(false);
  const [etsyPrice, setEtsyPrice] = useState('5.00');
  const [etsyConnected, setEtsyConnected] = useState(false);
  const [etsyPublishing, setEtsyPublishing] = useState(false);
  const [etsyPublished, setEtsyPublished] = useState<{ listing_id: number; url?: string; warning?: string } | null>(null);
  const [etsyError, setEtsyError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

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

  const steps = ['Niche', 'Product', 'Customize', 'Generate', 'Review', 'List on Etsy'];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Generate Product</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${step === i + 1 ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{s}</span>
            {i < steps.length - 1 && <div className="w-4 h-px bg-slate-300 dark:bg-slate-600" />}
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
            <div className="flex items-center gap-3">
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

      {/* Step 5: Review & Export */}
      {step === 5 && content && (
        <div>
          <button onClick={() => setStep(4)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back</button>
          <h2 className="text-lg font-semibold mb-4">Step 5: Review & Export PDF</h2>
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
                  className="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4">
                  Open PDF in new tab
                </a>
              )}
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
          <button onClick={() => setStep(5)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1">← Back</button>
          <h2 className="text-lg font-semibold mb-2">Step 6: List on Etsy</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
            AI generates an SEO-optimized title, tags, and description. Review, adjust price, then publish.
          </p>

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

