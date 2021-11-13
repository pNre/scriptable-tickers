// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: book; share-sheet-inputs: plain-text;
// Tickers Widget
const showRefreshTime = false;
const stocks = [
  "^GSPC",
  "AAPL",
  "NVDA",
  "AMZN",
  "GOOG",
  "ASML",
  "SHOP",
  "CMPS",
];
const crypto = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
  },
  {
    id: "tezos",
    symbol: "XTZ",
    name: "Tezos",
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
  },
  {
    id: "harmony",
    symbol: "ONE",
    name: "Harmony",
  },
  {
    id: "klima-dao",
    symbol: "KLIMA",
    name: "Klima DAO",
  },
  {
    id: "wonderland",
    symbol: "TIME",
    name: "Wonderland",
  },
];

let tasks = [];
if (args.widgetParameter) {
  if (args.widgetParameter === "stocks") {
    tasks = [getStockData(stocks)];
  } else if (args.widgetParameter === "crypto") {
    tasks = [getCryptoData(crypto)];
  }
} else {
  tasks = [getStockData(stocks), getCryptoData(crypto)];
}

const data = (await Promise.all(tasks)).flat();

const widget = await createWidget(data);
widget.backgroundColor = Color.black();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentLarge();
}
Script.complete();

function makeCell(cell, symbol, changePercent, price) {
  cell.layoutVertically();

  const symbolText = cell.addText(symbol);
  symbolText.lineLimit = 1;
  symbolText.textColor = Color.white();
  symbolText.font = Font.boldMonospacedSystemFont(14);

  cell.addSpacer(4);

  const isPositive = changePercent >= 0;
  const sign = isPositive ? "+" : "-";
  const changeText = cell.addText(
    sign + Math.abs(changePercent).toFixed(2) + "%"
  );
  changeText.textColor = isPositive ? Color.green() : Color.red();
  changeText.font = Font.boldMonospacedSystemFont(14);

  cell.addSpacer(4);

  const priceText = cell.addText(price);
  priceText.textColor = Color.white();
  priceText.textOpacity = 0.7;
  priceText.font = Font.regularMonospacedSystemFont(12);
}

async function createWidget(data) {
  const columns = 4;
  const rows = Math.ceil(data.length / columns);

  const widget = new ListWidget();
  widget.refreshAfterDate = new Date(Date.now() + 90);

  const instrumentsStack = widget.addStack();
  instrumentsStack.topAlignContent();

  for (let c = 0; c < columns; c++) {
    if (c > 0) {
      instrumentsStack.addSpacer();
    }

    const column = instrumentsStack.addStack();
    column.layoutVertically();
    column.topAlignContent();

    for (let r = 0; r < rows; r++) {
      const cell = column.addStack();

      const i = r * columns + c;
      if (i >= data.length) {
        continue;
      } else {
        const instrument = data[i];
        makeCell(
          cell,
          instrument.symbol,
          instrument.changePercent,
          instrument.price
        );
      }

      if (r < rows - 1) {
        column.addSpacer(16);
      }
    }
  }

  const bottomSpacingStack = widget.addStack();
  bottomSpacingStack.layoutVertically();
  bottomSpacingStack.addSpacer();

  if (showRefreshTime) {
    const refreshTimeStack = widget.addStack();
    refreshTimeStack.bottomAlignContent();
    refreshTimeStack.addSpacer();

    const refreshTime = refreshTimeStack.addDate(new Date());
    refreshTime.applyTimeStyle();
    refreshTime.lineLimit = 1;
    refreshTime.textColor = Color.white();
    refreshTime.textOpacity = 0.5;
    refreshTime.font = Font.regularSystemFont(8);
  }

  return widget;
}

async function getCryptoData(crypto) {
  const data = await queryCryptoData(crypto.map((c) => c.id));
  return crypto
    .map((c) => {
      const price = data[c.id];
      if (!price) {
        return;
      }

      return {
        symbol: c.symbol,
        changePercent: price.eur_24h_change.toFixed(2),
        price: price.eur.toFixed(2),
        name: c.name,
      };
    })
    .filter((c) => c !== undefined);
}

async function getStockData(stocks) {
  const data = await queryStockData(stocks);

  return data.quoteResponse.result.map((stock) => ({
    symbol: stock.symbol,
    changePercent: stock.regularMarketChangePercent.raw.toFixed(2),
    price: stock.regularMarketPrice.raw.toFixed(2),
    name: stock.shortName,
  }));
}

async function queryStockData(symbols) {
  const encodedSymbols = symbols.map(encodeURIComponent).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodedSymbols}&fields=shortName,regularMarketChangePercent,regularMarketPrice&formatted=true`;
  const req = new Request(url);
  return await req.loadJSON();
}

async function queryCryptoData(ids) {
  const encodedIds = ids.map(encodeURIComponent).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodedIds}&vs_currencies=eur&include_24hr_change=true`;
  const req = new Request(url);
  return await req.loadJSON();
}
