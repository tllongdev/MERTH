const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhoneXR = devices['iPhone XR landscape'];

puppeteer.launch({ headless: true }).then(async browser => {
  const page = await browser.newPage();
  // spoof mobile to access store map
  await page.emulate(iPhoneXR);
  let cartUrl =
    'https://www.homedepot.com/mycart/home?userId=cd14e1db-18d4-4f32-9f20-49a9814b2cc8&customerId=cd14e1db-18d4-4f32-9f20-49a9814b2cc8&sharedCartId=HL100097460525?cm_mmc=ecc-_-THD_SHARE_CART__V1_M1_CA-_-VIEW_CART#';
  // go to cart url
  await page.goto(cartUrl);
  await page.waitForSelector('div.cartTotals');
  // grab each div.cartItem and store in cartItems array
  const cartItems = await page.$$('div.cartItem');
  let screenshotCount = 0;

  for (let i = 0; i < cartItems.length; i++) {
    await page.goto('https://www.homedepot.com/mycart/home#');
    await page.waitForSelector('div.cartTotals');
    // grab each div.cartItem and store in cartItems array
    const cartItems = await page.$$('div.cartItem');

    let item = cartItems[i];
    // click the div.cartImage > a
    let itemLink = await item.$('div.cartImage > a');
    await itemLink.click();

    await page.waitForSelector('div.store-availability__inventory');
    // click store map link on item page
    await Promise.all([
      await page.click('div.store-availability__inventory > a'),
      await page.waitForNavigation({ waitUntil: 'load' })
    ]);
    // zoom out 1x store layout
    // await page.click('rect.minus-box');
    await page.screenshot({ path: `test${screenshotCount}.png` });
    ++screenshotCount;
    console.log(screenshotCount);
  }

  // click the div.cartImage > a
  // await Promise.all([
  //   await page.click('div.cartImage > a'),
  //   await page.waitForNavigation({ waitUntil: 'load' })
  // ]);

  // click store map on item page
  // await Promise.all([
  //   await page.click('div.store-availability__inventory > a'),
  //   await page.waitForNavigation({ waitUntil: 'load' })
  // ]);
  // grab the g.active-aisle (storemarker) and store it in ITEM object
  // need to grab rect.(x,y) coordinates
  // Traveling Salesman algorithm + rerender div.cartItem(s) in correct order

  // zoom out 1x store layout
  // await page.click('rect.minus-box');

  // screenshot the page
  // let screenshotCount = 0;
  // await page.screenshot({ path: `test${screenshotCount++}.png` });
  await browser.close();
});
