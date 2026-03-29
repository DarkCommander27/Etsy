import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { createCanvas } from '@napi-rs/canvas';
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

async function generateImagePng(prompt: string, apiKey: string): Promise<Buffer> {
	const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 2 });
	const response = await client.images.generate({
		model: 'gpt-image-1',
		prompt,
		size: '1536x1024',
	});

	const b64 = response.data?.[0]?.b64_json;
	if (!b64) {
		throw new Error('Image provider returned no image data.');
	}
	return Buffer.from(b64, 'base64');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = '';

	for (const word of words) {
		const next = current ? `${current} ${word}` : word;
		if (next.length > maxCharsPerLine) {
			if (current) lines.push(current);
			current = word;
		} else {
			current = next;
		}
	}
	if (current) lines.push(current);
	return lines;
}

function generateLocalMockupPng(request: ListingImageRequest, rank: number): Buffer {
	const width = 1536;
	const height = 1024;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	const bg = request.colorScheme?.background || '#0f172a';
	const primary = request.colorScheme?.primary || '#312e81';
	const secondary = request.colorScheme?.secondary || '#1e293b';
	const accent = request.colorScheme?.accent || '#a78bfa';

	const gradient = ctx.createLinearGradient(0, 0, width, height);
	gradient.addColorStop(0, bg);
	gradient.addColorStop(1, secondary);
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);

	ctx.globalAlpha = 0.16;
	ctx.fillStyle = primary;
	ctx.fillRect(80, 70, width - 160, height - 140);
	ctx.globalAlpha = 1;

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(170, 130, width - 340, height - 260);

	ctx.fillStyle = accent;
	ctx.fillRect(170, 130, width - 340, 72);

	ctx.fillStyle = '#f8fafc';
	ctx.font = 'bold 34px sans-serif';
	ctx.fillText('INSTANT DIGITAL DOWNLOAD', 210, 178);

	const title = request.title || 'Printable Worksheet';
	const lines = wrapText(title, 34).slice(0, 3);
	ctx.fillStyle = '#0f172a';
	ctx.font = 'bold 68px sans-serif';
	lines.forEach((line, idx) => {
		ctx.fillText(line, 230, 330 + idx * 88);
	});

	ctx.font = '28px sans-serif';
	ctx.fillStyle = '#334155';
	ctx.fillText(`Variation ${rank} • Ready to Print • PDF`, 230, 690);

	ctx.fillStyle = accent;
	ctx.fillRect(230, 740, 420, 14);
	ctx.fillStyle = primary;
	ctx.fillRect(230, 780, 320, 14);

	return canvas.toBuffer('image/png');
}

export async function generateAndStoreListingImages(request: ListingImageRequest): Promise<{ images: ListingImageMeta[]; warnings: string[] }> {
	ensureGeneratedDir();
	try {
		pruneGeneratedImages();
	} catch {
		// Cleanup should never block generation for a local single-user tool.
	}

	const apiKey = request.settings?.openaiApiKey || process.env.OPENAI_API_KEY || '';
	const useLocalFallbackOnly = !apiKey;
	const warnings: string[] = [];
	if (useLocalFallbackOnly) {
		warnings.push('OpenAI image key not found; using built-in local mockups instead.');
	}

	const count = Math.min(request.imageCount || 5, 5);
	const generatedAt = new Date().toISOString();
	const batchId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
	const baseSlug = slugify(request.title || 'listing-image');
	const images: ListingImageMeta[] = [];

	for (let index = 0; index < count; index += 1) {
		const rank = index + 1;
		const prompt = buildPrompt(request, IMAGE_VARIANTS[index] || IMAGE_VARIANTS[0]);
		const filename = `${baseSlug}-${batchId}-${rank}.png`;
		const filePath = path.join(GENERATED_DIR, filename);

		try {
			let png: Buffer;
			if (useLocalFallbackOnly) {
				png = generateLocalMockupPng(request, rank);
			} else {
				try {
					png = await generateImagePng(prompt, apiKey);
				} catch (err) {
					warnings.push(`Image ${rank} fell back to local mockup: ${err instanceof Error ? err.message : 'Unknown error'}`);
					png = generateLocalMockupPng(request, rank);
				}
			}
			fs.writeFileSync(filePath, png);
			images.push({
				id: `${batchId}-${rank}`,
				rank,
				filename,
				url: `/generated/listing-images/${filename}`,
				width: 1536,
				height: 1024,
				prompt,
				createdAt: generatedAt,
			});
		} catch (err) {
			warnings.push(`Image ${rank} failed to generate: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	if (!images.length) {
		throw new Error('All listing image generations failed.');
	}

	return { images, warnings };
}
