// Sends login codes. In development the code is printed to the server console.
import { dev } from '$app/env';
import { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, OTP_SENDER } from '$app/env/private';

/** Development only: the last code per phone, so the sign-in page can show it (no SMS is sent locally). */
export const devCodes = new Map<string, string>();

export async function sendOtp(phone: string, code: string): Promise<void> {
	if (OTP_SENDER === 'console') {
		console.log(`\n  ==============================\n   [login code] ${phone}: ${code}\n  ==============================\n`);
		if (dev) {
			devCodes.set(phone, code);
			// Lets automated tests sign in locally. Never used in production.
			const fs = await import('node:fs/promises');
			await fs.mkdir('.data', { recursive: true });
			await fs.writeFile('.data/last-otp.json', JSON.stringify({ phone, code }));
		}
		return;
	}
	if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) throw new Error('MSG91 is not configured');
	// MSG91 OTP API: the template must be DLT-approved and contain the ##OTP## variable.
	const res = await fetch('https://control.msg91.com/api/v5/otp', {
		method: 'POST',
		headers: { 'content-type': 'application/json', authkey: MSG91_AUTH_KEY },
		body: JSON.stringify({ template_id: MSG91_TEMPLATE_ID, mobile: phone.replace('+', ''), otp: code })
	});
	if (!res.ok) throw new Error(`Could not send the code (${res.status})`);
}
