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
	'Hero shot: the printable product displayed flat with clean white space, bold readable type, high-contrast layout. No props. The page itself is the star.',
	'Lifestyle flat-lay: the printed page on a real desk alongside a pen, a coffee cup, and a small plant. Warm natural side lighting, styled but not cluttered.',
	'Close-up detail: extreme crop on one section of the printable — emphasise the typography, structure, and fill-in lines. Show that this is readable and well-designed.',
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

const COLOR_MOOD_DESCRIPTIONS: Record<string, string> = {
	// ADHD
	'Calm Blue': 'crisp white background with cool cornflower blue headings and soft sky-blue accents — clean, focused, airy',
	'Focus Green': 'bright white background with vivid emerald green headings and mint-green highlights — energising and clear',
	'Energy Orange': 'warm cream background with bold tangerine orange headings and peachy highlights — vibrant and motivating',
	'Purple Calm': 'pale lavender-white background with deep violet headings and soft lilac accents — serene and structured',
	// MDD Support
	'Soft Lavender': 'pale lilac background with rich purple headings and delicate violet accents — gentle and soothing',
	'Warm Sage': 'soft mint-white background with deep sage green headings and light aqua-green highlights — calm and nurturing',
	'Dusty Rose': 'blush white background with deep rose headings and soft pink accents — warm, compassionate, and soft',
	'Sky Blue': 'airy pale blue background with cobalt headings and light azure highlights — open and tranquil',
	// Anxiety Relief
	'Ocean Calm': 'soft seafoam white background with deep teal headings and turquoise accents — cool, grounding, and calm',
	'Misty Grey': 'clean white background with slate grey headings and silver-grey accents — minimal, quiet, uncluttered',
	'Forest Green': 'pale green-white background with forest green headings and bright leaf-green highlights — grounded and natural',
	'Sunrise Yellow': 'warm ivory background with golden amber headings and soft yellow accents — gentle, warm, hopeful',
	// Social Skills
	'Warm Amber': 'warm cream background with rich amber headings and honey-gold highlights — welcoming and energetic',
	'Peach Soft': 'soft peach-white background with burnt orange headings and apricot highlights — friendly and approachable',
	'Mint Fresh': 'crisp white background with vivid green headings and fresh mint accents — lively and open',
	'Coral Pink': 'blush white background with deep coral-red headings and rose-pink accents — bold and social',
	// General Life
	'Clean White': 'pure white background with near-black charcoal headings and neutral grey accents — timeless, editorial, minimal',
	'Nature Green': 'clean white background with deep forest green headings and bright emerald highlights — fresh and organised',
	'Navy Blue': 'cool white background with deep navy headings and bright cornflower-blue accents — professional and trustworthy',
	'Golden Hour': 'warm ivory background with rich brown-gold headings and amber highlights — cosy and premium',
	// Tech & Dev
	'Dark Code': 'dark navy background with electric sky-blue headings and bright violet accents — sleek, modern, high-contrast',
	'Terminal Green': 'deep charcoal-black background with neon green headings and light green highlights — developer terminal aesthetic',
	'GitHub Grey': 'light off-white background with near-black headings and steel-blue link accents — clean GitHub-style monochrome',
	'VS Code Blue': 'dark charcoal background with bright Azure-blue headings and medium-blue accents — VS Code dark theme style',
};

function buildPrompt(request: ListingImageRequest, variation: string): string {
	const niche = getNicheById(request.nicheId);
	const product = getProductById(request.nicheId, request.productTypeId);
	const scheme = request.colorScheme;

	// Use a descriptive mood string rather than just the palette name so the model
	// can accurately reproduce the intended colours and feel.
	const colorMood = scheme?.name
		? `Color palette: ${COLOR_MOOD_DESCRIPTIONS[scheme.name] ?? scheme.name}.`
		: '';

	return [
		'Create a photorealistic Etsy listing image for a digital printable product.',
		`Product: "${request.title}" — a ${product?.name || request.productTypeId} for the ${niche?.name || request.nicheId} niche.`,
		`The printable contains structured fill-in sections, checklists, prompts, or guided reflection relevant to ${niche?.name || 'personal development'}.`,
		'The page shown must have visible text headers, ruled lines or boxes, and clear sections — it should look like a real, filled-in worksheet, not a blank page.',
		'Design constraints: modern, clean A4/letter composition, no brand logos, no watermarks, no UI chrome, no spelling errors on the page.',
		'Output should look like a high-converting Etsy thumbnail for a premium digital download.',
		colorMood,
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

  const count = Math.min(request.imageCount || 3, IMAGE_VARIANTS.length);
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
