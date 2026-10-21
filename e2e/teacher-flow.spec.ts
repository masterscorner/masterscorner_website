// A new teacher signs in, sets up a class, adds a child and takes attendance; the parent confirms.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, phone: string) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Mobile number').fill(phone);
	await page.getByRole('button', { name: 'Send code' }).click();
	await expect(page.getByText('Code sent to')).toBeVisible();
	const { code } = JSON.parse(readFileSync('.data/last-otp.json', 'utf8'));
	await page.getByLabel('6 number code').fill(code);
	await page.getByRole('button', { name: 'Sign in' }).click();
}

const stamp = String(Date.now()).slice(-6);
const teacherPhone = `97${stamp}01`;
const parentPhone = `96${stamp}02`;

test('teacher sets up a class and takes attendance; parent confirms child', async ({ page }) => {
	await signIn(page, teacherPhone);
	await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
	await page.getByLabel('Your name').fill('Ravi Kumar');
	await page.getByLabel('Year you were born').selectOption('1988');
	await page.getByLabel(/I am 18 or older/).check();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByRole('heading', { name: /Hello, Ravi/ })).toBeVisible();

	await page.getByRole('link', { name: 'Start my class' }).click();
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Class name').fill(`Test Karate ${stamp}`);
	await page.getByLabel('What do you teach?').selectOption({ label: '🥋 Karate' });
	await page.getByLabel('City', { exact: true }).fill('Madurai');
	await page.getByLabel('Address').fill('5 Temple Street');
	// Class days are in India time, whatever the test machine's clock says.
	const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(new Date());
	await page.locator('label.chip', { hasText: dayName }).first().click();
	await page.getByRole('button', { name: 'Create my class' }).click();
	await expect(page.getByText('Your class is live.')).toBeVisible();

	await page.getByRole('link', { name: 'Add students' }).first().click();
	await page.getByLabel('Student name').fill('Meena');
	await page.getByLabel("Parent's mobile number").fill(parentPhone);
	await page.getByRole('button', { name: 'Add student' }).click();
	await expect(page.getByText('Meena added.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add student' })).toBeEnabled();
	await page.locator('label.chip', { hasText: 'An adult' }).click();
	await page.getByLabel('Student name').fill('Suresh');
	await page.getByRole('button', { name: 'Add student' }).click();
	await expect(page.getByText('Suresh added.')).toBeVisible();
	await expect(page.getByText('Waiting for parent')).toBeVisible();

	await page.getByRole('link', { name: 'Today' }).click();
	await page.getByRole('link', { name: 'Take attendance' }).click();
	// Only Suresh (adult) is on the list; Meena waits for her parent.
	await expect(page.locator('.name', { hasText: 'Suresh' })).toBeVisible();
	await expect(page.getByText('Meena')).toHaveCount(0);
	await page.getByRole('button', { name: 'Everyone else is present' }).click();
	await page.getByRole('button', { name: /Save attendance/ }).click();
	await expect(page.getByText('Saved.')).toBeVisible();

	// Insights, levels and fees.
	await page.getByRole('link', { name: 'Insights' }).click();
	await expect(page.getByRole('heading', { name: 'Attendance each week' })).toBeVisible();
	await page.getByRole('link', { name: 'More' }).click();
	await page.getByRole('link', { name: /Levels/ }).click();
	// A karate class starts with karate belts.
	await expect(page.getByText('Karate belts (kyu)').first()).toBeVisible();
	await page.getByRole('button', { name: 'Give level' }).first().click();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByText(/^Yellow since|^White since/)).toBeVisible();
	// Back returns to the page you came from (More), not the dashboard.
	await page.getByRole('link', { name: 'Back' }).click();
	await expect(page).toHaveURL(/\/more$/);
	await page.getByRole('link', { name: 'Fees' }).click();
	await expect(page.getByRole('heading', { name: 'Fees' })).toBeVisible();

	// Parent signs in on another phone and confirms.
	await page.context().clearCookies();
	await signIn(page, parentPhone);
	await page.getByLabel('Your name').fill('Lakshmi');
	await page.getByLabel('Year you were born').selectOption('1990');
	await page.getByLabel(/I am 18 or older/).check();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByText('Please confirm your child')).toBeVisible();
	await page.getByRole('button', { name: 'Yes, confirm' }).click();
	await expect(page.getByText('Thank you. Your child is confirmed.')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'My children', exact: true })).toBeVisible();
	await page.getByRole('link', { name: new RegExp(`Test Karate ${stamp}`) }).first().click();
	await expect(page.getByText('Meena').first()).toBeVisible();
	await expect(page.getByRole('region', { name: 'Attendance' })).toBeVisible();
});
