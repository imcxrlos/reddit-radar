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

  return `You are a lead intelligence analyst for a marketing agency. Analyze this Reddit ${item.type} and determine if it's a potential lead for any of our clients.

REDDIT POST/COMMENT:
Subreddit: r/${item.subreddit}
Author: u/${item.author}
${content}

OUR CLIENT ROSTER:
${JSON.stringify(clientRoster, null, 2)}

CRITICAL INSTRUCTIONS:

1. SEMANTIC MATCHING — Do NOT rely on exact keyword matches. Understand the MEANING and INTENT of the post. These should all be identified as relevant even without exact keywords:
   - "Someone hit my car yesterday" → car accident / personal injury
   - "Insurance won't help after my wreck" → insurance claim / personal injury
   - "My neck has been hurting since I got rear-ended" → personal injury / chiropractor
   - "Tooth has been killing me all week" → dental emergency
   - "My back went out after that fall" → chiropractor / personal injury

2. LEAD DETERMINATION — is_lead should be true ONLY if the person is expressing a personal need for help, advice, or services. Not news articles, not general discussions, not jokes. High intent = actively seeking a lawyer/dentist/chiropractor, describing an accident/injury/pain, asking about insurance/settlements, or asking for recommendations in the service area.

3. INTENT SCORING (0-100):
   - 80-100: Direct request for help, specific injury/accident described, location matches a client
   - 50-79: Discusses relevant situation but not actively seeking help yet
   - 0-49: Tangential mention, news, general discussion without personal need

4. CLIENT MATCHING — Match the post to the BEST single client based on:
   - Location overlap (does the detected location match the client's service area?)
   - Semantic topic match (does the post's meaning relate to the client's services?)
   - Keyword relevance (are any of the client's keywords semantically relevant?)
   Only match if BOTH location AND topic align. If no client is a good fit, leave matched_client_id empty.

5. MATCH REASONING — In match_reasoning, provide a clear bullet-point explanation of WHY you recommended this client. Format as a newline-separated list of reasons, e.g.:
   "• Detected location: Charlotte, NC — matches client's service area
   • Topic: Car accident — matches client's personal injury practice
   • High legal intent: poster is asking about insurance settlement
   • Matches client keywords: car accident, settlement
   • No better client match found"

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

    let processedCount = 0;
    let oppCount = 0;

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

        if (isLead && matchedClient) {
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
          });
          oppCount++;
        }

        await base44.asServiceRole.entities.RedditItem.update(item.id, { processed: true });
        processedCount++;
      } catch (e) {
        console.error(`Failed to process item ${item.id}:`, e.message);
      }
    }

    return Response.json({
      message: `Processed ${processedCount} items, created ${oppCount} opportunities.`,
      processed: processedCount,
      opportunities_created: oppCount,
    });
  } catch (error) {
    console.error('processRedditItems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});