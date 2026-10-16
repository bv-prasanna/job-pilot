// Explicit public ATS job feeds only. No LinkedIn scraping or address guessing.
const cleanText = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export function feedUrl(provider, board) {
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(board || '')) throw new Error('Invalid board identifier');
  if (provider === 'greenhouse') return `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
  if (provider === 'lever') return `https://api.lever.co/v0/postings/${board}?mode=json`;
  throw new Error('Unsupported provider');
}
export function normalizeJobs(provider, payload, board) {
  const rows = provider === 'greenhouse' ? payload?.jobs : payload;
  if (!Array.isArray(rows)) throw new Error('Invalid provider response');
  return rows.slice(0, 500).map(x => ({
    externalId: String(x.id || '').slice(0,100),
    title: cleanText(x.title || x.text).slice(0,180),
    company: board,
    description: cleanText(provider === 'greenhouse' ? x.content : x.descriptionPlain || x.description || '').slice(0,40000),
    location: cleanText(provider === 'greenhouse' ? x.location?.name : x.categories?.location).slice(0,160),
    url: provider === 'greenhouse' ? x.absolute_url : x.hostedUrl,
    source: provider,
  })).filter(x => x.title && typeof x.url === 'string' && /^https:\/\//.test(x.url));
}
export async function discover({provider,board,fetcher=fetch}) {
  const url = feedUrl(provider,board);
  const response = await fetcher(url,{signal:AbortSignal.timeout(8000),headers:{accept:'application/json'},redirect:'error'});
  if (!response.ok) throw new Error('Feed unavailable');
  const declared = Number(response.headers.get('content-length'));
  if (declared>2_000_000) throw new Error('Feed too large');
  const raw = await response.text();
  if (raw.length > 2_000_000) throw new Error('Feed too large');
  return normalizeJobs(provider,JSON.parse(raw),board);
}