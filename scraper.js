const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhone = devices['iPhone 8 Plus landscape'];

const Item = {
  itemName: '',
  cartItemDiv: '',
  locationText: '',
  storeMarkerElement: '',
  x: '',
  y: ''
};

const itemArray = [];

puppeteer.launch({ headless: false }).then(async browser => {
  const page = await browser.newPage();
  // emulate mobile browser to access store map link
  await page.emulate(iPhone);

  let cartUrl =
    'https://www.homedepot.com/mycart/home?userId=cd14e1db-18d4-4f32-9f20-49a9814b2cc8&customerId=cd14e1db-18d4-4f32-9f20-49a9814b2cc8&sharedCartId=HL100097460525?cm_mmc=ecc-_-THD_SHARE_CART__V1_M1_CA-_-VIEW_CART#';

  let storeNumber = '1912';

  // establish cart history by navigating to cart url
  await page.goto(cartUrl);
  await page.waitForSelector('div.cartTotals');

  // <--------------- select store --------------->
  await page.click('#myStoreMobile > a > span > div');
  await page.waitForSelector('#myStore-formInput');
  await page.focus('#myStore-formInput');
  await page.keyboard.type(storeNumber);
  await page.keyboard.press('Enter');
  await page.waitForSelector(
    '#myStore-list > div:nth-child(1) > div.localization__button--select > a > span'
  );
  await page.click(
    '#myStore-list > div:nth-child(1) > div.localization__button--select > a > span'
  );
  await page.click('div.Mask.Mask--open');
  // <--------------- select store --------------->

  // grab each div.cartItem and store in cartItems array
  const cartItems = await page.$$('div.cartItem');
  // console.log(cartItems);

  let screenshotCount = 1;

  // <------------ cartItems data scraping loop ------------>
  for (let i = 0; i < cartItems.length; i++) {
    // go to established cart and wait for the page to load
    await page.goto('https://www.homedepot.com/mycart/home');
    await page.waitForSelector('div.cartTotals');

    // rebuild cartItems array
    const cartItems = await page.$$('div.cartItem');

    let item = cartItems[i];

    // console.log(document.querySelector('div.cartItem__productId').outerText.slice(7))

    // get itemName
    let itemName = await item.$eval('h3.cartItem__brandName', element => element.outerText );
    console.log(itemName);

    // get cartItemDiv
    let cartItemDiv = await item.$eval('div:nth-child(1)', element => element.outerHTML);
    // console.log(cartItemDiv);

    // window[`${newItem.outerText.slice(7)}`] = new Item;

    // click the 'div.cartImage > a' to navigate to the item page
    let itemLink = await item.$('div.cartImage > a');
    await itemLink.click();

    // wait for the store map link to be available
    await page.waitForSelector(
      '#store-availability > div > fieldset > div > a'
      );
      page.waitForNavigation();

      //#store-availability > div > fieldset > div > a > span.u__bold.store-availability__content
      let locationText = await page.$eval('a > .store-availability__content', element => element.outerText );
      console.log(locationText);

    // click store map link
    await page.$eval(
      '#store-availability > div > fieldset > div > a',
      element => element.click()
    );

    // wait for data to be loaded so we can get storemarker and vertex
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    if (await page.$('g.storemarker')) {
      const storeMarkerElement = await page.$eval('g.storemarker', element => element.outerHTML );
      const x = await page.$eval('g.storemarker', element => element.dataset.x );
      const y = await page.$eval('g.storemarker', element => element.dataset.y );
      console.log(storeMarkerElement);
      console.log('x:', x);
      console.log('y:', y);
    }

    // zoom out 1x store layout
    await page.waitForSelector('rect.minus-box');
    await page.click('rect.minus-box');


    // screenshot the store map
    await page.screenshot({ path: `test${screenshotCount}.png` });
    console.log(screenshotCount);
    // increment screenshotCount for .png naming sequence
    ++screenshotCount;
  }
  // <------------ cartItems data scraping loop ------------>

  //document.querySelector('g.storemarker').dataset.x
  //document.querySelector('g.storemarker').dataset.y
  // grab the g.active-aisle (g.storemarker) innerHtml and store it in ITEM object
  // need to grab rect.(x,y) coordinates from g.storemarker for each item
  // svg parent graph element is #storemap-wrapper > svg > g.outer > g (width="450" height="319.13113161025126")
  // Traveling Salesman algorithm + rerender div.cartItem(s) in correct order
  // return store map with visualization of TS route

  // close headless browser when finished
  await browser.close();
});
