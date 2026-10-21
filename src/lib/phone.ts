// Phone numbers are stored in international (E.164) format: +919876543210.

const E164 = /^\+[1-9]\d{6,14}$/;

export function isE164(value: string): boolean {
	return E164.test(value);
}

/**
 * Turn what a person types into E.164. Indian 10-digit mobiles get +91.
 * Returns null when it cannot be a valid number.
 */
export function normalisePhone(input: string, defaultCountryCode = '91'): string | null {
	const trimmed = input.trim();
	const digits = trimmed.replace(/\D/g, '');
	if (!digits) return null;
	let candidate: string;
	if (trimmed.startsWith('+')) {
		candidate = `+${digits}`;
	} else if (digits.startsWith('00')) {
		candidate = `+${digits.slice(2)}`;
	} else if (defaultCountryCode === '91' && digits.length === 11 && digits.startsWith('0')) {
		candidate = `+91${digits.slice(1)}`;
	} else if (defaultCountryCode === '91' && digits.length === 12 && digits.startsWith('91')) {
		candidate = `+${digits}`;
	} else if (defaultCountryCode === '91' && digits.length === 10) {
		if (!/^[6-9]/.test(digits)) return null;
		candidate = `+91${digits}`;
	} else {
		candidate = `+${defaultCountryCode}${digits}`;
	}
	return isE164(candidate) ? candidate : null;
}

/** +919876543210 → 98765 43210 (for display in India), otherwise unchanged. */
export function formatPhone(e164: string): string {
	if (e164.startsWith('+91') && e164.length === 13) {
		const n = e164.slice(3);
		return `${n.slice(0, 5)} ${n.slice(5)}`;
	}
	return e164;
}
