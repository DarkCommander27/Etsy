import { NextRequest, NextResponse } from 'next/server';
import { NicheResearchResult, TopListing } from '@/lib/nicheResearch';

const ETSY_API_BASE = 'https://openapi.etsy.com/v3/application';
const REQUEST_TIMEOUT_MS = 15_000;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function computeOpportunityScore(totalListings: number, avgFavorers: number): number {
  // Competition: 0 (none) – 1 (saturated). Threshold: 50k listings = max.
  const compNorm = clamp(totalListings / 50_000, 0, 1);

  // Demand: 0 (no interest) – 1 (viral). Threshold: 500 avg favorers = max.
  const demandNorm = clamp(avgFavorers / 500, 0, 1);

  // Opportunity = 60% demand weight + 40% low-competition weight
  const score = demandNorm * 60 + (1 - compNorm) * 40;
  return Math.round(score);
}

function competitionLevel(total: number): 'low' | 'medium' | 'high' {
  if (total < 5_000) return 'low';
  if (total < 20_000) return 'medium';
  return 'high';
}

function demandLevel(avg: number): 'low' | 'medium' | 'high' {
  if (avg < 50) return 'low';
  if (avg < 200) return 'medium';
  return 'high';
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: NextRequest) {
  let body: { keyword?: string; etsyApiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const keyword = (body.keyword ?? '').trim();
  const etsyApiKey = (body.etsyApiKey ?? '').trim();

  if (!keyword) {
    return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
  }
  if (!etsyApiKey) {
    return NextResponse.json({ error: 'Etsy API key is required. Add it in Settings.' }, { status: 400 });
  }

  const params = new URLSearchParams({
    keywords: keyword,
    limit: '20',
    sort_on: 'score',
    sort_order: 'desc',
    includes: 'price',
  });

  const url = `${ETSY_API_BASE}/listings/active?${params.toString()}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      headers: { 'x-api-key': etsyApiKey },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return NextResponse.json({ error: `Etsy API request failed: ${msg}` }, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `Etsy API error ${res.status}: ${text || res.statusText}` },
      { status: res.status >= 500 ? 502 : res.status }
    );
  }

  const data = await res.json() as {
    count: number;
    results: Array<{
      listing_id: number;
      title: string;
      num_favorers: number;
      views: number;
      price?: { amount: number; divisor: number; currency_code: string };
    }>;
  };

  const results = data.results ?? [];
  const totalListings = data.count ?? 0;

  const avgFavorers = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.num_favorers ?? 0), 0) / results.length)
    : 0;

  const pricesWithValues = results
    .map((r) => r.price ? r.price.amount / r.price.divisor : null)
    .filter((p): p is number => p !== null);

  const avgPrice = pricesWithValues.length > 0
    ? Math.round((pricesWithValues.reduce((s, p) => s + p, 0) / pricesWithValues.length) * 100) / 100
    : 0;

  const topListings: TopListing[] = results.slice(0, 5).map((r) => {
    const priceVal = r.price ? (r.price.amount / r.price.divisor).toFixed(2) : '?';
    const currency = r.price?.currency_code ?? 'USD';
    return {
      id: r.listing_id,
      title: r.title,
      price: `${currency} $${priceVal}`,
      favorers: r.num_favorers ?? 0,
      url: `https://www.etsy.com/listing/${r.listing_id}`,
    };
  });

  const opportunityScore = computeOpportunityScore(totalListings, avgFavorers);

  const result: NicheResearchResult = {
    keyword,
    totalListings,
    avgFavorers,
    avgPrice,
    topListings,
    opportunityScore,
    competitionLevel: competitionLevel(totalListings),
    demandLevel: demandLevel(avgFavorers),
  };

  return NextResponse.json(result);
}
