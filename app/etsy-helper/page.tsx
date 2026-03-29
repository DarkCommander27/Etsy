'use client';
import { useState } from 'react';
import { NICHES, getNicheById } from '@/lib/niches';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

interface EtsyListing {
  title: string;
  tags: string[];
  description: string;
  category?: string;
  taxonomyId?: number;
}

export default function EtsyHelperPage() {
  const [nicheId, setNicheId] = useState('');
  const [productTypeId, setProductTypeId] = useState('');
  const [listing, setListing] = useState<EtsyListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const niche = getNicheById(nicheId);
  const product = niche?.products.find((p) => p.id === productTypeId);

  function getSettings() {
    try { return JSON.parse(localStorage.getItem('etsygen-settings') || '{}'); }
    catch { return {}; }
  }

  async function generate() {
    if (!nicheId || !productTypeId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-etsy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nicheId,
          productTypeId,
          productName: product?.name,
          settings: getSettings(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setListing(data.listing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate listing');
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Etsy Listing Helper</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Auto-generate SEO-optimized Etsy titles, tags, and descriptions.
      </p>

      <Card padding="md" className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Select
            label="Niche"
            value={nicheId}
            onChange={(e) => { setNicheId(e.target.value); setProductTypeId(''); setListing(null); }}
          >
            <option value="">Select niche…</option>
            {NICHES.map((n) => (
              <option key={n.id} value={n.id}>{n.icon} {n.name}</option>
            ))}
          </Select>
          <Select
            label="Product Type"
            value={productTypeId}
            onChange={(e) => { setProductTypeId(e.target.value); setListing(null); }}
            disabled={!nicheId}
          >
            <option value="">Select product…</option>
            {niche?.products.map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </Select>
        </div>
        <Button onClick={generate} loading={loading} disabled={!nicheId || !productTypeId} className="w-full">
          {loading ? 'Generating…' : '✨ Generate Etsy Listing'}
        </Button>
      </Card>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-slate-500 mb-4">
          <Spinner />
          <span className="text-sm">Generating optimized listing…</span>
        </div>
      )}

      {listing && (
        <div className="space-y-4">
          {/* Title */}
          <Card padding="md">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Title <span className="font-normal text-slate-400">({listing.title?.length}/140 chars)</span>
              </h3>
              <button
                onClick={() => copy(listing.title, 'title')}
                className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors shrink-0"
              >
                {copied === 'title' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 rounded p-3">
              {listing.title}
            </p>
          </Card>

          {/* Tags */}
          <Card padding="md">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tags <span className="font-normal text-slate-400">({listing.tags?.length}/13)</span>
              </h3>
              <button
                onClick={() => copy(listing.tags?.join(', '), 'tags')}
                className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors shrink-0"
              >
                {copied === 'tags' ? '✓ Copied!' : 'Copy all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {listing.tags?.map((tag, i) => (
                <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </Card>

          {/* Description */}
          <Card padding="md">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</h3>
              <button
                onClick={() => copy(listing.description, 'desc')}
                className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors shrink-0"
              >
                {copied === 'desc' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 rounded p-3 whitespace-pre-line">
              {listing.description}
            </p>
          </Card>

          {/* Category */}
          <Card padding="md">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</h3>
              <button
                onClick={() => copy(`${listing.category || 'Paper & Party Supplies > Paper > Calendars & Planners'} (Taxonomy ID: ${listing.taxonomyId || 2078})`, 'category')}
                className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors shrink-0"
              >
                {copied === 'category' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 rounded p-3">
              {listing.category || 'Paper & Party Supplies > Paper > Calendars & Planners'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Taxonomy ID: {listing.taxonomyId || 2078}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
