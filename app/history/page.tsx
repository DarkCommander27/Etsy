'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getNicheById } from '@/lib/niches';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

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
  colorScheme: string;
  pageSize: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then(({ history: h }) => { setHistory(Array.isArray(h) ? h : []); })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

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

      {!loading && history.length === 0 && (
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
          return (
            <Card key={entry.id} padding="md">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{niche?.icon || '📄'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {entry.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {niche?.name} · {entry.productTypeId.replace(/-/g, ' ')} · {entry.pageSize?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={toBadgeVariant(niche?.color)}>
                    {entry.colorScheme}
                  </Badge>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
