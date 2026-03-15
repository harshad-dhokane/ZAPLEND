const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1080 });
  
  // Dashboard
  await page.goto('http://localhost:3003/dashboard', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/home/harshad/.gemini/antigravity/brain/d6c5ef50-aed9-4f74-b7be-cf5be488a33b/genalpha_dashboard.png', fullPage: true });

  // Borrow
  await page.goto('http://localhost:3003/borrow', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/home/harshad/.gemini/antigravity/brain/d6c5ef50-aed9-4f74-b7be-cf5be488a33b/genalpha_borrow.png', fullPage: true });
  
  // Lend
  await page.goto('http://localhost:3003/lend', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/home/harshad/.gemini/antigravity/brain/d6c5ef50-aed9-4f74-b7be-cf5be488a33b/genalpha_lend.png', fullPage: true });

  await browser.close();
})();
