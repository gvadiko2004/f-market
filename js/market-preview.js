/* Local UI fixtures only. Prices, floats and availability are synthetic, not listings.
   Imagery: Valve / Steam CDN, indexed by ByMykel/CSGO-API. No live price claims. */
(() => {
  if (!(location.protocol === 'file:' || ['localhost','127.0.0.1','[::1]'].includes(location.hostname))) return;
  const base = [
    ['AK-47','Asiimov','rifle','covert',189020],
    ['AWP','Neo-Noir','sniper','covert',247500],
    ['M4A1-S','Printstream','rifle','covert',587000],
    ['USP-S','Kill Confirmed','pistol','covert',319000],
    ['Desert Eagle','Printstream','pistol','covert',278000],
    ['Glock-18','Vogue','pistol','classified',64500],
    ['Karambit','Doppler','knife','covert',4680000],
    ['Sport Gloves','Vice','gloves','extraordinary',3850000]
  ];
  const wears = [['FT',0.2381,1],['MW',0.1124,1.3],['WW',0.4092,0.8]];
  window.FMarketCatalogPreview = Object.freeze(wears.flatMap(([wear,float,factor],v) => base.map(([weapon,name,category,rarity,price],i) => Object.freeze({
    id:`preview-${i}-${v}`,weapon,name,category,rarity,wear,float:Number((float+i*0.0007).toFixed(4)),
    priceMinor:Math.round(price*factor),image:`./images/market/skin-${i}.png`,
    stattrak:v===1&&i<6,available:!(v===2&&i%2===0)
  }))));
})();
