import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Reddit OAuth token cache
let tokenCache = { token: null, expires: 0 };

async function getRedditToken() {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expires - 60000) {
    return tokenCache.token;
  }

  const clientId = Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");
  const userAgent = Deno.env.get("REDDIT_USER_AGENT") || "LeadRadar/1.0";

  if (!clientId || !clientSecret) {
    throw new Error("Reddit API credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in dashboard settings.");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "User-Agent": userAgent,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await resp.json();
  if (!data.access_token) {
    throw new Error(`Reddit auth failed: ${JSON.stringify(data)}`);
  }

  tokenCache = {
    token: data.access_token,
    expires: now + (data.expires_in || 3600) * 1000,
  };
  return tokenCache.token;
}

async function redditFetch(path, token) {
  const userAgent = Deno.env.get("REDDIT_USER_AGENT") || "LeadRadar/1.0";
  const resp = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "User-Agent": userAgent,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Reddit API ${path} returned ${resp.status}: ${text.substring(0, 200)}`);
  }
  return resp.json();
}

async function searchReddit(keyword, token) {
  const url = `/search?q=${encodeURIComponent(keyword)}&sort=new&limit=25&type=link,sr:comment`;
  const data = await redditFetch(url, token);
  return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
}

async function getSubredditNew(subreddit, token) {
  const clean = subreddit.replace(/^r\//, '').trim();
  const data = await redditFetch(`/r/${clean}/new?limit=25`, token);
  return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
}

function buildRedditItem(post) {
  const id = post?.id || post?.name;
  if (!id || !post?.subreddit) return null;

  const isComment = post?.name?.startsWith('t1_') || !post?.title;
  const permalink = post?.permalink ? `https://www.reddit.com${post.permalink}` : '';
  const url = post?.url || permalink;

  return {
    reddit_id: id,
    type: isComment ? 'comment' : 'post',
    title: post?.title || (post?.link_title || post?.body?.substring(0, 100) || ''),
    body: post?.body || post?.selftext || '',
    author: post?.author || '[deleted]',
    subreddit: post.subreddit,
    url: url,
    permalink: permalink,
    reddit_created_at: post?.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
    processed: false,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const clients = await base44.asServiceRole.entities.Client.filter({ is_active: true });
    if (clients.length === 0) {
      return Response.json({ message: 'No active clients found.', collected: 0 });
    }

    // Gather unique keywords and subreddits across all active clients
    const keywords = [...new Set(clients.flatMap(c => c.keywords || []))].filter(Boolean);
    const subreddits = [...new Set(clients.flatMap(c => c.subreddits || []))].map(s => s.replace(/^r\//, '').trim()).filter(Boolean);

    if (keywords.length === 0 && subreddits.length === 0) {
      return Response.json({ message: 'No keywords or subreddits configured on active clients.', collected: 0 });
    }

    const token = await getRedditToken();
    const collected = [];
    const seenIds = new Set();

    // Search by keyword
    for (const kw of keywords) {
      try {
        const posts = await searchReddit(kw, token);
        for (const post of posts) {
          const item = buildRedditItem(post);
          if (item && !seenIds.has(item.reddit_id)) {
            seenIds.add(item.reddit_id);
            collected.push(item);
          }
        }
      } catch (e) {
        console.error(`Keyword "${kw}" failed:`, e.message);
      }
    }

    // Pull new posts from monitored subreddits
    for (const sub of subreddits) {
      try {
        const posts = await getSubredditNew(sub, token);
        for (const post of posts) {
          const item = buildRedditItem(post);
          if (item && !seenIds.has(item.reddit_id)) {
            seenIds.add(item.reddit_id);
            collected.push(item);
          }
        }
      } catch (e) {
        console.error(`Subreddit r/${sub} failed:`, e.message);
      }
    }

    // Deduplicate against existing records
    if (collected.length === 0) {
      return Response.json({ message: 'No new Reddit items found this cycle.', collected: 0 });
    }

    const redditIds = collected.map(c => c.reddit_id);
    const existing = await base44.asServiceRole.entities.RedditItem.filter({
      reddit_id: { $in: redditIds }
    });
    const existingIds = new Set(existing.map(e => e.reddit_id));
    const newItems = collected.filter(c => !existingIds.has(c.reddit_id));

    if (newItems.length === 0) {
      return Response.json({ message: 'All collected items already exist.', collected: 0, duplicates: collected.length });
    }

    // Bulk create new items (limit to 100 per cycle to control volume)
    const toCreate = newItems.slice(0, 100);
    await base44.asServiceRole.entities.RedditItem.bulkCreate(toCreate);

    // Trigger AI processing of unprocessed items
    try {
      await base44.asServiceRole.functions.invoke('processRedditItems', { limit: 50 });
    } catch (e) {
      console.error('AI processing failed (will retry next cycle):', e.message);
    }

    return Response.json({
      message: `Collected ${toCreate.length} new items (${newItems.length - toCreate.length} skipped) from ${keywords.length} keywords and ${subreddits.length} subreddits.`,
      collected: toCreate.length,
      skipped: newItems.length - toCreate.length,
    });
  } catch (error) {
    console.error('collectReddit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});