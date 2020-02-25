const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhoneXR = devices['iPhone XR landscape'];

puppeteer.launch({ headless: false }).then(async browser => {
  const page = await browser.newPage();
  // spoof mobile to access store map
  await page.emulate(iPhoneXR);
  // go to cart url
  const url =
    'https://www.homedepot.com/p/DAP-Alex-Plus-10-1-oz-White-Acrylic-Latex-Caulk-Plus-Silicone-18103/100097524';
  await page.goto(url);
  // grab the div.grid in every div.cartItem and store in an ITEM object?
  // click the div.cartImage > a
  // click store map on item page
  await Promise.all([
    await page.click('div.store-availability__inventory > a'),
    await page.waitForNavigation({ waitUntil: 'load' })
  ]);
  // grab the g.active-aisle (storemarker) and store it in ITEM object
  // need to grab rect.(x,y) coordinates
  // Traveling Salesman algorithm + rerender div.cartItem(s) in correct order

  // zoom out 1x store layout
  await page.click('rect.minus-box');
  // screenshot the page
  await page.screenshot({ path: 'test.png' });
  await browser.close();
});
