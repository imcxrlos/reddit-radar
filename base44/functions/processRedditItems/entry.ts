import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    is_lead: { type: 'boolean', description: 'true if this post indicates someone seeking help/services about their OWN situation' },
    intent_score: { type: 'number', description: '0-100 score of how strong the lead intent is' },
    detected_location: { type: 'string', description: 'City detected in the post, or empty' },
    detected_state: { type: 'string', description: 'US state abbreviation or full name detected, or empty' },
    detected_category: { type: 'string', description: 'The single best-matching category name from the provided category definitions, or empty if none fit' },
    category_confidence: { type: 'number', description: '0-100 confidence in the category assignment' },
    alternate_categories: { type: 'array', items: { type: 'string' }, description: 'Up to 2 alternate category names when confidence is below 80' },
    needs_review: { type: 'boolean', description: 'true if category confidence is low (below 70), multiple categories are equally likely, or the category is unclear — requires human review before any client matching' },
    detected_service: { type: 'string', description: 'Specific service or topic the user needs help with' },
    matched_client_id: { type: 'string', description: 'The ID of the best matching client, or empty if none match or needs_review is true' },
    matched_client_name: { type: 'string', description: 'Name of the matched client, or empty' },
    match_reasoning: { type: 'string', description: 'Bullet-point reasoning explaining WHY this client was matched' },
    competitor_mentions: { type: 'array', items: { type: 'string' }, description: 'Competitor names mentioned in the post' },
    summary: { type: 'string', description: '2-3 sentence summary of what the person needs' },
    draft_response: { type: 'string', description: 'A helpful, natural, non-spammy reply the team can review and post' },
  },
  required: ['is_lead', 'intent_score', 'summary', 'draft_response'],
};

function buildCategorySection(categoryDefs) {
  return categoryDefs
    .filter(c => c.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((cat) => {
      const examples = (cat.examples || []).map(e => `   - ${e}`).join('\n');
      const signals = (cat.signals || []).map(s => `   - ${s}`).join('\n');
      const rules = (cat.matching_rules || []).map(r => `   - ${r}`).join('\n');
      let section = `${cat.name}:\n   ${cat.description}`;
      if (examples) section += `\n   Examples:\n${examples}`;
      if (signals) section += `\n   Signals:\n${signals}`;
      if (rules) section += `\n   Rules:\n${rules}`;
      return section;
    }).join('\n\n');
}

function buildPrompt(item, clients, categoryDefs) {
  const clientRoster = clients.map(c => ({
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

CATEGORY DEFINITIONS — Use these to categorize the post. Prioritize semantic understanding over keyword matching.

${buildCategorySection(categoryDefs)}

IMPORTANT MATCHING RULES:
- It is better to leave an item as "Needs Review" (needs_review=true) than confidently assign it to the wrong category.
- If confidence is low or multiple categories are equally possible, set needs_review=true and list the alternate_categories.
- Only assign detected_category when you are confident (70+). Otherwise leave it empty and set needs_review=true.

LEAD DETERMINATION:
- is_lead should be true ONLY if the person is expressing a PERSONAL need for help about their OWN situation.
- NOT news articles, political discussion, general discussion, or hypothetical scenarios.
- If the post is about a news event, government policy, or political topic (e.g., DOGE cuts, federal layoffs), score intent 0-20.

INTENT SCORING (0-100):
- 80-100: Direct personal request for help, specific injury/accident/need described, location matches a client
- 50-79: Discusses a relevant personal situation but not actively seeking help yet
- 0-49: News, politics, general discussion, hypothetical, or no personal need

CLIENT MATCHING — Only attempt if needs_review is false AND detected_category is set:
- LOCATION: The detected location MUST appear in the client's "locations" array. Check the actual array values. Do NOT assume a national footprint. If the detected location is NOT in the client's locations array, do NOT match.
- Practice area: the detected_category must match the client's category field.
- Personal need: the poster must be describing their own situation.
- If ANY of these fail, leave matched_client_id EMPTY. A non-match is better than a wrong match.

MATCH REASONING — FACTUALLY ACCURATE bullets, specific to THIS post (no generic template language):
"• Location: <city, state> is listed in <client name>'s locations array: [<actual array values>]
• Practice area: <specific topic from post> matches client's <specific service or category>
• Intent: <one concrete sentence quoting or paraphrasing what the poster said that shows they need help>
• Keywords matched: <list which of the client's keywords are relevant>"
If the detected location is NOT in the client's locations array, say "• Location: <detected location> is NOT in <client name>'s service area (serves: <actual array>)" and do NOT match.
If no location was detected, say "• Location: none detected — cannot confirm service area match" and do NOT match.

DRAFT RESPONSE:
Write a helpful, natural reply tailored to the matched client's response tone. Sound like a real person genuinely helping — not salesy or spammy. 3-5 sentences max.

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

    const [clients, categoryDefs] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ is_active: true }),
      base44.asServiceRole.entities.CategoryDefinition.list(),
    ]);

    if (categoryDefs.length === 0) {
      return Response.json({ error: 'No category definitions found. Add categories in the CategoryDefinition entity.' }, { status: 500 });
    }

    const clientMap = new Map(clients.map(c => [c.id, c]));

    const redditItemIds = unprocessed.map(i => i.id);
    const existingOpps = await base44.asServiceRole.entities.Opportunity.filter({
      reddit_item_id: { $in: redditItemIds }
    });
    const oppByItemId = new Map(existingOpps.map(o => [o.reddit_item_id, o]));

    let processedCount = 0;
    let oppCreatedCount = 0;
    let oppUpdatedCount = 0;
    let needsReviewCount = 0;

    for (const item of unprocessed) {
      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: buildPrompt(item, clients, categoryDefs),
          response_json_schema: ANALYSIS_SCHEMA,
        });

        const analysis = result || {};
        const isLead = analysis.is_lead !== false;
        const needsReview = analysis.needs_review === true;
        const matchedClientId = !needsReview ? (analysis.matched_client_id || '') : '';
        const matchedClient = matchedClientId ? clientMap.get(matchedClientId) : null;
        const existingOpp = oppByItemId.get(item.id);

        const engagementData = {
          reddit_score: item.score || 0,
          reddit_num_comments: item.num_comments || 0,
        };

        if (existingOpp) {
          await base44.asServiceRole.entities.Opportunity.update(existingOpp.id, engagementData);
          oppUpdatedCount++;
        } else if (isLead) {
          const hasMatch = Boolean(matchedClient);
          if (needsReview) needsReviewCount++;

          const title = item.title || (item.body ? item.body.substring(0, 120) : 'Untitled');
          const redditUrl = item.url || (item.permalink ? `https://www.reddit.com${item.permalink}` : '');

          await base44.asServiceRole.entities.Opportunity.create({
            reddit_item_id: item.id,
            client_id: hasMatch ? matchedClient.id : '',
            client_name: hasMatch ? matchedClient.name : '',
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
            category_confidence: analysis.category_confidence || 0,
            alternate_categories: analysis.alternate_categories || [],
            needs_review: needsReview,
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
      message: `Processed ${processedCount} items — created ${oppCreatedCount} opportunities (${needsReviewCount} need review), updated ${oppUpdatedCount} existing.`,
      processed: processedCount,
      opportunities_created: oppCreatedCount,
      opportunities_updated: oppUpdatedCount,
      needs_review: needsReviewCount,
    });
  } catch (error) {
    console.error('processRedditItems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});