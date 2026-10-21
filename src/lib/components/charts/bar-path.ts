/** A bar with a 4px rounded data-end and a square baseline end. */
export function barPath(x: number, y: number, w: number, h: number, end: 'top' | 'bottom' = 'top'): string {
	if (h <= 0 || w <= 0) return '';
	const r = Math.min(4, h, w / 2);
	if (end === 'top') return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
	return `M${x},${y}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w - r}Q${x + w},${y + h} ${x + w},${y + h - r}V${y}Z`;
}

/** Clean axis maximum: 1, 2, 5 × 10ⁿ. */
export function niceMax(v: number): number {
	if (v <= 0) return 1;
	const p = 10 ** Math.floor(Math.log10(v));
	for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
	return 10 * p;
}

/** 1200 → 1.2K, 250000 → 2.5L (Indian compact). */
export function compact(n: number): string {
	if (n >= 1e7) return `${+(n / 1e7).toFixed(1)}Cr`;
	if (n >= 1e5) return `${+(n / 1e5).toFixed(1)}L`;
	if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
	return String(Math.round(n));
}
