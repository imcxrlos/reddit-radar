import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * ─── RedditProvider Interface ───
 * Every provider implements:
 *   searchByKeyword(keyword)        → RawRedditPost[]
 *   getSubredditNew(subreddit)      → RawRedditPost[]
 *   getSubredditComments(subreddit) → RawRedditPost[]
 *
 * The handler below never calls provider-specific logic —
 * switching providers requires zero changes to collection,
 * dedup, DB sync, or AI processing code.
 */

const USER_AGENT = Deno.env.get("REDDIT_USER_AGENT") || "LeadRadar/1.0";

// ─── PublicJsonProvider (temporary, no auth required) ───
const PublicJsonProvider = {
  name: 'public_json',

  async _fetch(url) {
    const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Public JSON ${url} returned ${resp.status}: ${text.substring(0, 200)}`);
    }
    return resp.json();
  },

  async searchByKeyword(keyword) {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&limit=25&type=link`;
    const data = await this._fetch(url);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },

  async getSubredditNew(subreddit) {
    const clean = subreddit.replace(/^r\//, '').trim();
    const url = `https://www.reddit.com/r/${clean}/new.json?limit=25`;
    const data = await this._fetch(url);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },

  async getSubredditComments(subreddit) {
    const clean = subreddit.replace(/^r\//, '').trim();
    const url = `https://www.reddit.com/r/${clean}/comments.json?limit=25`;
    const data = await this._fetch(url);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },
};

// ─── ProxyJsonProvider (ScraperAPI — routes through residential IPs) ───
const ProxyJsonProvider = {
  name: 'scraperapi_proxy',

  async _fetch(targetUrl) {
    const apiKey = Deno.env.get("SCRAPER_API_KEY");
    if (!apiKey) throw new Error("SCRAPER_API_KEY not set");

    const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&country_code=us&premium=true`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`ScraperAPI ${resp.status}: ${text.substring(0, 200)}`);
    }
    return resp.json();
  },

  async searchByKeyword(keyword) {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&limit=25&type=link`;
    const data = await this._fetch(url);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },

  async getSubredditNew(subreddit) {
    const clean = subreddit.replace(/^r\//, '').trim();
    const url = `https://www.reddit.com/r/${clean}/new.json?limit=25`;
    const data = await this._fetch(url);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },

  async getSubredditComments(subreddit) {
    const clean = subreddit.replace(/^r\//, '').trim();
    const url = `https://www.reddit.com/r/${clean}/comments.json?limit=25`;
    const data = await this._fetch(url);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },
};

// ─── OfficialApiProvider (OAuth, future — activates when credentials are set) ───
let tokenCache = { token: null, expires: 0 };

const OfficialApiProvider = {
  name: 'official_api',

  async _getToken() {
    const now = Date.now();
    if (tokenCache.token && now < tokenCache.expires - 60000) {
      return tokenCache.token;
    }

    const clientId = Deno.env.get("REDDIT_CLIENT_ID");
    const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Reddit API credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in dashboard settings.");
    }

    const auth = btoa(`${clientId}:${clientSecret}`);
    const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": USER_AGENT,
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
  },

  async _fetch(path) {
    const token = await this._getToken();
    const resp = await fetch(`https://oauth.reddit.com${path}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Reddit API ${path} returned ${resp.status}: ${text.substring(0, 200)}`);
    }
    return resp.json();
  },

  async searchByKeyword(keyword) {
    const path = `/search?q=${encodeURIComponent(keyword)}&sort=new&limit=25&type=link`;
    const data = await this._fetch(path);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },

  async getSubredditNew(subreddit) {
    const clean = subreddit.replace(/^r\//, '').trim();
    const data = await this._fetch(`/r/${clean}/new?limit=25`);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },

  async getSubredditComments(subreddit) {
    const clean = subreddit.replace(/^r\//, '').trim();
    const data = await this._fetch(`/r/${clean}/comments?limit=25`);
    return (data?.data?.children || []).map(c => c?.data).filter(Boolean);
  },
};

// ─── Provider Factory ───
// Uses OfficialApiProvider when credentials are present, otherwise
// falls back to PublicJsonProvider. Toggle is automatic — when
// Reddit approves your API access, just set the env vars.
function getRedditProvider() {
  const clientId = Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");
  if (clientId && clientSecret) {
    return OfficialApiProvider;
  }
  if (Deno.env.get("SCRAPER_API_KEY")) {
    return ProxyJsonProvider;
  }
  return PublicJsonProvider;
}

// ─── Shared Transform: raw Reddit post → app RedditItem ───
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

// Respectful rate limiting — 1s delay between requests
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Handler (provider-agnostic) ───
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const provider = getRedditProvider();

    const clients = await base44.asServiceRole.entities.Client.filter({ is_active: true });
    if (clients.length === 0) {
      return Response.json({ message: 'No active clients found.', collected: 0 });
    }

    const keywords = [...new Set(clients.flatMap(c => c.keywords || []))].filter(Boolean);
    const subreddits = [...new Set(clients.flatMap(c => c.subreddits || []))].map(s => s.replace(/^r\//, '').trim()).filter(Boolean);

    if (keywords.length === 0 && subreddits.length === 0) {
      return Response.json({ message: 'No keywords or subreddits configured on active clients.', collected: 0 });
    }

    const collected = [];
    const seenIds = new Set();
    const errors = [];

    // Keyword search
    for (const kw of keywords) {
      try {
        const posts = await provider.searchByKeyword(kw);
        for (const post of posts) {
          const item = buildRedditItem(post);
          if (item && !seenIds.has(item.reddit_id)) {
            seenIds.add(item.reddit_id);
            collected.push(item);
          }
        }
      } catch (e) {
        errors.push(`keyword "${kw}": ${e.message}`);
      }
      await sleep(1000);
    }

    // Subreddit monitoring — new posts + comments
    for (const sub of subreddits) {
      try {
        const [newPosts, comments] = await Promise.all([
          provider.getSubredditNew(sub),
          provider.getSubredditComments(sub),
        ]);
        for (const post of [...newPosts, ...comments]) {
          const item = buildRedditItem(post);
          if (item && !seenIds.has(item.reddit_id)) {
            seenIds.add(item.reddit_id);
            collected.push(item);
          }
        }
      } catch (e) {
        errors.push(`subreddit r/${sub}: ${e.message}`);
      }
      await sleep(1000);
    }

    if (collected.length === 0) {
      return Response.json({
        message: 'No new Reddit items found this cycle.',
        collected: 0,
        provider: provider.name,
        errors: errors.slice(0, 5),
      });
    }

    // Deduplication via Reddit ID — update existing, create new
    const redditIds = collected.map(c => c.reddit_id);
    const existing = await base44.asServiceRole.entities.RedditItem.filter({
      reddit_id: { $in: redditIds }
    });
    const existingByRedditId = new Map(existing.map(e => [e.reddit_id, e]));

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

    if (toUpdate.length > 0) {
      await base44.asServiceRole.entities.RedditItem.bulkUpdate(toUpdate);
    }

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
      provider: provider.name,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    console.error('collectReddit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});