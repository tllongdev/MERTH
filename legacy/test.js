const salesman = require('./salesman');

const data = [
  { itemName: 'Store Entrance', x: 314, y: 304 },
  {
    itemName: 'DEWALT Black and Gold Drill Bit Set (14-Piece)',
    locationText: 'Aisle 09, Bay 005',
    x: 226.2057708287155,
    y: 247.61979849227774,
    cartItemDiv:
      '<div class="grid"><div class="col__4-12 col__2-12--xs u__p-left--none"><div class="cartImage"><a href="//www.homedepot.com/p/DEWALT-Black-and-Gold-Drill-Bit-Set-14-Piece-DWA1184/205952637"><img alt="Black and Gold Drill Bit Set (14-Piece)" class="cartImage__image" src="https://images.homedepot-static.com/productImages/0fe61d8e-48ec-4773-acce-915b7867d43e/svn/dewalt-twist-drill-bits-dwa1184-64_400.jpg"></a></div></div><div class="col__8-12 col__4-12--xs"><h3 class="cartItem__brandName"><a href="//www.homedepot.com/p/DEWALT-Black-and-Gold-Drill-Bit-Set-14-Piece-DWA1184/205952637"><span class="u__bold">DEWALT</span>&nbsp;<span>Black and Gold Drill Bit Set (14-Piece)</span></a></h3><div class="cartItem__productId" data-automation-id="productDetailsModelNumberText">Model #DWA1184</div></div><div class="col__4-12 col__2-12--xs u__p-left--none"><div><div><label class="cartItem__qtyLabel">Qty</label><div><input type="tel" class="cartItem__qtyInput form-input__field padding_left-10 padding_right-10" maxlength="4" data-automation-id="itemQuantityBoxQuantityInput" value="1"></div></div></div></div><div class="col__4-12 col__2-12--xs"><label class="cartItem__priceLabel">Unit Price</label><div class="cartItem__price ">$14.97</div></div><div class="col__4-12 col__1-12--xs"><label class="cartItem__priceLabel">Item Total</label><div class="cartItem__price p-bottom-small">$14.97</div></div></div>',
    storeMarkerElement:
      '<g data-x="226.7057708287155" data-y="261.5868552490699" class="storemarker"><defs><marker id="storemarker" refX="-13.96705675679217" viewbox="0 0 32 32" refY="-0.5" markerWidth="32" markerHeight="32" fill="#f96302" style="shape-rendering: auto; stroke: none; opacity: 0.7;"><path d="M16 0c-5.523 0-10 4.477-10 10 0 10 10 22 10 22s10-12 10-22c0-5.523-4.477-10-10-10zM16 16c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"></path></marker></defs><path class="storemarker" d="M210.7057708287155,229.5868552490699L210.7057708287155,229.5968552490699" marker-end="url(#storemarker)" style="opacity: 1;"></path></g>'
  },
  {
    itemName:
      'DEWALT ATOMIC 20-Volt MAX Lithium-Ion Brushless Cordless Compact 1/2 in. Drill Driver w/ (2) Batteries 1.3Ah, Charger & Bag',
    locationText: 'Aisle 09, Bay 009',
    x: 226.2057708287155,
    y: 233.65274173548556,
    cartItemDiv:
      '<div class="grid"><div class="col__4-12 col__2-12--xs u__p-left--none"><div class="cartImage"><a href="//www.homedepot.com/p/DEWALT-ATOMIC-20-Volt-MAX-Lithium-Ion-Brushless-Cordless-Compact-1-2-in-Drill-Driver-w-2-Batteries-1-3Ah-Charger-Bag-DCD708C2/308067442"><img alt="ATOMIC 20-Volt MAX Lithium-Ion Brushless Cordless Compact 1/2 in. Drill Driver w/ (2) Batteries 1.3Ah, Charger &amp; Bag" class="cartImage__image" src="https://images.homedepot-static.com/productImages/c6327a22-e931-482b-9d3e-aeab30caa4be/svn/dewalt-power-drills-dcd708c2-64_400.jpg"></a></div></div><div class="col__8-12 col__4-12--xs"><h3 class="cartItem__brandName"><a href="//www.homedepot.com/p/DEWALT-ATOMIC-20-Volt-MAX-Lithium-Ion-Brushless-Cordless-Compact-1-2-in-Drill-Driver-w-2-Batteries-1-3Ah-Charger-Bag-DCD708C2/308067442"><span class="u__bold">DEWALT</span>&nbsp;<span>ATOMIC 20-Volt MAX Lithium-Ion Brushless Cordless Compact 1/2 in. Drill Driver w/ (2) Batteries 1.3Ah, Charger &amp; Bag</span></a></h3><div class="cartItem__productId" data-automation-id="productDetailsModelNumberText">Model #DCD708C2</div></div><div class="col__4-12 col__2-12--xs u__p-left--none"><div><div><label class="cartItem__qtyLabel">Qty</label><div><input type="tel" class="cartItem__qtyInput form-input__field padding_left-10 padding_right-10" maxlength="4" data-automation-id="itemQuantityBoxQuantityInput" value="1"></div></div></div></div><div class="col__4-12 col__2-12--xs"><label class="cartItem__priceLabel">Unit Price</label><div class="cartItem__price ">$159.00</div></div><div class="col__4-12 col__1-12--xs"><label class="cartItem__priceLabel">Item Total</label><div class="cartItem__price p-bottom-small">$159.00</div></div></div>',
    storeMarkerElement:
      '<g data-x="226.7057708287155" data-y="261.5868552490699" class="storemarker"><defs><marker id="storemarker" refX="-27.93411351358434" viewbox="0 0 32 32" refY="-0.5" markerWidth="32" markerHeight="32" fill="#f96302" style="shape-rendering: auto; stroke: none; opacity: 0.7;"><path d="M16 0c-5.523 0-10 4.477-10 10 0 10 10 22 10 22s10-12 10-22c0-5.523-4.477-10-10-10zM16 16c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"></path></marker></defs><path class="storemarker" d="M210.7057708287155,229.5868552490699L210.7057708287155,229.5968552490699" marker-end="url(#storemarker)" style="opacity: 1;"></path></g>'
  },
  {
    itemName: 'DAP Alex Plus 10.1 oz. White Acrylic Latex Caulk Plus Silicone',
    locationText: 'Aisle 38, Bay 003',
    x: 253.11407419384574,
    y: 174.36693710882855,
    cartItemDiv:
      '<div class="grid"><div class="col__4-12 col__2-12--xs u__p-left--none"><div class="cartImage"><a href="//www.homedepot.com/p/DAP-Alex-Plus-10-1-oz-White-Acrylic-Latex-Caulk-Plus-Silicone-18103/100097524"><img alt="Alex Plus 10.1 oz. White Acrylic Latex Caulk Plus Silicone" class="cartImage__image" src="https://images.homedepot-static.com/productImages/66016895-a1aa-445a-954f-8f75a0f7a6ed/svn/white-dap-caulk-18103-64_400.jpg"></a></div></div><div class="col__8-12 col__4-12--xs"><h3 class="cartItem__brandName"><a href="//www.homedepot.com/p/DAP-Alex-Plus-10-1-oz-White-Acrylic-Latex-Caulk-Plus-Silicone-18103/100097524"><span class="u__bold">DAP</span>&nbsp;<span>Alex Plus 10.1 oz. White Acrylic Latex Caulk Plus Silicone</span></a></h3><div class="cartItem__productId" data-automation-id="productDetailsModelNumberText">Model #18103</div></div><div class="col__4-12 col__2-12--xs u__p-left--none"><div><div><label class="cartItem__qtyLabel">Qty</label><div><input type="tel" class="cartItem__qtyInput form-input__field padding_left-10 padding_right-10" maxlength="4" data-automation-id="itemQuantityBoxQuantityInput" value="1"></div></div></div></div><div class="col__4-12 col__2-12--xs"><label class="cartItem__priceLabel">Unit Price</label><div class="cartItem__price ">$2.58</div></div><div class="col__4-12 col__1-12--xs"><label class="cartItem__priceLabel">Item Total</label><div class="cartItem__price p-bottom-small">$2.58</div></div></div>',
    storeMarkerElement:
      '<g data-x="261.61939668883724" data-y="178.02273440448178" class="storemarker"><defs><marker id="storemarker" refX="-3.6557972956532248" viewbox="0 0 32 32" refY="-8.5053224949915" markerWidth="32" markerHeight="32" fill="#f96302" style="shape-rendering: auto; stroke: none; opacity: 0.7;"><path d="M16 0c-5.523 0-10 4.477-10 10 0 10 10 22 10 22s10-12 10-22c0-5.523-4.477-10-10-10zM16 16c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"></path></marker></defs><path class="storemarker" d="M245.61939668883724,146.02273440448178L245.61939668883724,146.03273440448177" marker-end="url(#storemarker)" style="opacity: 1;"></path></g>'
  },
  {
    itemName:
      'EcoSmart 60-Watt Equivalent A19 Non-Dimmable LED Light Bulb Daylight (8-Pack)',
    locationText: 'Aisle 01, Bay 010',
    x: 304.38581383580714,
    y: 231.83376767470008,
    cartItemDiv:
      '<div class="grid"><div class="col__4-12 col__2-12--xs u__p-left--none"><div class="cartImage"><a href="//www.homedepot.com/p/EcoSmart-60-Watt-Equivalent-A19-Non-Dimmable-LED-Light-Bulb-Daylight-8-Pack-B7A19A60WUL38/303574493"><img alt="60-Watt Equivalent A19 Non-Dimmable LED Light Bulb Daylight (8-Pack)" class="cartImage__image" src="https://images.homedepot-static.com/productImages/9e5456cf-b653-4adf-9f8d-0db4548bbdb3/svn/ecosmart-led-light-bulbs-b7a19a60wul38-64_400.jpg"></a></div></div><div class="col__8-12 col__4-12--xs"><h3 class="cartItem__brandName"><a href="//www.homedepot.com/p/EcoSmart-60-Watt-Equivalent-A19-Non-Dimmable-LED-Light-Bulb-Daylight-8-Pack-B7A19A60WUL38/303574493"><span class="u__bold">EcoSmart</span>&nbsp;<span>60-Watt Equivalent A19 Non-Dimmable LED Light Bulb Daylight (8-Pack)</span></a></h3><div class="cartItem__productId" data-automation-id="productDetailsModelNumberText">Model #B7A19A60WUL38</div></div><div class="col__4-12 col__2-12--xs u__p-left--none"><div><div><label class="cartItem__qtyLabel">Qty</label><div><input type="tel" class="cartItem__qtyInput form-input__field padding_left-10 padding_right-10" maxlength="4" data-automation-id="itemQuantityBoxQuantityInput" value="1"></div></div></div></div><div class="col__4-12 col__2-12--xs"><label class="cartItem__priceLabel">Unit Price</label><div class="cartItem__price ">$9.94</div></div><div class="col__4-12 col__1-12--xs"><label class="cartItem__priceLabel">Item Total</label><div class="cartItem__price p-bottom-small">$9.94</div></div></div>',
    storeMarkerElement:
      '<g data-x="307.58581383580713" data-y="258.6930330062223" class="storemarker"><defs><marker id="storemarker" refX="-26.859265331522224" viewbox="0 0 32 32" refY="-3.2" markerWidth="32" markerHeight="32" fill="#f96302" style="shape-rendering: auto; stroke: none; opacity: 0.7;"><path d="M16 0c-5.523 0-10 4.477-10 10 0 10 10 22 10 22s10-12 10-22c0-5.523-4.477-10-10-10zM16 16c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"></path></marker></defs><path class="storemarker" d="M291.58581383580713,226.69303300622232L291.58581383580713,226.7030330062223" marker-end="url(#storemarker)" style="opacity: 1;"></path></g>'
  },
  {
    itemName:
      '3M Scotch 1.88 in. x 54.6 yds. Heavy-Duty Shipping Packaging Tape with Dispenser',
    locationText: 'Aisle 61, Bay 002',
    x: 325.8078270594234,
    y: 166.20040028201868,
    cartItemDiv:
      '<div class="grid"><div class="col__4-12 col__2-12--xs u__p-left--none"><div class="cartImage"><a href="//www.homedepot.com/p/3M-Scotch-1-88-in-x-54-6-yds-Heavy-Duty-Shipping-Packaging-Tape-with-Dispenser-3850-RD-DC/100149185"><img alt="Scotch 1.88 in. x 54.6 yds. Heavy-Duty Shipping Packaging Tape with Dispenser" class="cartImage__image" src="https://images.homedepot-static.com/productImages/93552175-1709-44b0-8e1a-041a8e78a62c/svn/3m-adhesives-tape-3850-rd-dc-64_400.jpg"></a></div></div><div class="col__8-12 col__4-12--xs"><h3 class="cartItem__brandName"><a href="//www.homedepot.com/p/3M-Scotch-1-88-in-x-54-6-yds-Heavy-Duty-Shipping-Packaging-Tape-with-Dispenser-3850-RD-DC/100149185"><span class="u__bold">3M</span>&nbsp;<span>Scotch 1.88 in. x 54.6 yds. Heavy-Duty Shipping Packaging Tape with Dispenser</span></a></h3><div class="cartItem__productId" data-automation-id="productDetailsModelNumberText">Model #3850-RD-DC</div></div><div class="col__4-12 col__2-12--xs u__p-left--none"><div><div><label class="cartItem__qtyLabel">Qty</label><div><input type="tel" class="cartItem__qtyInput form-input__field padding_left-10 padding_right-10" maxlength="4" data-automation-id="itemQuantityBoxQuantityInput" value="1"></div></div></div></div><div class="col__4-12 col__2-12--xs"><label class="cartItem__priceLabel">Unit Price</label><div class="cartItem__price ">$6.27</div></div><div class="col__4-12 col__1-12--xs"><label class="cartItem__priceLabel">Item Total</label><div class="cartItem__price p-bottom-small">$6.27</div></div></div>',
    storeMarkerElement:
      '<g data-x="320.5086938380746" data-y="170.267897620809" class="storemarker"><defs><marker id="storemarker" refX="-4.067497338790326" viewbox="0 0 32 32" refY="5.2991332213488" markerWidth="32" markerHeight="32" fill="#f96302" style="shape-rendering: auto; stroke: none; opacity: 0.7;"><path d="M16 0c-5.523 0-10 4.477-10 10 0 10 10 22 10 22s10-12 10-22c0-5.523-4.477-10-10-10zM16 16c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"></path></marker></defs><path class="storemarker" d="M304.5086938380746,138.267897620809L304.5086938380746,138.277897620809" marker-end="url(#storemarker)" style="opacity: 1;"></path></g>'
  }
];
let noLocationData = [
  {
    itemName:
      'Energizer Rechargeable AA Batteries, NiHM, 2000 mAh, Pre-Charged, 4-Count (Recharge Universal)',
    locationText: 'Aisle C2, Bay 020',
    cartItemDiv:
      '<div class="grid"><div class="col__4-12 col__2-12--xs u__p-left--none"><div class="cartImage"><a href="//www.homedepot.com/p/Energizer-Rechargeable-AA-Batteries-NiHM-2000-mAh-Pre-Charged-4-Count-Recharge-Universal-UNH15BP-4/204406591"><img alt="Rechargeable AA Batteries, NiHM, 2000 mAh, Pre-Charged, 4-Count (Recharge Universal)" class="cartImage__image" src="https://images.homedepot-static.com/productImages/92ffd374-b030-48fa-8322-542966d2e1a2/svn/energizer-aa-batteries-unh15bp-4-64_400.jpg"></a></div></div><div class="col__8-12 col__4-12--xs"><h3 class="cartItem__brandName"><a href="//www.homedepot.com/p/Energizer-Rechargeable-AA-Batteries-NiHM-2000-mAh-Pre-Charged-4-Count-Recharge-Universal-UNH15BP-4/204406591"><span class="u__bold">Energizer</span>&nbsp;<span>Rechargeable AA Batteries, NiHM, 2000 mAh, Pre-Charged, 4-Count (Recharge Universal)</span></a></h3><div class="cartItem__productId" data-automation-id="productDetailsModelNumberText">Model #UNH15BP-4</div></div><div class="col__4-12 col__2-12--xs u__p-left--none"><div><div><label class="cartItem__qtyLabel">Qty</label><div><input type="tel" class="cartItem__qtyInput form-input__field padding_left-10 padding_right-10" maxlength="4" data-automation-id="itemQuantityBoxQuantityInput" value="1"></div></div></div></div><div class="col__4-12 col__2-12--xs"><label class="cartItem__priceLabel">Unit Price</label><div class="cartItem__price ">$10.98</div></div><div class="col__4-12 col__1-12--xs"><label class="cartItem__priceLabel">Item Total</label><div class="cartItem__price p-bottom-small">$10.98</div></div></div>'
  }
];
// points: [
//   Point { x: 314, y: 304 },
//   Point { x: 226.2057708287155, y: 247.61979849227774 },
//   Point { x: 226.2057708287155, y: 233.65274173548556 },
//   Point { x: 253.11407419384574, y: 174.36693710882855 },
//   Point { x: 304.38581383580714, y: 231.83376767470008 },
//   Point { x: 325.8078270594234, y: 166.20040028201868 }
// ]
// solution: [ 0, 4, 5, 3, 2, 1 ]
// ordered_points: [
//   Point { x: 314, y: 304 },
//   Point { x: 304.38581383580714, y: 231.83376767470008 },
//   Point { x: 325.8078270594234, y: 166.20040028201868 },
//   Point { x: 253.11407419384574, y: 174.36693710882855 },
//   Point { x: 226.2057708287155, y: 233.65274173548556 },
//   Point { x: 226.2057708287155, y: 247.61979849227774 }
// ]

