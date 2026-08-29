// Regenerates the screenshots used by /docs/authentication/login.
//
// Playwright isn't a project dependency (kept out of package.json on
// purpose) — install it ephemerally before running this:
//   cd /tmp && npm init -y && npm install --no-save playwright
//   npx playwright install chromium
//
// Then, with a dev server running (`php artisan serve --port=8010`, or set
// APP_URL below) and logged out:
//   node /path/to/this/file.mjs
//
// Requires a seeded user with a known password and no 2FA enabled —
// database/seeders/UserSeeder.php's accounts all use the factory default
// password ("password"). Update DEMO_EMAIL if that user no longer exists.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE_URL = process.env.APP_URL ?? 'http://127.0.0.1:8010';
const DEMO_EMAIL = 'priya.shah@steward.app';
const DEMO_PASSWORD = 'password';

const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
);
const OUT_DIR = path.join(
    REPO_ROOT,
    'public/docs-screenshots/authentication',
);

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// 1. Empty login form
await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#email');
await page.screenshot({ path: `${OUT_DIR}/login-01-empty.png` });

// 2. Filled login form (before submitting)
await page.fill('#email', DEMO_EMAIL);
await page.fill('#password', DEMO_PASSWORD);
await page.screenshot({ path: `${OUT_DIR}/login-02-filled.png` });

// 3. Validation error (wrong password)
await page.fill('#password', 'wrong-password');
await page.click('[data-test="login-button"]');
await page.waitForSelector('text=/these credentials/i', { timeout: 10000 });
await page.screenshot({ path: `${OUT_DIR}/login-03-invalid.png` });

// 4. Successful login -> dashboard
await page.fill('#password', DEMO_PASSWORD);
await page.click('[data-test="login-button"]');
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.waitForTimeout(600); // let charts/data settle
await page.screenshot({ path: `${OUT_DIR}/login-04-dashboard.png` });

await browser.close();
console.log(`Screenshots written to ${OUT_DIR}`);
