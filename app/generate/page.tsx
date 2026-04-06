'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { NICHES, getNicheById, NICHE_LIGHT_COLORS, NICHE_TEXT_COLORS } from '@/lib/niches';
import { PRODUCT_QUALITY_MIN_SCORE, evaluateProductQuality } from '@/lib/validation/generated';
import { CONTENT_VARIATIONS, ContentVariationId } from '@/lib/ai/prompts';
import { getSettings } from '@/lib/settings';
import { EtsyListing, ListingImageMeta } from '@/lib/types';
import { getApiErrorMessage, readJsonResponse } from '@/lib/utils';
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

type ImageProviderMode = 'openai';

const GENERATE_DRAFT_KEY = 'etsy_generate_draft';

interface ProductNameIdea {
  title: string;
  score: number;
  reasons: string[];
}

type ContentQualityTemplateId = 'default' | 'best-quality';

function GenerateContent() {
  const searchParams = useSearchParams();
  const queryNicheId = searchParams.get('niche') || '';
  const queryProductTypeId = searchParams.get('product') || '';
  const requestedKeyword = searchParams.get('q') || '';
  const initialNiche = getNicheById(queryNicheId);
  const initialProduct = initialNiche?.products.find((p) => p.id === queryProductTypeId);
  const [step, setStep] = useState(initialProduct ? 3 : initialNiche ? 2 : 1);
  const [nicheId, setNicheId] = useState(initialNiche?.id || '');
  const [productTypeId, setProductTypeId] = useState(initialProduct?.id || '');
  const [title, setTitle] = useState(initialProduct?.name || '');
  const [colorSchemeId, setColorSchemeId] = useState(initialNiche?.colorSchemes[0]?.id || '');
  const [pageSize, setPageSize] = useState('letter');
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [contentWarnings, setContentWarnings] = useState<string[]>([]);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const [qualityTemplateId, setQualityTemplateId] = useState<ContentQualityTemplateId>('best-quality');
  const [variationId, setVariationId] = useState<ContentVariationId>('standard');
  const [generatedImages, setGeneratedImages] = useState<ListingImageMeta[]>([]);
  const [imageWarnings, setImageWarnings] = useState<string[]>([]);
  const [imageProviderMode, setImageProviderMode] = useState<ImageProviderMode | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [titleIdeas, setTitleIdeas] = useState<ProductNameIdea[]>([]);
  const [titleIdeasLoading, setTitleIdeasLoading] = useState(false);
  const [titleIdeasError, setTitleIdeasError] = useState('');

  // Step 6 — Etsy listing
  const [etsyListing, setEtsyListing] = useState<EtsyListing | null>(null);
  const [listingWarnings, setListingWarnings] = useState<string[]>([]);
  const [etsyLoading, setEtsyLoading] = useState(false);
  const [etsyPrice, setEtsyPrice] = useState('5.00');
  const [etsyConnected, setEtsyConnected] = useState(false);
  const [etsyPublishing, setEtsyPublishing] = useState(false);
  const [etsyPublished, setEtsyPublished] = useState<{ listing_id: number } | null>(null);
  const [publishWarnings, setPublishWarnings] = useState<string[]>([]);
  const [etsyError, setEtsyError] = useState('');
  const [automationStatus, setAutomationStatus] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const hasSavedOnceRef = useRef(false);

  const niche = getNicheById(nicheId);
  const product = niche?.products.find((p) => p.id === productTypeId);
  const colorScheme = niche?.colorSchemes.find((c) => c.id === colorSchemeId) || niche?.colorSchemes[0];

  function resetGeneratedState() {
    setContent(null);
    setEditableContent('');
    setContentWarnings([]);
    setQualityScore(null);
    setQualityIssues([]);
    setEtsyListing(null);
    setListingWarnings([]);
    setPublishWarnings([]);
    setEtsyPublished(null);
    setPdfUrl('');
    setGeneratedImages([]);
    setImageWarnings([]);
    setImageProviderMode(null);
    setImageLoading(false);
    setTitleIdeas([]);
    setTitleIdeasLoading(false);
    setTitleIdeasError('');
    setEtsyError('');
    setAutomationStatus('');
    setError('');
    setShowRawJson(false);
    try { localStorage.removeItem(GENERATE_DRAFT_KEY); } catch { /* ignore */ }
  }

  useEffect(() => {
    const settings = getSettings();
    const preferredPageSize = typeof settings.defaultPageSize === 'string' ? settings.defaultPageSize : '';
    if (preferredPageSize === 'letter' || preferredPageSize === 'a4' || preferredPageSize === 'a5') {
      setPageSize(preferredPageSize);
    }
  }, []);

  useEffect(() => {
    if (!queryNicheId) return;

    const nextNiche = getNicheById(queryNicheId);
    const nextProduct = nextNiche?.products.find((p) => p.id === queryProductTypeId);
    if (!nextNiche) return;

    resetGeneratedState();
    setNicheId(nextNiche.id);
    setColorSchemeId(nextNiche.colorSchemes[0]?.id || '');

    if (nextProduct) {
      setProductTypeId(nextProduct.id);
      setTitle(nextProduct.name);
      setStep(3);
      return;
    }

    setProductTypeId('');
    setTitle('');
    setStep(2);
  }, [queryNicheId, queryProductTypeId]);

  const getResolvedProductTitle = useCallback((preferredContent?: Record<string, unknown> | null): string => {
    const preferredTitle = preferredContent && typeof preferredContent.title === 'string'
      ? preferredContent.title.trim()
      : '';
    if (preferredTitle) return preferredTitle;

    if (editableContent.trim()) {
      try {
        const parsed = JSON.parse(editableContent) as Record<string, unknown>;
        const parsedTitle = typeof parsed.title === 'string' ? parsed.title.trim() : '';
        if (parsedTitle) return parsedTitle;
      } catch {
        // Ignore parse errors here — callers that require valid JSON already handle them separately.
      }
    }

    const currentContentTitle = content && typeof content.title === 'string' ? content.title.trim() : '';
    if (currentContentTitle) return currentContentTitle;

    return (title || product?.name || '').trim();
  }, [editableContent, content, title, product]);

  // Check Etsy connection once on mount
  useEffect(() => {
    fetch('/api/etsy/status')
      .then((r) => r.json())
      .then(({ connected }) => setEtsyConnected(!!connected))
      .catch(() => {});
  }, []);

  // Revoke blob URLs when replaced or on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const generateEtsyListing = useCallback(async (): Promise<EtsyListing | null> => {
    setEtsyLoading(true);
    setEtsyError('');
    setListingWarnings([]);
    try {
      const resolvedProductTitle = getResolvedProductTitle();
      const res = await fetch('/api/generate-etsy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheId, productTypeId, productName: resolvedProductTitle, referenceTitle: resolvedProductTitle, pageSize, settings: getSettings() }),
      });
      const data = await readJsonResponse<{ error?: string; details?: string[]; listing?: EtsyListing; warnings?: string[] }>(res);
      if (!res.ok || data?.error || !data?.listing) throw new Error(getApiErrorMessage(data, 'Failed to generate Etsy listing'));
      setEtsyListing(data.listing);
      setListingWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      return data.listing as EtsyListing;
    } catch (e) {
      setEtsyError(e instanceof Error ? e.message : 'Failed to generate Etsy listing');
      return null;
    } finally {
      setEtsyLoading(false);
    }
  }, [nicheId, productTypeId, pageSize, getResolvedProductTitle]);

  // Auto-generate Etsy listing when entering step 6
  useEffect(() => {
    if (step === 6 && !etsyListing && !etsyLoading && !etsyError && nicheId && productTypeId) {
      generateEtsyListing();
    }
  }, [step, etsyListing, etsyLoading, etsyError, nicheId, productTypeId, generateEtsyListing]);

  // Restore in-progress draft from localStorage on mount (skipped when URL params are present)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (queryNicheId) return;
    try {
      const raw = localStorage.getItem(GENERATE_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.step === 'number') setStep(d.step);
      if (typeof d.nicheId === 'string') setNicheId(d.nicheId);
      if (typeof d.productTypeId === 'string') setProductTypeId(d.productTypeId);
      if (typeof d.title === 'string') setTitle(d.title);
      if (typeof d.colorSchemeId === 'string') setColorSchemeId(d.colorSchemeId);
      if (typeof d.pageSize === 'string') setPageSize(d.pageSize);
      if (d.content && typeof d.content === 'object') {
        setContent(d.content as Record<string, unknown>);
        if (typeof d.editableContent === 'string') setEditableContent(d.editableContent);
      }
      if (Array.isArray(d.contentWarnings)) setContentWarnings(d.contentWarnings as string[]);
      if (typeof d.qualityScore === 'number') setQualityScore(d.qualityScore);
      if (Array.isArray(d.qualityIssues)) setQualityIssues(d.qualityIssues as string[]);
      if (d.qualityTemplateId === 'best-quality' || d.qualityTemplateId === 'default') setQualityTemplateId(d.qualityTemplateId);
      if (typeof d.variationId === 'string') setVariationId(d.variationId as ContentVariationId);
      if (Array.isArray(d.generatedImages)) setGeneratedImages(d.generatedImages as ListingImageMeta[]);
      if (Array.isArray(d.imageWarnings)) setImageWarnings(d.imageWarnings as string[]);
      if (d.imageProviderMode === 'openai') setImageProviderMode(d.imageProviderMode);
      if (d.etsyListing && typeof d.etsyListing === 'object') setEtsyListing(d.etsyListing as EtsyListing);
      if (Array.isArray(d.listingWarnings)) setListingWarnings(d.listingWarnings as string[]);
      if (typeof d.etsyPrice === 'string') setEtsyPrice(d.etsyPrice);
      if (d.etsyPublished && typeof d.etsyPublished === 'object') setEtsyPublished(d.etsyPublished as { listing_id: number });
      if (Array.isArray(d.publishWarnings)) setPublishWarnings(d.publishWarnings as string[]);
      if (typeof d.automationStatus === 'string') setAutomationStatus(d.automationStatus);
    } catch { /* corrupt draft — ignore */ }
  }, []);

  // Persist draft to localStorage whenever relevant state changes
  useEffect(() => {
    if (!hasSavedOnceRef.current) {
      hasSavedOnceRef.current = true;
      return; // skip first run (before hydration has settled)
    }
    try {
      localStorage.setItem(GENERATE_DRAFT_KEY, JSON.stringify({
        step, nicheId, productTypeId, title, colorSchemeId, pageSize,
        content, editableContent, contentWarnings, qualityScore, qualityIssues,
        qualityTemplateId, variationId,
        generatedImages, imageWarnings, imageProviderMode,
        etsyListing, listingWarnings, etsyPrice, etsyPublished, publishWarnings,
        automationStatus,
      }));
    } catch { /* localStorage quota or SSR — ignore */ }
  }, [
    step, nicheId, productTypeId, title, colorSchemeId, pageSize,
    content, editableContent, contentWarnings, qualityScore, qualityIssues,
    qualityTemplateId, variationId,
    generatedImages, imageWarnings, imageProviderMode,
    etsyListing, listingWarnings, etsyPrice, etsyPublished, publishWarnings,
    automationStatus,
  ]);

  function hasOpenAIImageKey(): boolean {
    const settings = getSettings();
    return Boolean(String(settings?.openaiApiKey || '').trim());
  }

  async function generateAIContent() {
    setLoading(true);
    setError('');
    setContentWarnings([]);
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nicheId,
          productTypeId,
          customTitle: title,
          qualityTemplateId,
          variationId,
          settings: getSettings(),
        }),
      });
      const data = await readJsonResponse<{
        error?: string;
        details?: string[];
        content?: Record<string, unknown>;
        warnings?: string[];
        qualityScore?: number;
        qualityIssues?: string[];
        bestCandidate?: {
          content?: Record<string, unknown>;
          qualityScore?: number;
          warnings?: string[];
          qualityIssues?: string[];
        };
      }>(res);
      // 422 with a bestCandidate means all attempts fell below the quality threshold —
      // use the closest result rather than surfacing an error to the user.
      const bestCandidate = data?.bestCandidate;
      if (res.status === 422 && bestCandidate?.content) {
        setContent(bestCandidate.content);
        setEditableContent(JSON.stringify(bestCandidate.content, null, 2));
        setContentWarnings([
          `Quality score ${bestCandidate.qualityScore}/100 was below target. Review carefully before publishing.`,
          ...(Array.isArray(bestCandidate.warnings) ? bestCandidate.warnings : []),
        ]);
        setQualityScore(Number.isFinite(Number(bestCandidate.qualityScore)) ? Number(bestCandidate.qualityScore) : null);
        setQualityIssues(Array.isArray(bestCandidate.qualityIssues) ? bestCandidate.qualityIssues : []);
        setStep(5);
        return;
      }
      if (!res.ok || data?.error || !data?.content) throw new Error(getApiErrorMessage(data, 'Failed to generate content'));
      const generatedContent = data.content;
      setContent(generatedContent);
      setEditableContent(JSON.stringify(generatedContent, null, 2));
      setContentWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setQualityScore(Number.isFinite(Number(data.qualityScore)) ? Number(data.qualityScore) : null);
      setQualityIssues(Array.isArray(data.qualityIssues) ? data.qualityIssues : []);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  }

  async function generateTitleIdeas() {
    if (!nicheId || !productTypeId) return;
    setTitleIdeasLoading(true);
    setTitleIdeasError('');
    try {
      const res = await fetch('/api/generate-title-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheId, productTypeId, customTitle: title }),
      });
      const data = await readJsonResponse<{ error?: string; details?: string[]; ideas?: ProductNameIdea[] }>(res);
      if (!res.ok || data?.error) throw new Error(getApiErrorMessage(data, 'Failed to generate product name ideas'));
      const ideas = Array.isArray(data?.ideas) ? data.ideas : [];
      setTitleIdeas(ideas);
    } catch (e) {
      setTitleIdeas([]);
      setTitleIdeasError(e instanceof Error ? e.message : 'Failed to generate product name ideas');
    } finally {
      setTitleIdeasLoading(false);
    }
  }

  async function downloadPDF() {
    setLoading(true);
    setError('');
    try {
      let finalContent = content;
      try {
        finalContent = JSON.parse(editableContent);
      } catch {
        throw new Error('Edited JSON is invalid. Fix it or switch back to preview before generating the PDF.');
      }
      const quality = evaluateProductQuality(finalContent as Parameters<typeof evaluateProductQuality>[0]);
      setQualityScore(quality.score);
      setQualityIssues(quality.issues);
      const resolvedProductTitle = getResolvedProductTitle(finalContent as Record<string, unknown>);
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheId, productTypeId, title: resolvedProductTitle, colorScheme, pageSize, content: finalContent }),
      });
      if (!res.ok) {
        const data = await readJsonResponse<unknown>(res);
        throw new Error(getApiErrorMessage(data, 'Failed to generate PDF'));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(resolvedProductTitle || 'product').replace(/\s+/g, '-')}.pdf`;
      a.click();

      setAutomationStatus('Generating 3 Etsy listing images...');
      const images = hasOpenAIImageKey()
        ? await generateListingImages()
        : [];

      const settings = getSettings();
      if (!etsyConnected || !settings.etsyShopId) {
        setAutomationStatus('Auto draft skipped: connect Etsy and set your Shop ID in Settings to fully automate publishing.');
        return;
      }

      if (quality.score < PRODUCT_QUALITY_MIN_SCORE) {
        setAutomationStatus(`Auto draft skipped: quality score ${quality.score}/100 is below threshold (${PRODUCT_QUALITY_MIN_SCORE}/100). Improve content and retry.`);
        return;
      }

      if (!images.length) {
        setAutomationStatus('Auto draft skipped: listing images failed, you can continue manually.');
        return;
      }

      setAutomationStatus('Generating Etsy SEO listing content...');
      const listing = await generateEtsyListing();
      if (!listing) {
        setAutomationStatus('Auto draft skipped: Etsy listing generation failed, continue manually in Step 6.');
        return;
      }

      setAutomationStatus('Creating Etsy draft with PDF and images...');
      const published = await publishToEtsy({
        listing,
        finalContent,
        images,
      });
      if (published) {
        setAutomationStatus('Done: Etsy draft was created automatically. Review it on Etsy and publish when ready.');
        setStep(6);
      } else {
        setAutomationStatus('Auto draft failed. You can retry in Step 6 without regenerating content.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate PDF');
      setAutomationStatus('');
    } finally {
      setLoading(false);
    }
  }

  async function generateListingImages(): Promise<ListingImageMeta[]> {
    setImageLoading(true);
    setImageWarnings([]);
    try {
      const res = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nicheId,
          productTypeId,
          title: title || product?.name,
          imageCount: 3,
          colorScheme,
          settings: getSettings(),
        }),
      });
      const data = await readJsonResponse<{ error?: string; details?: string[]; images?: ListingImageMeta[]; warnings?: string[]; provider?: string }>(res);
      if (!res.ok || data?.error) throw new Error(getApiErrorMessage(data, 'Failed to generate listing images'));
      const images = Array.isArray(data?.images) ? data.images : [];
      setGeneratedImages(images);
      setImageWarnings(Array.isArray(data?.warnings) ? data.warnings : []);
      setImageProviderMode(data?.provider === 'openai' ? data.provider : null);
      return images;
    } catch (e) {
      setImageWarnings([e instanceof Error ? e.message : 'Failed to generate listing images']);
      setGeneratedImages([]);
      setImageProviderMode(null);
      return [];
    } finally {
      setImageLoading(false);
    }
  }

  async function publishToEtsy(options?: {
    listing?: EtsyListing;
    finalContent?: Record<string, unknown> | null;
    images?: ListingImageMeta[];
  }): Promise<boolean> {
    const listingToPublish = options?.listing || etsyListing;
    if (!listingToPublish) return false;
    setEtsyPublishing(true);
    setEtsyError('');
    setPublishWarnings([]);
    try {
      const s = getSettings();
      let finalContent = options?.finalContent || content;
      if (!options?.finalContent) {
        try {
          finalContent = JSON.parse(editableContent);
        } catch {
          throw new Error('Edited JSON is invalid. Fix it or switch back to preview before publishing.');
        }
      }
      const resolvedProductTitle = getResolvedProductTitle(finalContent as Record<string, unknown>);
      const images = options?.images || generatedImages;
      const idempotencyKey = [
        s.etsyShopId || 'shop',
        nicheId || 'niche',
        productTypeId || 'product',
        resolvedProductTitle || 'title',
        listingToPublish.title,
        String(parseFloat(etsyPrice) || 5.0),
        images
          .map((img) => `${img.id}:${img.rank}`)
          .sort()
          .join('|') || 'no-images',
      ].join('::');

      const res = await fetch('/api/etsy/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: listingToPublish.title,
          description: listingToPublish.description,
          tags: listingToPublish.tags,
          taxonomyId: listingToPublish.taxonomyId,
          price: parseFloat(etsyPrice) || 5.0,
          shopId: s.etsyShopId,
          idempotencyKey,
          pdfOptions: { pageSize, colorScheme, title: resolvedProductTitle, nicheId, productTypeId, content: finalContent },
          listingImages: images,
        }),
      });
      const data = await readJsonResponse<{ error?: string; details?: string[]; warnings?: string[]; listing?: { listing_id?: number } }>(res);
      if (!res.ok || data?.error || !data?.listing?.listing_id) throw new Error(getApiErrorMessage(data, 'Failed to publish to Etsy'));
      const allPublishWarnings = Array.isArray(data.warnings) ? data.warnings : [];
      setPublishWarnings(allPublishWarnings);
      setEtsyPublished({ listing_id: data.listing?.listing_id });
      return true;
    } catch (e) {
      setEtsyError(e instanceof Error ? e.message : 'Failed to publish to Etsy');
      return false;
    } finally {
      setEtsyPublishing(false);
    }
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function openEtsyNewListing() {
    window.open('https://www.etsy.com/your/shops/me/tools/listings/create', '_blank', 'noopener,noreferrer');
  }

  function downloadGeneratedImages() {
    generatedImages.forEach((image, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = image.url;
        a.download = image.filename || `listing-image-${image.rank}.png`;
        a.click();
      }, i * 100);
    });
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
          {!nicheId && requestedKeyword && (
            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Research keyword: “{requestedKeyword}”</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-1">Pick the niche that best matches this idea, then choose the product type you want to generate.</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {NICHES.map((n) => (
              <button key={n.id} onClick={() => { resetGeneratedState(); setNicheId(n.id); setProductTypeId(''); setColorSchemeId(''); setStep(2); }}
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
              <button key={p.id} onClick={() => { resetGeneratedState(); setProductTypeId(p.id); setTitle(p.name); setColorSchemeId(niche.colorSchemes[0].id); setStep(3); }}
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
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">High-intent product name ideas</p>
                <Button
                  onClick={generateTitleIdeas}
                  loading={titleIdeasLoading}
                  size="sm"
                  variant="secondary"
                >
                  {titleIdeasLoading ? 'Generating...' : 'Generate Ideas'}
                </Button>
              </div>
              {titleIdeasError && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">{titleIdeasError}</p>
              )}
              {titleIdeas.length > 0 ? (
                <div className="space-y-2">
                  {titleIdeas.map((idea) => (
                    <button
                      key={idea.title}
                      onClick={() => setTitle(idea.title)}
                      className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 hover:border-indigo-400 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{idea.title}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                          {idea.score}/100
                        </span>
                      </div>
                      {idea.reasons[0] && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{idea.reasons[0]}</p>
                      )}
                    </button>
                  ))}
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tip: click any idea to apply it as your title.</p>
                </div>
              ) : (
                !titleIdeasLoading && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Generate SEO-focused title options tailored to this niche and product type.</p>
                )
              )}
            </div>
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
              <option value="letter">US Letter (8.5&quot; × 11&quot;) — Best for US customers</option>
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
          <Card padding="md" className="mb-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Content quality template</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Use Best Quality to bias the model toward deeper, more practical worksheets.</p>
                </div>
                <select
                  value={qualityTemplateId}
                  onChange={(e) => setQualityTemplateId(e.target.value as ContentQualityTemplateId)}
                  className="rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-200"
                >
                  <option value="best-quality">Best Quality</option>
                  <option value="default">Standard</option>
                </select>
              </div>
              {qualityTemplateId === 'best-quality' && (
                <ul className="text-xs text-emerald-800 dark:text-emerald-200 space-y-1 list-disc list-inside">
                  <li>Requires clear instructions, prompts, or steps</li>
                  <li>Avoids generic labels and repeated lines</li>
                  <li>Pushes for richer, buyer-usable structure</li>
                </ul>
              )}
              <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-1">Content style variation</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-2">Generates meaningfully different content for the same product — use a different style per listing to avoid duplicates.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTENT_VARIATIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVariationId(v.id)}
                      className={`text-left p-2 rounded-lg border text-xs transition-all ${
                        variationId === v.id
                          ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                          : 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      <p className="font-semibold">{v.label}</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{v.description}</p>
                    </button>
                  ))}
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
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">This is what will be on your PDF. Download to generate the PDF, listing images, and Etsy listing copy. If Etsy API is connected, draft publishing runs automatically.</p>
          </div>
          {contentWarnings.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Review these product quality warnings before exporting:</p>
              <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {contentWarnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          {qualityScore !== null && (
            <div className={`mb-4 p-3 border rounded-lg ${qualityScore >= PRODUCT_QUALITY_MIN_SCORE ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
              <p className={`text-sm font-medium mb-1 ${qualityScore >= PRODUCT_QUALITY_MIN_SCORE ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}`}>
                Quality score: {qualityScore}/100 (minimum for auto-publish: {PRODUCT_QUALITY_MIN_SCORE}/100)
              </p>
              {qualityIssues.length > 0 && (
                <ul className={`space-y-1 text-xs ${qualityScore >= PRODUCT_QUALITY_MIN_SCORE ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {qualityIssues.map((issue) => (
                    <li key={issue}>• {issue}</li>
                  ))}
                </ul>
              )}
            </div>
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
                {loading ? '⏳ Running export flow...' : '⬇️ Download PDF + Prepare Etsy Assets'}
              </Button>
              {!hasOpenAIImageKey() && (
                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    OpenAI image key not detected in Settings. Listing images cannot be generated until a key is added.
                    {' '}
                    <a href="/settings" className="underline">Add OpenAI key</a>
                    {' '}to enable image generation.
                  </p>
                </div>
              )}
              {automationStatus && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">🤖 {automationStatus}</p>
                </div>
              )}
              {pdfUrl && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">✅ PDF downloaded!</p>
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Open PDF in browser →
                  </a>
                </div>
              )}
              {imageLoading && (
                <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">🎨 Generating your 3 Etsy listing images...</p>
                </div>
              )}
              {generatedImages.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Generated listing images ({generatedImages.length}/3)</p>
                    {imageProviderMode && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                        OpenAI images
                      </span>
                    )}
                    <button
                      onClick={generateListingImages}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      disabled={imageLoading}
                    >
                      Regenerate
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {generatedImages.map((image) => (
                      <Image
                        key={image.id}
                        src={image.url}
                        alt={`Listing image ${image.rank}`}
                        width={image.width}
                        height={image.height}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 object-cover aspect-[3/2]"
                      />
                    ))}
                  </div>
                  <button
                    onClick={downloadGeneratedImages}
                    className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Download all listing images
                  </button>
                </div>
              )}
              {imageWarnings.length > 0 && (
                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Image generation notes</p>
                  <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                    {imageWarnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg mb-3">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">Automation fallback</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">If Etsy API is unavailable, open Step 6 for a manual upload checklist, copy-ready listing text, and direct Etsy links.</p>
              </div>
              <Button
                onClick={() => setStep(6)}
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={imageLoading}
              >
                Open Manual Etsy Editor →
              </Button>
              {generatedImages.length === 0 && !imageLoading && (
                <p className="text-xs text-slate-500 mt-2 text-center">Listing details, copy-ready text, and Etsy links will be in Step 6.</p>
              )}
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
              AI has written your SEO-optimized title, tags, and description. Review everything, then publish via API or upload manually on Etsy.
            </p>
          </div>

          {etsyError && etsyListing && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {etsyError}
              {!etsyConnected && (
                <span> — <a href="/settings" className="underline">Connect Etsy in Settings</a></span>
              )}
            </div>
          )}

          {listingWarnings.length > 0 && !etsyPublished && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Listing quality warnings</p>
              <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {listingWarnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {publishWarnings.length > 0 && !etsyPublished && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Publish review notes</p>
              <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                {publishWarnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {etsyPublished ? (
            <Card padding="lg" className="text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">Draft Created on Etsy!</p>
              {publishWarnings.length > 0 && (
                <div className="text-left mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Publish notes</p>
                  <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                    {publishWarnings.map((w) => <li key={w}>• {w}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-slate-500 text-sm mb-1">
                Listing ID: <span className="font-mono">{etsyPublished.listing_id}</span>
              </p>
              <p className="text-slate-400 text-xs mb-4">The draft is in your Etsy shop. Open it to add more photos and publish.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a
                  href={`https://www.etsy.com/your/listings/${etsyPublished.listing_id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >
                  Edit Draft on Etsy →
                </a>
                <button
                  onClick={() => { resetGeneratedState(); setStep(1); setNicheId(''); setProductTypeId(''); }}
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
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                        <button
                          onClick={() => copyText(`${etsyListing.category || ''} (Taxonomy ID: ${etsyListing.taxonomyId || ''})`, 'category')}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {copied === 'category' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm text-slate-700 dark:text-slate-300">
                        <p>{etsyListing.category || 'Paper & Party Supplies > Paper > Calendars & Planners'}</p>
                        <p className="text-xs text-slate-500 mt-1">Taxonomy ID: {etsyListing.taxonomyId || 2078}</p>
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
                  <div className="py-6 text-center">
                    {etsyError ? (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm text-left">
                        {etsyError}
                      </div>
                    ) : null}
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      {etsyError ? 'Failed to generate listing. Check your AI key in Settings, then retry.' : 'Listing not yet generated.'}
                    </p>
                    <Button onClick={() => { void generateEtsyListing(); }} size="sm">
                      Generate Listing Details
                    </Button>
                  </div>
                )}
              </div>

              {/* Publish panel */}
              <div>
                <Card padding="md" className="mb-4">
                  <p className="text-sm font-semibold mb-3">Publish Settings</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Images ready: {generatedImages.length}/3</p>
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
                    onClick={() => { void publishToEtsy(); }}
                    loading={etsyPublishing}
                    disabled={!etsyListing || etsyLoading || generatedImages.length === 0}
                    size="lg"
                    className="w-full mb-3 bg-orange-500 hover:bg-orange-600 focus:ring-orange-400"
                  >
                    {etsyPublishing ? 'Publishing...' : '🚀 Publish Draft to Etsy'}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-xs">
                      <strong>Manual mode active.</strong> You can still publish today: open Etsy, create a new listing, upload the generated PDF and 5 images, then paste the title/tags/description below.
                    </div>
                    <button
                      onClick={openEtsyNewListing}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                    >
                      Open Etsy New Listing
                    </button>
                    <button
                      onClick={downloadGeneratedImages}
                      disabled={generatedImages.length === 0}
                      className="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Download 3 Listing Images
                    </button>
                    <button
                      onClick={() => copyText(`Title: ${etsyListing?.title}\n\nCategory: ${etsyListing?.category || 'Paper & Party Supplies > Paper > Calendars & Planners'}\nTaxonomy ID: ${etsyListing?.taxonomyId || 2078}\n\nTags: ${etsyListing?.tags?.join(', ')}\n\nDescription:\n${etsyListing?.description}`, 'all')}
                      className="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copied === 'all' ? '✓ Copied!' : '📋 Copy All Listing Details'}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Suggested category for your products: Calendars &amp; Planners.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => { resetGeneratedState(); setStep(1); setNicheId(''); setProductTypeId(''); }}
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

