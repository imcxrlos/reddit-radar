import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    is_lead: { type: 'boolean', description: 'true if this post indicates someone seeking help/services' },
    intent_score: { type: 'number', description: '0-100 score of how strong the lead intent is' },
    detected_location: { type: 'string', description: 'City detected in the post, or empty' },
    detected_state: { type: 'string', description: 'US state abbreviation or full name detected, or empty' },
    detected_category: { type: 'string', description: 'Business category that best fits this post' },
    detected_service: { type: 'string', description: 'Specific service or topic the user needs help with' },
    matched_client_id: { type: 'string', description: 'The ID of the best matching client from the roster, or empty if none match' },
    matched_client_name: { type: 'string', description: 'Name of the matched client, or empty' },
    match_reasoning: { type: 'string', description: 'Bullet-point reasoning explaining WHY this client was matched (location overlap, topic match, service area, keyword relevance, etc.)' },
    competitor_mentions: { type: 'array', items: { type: 'string' }, description: 'Competitor names mentioned in the post' },
    summary: { type: 'string', description: '2-3 sentence summary of what the person needs' },
    draft_response: { type: 'string', description: 'A helpful, natural, non-spammy reply the team can review and post' },
  },
  required: ['is_lead', 'intent_score', 'summary', 'draft_response'],
};

