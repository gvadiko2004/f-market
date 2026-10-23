/* Isolated design fixture. Used only on file://, localhost and 127.0.0.1.
   Prices are copied from Figma, not fetched from Steam or a trading provider. */
window.FMarketPreview = Object.freeze({
  currency: 'UAH',
  items: Object.freeze(Array.from({ length: 12 }, (_, index) => Object.freeze({
    id: `figma-ak-${index + 1}`,
    game: 'cs2',
    name: 'AK-47 | Азимов',
    priceMinor: 189020,
    image: './images/exchange/0c79d.png'
  })))
});
