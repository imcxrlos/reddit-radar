import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get("SCRAPER_API_KEY");
    if (!apiKey) return Response.json({ error: 'SCRAPER_API_KEY not set' }, { status: 500 });

    const targetUrl = 'https://www.reddit.com/search.json?q=car%20accident&sort=new&limit=3';

    // Try multiple parameter combos to find one that works
    const attempts = [
      { label: 'render=true', params: '&country_code=us&render=true' },
      { label: 'base (no extras)', params: '&country_code=us' },
      { label: 'session_id', params: '&country_code=us&session_number=1' },
    ];

    const results = [];
    for (const attempt of attempts) {
      const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}${attempt.params}`;
      const resp = await fetch(proxyUrl);
      const text = await resp.text();
      let isJson = false;
      let posts = 0;
      try {
        const data = JSON.parse(text);
        isJson = true;
        posts = (data?.data?.children || []).length;
      } catch {}
      results.push({
        label: attempt.label,
        status: resp.status,
        isJson,
        posts,
        preview: text.substring(0, 200),
      });
      if (isJson && posts > 0) break;
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});