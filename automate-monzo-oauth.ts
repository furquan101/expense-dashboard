import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DEVELOPER_PORTAL = 'https://developers.monzo.com/';
const LOCAL_SETUP_URL = 'http://localhost:3000/api/monzo-oauth/setup';
const ENV_FILE = path.join(process.cwd(), '.env.local');

async function automateMonzoOAuth() {
  console.log('🤖 Starting Monzo OAuth Automation');
  console.log('===================================\n');

  const browser = await chromium.launch({
    headless: false, // Keep browser visible
    slowMo: 500 // Slow down for visibility
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to Monzo Developer Portal
    console.log('📱 Step 1: Opening Monzo Developer Portal...');
    await page.goto(DEVELOPER_PORTAL);
    await page.waitForLoadState('networkidle');

    console.log('\n⏸️  MANUAL ACTION REQUIRED:');
    console.log('Please log in to Monzo in the browser window.');
    console.log('After logging in, press Enter here to continue...\n');

    // Wait for user to log in
    await waitForEnter();

    console.log('\n✅ Continuing automation...\n');

    // Step 2: Look for "Create OAuth Client" or similar button
    console.log('📝 Step 2: Creating OAuth Client...');

    await page.waitForTimeout(2000);

    // Try to find and click the create client button
    const createButtonSelectors = [
      'text=Create OAuth Client',
      'text=New Client',
      'text=Create Client',
      'button:has-text("Create")',
      'a:has-text("Create")'
    ];

    let createButtonFound = false;
    for (const selector of createButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found button: ${selector}`);
          await button.click();
          createButtonFound = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!createButtonFound) {
      console.log('⚠️  Could not find "Create OAuth Client" button automatically.');
      console.log('Please click the "Create OAuth Client" button manually.');
      console.log('Press Enter when ready to continue...\n');
      await waitForEnter();
    }

    await page.waitForTimeout(2000);

    // Step 3: Fill in the OAuth client form
    console.log('📋 Step 3: Filling OAuth client form...');

    const formFields = {
      name: 'Expense Dashboard',
      redirect_uri: 'http://localhost:3000/api/monzo-oauth/callback',
      description: 'Personal expense tracking dashboard'
    };

    // Try to fill common form field selectors
    const nameSelectors = ['input[name="name"]', 'input[name="client_name"]', 'input[placeholder*="name" i]'];
    for (const selector of nameSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 1000 })) {
          await page.fill(selector, formFields.name);
          console.log('✅ Filled name field');
          break;
        }
      } catch (e) {}
    }

    const redirectSelectors = ['input[name="redirect_uri"]', 'input[name="redirect_uris"]', 'input[placeholder*="redirect" i]'];
    for (const selector of redirectSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 1000 })) {
          await page.fill(selector, formFields.redirect_uri);
          console.log('✅ Filled redirect URI');
          break;
        }
      } catch (e) {}
    }

    const descSelectors = ['textarea[name="description"]', 'input[name="description"]', 'textarea[placeholder*="description" i]'];
    for (const selector of descSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 1000 })) {
          await page.fill(selector, formFields.description);
          console.log('✅ Filled description');
          break;
        }
      } catch (e) {}
    }

    // Select "Confidential" if radio button exists
    const confidentialSelectors = [
      'input[value="confidential"]',
      'input[name="confidentiality"][value="confidential"]',
      'label:has-text("Confidential")'
    ];
    for (const selector of confidentialSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 1000 })) {
          await page.locator(selector).click();
          console.log('✅ Selected Confidential');
          break;
        }
      } catch (e) {}
    }

    console.log('\n⏸️  MANUAL ACTION REQUIRED:');
    console.log('Please review the form and submit it.');
    console.log('After the OAuth client is created, you should see:');
    console.log('  - Client ID');
    console.log('  - Client Secret');
    console.log('\nPress Enter after you see the credentials...\n');

    await waitForEnter();

    // Step 4: Extract credentials from the page
    console.log('\n🔍 Step 4: Extracting OAuth credentials...');

    await page.waitForTimeout(2000);

    // Try to extract credentials
    let clientId = '';
    let clientSecret = '';

    // Look for text patterns
    const pageText = await page.textContent('body');

    // Extract Client ID (starts with oauth2client_)
    const clientIdMatch = pageText?.match(/oauth2client_[a-zA-Z0-9]+/);
    if (clientIdMatch) {
      clientId = clientIdMatch[0];
      console.log(`✅ Found Client ID: ${clientId.substring(0, 20)}...`);
    }

    // Extract Client Secret (starts with mnzconf.)
    const clientSecretMatch = pageText?.match(/mnzconf\.[a-zA-Z0-9_-]+/);
    if (clientSecretMatch) {
      clientSecret = clientSecretMatch[0];
      console.log(`✅ Found Client Secret: ${clientSecret.substring(0, 15)}...`);
    }

    // If not found automatically, ask user
    if (!clientId || !clientSecret) {
      console.log('\n⚠️  Could not extract credentials automatically.');
      console.log('Please copy them from the page:');

      if (!clientId) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        clientId = await new Promise(resolve => {
          readline.question('Enter Client ID (oauth2client_...): ', resolve);
        });
        readline.close();
      }

      if (!clientSecret) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        clientSecret = await new Promise(resolve => {
          readline.question('Enter Client Secret (mnzconf...): ', resolve);
        });
        readline.close();
      }
    }

    // Step 5: Update .env.local
    console.log('\n💾 Step 5: Updating .env.local...');

    let envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    const backupFile = ENV_FILE + '.backup';
    fs.writeFileSync(backupFile, envContent);
    console.log(`✅ Backed up to ${backupFile}`);

    // Update or add credentials
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

    if (!envContent.includes('MONZO_REDIRECT_URI=')) {
      envContent += `\nMONZO_REDIRECT_URI=http://localhost:3000/api/monzo-oauth/callback`;
    }

    fs.writeFileSync(ENV_FILE, envContent);
    console.log('✅ Updated .env.local with new credentials');

    console.log('\n⚠️  Please restart your dev server now:');
    console.log('  1. Press Ctrl+C in the terminal running "npm run dev"');
    console.log('  2. Run "npm run dev" again');
    console.log('\nPress Enter after restarting the server...\n');

    await waitForEnter();

    // Step 6: Get authorization URL
    console.log('\n🔗 Step 6: Getting authorization URL...');

    const setupPage = await context.newPage();
    await setupPage.goto(LOCAL_SETUP_URL);
    await setupPage.waitForLoadState('networkidle');

    const setupResponse = await setupPage.textContent('body');
    const setupData = JSON.parse(setupResponse || '{}');
    const authUrl = setupData.authorizationUrl;

    if (!authUrl) {
      throw new Error('Could not get authorization URL. Make sure dev server is running.');
    }

    console.log(`✅ Got authorization URL`);

    // Step 7: Authorize the app
    console.log('\n🔐 Step 7: Authorizing the app...');

    await page.goto(authUrl);
    await page.waitForLoadState('networkidle');

    console.log('\n⏸️  MANUAL ACTION REQUIRED:');
    console.log('Please authorize the app in the browser.');
    console.log('You should see a Monzo authorization page.');
    console.log('Click "Authorize" or "Allow".\n');

    // Wait for redirect to callback
    await page.waitForURL(/\/api\/monzo-oauth\/callback/, { timeout: 120000 });

    console.log('✅ Authorization callback received!');

    await page.waitForTimeout(2000);

    // Step 8: Extract tokens from callback page
    console.log('\n🎉 Step 8: Extracting tokens...');

    const callbackText = await page.textContent('body');
    const callbackData = JSON.parse(callbackText || '{}');

    const accessToken = callbackData.tokens?.MONZO_ACCESS_TOKEN;
    const refreshToken = callbackData.tokens?.MONZO_REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      throw new Error('Could not extract tokens from callback page');
    }

    console.log(`✅ Got access token: ${accessToken.substring(0, 20)}...`);
    console.log(`✅ Got refresh token: ${refreshToken.substring(0, 20)}...`);

    // Step 9: Update .env.local with tokens
    console.log('\n💾 Step 9: Saving tokens to .env.local...');

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
    console.log('✅ Saved tokens to .env.local');

    console.log('\n🎉 SUCCESS! Monzo OAuth is now fully configured!');
    console.log('============================================\n');
    console.log('Next steps:');
    console.log('1. Restart your dev server one more time');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Your latest transactions should now appear!');
    console.log('\nTest with:');
    console.log('  curl http://localhost:3000/api/monzo-debug | python3 -m json.tool');

  } catch (error) {
    console.error('\n❌ Error during automation:', error);
    console.error('\nYou may need to complete the remaining steps manually.');
  } finally {
    await browser.close();
  }
}

function waitForEnter(): Promise<void> {
  return new Promise(resolve => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    readline.question('', () => {
      readline.close();
      resolve();
    });
  });
}

// Run the automation
automateMonzoOAuth();
