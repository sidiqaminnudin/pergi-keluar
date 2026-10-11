import {chromium} from 'playwright';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = path.join(ROOT, 'docs', 'screenshots', process.env.TAG || 'before');

const VIEWPORTS = [
  {name: '375', width: 375, height: 812, mobile: true},
  {name: '768', width: 768, height: 1024, mobile: true},
  {name: '1440', width: 1440, height: 900, mobile: false},
];

const ROUTES = [
  {name: 'home', url: '/'},
  {name: 'trip-listing', url: '/trip'},
  {name: 'destinasi-listing', url: '/destinasi'},
  {name: 'tentang', url: '/tentang'},
  {name: 'trip-detail', url: '/trip/karanganyar-2-hari-1-malam'},
  {name: 'destinasi-detail', url: '/destinasi/kebun-teh-kemuning'},
  {name: 'admin-login', url: '/admin/login'},
];

const CRED = {
  email: process.env.SEED_ADMIN_EMAIL,
  password: process.env.SEED_ADMIN_PASSWORD,
};

const ADMIN_ROUTES = [
  {name: 'admin-dashboard', url: '/admin'},
  {name: 'admin-trips', url: '/admin/trips'},
  {name: 'admin-trip-editor', url: '/admin/trips/create'},
  {name: 'admin-destinations', url: '/admin/destinations'},
  {name: 'admin-media', url: '/admin/media'},
  {name: 'admin-settings', url: '/admin/settings'},
];

fs.mkdirSync(OUT, {recursive: true});

const browser = await chromium.launch();
const report = [];

async function shoot(ctx, route, vp, opts = {}) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const failed = [];
  page.on('requestfailed', r => failed.push(r.url().slice(0, 120)));

  await page.goto(BASE + route.url, {waitUntil: 'load', timeout: 30000});
  await page.waitForTimeout(1800);
  // Force lazy fonts/images to settle.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(600);

  const file = path.join(OUT, `${route.name}__${vp.name}.png`);
  await page.screenshot({path: file, fullPage: opts.full !== false});

  const metrics = await page.evaluate(() => {
    const de = document.documentElement;
    const overflowing = [];
    const vw = window.innerWidth;
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 1.5 || r.left < -1.5)) {
        overflowing.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '',
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    });
    return {
      scrollW: de.scrollWidth,
      clientW: de.clientWidth,
      scrollH: de.scrollHeight,
      overflowing: overflowing.slice(0, 12),
      h1: document.querySelector('h1')?.innerText?.slice(0, 120) || null,
      h1Size: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontSize : null,
    };
  });

  report.push({route: route.name, viewport: vp.name, file: path.relative(ROOT, file), ...metrics,
    hScroll: metrics.scrollW > metrics.clientW, errors, failedRequests: failed});
  await page.close();
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: {width: vp.width, height: vp.height},
    deviceScaleFactor: 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    locale: 'id-ID',
  });
  for (const route of ROUTES) await shoot(ctx, route, vp);
  if (vp.name === '1440' && CRED.email && CRED.password) {
    const page = await ctx.newPage();
    await page.goto(BASE + '/admin/login', {waitUntil: 'load'});
    await page.waitForTimeout(1200);
    await page.fill('input[type=email]', CRED.email);
    await page.fill('input[type=password]', CRED.password);
    await page.click('button[type=submit]');
    await page.waitForTimeout(2500);
    report.push({route: 'admin-login-attempt', viewport: '1440', url: page.url()});
    await page.close();
    for (const route of ADMIN_ROUTES) {
      for (const v of [vp, VIEWPORTS[0]]) await shoot(ctx, route, v);
    }
  }
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report.map(r => ({
  route: r.route, vp: r.viewport,
  hScroll: r.hScroll, scrollW: r.scrollW, clientW: r.clientW,
  overflow: r.overflowing?.length || 0,
  errs: r.errors?.length || 0,
  failed: r.failedRequests?.length || 0,
})), null, 1));
