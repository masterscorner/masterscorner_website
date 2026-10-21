// Photo storage. Development: files in .data/uploads. Production: Cloudflare R2 (binding PHOTOS).
import { dev } from '$app/env';

interface R2Like {
	put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
	get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
	delete(key: string): Promise<void>;
}

async function bucket(): Promise<R2Like> {
	const { env } = await import(/* @vite-ignore */ 'cloudflare:workers');
	const b = (env as { PHOTOS?: R2Like }).PHOTOS;
	if (!b) throw new Error('PHOTOS bucket is not configured');
	return b;
}

const DIR = '.data/uploads';

function safeKey(key: string): string {
	if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes('..')) throw new Error('Bad file name');
	return key;
}

export async function putObject(key: string, bytes: ArrayBuffer, contentType: string): Promise<void> {
	safeKey(key);
	if (dev) {
		const fs = await import('node:fs/promises');
		const path = await import('node:path');
		const file = path.join(DIR, key);
		await fs.mkdir(path.dirname(file), { recursive: true });
		await fs.writeFile(file, new Uint8Array(bytes));
		await fs.writeFile(`${file}.type`, contentType);
		return;
	}
	await (await bucket()).put(key, bytes, { httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' } });
}

export async function getObject(key: string): Promise<{ body: BodyInit; contentType: string } | null> {
	safeKey(key);
	if (dev) {
		const fs = await import('node:fs/promises');
		const path = await import('node:path');
		const file = path.join(DIR, key);
		try {
			const [data, type] = await Promise.all([fs.readFile(file), fs.readFile(`${file}.type`, 'utf8').catch(() => 'image/webp')]);
			return { body: new Uint8Array(data), contentType: type };
		} catch {
			return null;
		}
	}
	const obj = await (await bucket()).get(key);
	return obj ? { body: obj.body, contentType: obj.httpMetadata?.contentType ?? 'image/webp' } : null;
}

export async function deleteObject(key: string): Promise<void> {
	safeKey(key);
	if (dev) {
		const fs = await import('node:fs/promises');
		const path = await import('node:path');
		await fs.rm(path.join(DIR, key), { force: true });
		await fs.rm(path.join(DIR, `${key}.type`), { force: true });
		return;
	}
	await (await bucket()).delete(key);
}

export const IMAGE_TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Checks the file really starts like a WebP/JPEG/PNG image (not just its claimed type). */
export function looksLikeImage(bytes: Uint8Array, type: string): boolean {
	if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
	if (type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
	if (type === 'image/webp')
		return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
	return false;
}
