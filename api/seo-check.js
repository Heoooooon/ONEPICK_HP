// Vercel Serverless Function: GET /api/seo-check?url=https://example.com
// Fetches the page HTML plus robots.txt / sitemap.xml existence so the
// diagnose page can analyze it in the browser.

const MAX_BYTES = 3 * 1024 * 1024;
const UA = "Mozilla/5.0 (compatible; OnePickSEOChecker/1.0; +https://github.com)";

function normalizeUrl(raw) {
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("[")) return true;
  return false;
}

async function exists(url) {
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
    }
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const url = normalizeUrl(req.query && req.query.url);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ success: false, error: "올바른 URL을 입력해주세요." });
  }
  if (!/^https?:$/.test(parsed.protocol) || isPrivateHost(parsed.hostname)) {
    return res.status(400).json({ success: false, error: "검사할 수 없는 주소입니다." });
  }

  let html = "";
  let statusCode = 0;
  let finalUrl = parsed.toString();
  try {
    const r = await fetch(parsed.toString(), {
      headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    statusCode = r.status;
    finalUrl = r.url || finalUrl;
    const buf = await r.arrayBuffer();
    html = new TextDecoder("utf-8").decode(buf.slice(0, MAX_BYTES));
  } catch {
    return res.status(200).json({ success: false, error: "페이지에 접근할 수 없습니다. 주소를 확인하거나 소스를 붙여넣어 주세요." });
  }

  const origin = new URL(finalUrl).origin;
  const [robots, sitemap] = await Promise.all([exists(`${origin}/robots.txt`), exists(`${origin}/sitemap.xml`)]);

  return res.status(200).json({ success: true, data: { url: finalUrl, statusCode, html, robots, sitemap } });
};