function buildPrompt(item, clients) {
  const clientRoster = clients.map((c, i) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    locations: c.locations || [],
    services: c.services || [],
    keywords: c.keywords || [],
    competitors: c.competitors || [],
    response_tone: c.response_tone || 'professional and helpful',
  }));

  const content = item.title
    ? `Title: ${item.title}\n\nBody: ${item.body || '(no body)'}`
    : `Body: ${item.body || '(no body)'}`;

  const postDate = item.reddit_created_at
    ? new Date(item.reddit_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'unknown';

  return `You are a lead intelligence analyst for a marketing agency. Analyze this Reddit ${item.type} and determine if it's a potential lead for any of our clients.

REDDIT POST/COMMENT:
Subreddit: r/${item.subreddit}
Author: u/${item.author}
Posted: ${postDate}
${content}

OUR CLIENT ROSTER:
${JSON.stringify(clientRoster, null, 2)}

CRITICAL INSTRUCTIONS:

1. DOMAIN ACCURACY — You must understand the ACTUAL practice area of each client and only match posts that genuinely fit. These are DIFFERENT fields and must NOT be conflated:
   - Personal Injury: injuries caused by someone else's negligence (car accidents, slip & fall, dog bites, medical malpractice)
   - Workers' Compensation: injuries that happen ON THE JOB — this is a SEPARATE practice area from personal injury
   - Criminal Defense: someone charged with a crime
   - Family Law: divorce, custody, adoption
   - Bankruptcy: debt relief, Chapter 7/13
   - A post about workplace injury or RIF/severance does NOT match a personal injury client unless that client explicitly lists workers' compensation as a service.
   - When in doubt about whether a topic fits a client's practice area, DO NOT MATCH.

2. LEAD DETERMINATION — is_lead should be true ONLY if the person is expressing a PERSONAL need for help, advice, or services — about their OWN situation. NOT news articles, NOT political discussion, NOT general discussion of a topic, NOT hypothetical scenarios. Ask yourself: is this person describing something that happened TO THEM and looking for help?

3. INTENT SCORING (0-100):
   - 80-100: Direct personal request for help, specific injury/accident/need described, location matches a client
   - 50-79: Discusses a relevant personal situation but not actively seeking help yet
   - 0-49: News, politics, general discussion, hypothetical, or no personal need
   - If the post is about a news event, government policy, or political topic (e.g., DOGE cuts, federal layoffs), score 0-20 — these are NOT leads.

4. CLIENT MATCHING — Match the post to the BEST single client based on ALL THREE:
   - Location overlap: the detected location must fall within the client's service area. If NO location is detected and the client serves specific cities, do NOT match.
   - Practice area match: the post's topic must fit the client's ACTUAL category and services (see domain rules above).
   - Personal need: the poster must be describing their own situation, not discussing a topic in general.
   If ANY of these three fail, leave matched_client_id EMPTY. A non-match is better than a wrong match.

5. MATCH REASONING — In match_reasoning, give a FACTUALLY ACCURATE explanation of WHY this client was matched. Every bullet must be true and specific to THIS post — do not use generic template language. Format as newline-separated bullets:
   "• Location: <city, state> falls within <client name>'s service area
   • Practice area: <specific topic from post> matches client's <specific service or category>
   • Intent: <one concrete sentence quoting or paraphrasing what the poster said that shows they need help>
   • Keywords matched: <list which of the client's keywords are relevant>"
   If location was NOT detected, say "• Location: none detected — cannot confirm service area match" and do NOT match the client.
   Never invent connections or stretch a topic to fit. If the reasoning feels forced, the match is wrong.

6. DRAFT RESPONSE — Write a helpful, natural reply tailored to the matched client's response tone. Sound like a real person genuinely helping — not salesy or spammy. Offer useful advice and mention the client's services only if relevant and natural. 3-5 sentences max.

Return your analysis as JSON.`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const limit = 50;
    const unprocessed = await base44.asServiceRole.entities.RedditItem.filter(
      { processed: false },
      '-created_date',
      limit
    );

    if (unprocessed.length === 0) {
      return Response.json({ message: 'No unprocessed Reddit items.', processed: 0 });
    }

    const clients = await base44.asServiceRole.entities.Client.filter({ is_active: true });
    const clientMap = new Map(clients.map(c => [c.id, c]));

    // Pre-fetch existing opportunities for these Reddit items to prevent duplicates
    const redditItemIds = unprocessed.map(i => i.id);
    const existingOpps = await base44.asServiceRole.entities.Opportunity.filter({
      reddit_item_id: { $in: redditItemIds }
    });
    const oppByItemId = new Map(existingOpps.map(o => [o.reddit_item_id, o]));

    let processedCount = 0;
    let oppCreatedCount = 0;
    let oppUpdatedCount = 0;

    for (const item of unprocessed) {
      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: buildPrompt(item, clients),
          response_json_schema: ANALYSIS_SCHEMA,
        });

        const analysis = result || {};
        const isLead = analysis.is_lead !== false;
        const matchedClientId = analysis.matched_client_id || '';
        const matchedClient = matchedClientId ? clientMap.get(matchedClientId) : null;
        const existingOpp = oppByItemId.get(item.id);

        const engagementData = {
          reddit_score: item.score || 0,
          reddit_num_comments: item.num_comments || 0,
        };

        if (existingOpp) {
          // Update existing opportunity with fresh engagement data
          await base44.asServiceRole.entities.Opportunity.update(existingOpp.id, engagementData);
          oppUpdatedCount++;
        } else if (isLead && matchedClient) {
          const title = item.title || (item.body ? item.body.substring(0, 120) : 'Untitled');
          const redditUrl = item.url || (item.permalink ? `https://www.reddit.com${item.permalink}` : '');

          await base44.asServiceRole.entities.Opportunity.create({
            reddit_item_id: item.id,
            client_id: matchedClient.id,
            client_name: matchedClient.name,
            reddit_title: title,
            reddit_url: redditUrl,
            reddit_body: item.body || '',
            subreddit: item.subreddit,
            author: item.author,
            is_lead: true,
            intent_score: analysis.intent_score || 0,
            detected_location: analysis.detected_location || '',
            detected_state: analysis.detected_state || '',
            detected_category: analysis.detected_category || '',
            detected_service: analysis.detected_service || '',
            competitor_mentions: analysis.competitor_mentions || [],
            ai_summary: analysis.summary || '',
            match_reasoning: analysis.match_reasoning || '',
            draft_response: analysis.draft_response || '',
            status: 'new',
            ...engagementData,
          });
          oppCreatedCount++;
        }

        await base44.asServiceRole.entities.RedditItem.update(item.id, { processed: true });
        processedCount++;
      } catch (e) {
        console.error(`Failed to process item ${item.id}:`, e.message);
      }
    }

    return Response.json({
      message: `Processed ${processedCount} items — created ${oppCreatedCount} new opportunities, updated ${oppUpdatedCount} existing.`,
      processed: processedCount,
      opportunities_created: oppCreatedCount,
      opportunities_updated: oppUpdatedCount,
    });
  } catch (error) {
    console.error('processRedditItems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});