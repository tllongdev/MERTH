const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhoneXR = devices['iPhone XR landscape'];

puppeteer.launch({ headless: false }).then(async browser => {
  const page = await browser.newPage();
  // emulate mobile browser to access store map link
  await page.emulate(iPhoneXR);

  let cartUrl =
    'https://www.homedepot.com/mycart/home?userId=cd14e1db-18d4-4f32-9f20-49a9814b2cc8&customerId=cd14e1db-18d4-4f32-9f20-49a9814b2cc8&sharedCartId=HL100097460525?cm_mmc=ecc-_-THD_SHARE_CART__V1_M1_CA-_-VIEW_CART#';

  let storeNumber = '1912';

  // establish cart history by navigating to cart url
  await page.goto(cartUrl);
  await page.waitForSelector('div.cartTotals');

  // select store --------------->
  await page.click('#myStoreMobile > a > span > div');
  await page.waitForSelector('#myStore-formInput');
  await page.focus('#myStore-formInput');
  await page.keyboard.type(storeNumber);
  // await page.$eval('#myStore-formInput', input => (input.value = storeNumber));
  await page.keyboard.press('Enter');
  // await page.click('img.localization__icn--search');
  await page.waitForSelector(
    '#myStore-list > div:nth-child(1) > div.localization__button--select > a > span'
  );
  await page.click(
    '#myStore-list > div:nth-child(1) > div.localization__button--select > a > span'
  );
  await page.click('div.Mask.Mask--open');
  // select store --------------->

  // grab each div.cartItem and store in cartItems array
  const cartItems = await page.$$('div.cartItem');

  let screenshotCount = 1;

  // loop through cartItems
  for (let i = 0; i < cartItems.length; i++) {
    // go to established cart and wait for the page to load
    await page.goto('https://www.homedepot.com/mycart/home#');
    await page.waitForSelector('div.cartTotals');

    // rebuild cartItems array
    const cartItems = await page.$$('div.cartItem');

    let item = cartItems[i];

    // click the 'div.cartImage > a' to navigate to the item page
    let itemLink = await item.$('div.cartImage > a');
    await itemLink.click();

    // wait for the store map link to be available
    await page.waitForSelector('div.store-availability__inventory > a');

    // click store map link
    await page.$eval('div.store-availability__inventory > a', element =>
      element.click()
    );

    // (await page.waitForSelector('g.storemarker')) ||
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    // zoom out 1x store layout
    await page.click('rect.minus-box');

    // screenshot the store map
    await page.screenshot({ path: `test${screenshotCount}.png` });
    console.log(screenshotCount);
    // increment screenshotCount for .png naming sequence
    ++screenshotCount;
  }

  // grab the g.active-aisle (g.storemarker) innerHtml and store it in ITEM object
  // need to grab rect.(x,y) coordinates from g.storemarker for each item
  // Traveling Salesman algorithm + rerender div.cartItem(s) in correct order
  // return store map with visualization of TS route

  // close headless browser when finished
  await browser.close();
});
