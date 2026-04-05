'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Wand2, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { NICHES, NICHE_LIGHT_COLORS, NICHE_TEXT_COLORS, getNicheById } from '@/lib/niches';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type BadgeVariant = 'default' | 'blue' | 'purple' | 'teal' | 'amber' | 'green' | 'slate' | 'red';
const BADGE_VARIANTS = new Set<BadgeVariant>(['default', 'blue', 'purple', 'teal', 'amber', 'green', 'slate', 'red']);
function toBadgeVariant(color: string | undefined): BadgeVariant {
  return BADGE_VARIANTS.has(color as BadgeVariant) ? (color as BadgeVariant) : 'default';
}

interface HistoryEntry {
  id: string;
  nicheId: string;
  productTypeId: string;
  title: string;
  createdAt: string;
}

export default function Dashboard() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    fetch('/api/history')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Could not load history.');
        }
        return data;
      })
      .then(({ history: h }) => {
        if (!Array.isArray(h)) return;
        setHistory(h);
        const today = new Date().toDateString();
        setTodayCount(h.filter((e: HistoryEntry) => new Date(e.createdAt).toDateString() === today).length);
      })
      .catch((err) => setHistoryError(err instanceof Error ? err.message : 'Could not load history.'));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          🛍️ EtsyGen Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Your personal digital product generator
        </p>
      </div>

      {historyError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {historyError}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{todayCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Generated today</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{history.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total generated</p>
            </div>
          </div>
        </Card>
        <Card padding="md" className="col-span-2 md:col-span-1">
          <Link href="/generate" className="flex items-center gap-3 group">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Wand2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Generate New
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create a product →</p>
            </div>
          </Link>
        </Card>
      </div>

      {/* CTA */}
      <div className="mb-8">
        <Link
          href="/generate"
          className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-base"
        >
          <Wand2 className="h-5 w-5" />
          Generate a New Product
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Niches */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Product Niches
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {NICHES.map((niche) => (
            <Link
              key={niche.id}
              href={`/generate?niche=${niche.id}`}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md ${NICHE_LIGHT_COLORS[niche.color]}`}
            >
              <span className="text-2xl">{niche.icon}</span>
              <div>
                <p className={`font-semibold text-sm ${NICHE_TEXT_COLORS[niche.color]}`}>
                  {niche.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {niche.description}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {niche.products.length} products
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent Products
            </h2>
            <Link
              href="/history"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((entry) => {
              const niche = getNicheById(entry.nicheId);
              return (
                <Card key={entry.id} padding="sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{niche?.icon || '📄'}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {entry.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {niche?.name} · {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={toBadgeVariant(niche?.color)}>
                      {entry.productTypeId.replace(/-/g, ' ')}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
