import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const APPS = ['customer', 'driver', 'provider'];

export async function buildMobileApp(appName) {
  if (!APPS.includes(appName)) {
    throw new Error(`Unknown app "${appName}". Available apps: ${APPS.join(', ')}`);
  }

  const apiBase = String(process.env.ARY_API_BASE || process.env.VITE_API_BASE || '').trim().replace(/\\/$/, '');
  if (!apiBase) throw new Error('Set ARY_API_BASE to the deployed HTTPS API base (for example https://api.example.com/api) before building native apps.');
  let parsedApiBase;
  try { parsedApiBase = new URL(apiBase); } catch { throw new Error('ARY_API_BASE must be a valid absolute HTTPS URL.'); }
  if (parsedApiBase.protocol !== 'https:' || !parsedApiBase.pathname.replace(/\\/$/, '').endsWith('/api')) throw new Error('ARY_API_BASE must use HTTPS and end with /api.');
  process.env.VITE_API_BASE = apiBase;

  const root = process.cwd();
  const mobileDir = path.resolve(root, 'mobile', appName);
  const outDir = path.resolve(mobileDir, 'dist');

  console.log(`\n🚀 [ARY Mobile] Building "${appName}" mobile app bundle...`);

  await build({
    plugins: [react()],
    base: './',
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(mobileDir, 'index.html')
      }
    }
  });

  const nestedIndex = path.resolve(outDir, 'mobile', appName, 'index.html');
  const targetIndex = path.resolve(outDir, 'index.html');
  if (fs.existsSync(nestedIndex)) {
    let content = fs.readFileSync(nestedIndex, 'utf8');
    content = content.replace(/\.\.\/\.\.\/assets\//g, './assets/');
    fs.writeFileSync(targetIndex, content, 'utf8');
    fs.rmSync(path.resolve(outDir, 'mobile'), { recursive: true, force: true });
  }

  console.log(`✅ [ARY Mobile] "${appName}" bundle generated at: ${outDir}`);

  // Sync to native Android platform
  if (fs.existsSync(path.resolve(mobileDir, 'android'))) {
    console.log(`📲 [ARY Mobile] Syncing assets to native Android project for "${appName}"...`);
    execSync('npx cap sync android', { cwd: mobileDir, stdio: 'inherit' });
    console.log(`🎉 [ARY Mobile] Android project for "${appName}" synced successfully!`);
  }
}

async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'all') {
    for (const app of APPS) {
      await buildMobileApp(app);
    }
  } else {
    await buildMobileApp(target);
  }
}

if (process.argv[1] && process.argv[1].endsWith('build-mobile.mjs')) {
  main().catch((err) => {
    console.error('❌ Build failed:', err);
    process.exit(1);
  });
}
