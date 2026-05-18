// Cloudflare Worker - SofaScore Proxy
// פרוקסי שמעביר בקשות ל-SofaScore עם headers שעוקפים את חסימת ה-IP
// העתק את התוכן הזה לתוך Worker חדש ב-Cloudflare

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    // בנה את ה-URL היעד - מחליף את ה-host של ה-Worker ב-SofaScore
    const targetUrl = `https://api.sofascore.com${url.pathname}${url.search}`;

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.sofascore.com/',
          'Origin': 'https://www.sofascore.com'
        }
      });

      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300'
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
