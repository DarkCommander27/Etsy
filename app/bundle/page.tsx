'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getNicheById, getProductById } from '@/lib/niches';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { readJsonResponse, getApiErrorMessage } from '@/lib/utils';
import { getSettings } from '@/lib/settings';

type BadgeVariant = 'default' | 'blue' | 'purple' | 'teal' | 'amber' | 'green' | 'slate' | 'red';
const BADGE_VARIANTS = new Set<BadgeVariant>(['default', 'blue', 'purple', 'teal', 'amber', 'green', 'slate', 'red']);
function toBadgeVariant(color: string | undefined): BadgeVariant {
  return BADGE_VARIANTS.has(color as BadgeVariant) ? (color as BadgeVariant) : 'default';
}

interface GeneratedImage {
  id: string;
  rank: number;
  filename: string;
  url: string;
  width: number;
  height: number;
  prompt: string;
  createdAt: string;
}

interface HistoryEntry {
  id: string;
  nicheId: string;
  productTypeId: string;
  title: string;
  colorScheme: string;
  pageSize: string;
  createdAt: string;
  content?: Record<string, unknown>;
  generatedImages?: GeneratedImage[];
}

interface EtsyListing {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  taxonomyId?: number;
}

const MAX_BUNDLE = 8;

export default function BundlePage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bundleTitle, setBundleTitle] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [listingLoading, setListingLoading] = useState(false);
  const [listing, setListing] = useState<EtsyListing | null>(null);
  const [listingError, setListingError] = useState('');

  useEffect(() => {
    fetch('/api/history')
      .then(async (r) => {
        const data = await readJsonResponse<{ error?: string; history?: HistoryEntry[] }>(r);
        if (!r.ok) throw new Error(typeof data?.error === 'string' ? data.error : `Could not load history (${r.status}).`);
        return data;
      })
      .then((data) => {
        // Only entries with content can be bundled (need content to regenerate PDF)
        const withContent = (Array.isArray(data?.history) ? data.history : []).filter((e) => !!e.content);
        setHistory(withContent);
        setHistoryError('');
      })
      .catch((err) => {
        setHistoryError(err instanceof Error ? err.message : 'Could not load history.');
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_BUNDLE) {
        next.add(id);
      }
      return next;
    });
    setListing(null);
    setListingError('');
    setDownloadError('');
  }

  const selectedItems = history.filter((e) => selected.has(e.id));
  const resolvedBundleTitle = bundleTitle.trim() ||
    selectedItems.map((e) => e.title.replace(/ Printable.*$/i, '').replace(/ Digital.*$/i, '').trim()).join(' + ') + ' Bundle';

  async function downloadBundlePDF() {
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch('/api/bundle-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleTitle: resolvedBundleTitle,
          items: selectedItems.map((e) => ({
            nicheId: e.nicheId,
            productTypeId: e.productTypeId,
            title: e.title,
            pageSize: e.pageSize || 'letter',
            content: e.content,
          })),
        }),
      });
      if (!res.ok) {
        const data = await readJsonResponse<{ error?: string }>(res);
        throw new Error(getApiErrorMessage(data, 'Failed to generate bundle PDF'));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resolvedBundleTitle.replace(/[^a-z0-9]/gi, '-')}-bundle.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Failed to generate bundle PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function generateBundleListing() {
    setListingLoading(true);
    setListingError('');
    setListing(null);
    try {
      const bundleProductName = resolvedBundleTitle;
      const res = await fetch('/api/generate-etsy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nicheId: selectedItems[0].nicheId,
          productTypeId: selectedItems[0].productTypeId,
          productName: bundleProductName,
          referenceTitle: bundleProductName,
          settings: getSettings(),
        }),
      });
      const data = await readJsonResponse<{ error?: string; details?: string[]; listing?: EtsyListing }>(res);
      if (!res.ok || data?.error || !data?.listing) {
        throw new Error(getApiErrorMessage(data, 'Failed to generate bundle listing'));
      }
      setListing(data.listing);
    } catch (e) {
      setListingError(e instanceof Error ? e.message : 'Failed to generate bundle listing');
    } finally {
      setListingLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bundle Maker</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Combine 2–{MAX_BUNDLE} products into a single bundle PDF and Etsy listing.
          </p>
        </div>
        <Link
          href="/history"
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
        >
          ← History
        </Link>
      </div>

      {/* Step 1: Select products */}
      <Card padding="md" className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Step 1 — Select products ({selected.size}/{MAX_BUNDLE})
        </h2>

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-4">
            <Spinner />
            <span className="text-sm">Loading history…</span>
          </div>
        )}

        {!loading && historyError && (
          <p className="text-sm text-red-600 dark:text-red-400">{historyError}</p>
        )}

        {!loading && !historyError && history.length === 0 && (
          <div className="text-center py-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">No generated products with content found.</p>
            <Link href="/generate" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
              Generate your first product →
            </Link>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {history.map((entry) => {
            const niche = getNicheById(entry.nicheId);
            const product = niche ? getProductById(entry.nicheId, entry.productTypeId) : undefined;
            const images = entry.generatedImages || [];
            const isSelected = selected.has(entry.id);
            const isDisabled = !isSelected && selected.size >= MAX_BUNDLE;

            return (
              <button
                key={entry.id}
                onClick={() => !isDisabled && toggleSelect(entry.id)}
                disabled={isDisabled}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                    : isDisabled
                      ? 'border-slate-100 dark:border-slate-800 opacity-40 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                    isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {entry.title}
                      </span>
                      <Badge variant={toBadgeVariant(niche?.color)}>
                        {niche?.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {product?.name || entry.productTypeId.replace(/-/g, ' ')} · {entry.pageSize?.toUpperCase()}
                      {' · '}{new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {images[0] && (
                    <Image
                      src={images[0].url}
                      alt=""
                      width={56}
                      height={40}
                      className="rounded object-cover h-10 w-14 shrink-0"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Step 2: Bundle title */}
      {selected.size >= 2 && (
        <Card padding="md" className="mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Step 2 — Bundle title (optional)
          </h2>
          <Input
            label="Bundle title"
            value={bundleTitle}
            onChange={(e) => { setBundleTitle(e.target.value); setListing(null); }}
            placeholder={resolvedBundleTitle}
          />
          <p className="text-xs text-slate-400 mt-1">
            Auto-generated from selected products if left blank.
          </p>

          {/* Selected summary */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selectedItems.map((e) => (
              <span key={e.id} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                {e.title}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Step 3: Actions */}
      {selected.size >= 2 && (
        <Card padding="md" className="mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Step 3 — Generate
          </h2>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={downloadBundlePDF}
              disabled={downloading}
              variant="primary"
            >
              {downloading ? <><Spinner className="mr-2" />Building PDF…</> : '⬇ Download Bundle PDF'}
            </Button>

            <Button
              onClick={generateBundleListing}
              disabled={listingLoading}
              variant="secondary"
            >
              {listingLoading ? <><Spinner className="mr-2" />Generating listing…</> : '✨ Generate Etsy Listing'}
            </Button>
          </div>

          {downloadError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-3">{downloadError}</p>
          )}
          {listingError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-3">{listingError}</p>
          )}
        </Card>
      )}

      {/* Listing result */}
      {listing && (
        <Card padding="md">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Etsy Listing — {resolvedBundleTitle}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Title</label>
              <p className="mt-1 text-sm text-slate-900 dark:text-slate-100 font-medium">{listing.title}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tags ({listing.tags.length})</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {listing.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Description</label>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
            </div>

            {listing.category && (
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Category</label>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{listing.category}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
