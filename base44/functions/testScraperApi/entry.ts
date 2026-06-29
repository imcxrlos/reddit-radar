import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get("SCRAPER_API_KEY");
    if (!apiKey) return Response.json({ error: 'No SCRAPER_API_KEY' }, { status: 500 });

    const clean = (t) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();

    // 1. Parse search results page
    const searchUrl = 'https://old.reddit.com/search?q=car+accident&sort=new&t=month';
    const sResp = await fetch(`https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(searchUrl)}`);
    const sHtml = await sResp.text();
    const sPosts = [];
    const sRegex = /<div[^>]*class="[^"]*search-result[^"]*"[^>]*data-fullname="(t[13]_\w+)"/g;
    let sMatch;
    while ((sMatch = sRegex.exec(sHtml)) !== null) {
      const block = sHtml.substring(sMatch.index, sMatch.index + 8000);
      const fullname = sMatch[1];
      const title = clean(block.match(/class="search-title[^"]*"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
      const scoreText = block.match(/class="search-score"[^>]*>(.*?)<\/span>/)?.[1] || '0';
      const score = parseInt(scoreText.replace(/[^0-9]/g, '')) || 0;
      const commentsText = block.match(/class="search-comments[^"]*"[^>]*>(.*?)<\/a>/)?.[1] || '0';
      const numComments = parseInt(commentsText.replace(/[^0-9]/g, '')) || 0;
      const author = clean(block.match(/class="author[^"]*"[^>]*>(.*?)<\/a>/)?.[1] || '[deleted]');
      const subreddit = block.match(/class="search-subreddit-link[^"]*"[^>]*>r\/(.*?)<\/a>/)?.[1]?.trim() || '';
      const datetime = block.match(/<time[^>]*datetime="([^"]*)"/)?.[1] || '';
      sPosts.push({ fullname, title, score, numComments, author, subreddit, datetime });
    }

    // 2. Parse subreddit /new/ page
    const newUrl = 'https://old.reddit.com/r/Charlotte/new/';
    const nResp = await fetch(`https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(newUrl)}`);
    const nHtml = await nResp.text();
    const nPosts = [];
    const nRegex = /<div[^>]*class="[^"]*thing[^"]*"[^>]*data-fullname="(t[13]_\w+)"/g;
    let nMatch;
    while ((nMatch = nRegex.exec(nHtml)) !== null) {
      const block = nHtml.substring(nMatch.index, nMatch.index + 8000);
      const fullname = nMatch[1];
      const author = block.match(/data-author="([^"]*)"/)?.[1] || '[deleted]';
      const subreddit = block.match(/data-subreddit="([^"]*)"/)?.[1] || '';
      const score = parseInt(block.match(/data-score="([^"]*)"/)?.[1] || '0');
      const numComments = parseInt(block.match(/data-comments-count="([^"]*)"/)?.[1] || '0');
      const dataUrl = block.match(/data-url="([^"]*)"/)?.[1] || '';
      let title = clean(block.match(/class="title[^"]*"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
      nPosts.push({ fullname, title, author, subreddit, score, numComments, dataUrl });
    }

    return Response.json({
      searchPosts: sPosts.length,
      searchSample: sPosts.slice(0, 3),
      newPosts: nPosts.length,
      newSample: nPosts.slice(0, 3),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});