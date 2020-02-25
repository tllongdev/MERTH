const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhoneXR = devices['iPhone XR landscape'];
const iPad = devices['iPad'];

puppeteer.launch({ headless: false }).then(async browser => {
  const page = await browser.newPage();
  await page.emulate(iPhoneXR);
  const url = 'https://www.homedepot.com/p/DAP-Alex-Plus-10-1-oz-White-Acrylic-Latex-Caulk-Plus-Silicone-18103/100097524';
  await page.goto(url);
  await page.screenshot({ path: 'test.png' });
  await browser.close();
});
