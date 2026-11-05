export async function getPrice(symbol) {
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(symbol)}&vs_currencies=usd`);
  const body = await r.json();
  return { symbol, usd: body[symbol]?.usd ?? null, at: new Date().toISOString() };
}
