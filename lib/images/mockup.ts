import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { getNicheById, getProductById } from '@/lib/niches';
import { ListingImageMeta, ListingImageRequest } from '@/lib/validation/generated';

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated', 'listing-images');
const MAX_GENERATED_IMAGES = 200;
const MAX_IMAGE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const IMAGE_VARIANTS = [
	'A polished hero mockup featuring the full printable product with clean desk styling.',
	'A flat-lay composition with warm natural lighting and tasteful stationery props.',
	'A close-up detail shot emphasizing legibility, typography, and premium print quality.',
	'A lifestyle scene showing the printable in real use with a minimal, modern workspace.',
	'A bundle overview composition with layered pages and clear value-focused visual hierarchy.',
];

function ensureGeneratedDir() {
	if (!fs.existsSync(GENERATED_DIR)) {
		fs.mkdirSync(GENERATED_DIR, { recursive: true });
	}
}

function pruneGeneratedImages() {
	const now = Date.now();
	const entries = fs.readdirSync(GENERATED_DIR)
		.filter((name) => name.endsWith('.png'))
		.map((name) => {
			const fullPath = path.join(GENERATED_DIR, name);
			const stats = fs.statSync(fullPath);
			return { name, fullPath, mtimeMs: stats.mtimeMs };
		});

	for (const entry of entries) {
		if (now - entry.mtimeMs > MAX_IMAGE_AGE_MS) {
			fs.unlinkSync(entry.fullPath);
		}
	}

	const remaining = fs.readdirSync(GENERATED_DIR)
		.filter((name) => name.endsWith('.png'))
		.map((name) => {
			const fullPath = path.join(GENERATED_DIR, name);
			const stats = fs.statSync(fullPath);
			return { fullPath, mtimeMs: stats.mtimeMs };
		})
		.sort((a, b) => a.mtimeMs - b.mtimeMs);

	const overflow = remaining.length - MAX_GENERATED_IMAGES;
	if (overflow > 0) {
		for (const stale of remaining.slice(0, overflow)) {
			fs.unlinkSync(stale.fullPath);
		}
	}
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function buildPrompt(request: ListingImageRequest, variation: string): string {
	const niche = getNicheById(request.nicheId);
	const product = getProductById(request.nicheId, request.productTypeId);
	const scheme = request.colorScheme;

	return [
		'Create a photorealistic Etsy listing image for a digital printable product.',
		`Product title: ${request.title}.`,
		`Niche: ${niche?.name || request.nicheId}.`,
		`Product type: ${product?.name || request.productTypeId}.`,
		'Design constraints: modern, clean composition, no brand logos, no watermarks, no UI chrome, no spelling errors.',
		'Output should look like a high-converting Etsy thumbnail for digital downloads.',
		scheme?.name ? `Color mood: ${scheme.name}.` : '',
		scheme?.primary ? `Primary color: ${scheme.primary}.` : '',
		scheme?.secondary ? `Secondary color: ${scheme.secondary}.` : '',
		scheme?.accent ? `Accent color: ${scheme.accent}.` : '',
		variation,
	].filter(Boolean).join(' ');
}

async function generateImagePng(prompt: string, apiKey: string): Promise<{ png: Buffer; width: number; height: number }> {
	const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 });

	// Try gpt-image-1 first (requires org-level access); fall back to dall-e-3.
	try {
		const response = await client.images.generate({
			model: 'gpt-image-1',
			prompt,
			size: '1536x1024',
		});
		const b64 = response.data?.[0]?.b64_json;
		if (b64) return { png: Buffer.from(b64, 'base64'), width: 1536, height: 1024 };
	} catch {
		// gpt-image-1 not available for this key — fall through to dall-e-3
	}

	const response = await client.images.generate({
		model: 'dall-e-3',
		prompt,
		size: '1792x1024',
		quality: 'hd',
		response_format: 'b64_json',
		n: 1,
	});
	const b64 = response.data?.[0]?.b64_json;
	if (!b64) {
		throw new Error('Image provider returned no image data.');
	}
	return { png: Buffer.from(b64, 'base64'), width: 1792, height: 1024 };
}

export async function generateAndStoreListingImages(request: ListingImageRequest): Promise<{ images: ListingImageMeta[]; warnings: string[]; provider: 'openai' }> {
	ensureGeneratedDir();
	try {
		pruneGeneratedImages();
	} catch {
		// Cleanup should never block generation for a local single-user tool.
	}

	const apiKey = request.settings?.openaiApiKey || process.env.OPENAI_API_KEY || '';
	if (!apiKey) {
		throw new Error('OpenAI image key is required to generate listing images. Add it in Settings.');
	}

	const warnings: string[] = [];

	const count = Math.min(request.imageCount || 5, 5);
	const generatedAt = new Date().toISOString();
	const batchId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
	const baseSlug = slugify(request.title || 'listing-image');
	const tasks = Array.from({ length: count }, (_, index) => {
		const rank = index + 1;
		const prompt = buildPrompt(request, IMAGE_VARIANTS[index] || IMAGE_VARIANTS[0]);
		const filename = `${baseSlug}-${batchId}-${rank}.png`;
		const filePath = path.join(GENERATED_DIR, filename);
		return generateImagePng(prompt, apiKey).then(({ png, width, height }) => {
			fs.writeFileSync(filePath, png);
			return {
				id: `${batchId}-${rank}`,
				rank,
				filename,
				url: `/generated/listing-images/${filename}`,
				width,
				height,
				prompt,
				createdAt: generatedAt,
			} satisfies ListingImageMeta;
		});
	});

	const results = await Promise.allSettled(tasks);
	const images: ListingImageMeta[] = [];
	for (const [i, result] of results.entries()) {
		if (result.status === 'fulfilled') {
			images.push(result.value);
		} else {
			warnings.push(`Image ${i + 1} failed to generate: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`);
		}
	}

	if (!images.length) {
		throw new Error('All listing image generations failed.');
	}

	return { images, warnings, provider: 'openai' };
}
