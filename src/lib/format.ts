// Display helpers in Indian conventions: ₹1,25,000 · 12 Oct · 6:30 PM.

export function rupees(paise: number | null | undefined): string {
	if (paise == null) return '';
	const value = paise / 100;
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: value % 1 === 0 ? 0 : 2
	}).format(value);
}

export function distance(metres: number): string {
	if (metres < 1000) return `${Math.max(100, Math.round(metres / 100) * 100)} m`;
	return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}

/** "17:30" → "5:30 PM" */
export function time12(hhmm: string): string {
	const [h, m] = hhmm.split(':').map(Number);
	const suffix = h >= 12 ? 'PM' : 'AM';
	const hour = h % 12 === 0 ? 12 : h % 12;
	return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function daysLabel(days: number[]): string {
	const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
	if (sorted.length === 7) return 'Every day';
	if (sorted.join(',') === '1,2,3,4,5') return 'Mon to Fri';
	if (sorted.join(',') === '1,2,3,4,5,6') return 'Mon to Sat';
	if (sorted.join(',') === '6,0') return 'Sat and Sun';
	return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

export function shortDate(iso: string): string {
	const d = new Date(`${iso}T00:00:00`);
	return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(d);
}

export function periodLabel(period: string): string {
	return { month: 'a month', quarter: 'every 3 months', term: 'a term', class: 'a class' }[period] ?? '';
}

export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
