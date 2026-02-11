import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DEVELOPER_PORTAL = 'https://developers.monzo.com/';
const LOCAL_SETUP_URL = 'http://localhost:3000/api/monzo-oauth/setup';
const ENV_FILE = path.join(process.cwd(), '.env.local');

async function automateMonzoOAuth() {
  console.log('🤖 Starting Monzo OAuth Automation (Non-Interactive Mode)');
  console.log('========================================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to Monzo Developer Portal
    console.log('📱 Step 1: Opening Monzo Developer Portal...');
    await page.goto(DEVELOPER_PORTAL);
    await page.waitForLoadState('networkidle');

    // Wait for login to complete (detect when we're past login page)
    console.log('⏳ Waiting for login... (detecting automatically)');

    // Wait until we're no longer on auth/login page
    await page.waitForFunction(() => {
      return !window.location.href.includes('/login') &&
             !window.location.href.includes('/auth/');
    }, { timeout: 120000 });

    console.log('✅ Login detected!\n');
    await page.waitForTimeout(3000);

    // Step 2: Create OAuth Client
    console.log('📝 Step 2: Creating OAuth Client...');

    // Look for create button
    const createButtonSelectors = [
      'text=Create OAuth Client',
      'text=New Client',
      'text=Create Client',
      'text=Create',
      'a:has-text("Create")',
      'button:has-text("Create")'
    ];

    let clicked = false;
    for (const selector of createButtonSelectors) {
      try {
        const elem = page.locator(selector).first();
        if (await elem.isVisible({ timeout: 2000 })) {
          console.log(`✅ Clicking: ${selector}`);
          await elem.click();
          clicked = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {}
    }

    if (!clicked) {
      console.log('⚠️  Waiting 10 seconds for you to click "Create OAuth Client"...');
      await page.waitForTimeout(10000);
    }

    // Step 3: Fill form
    console.log('📋 Step 3: Filling form...');

    // Name field
    const nameSelectors = ['input[name="name"]', 'input[name="client_name"]', 'input[id*="name"]', 'input[placeholder*="Name" i]'];
    for (const sel of nameSelectors) {
      try {
        if (await page.locator(sel).isVisible({ timeout: 1000 })) {
          await page.fill(sel, 'Expense Dashboard');
          console.log('✅ Name: Expense Dashboard');
          break;
        }
      } catch (e) {}
    }

    // Redirect URI
    const redirectSelectors = ['input[name="redirect_uri"]', 'input[name="redirect_uris"]', 'input[id*="redirect"]', 'input[placeholder*="Redirect" i]'];
    for (const sel of redirectSelectors) {
      try {
        if (await page.locator(sel).isVisible({ timeout: 1000 })) {
          await page.fill(sel, 'http://localhost:3000/api/monzo-oauth/callback');
          console.log('✅ Redirect URI: http://localhost:3000/api/monzo-oauth/callback');
          break;
        }
      } catch (e) {}
    }

    // Description
    const descSelectors = ['textarea[name="description"]', 'input[name="description"]', 'textarea[id*="description"]'];
    for (const sel of descSelectors) {
      try {
        if (await page.locator(sel).isVisible({ timeout: 1000 })) {
          await page.fill(sel, 'Personal expense tracking dashboard');
          console.log('✅ Description added');
          break;
        }
      } catch (e) {}
    }

    // Confidential
    const confSelectors = [
      'input[value="confidential"]',
      'input[type="radio"][value="confidential"]',
      'label:has-text("Confidential")'
    ];
    for (const sel of confSelectors) {
      try {
        if (await page.locator(sel).isVisible({ timeout: 1000 })) {
          await page.click(sel);
          console.log('✅ Selected: Confidential');
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(2000);

    // Submit form
    console.log('📤 Submitting form...');
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Create")',
      'button:has-text("Save")',
      'input[type="submit"]'
    ];

    for (const sel of submitSelectors) {
      try {
        if (await page.locator(sel).isVisible({ timeout: 1000 })) {
          console.log(`✅ Clicking submit: ${sel}`);
          await page.click(sel);
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(3000);

    // Step 4: Extract credentials
    console.log('\n🔍 Step 4: Extracting credentials...');

    const pageText = await page.textContent('body') || '';

    let clientIdMatch = pageText.match(/oauth2client_[a-zA-Z0-9]+/);
    let clientSecretMatch = pageText.match(/mnzconf\.[a-zA-Z0-9_-]+/);

    if (!clientIdMatch || !clientSecretMatch) {
      console.log('❌ Could not find credentials automatically');
      console.log('⏳ Waiting 15 seconds for credentials to appear...');
      await page.waitForTimeout(15000);

      const newPageText = await page.textContent('body') || '';
      clientIdMatch = newPageText.match(/oauth2client_[a-zA-Z0-9]+/);
      clientSecretMatch = newPageText.match(/mnzconf\.[a-zA-Z0-9_-]+/);

      if (!clientIdMatch || !clientSecretMatch) {
        throw new Error('Could not extract credentials. Please check the browser window.');
      }
    }

    const clientId = clientIdMatch[0];
    const clientSecret = clientSecretMatch[0];

    console.log(`✅ Client ID: ${clientId.substring(0, 25)}...`);
    console.log(`✅ Client Secret: ${clientSecret.substring(0, 20)}...`);

    // Step 5: Update .env.local
    console.log('\n💾 Step 5: Updating .env.local...');

    let envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    fs.writeFileSync(ENV_FILE + '.backup', envContent);

    if (envContent.includes('MONZO_CLIENT_ID=')) {
      envContent = envContent.replace(/MONZO_CLIENT_ID=.*/g, `MONZO_CLIENT_ID=${clientId}`);
    } else {
      envContent += `\nMONZO_CLIENT_ID=${clientId}`;
    }

    if (envContent.includes('MONZO_CLIENT_SECRET=')) {
      envContent = envContent.replace(/MONZO_CLIENT_SECRET=.*/g, `MONZO_CLIENT_SECRET=${clientSecret}`);
    } else {
      envContent += `\nMONZO_CLIENT_SECRET=${clientSecret}`;
    }

    fs.writeFileSync(ENV_FILE, envContent);
    console.log('✅ Credentials saved to .env.local');

    console.log('\n⚠️  IMPORTANT: Please restart your dev server now!');
    console.log('   Press Ctrl+C and run: npm run dev');
    console.log('\n⏳ Waiting 15 seconds for you to restart...');
    await page.waitForTimeout(15000);

    // Step 6: Get auth URL
    console.log('\n🔗 Step 6: Getting authorization URL...');

    const setupPage = await context.newPage();
    let setupData: any = {};

    try {
      await setupPage.goto(LOCAL_SETUP_URL);
      await setupPage.waitForLoadState('networkidle');
      const setupText = await setupPage.textContent('body') || '{}';
      setupData = JSON.parse(setupText);
    } catch (e) {
      console.error('❌ Could not fetch setup URL. Make sure dev server is running.');
      throw e;
    }

    const authUrl = setupData.authorizationUrl;
    console.log(`✅ Got authorization URL`);

    // Step 7: Authorize
    console.log('\n🔐 Step 7: Authorizing...');

    await page.goto(authUrl);
    await page.waitForLoadState('networkidle');

    // Look for authorize button
    await page.waitForTimeout(2000);

    const authButtonSelectors = [
      'button:has-text("Authorize")',
      'button:has-text("Allow")',
      'button:has-text("Approve")',
      'button[type="submit"]'
    ];

    for (const sel of authButtonSelectors) {
      try {
        if (await page.locator(sel).isVisible({ timeout: 2000 })) {
          console.log(`✅ Clicking: ${sel}`);
          await page.click(sel);
          break;
        }
      } catch (e) {}
    }

    // Wait for callback
    console.log('⏳ Waiting for callback...');
    await page.waitForURL(/\/api\/monzo-oauth\/callback/, { timeout: 60000 });
    console.log('✅ Callback received!');

    await page.waitForTimeout(2000);

    // Step 8: Extract tokens
    console.log('\n🎉 Step 8: Extracting tokens...');

    const callbackText = await page.textContent('body') || '{}';
    const callbackData = JSON.parse(callbackText);

    const accessToken = callbackData.tokens?.MONZO_ACCESS_TOKEN;
    const refreshToken = callbackData.tokens?.MONZO_REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      throw new Error('Could not extract tokens');
    }

    console.log(`✅ Access token: ${accessToken.substring(0, 30)}...`);
    console.log(`✅ Refresh token: ${refreshToken.substring(0, 30)}...`);

    // Step 9: Save tokens
    console.log('\n💾 Step 9: Saving tokens...');

    envContent = fs.readFileSync(ENV_FILE, 'utf-8');

    if (envContent.includes('MONZO_ACCESS_TOKEN=')) {
      envContent = envContent.replace(/MONZO_ACCESS_TOKEN=.*/g, `MONZO_ACCESS_TOKEN=${accessToken}`);
    } else {
      envContent += `\nMONZO_ACCESS_TOKEN=${accessToken}`;
    }

    if (envContent.includes('MONZO_REFRESH_TOKEN=')) {
      envContent = envContent.replace(/MONZO_REFRESH_TOKEN=.*/g, `MONZO_REFRESH_TOKEN=${refreshToken}`);
    } else {
      envContent += `\nMONZO_REFRESH_TOKEN=${refreshToken}`;
    }

    fs.writeFileSync(ENV_FILE, envContent);
    console.log('✅ Tokens saved!');

    console.log('\n🎉🎉🎉 SUCCESS! 🎉🎉🎉');
    console.log('======================');
    console.log('\nMonzo OAuth is fully configured!');
    console.log('\nNext steps:');
    console.log('1. Restart dev server one more time');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Your transactions will auto-refresh!');
    console.log('\nTest: curl http://localhost:3000/api/monzo-debug');

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await browser.close();
  }
}

automateMonzoOAuth();
