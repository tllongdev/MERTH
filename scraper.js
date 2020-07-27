const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhone = devices['iPhone 8 Plus landscape'];
const salesman = require('./salesman');

const data = [
  {
    itemName: 'Store Entrance',
    x: '314',
    y: '304',
  },
];
const noLocationData = [];

puppeteer.launch({ headless: false }).then(async (browser) => {
  const page = await browser.newPage();
  // emulate mobile browser to access store map link
  await page.emulate(iPhone);

  let cartUrl =
    'https://www.homedepot.com/mycart/home?userId=8cb45fd7-54c5-4cbe-838f-76bf8e8b7e7e&customerId=8cb45fd7-54c5-4cbe-838f-76bf8e8b7e7e&sharedCartId=HL100192050732&cm_mmc=ecc-_-THD_SHARE_CART-_-V1_M1_CA-_-VIEW_CART';

  // 'https://www.homedepot.com/mycart/home?userId=bb5df1d7-6fb3-475f-bc1e-cc374d5d25bb&customerId=bb5df1d7-6fb3-475f-bc1e-cc374d5d25bb&sharedCartId=HL100192050732&cm_mmc=ecc-_-THD_SHARE_CART-_-V1_M1_CA-_-VIEW_CART'
  // 'https://www.homedepot.com/mycart/home?userId=07a24488-de3a-4947-bf44-c2e6f8b3562e&customerId=07a24488-de3a-4947-bf44-c2e6f8b3562e&sharedCartId=HL100097460525?cm_mmc=ecc-_-THD_SHARE_CART__V1_M1_CA-_-VIEW_CART';
  // 'https://www.homedepot.com/mycart/home?userId=bfd41032-14de-4903-8e62-96e77a8918f0&customerId=bfd41032-14de-4903-8e62-96e77a8918f0&sharedCartId=HL100097460525?cm_mmc=ecc-_-THD_SHARE_CART__V1_M1_CA-_-VIEW_CART';
  // 'https://www.homedepot.com/mycart/home?userId=cd14e1db-18d4-4f32-9f20-49a9814b2cc8&customerId=cd14e1db-18d4-4f32-9f20-49a9814b2cc8&sharedCartId=HL100097460525?cm_mmc=ecc-_-THD_SHARE_CART__V1_M1_CA-_-VIEW_CART#';

  let storeNumber = '1912';

  // establish cart history by navigating to cart url
  await page.goto(cartUrl);
  await page.waitForSelector('div.cartTotals');

  // <--------------- select store --------------->
  console.log('selecting store...')
  await page.click('#myStoreMobile > a > span > div');
  await page.waitForSelector('#myStore-formInput');
  await page.focus('#myStore-formInput');
  await page.keyboard.type(storeNumber);
  await page.keyboard.press('Enter');
  await page.waitForSelector(
    '#myStore-list > div:nth-child(1) > div.localization__button--select > button'
  );
  await page.click(
    '#myStore-list > div:nth-child(1) > div.localization__button--select > button'
  );
  console.log('store selected')

  // await page.click('div.Mask.Mask--open');
  // <--------------- select store --------------->

  await page.goto(cartUrl);
  await page.waitForSelector('div.cartTotals');

  console.log('cart reloaded: OK')
  // grab each div.cartItem and store in cartItems array
  const cartItems = await page.$$('div.cartItem');
  // console.log(cartItems);

  let screenshotCount = 1;

  // <------------ cartItems data scraping loop ------------>
  console.log('cart items data collection loop started')
  for (let i = 0; i < cartItems.length; i++) {
    // go to established cart and wait for the page to load
    await page.goto('https://www.homedepot.com/mycart/home');
    await page.waitForSelector('div.cartTotals');

    // rebuild cartItems array
    const cartItems = await page.$$('div.cartItem');

    let item = cartItems[i];

    // console.log(document.querySelector('div.cartItem__productId').outerText.slice(7))

    // get itemName
    const itemName = await item.$eval(
      'h3.cartItem__brandName_mobile',
      (element) => element.outerText
    );
    console.log(itemName);

    // get cartItemDiv
    const cartItemDiv = await item.$eval(
      'div:nth-child(1)',
      (element) => element.outerHTML
    );
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
    await page.waitForSelector('a > .store-availability__content');
    const locationText = await page.$eval(
      'a > .store-availability__content',
      (element) => element.outerText
    );
    console.log(locationText);

    // click store map link
    await page.$eval(
      '#store-availability > div > fieldset > div > a',
      (element) => element.click()
    );

    // wait for data to be loaded so we can get storemarker and vertex
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    if (await page.$('g.storemarker')) {
      const storeMarkerElement = await page.$eval(
        'g.active-aisle',
        (element) => element.outerHTML
      );
      let x = await page.$eval('g.storemarker', (element) => element.dataset.x);
      // console.log('x before offeset:', x);

      let y = await page.$eval('g.storemarker', (element) => element.dataset.y);
      // console.log('y before offeset:', y);

      // const xOffset = await page.evaluate(() =>
      //   document.querySelector('#storemarker').getAttribute('refX')
      // );
      // console.log('xOffeset:', xOffset);
      // xOffset && (y = +y + +xOffset);

      // const yOffset = await page.evaluate(() =>
      //   document.querySelector('#storemarker').getAttribute('refY')
      // );
      // console.log('yOffeset:', yOffset);
      // yOffset && (x = +x + +yOffset);

      // console.log(storeMarkerElement);
      console.log('x:', x);
      console.log('y:', y);
      data.push({
        itemName,
        locationText,
        x,
        y,
        cartItemDiv,
        storeMarkerElement,
      });
    } else {
      noLocationData.push({
        itemName,
        locationText,
        cartItemDiv,
      });
    }

    // zoom out 1x store layout
    await page.waitForSelector('rect.minus-box');
    await page.click('rect.minus-box');

    // screenshot the store map
    // await page.screenshot({ path: `test${screenshotCount}.png` });
    // console.log(screenshotCount);
    // increment screenshotCount for .png naming sequence
    ++screenshotCount;
  }
  // <------------ cartItems data scraping loop ------------>
  // console.log('data:', data);
  // console.log('noLocationData:', noLocationData);

  // <------------ set Markers ------------>
  let storeMarkerStr = '';
  data.forEach(
    (item) =>
      item.storeMarkerElement && (storeMarkerStr += item.storeMarkerElement)
  );

  await page.evaluate((storeMarkerStr) => {
    let node = document.createElement('g');
    document.querySelector('.storemap-wrapper').appendChild(node);
    node.outerHTML = `${storeMarkerStr}`;
  }, storeMarkerStr);
  // <------------ set Markers ------------>

  // <--------- apply Traveling Salesman algorithm --------->
  console.log('applying algorithm')
  const points = [];
  data.forEach((item) => points.push(new salesman.Point(item.x, item.y)));
  console.log('points:', points);
  const solution = salesman.solve(points);
  console.log('solution:', solution);
  const ordered_points = solution.map((i) => points[i]);
  console.log('ordered_points:', ordered_points);
  // <--------- apply Traveling Salesman algorithm --------->

  const salesman_path_attribute_d = () => {
    let str = 'M';
    for (let i = 0; i < solution.length; i++) {
      str += `${data[solution[i]].x},${data[solution[i]].y}L`;
    }
    return str;
  };
  // console.log(salesman_path_attribute_d());
  let path = salesman_path_attribute_d();

  // <------------ set Salesman Path ------------>
  await page.evaluate((path) => {
    let node = document.createElement('path');
    document.querySelector('.storemap-wrapper').appendChild(node);
    node.outerHTML = `<path class="route" d="${path}" style="stroke: rgb(249, 99, 2); stroke-width: 2; fill: none; opacity: .6;"></path>
    `;
  }, path);

  // <------------ set Salesman Path ------------>

  //  + rerender div.cartItem(s) in correct order

  // svg parent graph element is #storemap-wrapper > svg > g.outer > g (width="450" height="319.13113161025126")
  // return store map with visualization of TS route
  // path html: <path class="route" d="M314,304L307.58581383580713,258.6930330062223L320.5086938380746,170.267897620809L261.61939668883724,178.02273440448178L226.7057708287155,261.5868552490699L226.7057708287155,261.5868552490699" style="stroke: rgb(249, 99, 2); stroke-width: 2; fill: none; opacity: .5;"></path>

  // close headless browser when finished
  // await browser.close();
});
