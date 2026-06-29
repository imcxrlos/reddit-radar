import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only: this runs on a schedule and touches all client data
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const result = { collected: 0, duplicates: 0, processed: 0, opportunities: 0, errors: [] };

    // ─── 1. Load all active clients ───
    const clients = await base44.asServiceRole.entities.Client.filter({ is_active: true });
    if (!clients || clients.length === 0) {
      return Response.json({ ...result, message: 'No active clients configured' });
    }

    // ─── 2. Get Reddit API credentials (plug-and-play: works once secrets are set) ───
    const clientId = Deno.env.get('REDDIT_CLIENT_ID');
    const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
    const userAgent = Deno.env.get('REDDIT_USER_AGENT') || 'LeadRadar/1.0';

    if (!clientId || !clientSecret) {
      return Response.json({
        ...result,
        message: 'Reddit API credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in dashboard settings to activate monitoring.'
      });
    }

    // ─── 3. Authenticate with Reddit (client credentials flow) ───
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const authRes2 = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authRes2.json();
    if (authData.error) {
      return Response.json({ ...result, errors: [`Reddit auth failed: ${authData.error}`] });
    }
    const accessToken = authData.access_token;

    // ─── 4. Build unified keyword + subreddit lists from all clients ───
    const allKeywords = [...new Set(clients.flatMap(c => c.keywords || []))];
    const allSubreddits = [...new Set(clients.flatMap(c => c.subreddits || []))];

    // ─── 5. Collect Reddit posts (deduplicate by reddit_id) ───
    const seen = new Set();
    const redditHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': userAgent,
    };

    // Keyword search
    for (const keyword of allKeywords) {
      try {
        const url = `https://oauth.reddit.com/search?q=${encodeURIComponent(keyword)}&sort=new&limit=25&type=link,sr_comment`;
        const res = await fetch(url, { headers: redditHeaders });
        const data = await res.json();
        const posts = data?.data?.children || [];
        for (const post of posts) {
          const pd = post.data;
          const redditId = pd.id;
          if (!redditId || seen.has(redditId)) { result.duplicates++; continue; }
          seen.add(redditId);

          // Check if already stored in DB
          const existing = await base44.asServiceRole.entities.RedditItem.filter({ reddit_id: redditId });
          if (existing && existing.length > 0) { result.duplicates++; continue; }

          await base44.asServiceRole.entities.RedditItem.create({
            reddit_id: redditId,
            type: 'post',
            title: pd.title || '',
            body: pd.selftext || '',
            author: pd.author || '',
            subreddit: pd.subreddit || '',
            url: `https://www.reddit.com${pd.permalink || ''}`,
            permalink: pd.permalink || '',
            reddit_created_at: pd.created_utc ? new Date(pd.created_utc * 1000).toISOString() : null,
            processed: false,
          });
          result.collected++;
        }
      } catch (e) {
        result.errors.push(`Keyword "${keyword}": ${e.message}`);
      }
    }

    // Subreddit monitoring
    for (const subreddit of allSubreddits) {
      try {
        const url = `https://oauth.reddit.com/r/${encodeURIComponent(subreddit)}/new?limit=25`;
        const res = await fetch(url, { headers: redditHeaders });
        const data = await res.json();
        const posts = data?.data?.children || [];
        for (const post of posts) {
          const pd = post.data;
          const redditId = pd.id;
          if (!redditId || seen.has(redditId)) { result.duplicates++; continue; }
          seen.add(redditId);

          const existing = await base44.asServiceRole.entities.RedditItem.filter({ reddit_id: redditId });
          if (existing && existing.length > 0) { result.duplicates++; continue; }

          await base44.asServiceRole.entities.RedditItem.create({
            reddit_id: redditId,
            type: 'post',
            title: pd.title || '',
            body: pd.selftext || '',
            author: pd.author || '',
            subreddit: pd.subreddit || '',
            url: `https://www.reddit.com${pd.permalink || ''}`,
            permalink: pd.permalink || '',
            reddit_created_at: pd.created_utc ? new Date(pd.created_utc * 1000).toISOString() : null,
            processed: false,
          });
          result.collected++;
        }
      } catch (e) {
        result.errors.push(`Subreddit r/${subreddit}: ${e.message}`);
      }
    }

    // ─── 6. AI Process unprocessed RedditItems ───
    const unprocessed = await base44.asServiceRole.entities.RedditItem.filter({ processed: false });
    if (unprocessed && unprocessed.length > 0) {
      // Build client context for matching
      const clientProfiles = clients.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        locations: c.locations || [],
        services: c.services || [],
        keywords: c.keywords || [],
        competitors: c.competitors || [],
        response_tone: c.response_tone || 'professional and helpful',
      }));

      for (const item of unprocessed.slice(0, 25)) { // Process up to 25 per cycle to avoid timeouts
        try {
          const content = `${item.title || ''} ${item.body || ''}`.trim() || '(no content)';

          const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are a lead intelligence analyst for a marketing agency. Analyze this Reddit post and determine if it's a potential lead for one of our clients.

REDDIT POST:
Subreddit: r/${item.subreddit}
Author: u/${item.author}
Title: ${item.title || ''}
Body: ${item.body || ''}

ACTIVE CLIENTS:
${JSON.stringify(clientProfiles, null, 2)}

Analyze the post and respond with:
1. is_lead: Is this a genuine potential lead? (true if someone is seeking help/advice/recommendations related to any client's services)
2. intent_score: 0-100 (how likely this person needs a service right now)
3. detected_location: city/state mentioned (or empty if none)
4. detected_state: 2-letter state code if detected (or empty)
5. detected_category: business category this relates to
6. detected_service: specific service needed
7. matched_client_id: the BEST matching client ID from the list (or empty if no match)
8. matched_client_name: name of the matched client (or empty)
9. competitor_mentions: array of any competitor names mentioned
10. ai_summary: 2-3 sentence summary of the opportunity
11. draft_response: a helpful, natural-sounding Reddit reply draft in the matched client's preferred tone. Should genuinely help the person without being overtly promotional. Mention the client naturally only if appropriate.

Only match a client if the post location overlaps with the client's locations AND the topic overlaps with the client's services/keywords. If no client matches well, still analyze but leave matched_client fields empty.`,
            response_json_schema: {
              type: 'object',
              properties: {
                is_lead: { type: 'boolean' },
                intent_score: { type: 'number' },
                detected_location: { type: 'string' },
                detected_state: { type: 'string' },
                detected_category: { type: 'string' },
                detected_service: { type: 'string' },
                matched_client_id: { type: 'string' },
                matched_client_name: { type: 'string' },
                competitor_mentions: { type: 'array', items: { type: 'string' } },
                ai_summary: { type: 'string' },
                draft_response: { type: 'string' },
              },
              required: ['is_lead', 'intent_score', 'ai_summary', 'draft_response'],
            },
          });

          // Create opportunity only if it's a lead
          if (aiResult.is_lead) {
            await base44.asServiceRole.entities.Opportunity.create({
              reddit_item_id: item.id,
              client_id: aiResult.matched_client_id || '',
              client_name: aiResult.matched_client_name || '',
              reddit_title: item.title || '',
              reddit_url: item.url || '',
              reddit_body: (item.body || '').substring(0, 2000),
              subreddit: item.subreddit || '',
              author: item.author || '',
              is_lead: true,
              intent_score: aiResult.intent_score || 0,
              detected_location: aiResult.detected_location || '',
              detected_state: aiResult.detected_state || '',
              detected_category: aiResult.detected_category || '',
              detected_service: aiResult.detected_service || '',
              competitor_mentions: aiResult.competitor_mentions || [],
              ai_summary: aiResult.ai_summary || '',
              draft_response: aiResult.draft_response || '',
              edited_response: '',
              internal_notes: '',
              status: 'new',
              handled_by: '',
            });
            result.opportunities++;
          }

          // Mark as processed
          await base44.asServiceRole.entities.RedditItem.update(item.id, { processed: true });
          result.processed++;
        } catch (e) {
          result.errors.push(`AI processing item ${item.id}: ${e.message}`);
        }
      }
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});