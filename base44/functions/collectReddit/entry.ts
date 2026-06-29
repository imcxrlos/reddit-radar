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
    score: post?.score || 0,
    num_comments: post?.num_comments || 0,
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

    if (collected.length === 0) {
      return Response.json({ message: 'No new Reddit items found this cycle.', collected: 0 });
    }

    // Check which Reddit items already exist
    const redditIds = collected.map(c => c.reddit_id);
    const existing = await base44.asServiceRole.entities.RedditItem.filter({
      reddit_id: { $in: redditIds }
    });
    const existingByRedditId = new Map(existing.map(e => [e.reddit_id, e]));

    // Update engagement data on existing items; collect new ones
    const toUpdate = [];
    const toCreate = [];

    for (const item of collected) {
      const existingItem = existingByRedditId.get(item.reddit_id);
      if (existingItem) {
        toUpdate.push({
          id: existingItem.id,
          score: item.score,
          num_comments: item.num_comments,
        });
      } else {
        toCreate.push(item);
      }
    }

    // Update existing items with fresh engagement data
    if (toUpdate.length > 0) {
      await base44.asServiceRole.entities.RedditItem.bulkUpdate(toUpdate);
    }

    // Create new items (limit to 100 per cycle)
    const newToCreate = toCreate.slice(0, 100);
    if (newToCreate.length > 0) {
      await base44.asServiceRole.entities.RedditItem.bulkCreate(newToCreate);
    }

    // Trigger AI processing of unprocessed items
    try {
      await base44.asServiceRole.functions.invoke('processRedditItems', { limit: 50 });
    } catch (e) {
      console.error('AI processing failed (will retry next cycle):', e.message);
    }

    return Response.json({
      message: `Collected ${newToCreate.length} new items, refreshed ${toUpdate.length} existing items from ${keywords.length} keywords and ${subreddits.length} subreddits.`,
      collected: newToCreate.length,
      refreshed: toUpdate.length,
    });
  } catch (error) {
    console.error('collectReddit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});