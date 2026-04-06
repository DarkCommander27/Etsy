'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getNicheById, getProductById } from '@/lib/niches';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { readJsonResponse } from '@/lib/utils';

const GENERATE_DRAFT_KEY = 'etsy_generate_draft';

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

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [restoredId, setRestoredId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/history')
      .then(async (r) => {
        const data = await readJsonResponse<{ error?: string; history?: HistoryEntry[] }>(r);
        if (!r.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : `Could not load history (${r.status}).`);
        }
        return data;
      })
      .then((data) => {
        setHistory(Array.isArray(data?.history) ? data.history : []);
        setHistoryError('');
      })
      .catch((err) => {
        setHistory([]);
        setHistoryError(err instanceof Error ? err.message : 'Could not load history.');
      })
      .finally(() => setLoading(false));
  }, []);

  const restoreDraft = useCallback((entry: HistoryEntry) => {
    try {
      const niche = getNicheById(entry.nicheId);
      const colorSchemeId = niche?.colorSchemes.find((c) => c.name === entry.colorScheme)?.id
        || niche?.colorSchemes[0]?.id || '';
      const draft = {
        step: entry.content ? 5 : 3,
        nicheId: entry.nicheId,
        productTypeId: entry.productTypeId,
        title: entry.title,
        colorSchemeId,
        pageSize: entry.pageSize || 'letter',
        content: entry.content || null,
        editableContent: entry.content ? JSON.stringify(entry.content, null, 2) : '',
        contentWarnings: [],
        qualityScore: null,
        qualityIssues: [],
        qualityTemplateId: 'best-quality',
        variationId: 'standard',
        generatedImages: entry.generatedImages || [],
        imageWarnings: [],
        imageProviderMode: (entry.generatedImages?.length ? 'openai' : null),
        etsyListing: null,
        listingWarnings: [],
        etsyPrice: '5.00',
        etsyPublished: null,
        publishWarnings: [],
        automationStatus: '',
      };
      localStorage.setItem(GENERATE_DRAFT_KEY, JSON.stringify(draft));
      setRestoredId(entry.id);
      setTimeout(() => router.push('/generate'), 600);
    } catch {
      // ignore localStorage errors
    }
  }, [router]);

  const todayCount = history.filter(
    (e) => new Date(e.createdAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Generation History</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {history.length} total · {todayCount} today
          </p>
        </div>
        <Link
          href="/generate"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Product
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-500">
          <Spinner />
          <span>Loading history…</span>
        </div>
      )}

      {!loading && historyError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {historyError}
        </div>
      )}

      {!loading && !historyError && history.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-slate-500 dark:text-slate-400 mb-4">No products generated yet.</p>
          <Link href="/generate" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
            Generate your first product →
          </Link>
        </Card>
      )}

      <div className="space-y-3">
        {history.map((entry) => {
          const niche = getNicheById(entry.nicheId);
          const product = niche ? getProductById(entry.nicheId, entry.productTypeId) : undefined;
          const images = entry.generatedImages || [];
          const isRestored = restoredId === entry.id;
          return (
            <Card key={entry.id} padding="md">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{niche?.icon || '📄'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {entry.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {niche?.name} · {product?.name || entry.productTypeId.replace(/-/g, ' ')} · {entry.pageSize?.toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {new Date(entry.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Badge variant={toBadgeVariant(niche?.color)}>
                        {entry.colorScheme}
                      </Badge>
                      {entry.content && (
                        <button
                          onClick={() => restoreDraft(entry)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                            isRestored
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800'
                          }`}
                        >
                          {isRestored ? '✓ Restoring…' : '↩ Restore Draft'}
                        </button>
                      )}
                      <Link
                        href={`/generate?niche=${encodeURIComponent(entry.nicheId)}&product=${encodeURIComponent(entry.productTypeId)}`}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline font-medium"
                      >
                        Re-generate →
                      </Link>
                    </div>
                  </div>

                  {images.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {images.slice(0, 3).map((img) => (
                        <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" title={`Listing image ${img.rank}`}>
                          <Image
                            src={img.url}
                            alt={`Listing image ${img.rank}`}
                            width={120}
                            height={80}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 object-cover h-20 w-[120px] shrink-0 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