const expect_solution = [0, 4, 5, 3, 2, 1];

// console.log(data[expect_solution[1]].x);

// let salesman_path_html = (
//   <path
//     class='salesman'
//     d='M314,304L307.58581383580713,258.6930330062223L320.5086938380746,170.267897620809L261.61939668883724,178.02273440448178L226.7057708287155,261.5868552490699L226.7057708287155,261.5868552490699L'
//     style='stroke: rgb(249, 99, 2); stroke-width: 2; fill: none; opacity: .5;'
//   ></path>
// );

// const points = [];
// data.forEach(item => points.push(new salesman.Point(item.x, item.y)));
// console.log('points:', points);
// const solution = salesman.solve(points);
// console.log('solution:', solution);
// const ordered_points = solution.map(i => points[i]);
// console.log('ordered_points:', ordered_points);

// const salesman_path_attribute_d = () => {
//   let str = 'M';
//   for (let i = 0; i < solution.length; i++) {
//     str += `${data[expect_solution[i]].x},${data[expect_solution[i]].y}L`;
//   }
//   return str;
// };
// console.log(salesman_path_attribute_d());

let storeMarkerStr = '';
data.forEach(
  item => item.storeMarkerElement && (storeMarkerStr += item.storeMarkerElement)
);
console.log(storeMarkerStr);
