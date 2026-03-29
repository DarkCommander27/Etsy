'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NICHES } from '@/lib/niches';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { NicheResearchResult, TopListing } from '@/app/api/niche-research/route';

const STORAGE_KEY = 'etsygen-settings';

const QUICK_KEYWORDS = [
  ...NICHES.map((n) => n.name),
  'printable planner',
  'digital journal',
  'habit tracker printable',
  'notion template',
  'adhd planner',
  'budget spreadsheet',
  'wedding planner',
  'fitness tracker',
  'meal planner printable',
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 60 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
    score >= 35 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {score}/100
    </span>
  );
}

function LevelBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[level]}`}>
      {level}
    </span>
  );
}

function OpportunityBar({ score }: { score: number }) {
  const color = score >= 60 ? 'bg-green-500' : score >= 35 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
      <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function NicheResearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [etsyApiKey, setEtsyApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<NicheResearchResult | null>(null);
  const [history, setHistory] = useState<NicheResearchResult[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.etsyApiKey) setEtsyApiKey(settings.etsyApiKey);
      }
    } catch { /* ignore */ }
  }, []);

  async function research(kw: string) {
    const k = kw.trim();
    if (!k) return;
    setKeyword(k);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/niche-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: k, etsyApiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Research failed');
        return;
      }
      const r = data as NicheResearchResult;
      setResult(r);
      setHistory((prev) => [r, ...prev.filter((x) => x.keyword !== r.keyword)].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function useNiche(kw: string) {
    // Find a matching niche id from NICHES by name or use the keyword as search
    const match = NICHES.find((n) => n.name.toLowerCase() === kw.toLowerCase());
    if (match) {
      router.push(`/generate?niche=${match.id}`);
    } else {
      // Pass keyword as a custom query so user can pick niche manually
      router.push(`/generate?q=${encodeURIComponent(kw)}`);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Niche Research</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Find high-demand, low-competition keywords before you generate listings.
        </p>
      </div>

      {/* Search bar */}
      <Card padding="md" className="mb-6">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="e.g. ADHD planner, budget tracker, wedding journal…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && research(keyword)}
            />
          </div>
          <Button
            onClick={() => research(keyword)}
            disabled={loading || !keyword.trim() || !etsyApiKey}
            className="shrink-0"
          >
            {loading ? <><Spinner className="w-4 h-4 mr-2" />Researching…</> : '🔍 Research'}
          </Button>
        </div>
        {!etsyApiKey && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            ⚠️ No Etsy API key found.{' '}
            <a href="/settings" className="underline">Add it in Settings</a> to enable research.
          </p>
        )}
      </Card>

      {/* Quick-pick keywords */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Quick Research</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => research(kw)}
              disabled={loading || !etsyApiKey}
              className="px-3 py-1.5 text-xs rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-slate-500 py-8 justify-center">
          <Spinner />
          <span>Analyzing <strong>{keyword}</strong> on Etsy…</span>
        </div>
      )}

      {/* Result */}
      {result && !loading && <ResearchResult result={result} onUse={useNiche} />}

      {/* History */}
      {history.length > 1 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Recent Searches</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice(1).map((r) => (
              <button
                key={r.keyword}
                onClick={() => setResult(r)}
                className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{r.keyword}</span>
                  <ScoreBadge score={r.opportunityScore} />
                </div>
                <OpportunityBar score={r.opportunityScore} />
                <p className="text-xs text-slate-400 mt-1">{r.totalListings.toLocaleString()} listings</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResearchResult({ result, onUse }: { result: NicheResearchResult; onUse: (kw: string) => void }) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Opportunity"
          value={<ScoreBadge score={result.opportunityScore} />}
          sub={<OpportunityBar score={result.opportunityScore} />}
        />
        <MetricCard
          label="Competition"
          value={result.totalListings.toLocaleString()}
          sub={<LevelBadge level={result.competitionLevel} />}
        />
        <MetricCard
          label="Avg Favorers"
          value={result.avgFavorers.toLocaleString()}
          sub={<LevelBadge level={result.demandLevel} />}
        />
        <MetricCard
          label="Avg Price"
          value={result.avgPrice > 0 ? `$${result.avgPrice.toFixed(2)}` : '—'}
          sub={<span className="text-xs text-slate-400">per listing</span>}
        />
      </div>

      {/* Interpretation */}
      <Card padding="md" className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          {interpretation(result)}
        </p>
      </Card>

      {/* Top listings */}
      {result.topListings.length > 0 && (
        <Card padding="none">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Top Listings for "{result.keyword}"</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {result.topListings.map((listing) => (
              <TopListingRow key={listing.id} listing={listing} />
            ))}
          </div>
        </Card>
      )}

      {/* Action */}
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onUse(result.keyword)}>
          ✨ Generate listings for "{result.keyword}"
        </Button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return (
    <Card padding="md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{value}</div>
      <div>{sub}</div>
    </Card>
  );
}

function TopListingRow({ listing }: { listing: TopListing }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline line-clamp-2"
        >
          {listing.title}
        </a>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{listing.price}</div>
        <div className="text-xs text-slate-400">❤️ {listing.favorers.toLocaleString()}</div>
      </div>
    </div>
  );
}

function interpretation(r: NicheResearchResult): string {
  const score = r.opportunityScore;
  const kw = `"${r.keyword}"`;

  if (score >= 60) {
    return `${kw} looks like a strong opportunity — solid buyer interest with manageable competition. This is a good niche to target now.`;
  }
  if (score >= 40) {
    if (r.competitionLevel === 'high') {
      return `${kw} has decent demand but heavy competition (${r.totalListings.toLocaleString()} listings). Focus on a more specific long-tail variation to stand out.`;
    }
    return `${kw} shows moderate potential. Competition is manageable — differentiate with a unique angle or style.`;
  }
  if (r.demandLevel === 'low') {
    return `${kw} has low buyer engagement signals. Consider a more specific or trending variation, or explore adjacent niches.`;
  }
  return `${kw} is heavily saturated (${r.totalListings.toLocaleString()} listings). High competition requires exceptional SEO or a narrow sub-niche to break through.`;
}
