import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ════════════════════════════════════════════════════════════════
// STAGE 1 — Candidate Selection (deterministic, no AI)
// ════════════════════════════════════════════════════════════════
// Dual-tier matching:
//   ANCHOR phrases  → incident/injury/problem-specific. ≥1 match = candidate.
//   MODIFIER terms  → generic professional words. Never qualify alone.
//
// A post becomes a candidate for a client ONLY when it contains at
// least one anchor phrase from that client's expanded_keywords.
// Modifier-only matches are discarded — they add noise, not signal.

// Parse a client's expanded_keywords into anchor and modifier arrays.
// Handles both the new structured format [{phrase, tier}] and the
// legacy string[] format (treated as anchors for backward compat).
function getClientKeywords(client) {
  const expanded = client.expanded_keywords || [];
  const anchors = [];
  const modifiers = [];

  for (const entry of expanded) {
    if (typeof entry === 'string') {
      const phrase = entry.toLowerCase().trim();
      if (phrase) anchors.push(phrase);
    } else if (entry && typeof entry === 'object') {
      const phrase = String(entry.phrase || '').toLowerCase().trim();
      if (!phrase) continue;
      if (entry.tier === 'modifier') {
        modifiers.push(phrase);
      } else {
        anchors.push(phrase);
      }
    }
  }

  // Fallback for clients onboarded before expanded_keywords existed.
  if (anchors.length === 0 && modifiers.length === 0) {
    const fallback = [...(client.keywords || []), ...(client.services || [])];
    for (const k of fallback) {
      const phrase = String(k).toLowerCase().trim();
      if (phrase) anchors.push(phrase);
    }
  }

  return { anchors, modifiers };
}

// Returns candidates: one entry per client where ≥1 anchor matched.
// Each entry carries the matched anchors/modifiers for audit storage.
function selectCandidates(item, clients) {
  const text = ((item.title || '') + ' ' + (item.body || '')).toLowerCase();
  if (!text.trim()) return [];
  const candidates = [];
  for (const client of clients) {
    const { anchors, modifiers } = getClientKeywords(client);
    const matchedAnchors = anchors.filter(a => text.includes(a));
    if (matchedAnchors.length === 0) continue; // modifier-only → discard

    const matchedModifiers = modifiers.filter(m => text.includes(m));
    candidates.push({
      client,
      matchedAnchors,
      matchedModifiers,
      decisionPath: 'Qualified via Anchor match',
    });
  }
  return candidates;
}

// ════════════════════════════════════════════════════════════════
// STAGE 2 — AI Verification (candidates only)
// ════════════════════════════════════════════════════════════════

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    is_lead: { type: 'boolean', description: 'true ONLY if the poster is describing their OWN situation and actively needs one of the candidate client\'s services' },
    intent_score: { type: 'number', description: '0-100 strength of personal intent' },
    detected_location: { type: 'string', description: 'City/region explicitly stated in the post. EMPTY if none stated — never guess or infer.' },
    detected_state: { type: 'string', description: 'US state explicitly stated, or empty. Never infer.' },
    detected_category: { type: 'string', description: 'Best-matching category name from the provided definitions, or empty' },
    category_confidence: { type: 'number', description: '0-100' },
    alternate_categories: { type: 'array', items: { type: 'string' }, description: 'Up to 2 alternates when confidence below 80' },
    needs_review: { type: 'boolean', description: 'true if confidence is low, multiple clients equally likely, or location cannot be confirmed — requires human review' },
    detected_service: { type: 'string', description: 'Specific service the poster needs help with' },
    matched_client_id: { type: 'string', description: 'ID of the best-matching candidate client, or empty if none genuinely fit' },
    matched_client_name: { type: 'string', description: 'Name of the matched client, or empty' },
    match_reasoning: { type: 'string', description: 'Bullet reasoning: service match + location verification + intent evidence' },
    competitor_mentions: { type: 'array', items: { type: 'string' }, description: 'Competitor names mentioned' },
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

function buildPrompt(item, candidates, categoryDefs) {
  const roster = candidates.map(({ client, matchedAnchors, matchedModifiers }) => ({
    id: client.id,
    name: client.name,
    category: client.category,
    locations: client.locations || [],
    services: client.services || [],
    response_tone: client.response_tone || 'professional and helpful',
    stage1_matched_anchors: matchedAnchors,
    stage1_matched_modifiers: matchedModifiers,
  }));

  const content = item.title
    ? `Title: ${item.title}\n\nBody: ${item.body || '(no body)'}`
    : `Body: ${item.body || '(no body)'}`;

  const postDate = item.reddit_created_at
    ? new Date(item.reddit_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'unknown';

  return `You are a lead intelligence analyst. Stage 1 (deterministic keyword matching) has already determined this Reddit ${item.type} is a CANDIDATE for the clients listed below — it matched at least one high-intent "anchor" phrase. Your job in Stage 2 is to VERIFY — do not assume the candidate is a real lead.

REDDIT POST/COMMENT:
Subreddit: r/${item.subreddit}
Author: u/${item.author}
Posted: ${postDate}
${content}

CANDIDATE CLIENTS (pre-filtered by Stage 1 anchor match):
${JSON.stringify(roster, null, 2)}

CATEGORY DEFINITIONS (for categorization only):
${buildCategorySection(categoryDefs)}

VERIFICATION — Answer each gate honestly. A wrong match is worse than no match.
1. SERVICE FIT: Is the poster's specific need genuinely one of a candidate client's listed services? Read the services array LITERALLY. A client offering "Car accidents" does NOT match a dog-bite or medical-malpractice post, even though all are Personal Injury. If the specific need is not in the services array, that client is NOT a match.
2. PERSONAL INTENT: Is the poster describing their OWN situation and actively seeking help? News articles, policy discussions, hypotheticals, third-party questions, and general commentary are NOT leads. If it's not a personal need, set is_lead=false and intent_score 0-25.
3. LOCATION: The poster's location MUST be within a candidate client's service area. Use the client's "locations" array. If the post states a location that is NOT in the client's locations, that client is NOT a match. If NO location is stated and the client is NOT explicitly statewide/national, do NOT match — set matched_client_id empty.
4. BEST CLIENT: If more than one candidate passes, pick the single best fit. If none genuinely pass all gates, leave matched_client_id EMPTY.

LOCATION RULE (critical): detected_location/detected_state must be EXACTLY what the post states. If the post does not explicitly name a city or state, return empty strings — NEVER infer, guess, or hallucinate a location from context.

Do not invent opportunities outside these candidate clients. Do not match a client unless ALL three gates (service + intent + location) pass.

INTENT SCORING:
- 80-100: Direct personal request for help, specific situation described, location confirmed in client area
- 50-79: Relevant personal situation but not clearly seeking help, or location unconfirmed
- 0-49: Not a personal need, news, hypothetical, or no relevant service

MATCH REASONING — factually accurate bullets specific to THIS post:
"• Service: <specific need> matches <client name>'s service: <exact entry>
• Location: <stated location> is in <client name>'s service area: [<actual array>]
• Intent: <one concrete sentence quoting/paraphrasing the poster>"
If a gate fails, state which and do not match. If no location stated: "• Location: none stated — cannot confirm service area" and do not match.

DRAFT RESPONSE: Write a helpful, natural reply tailored to the matched client's tone. Sound like a real person genuinely helping — not salesy. 3-5 sentences max. If no client matched, leave empty.

Return your analysis as JSON.`;
}

// ════════════════════════════════════════════════════════════════
// Handler
// ════════════════════════════════════════════════════════════════
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
      return Response.json({ error: 'No category definitions found.' }, { status: 500 });
    }

    const clientMap = new Map(clients.map(c => [c.id, c]));

    const redditItemIds = unprocessed.map(i => i.id);
    const existingOpps = await base44.asServiceRole.entities.Opportunity.filter({
      reddit_item_id: { $in: redditItemIds }
    });
    const oppByItemId = new Map(existingOpps.map(o => [o.reddit_item_id, o]));

    let processedCount = 0;
    let candidateCount = 0;
    let skippedCount = 0;
    let oppCreatedCount = 0;
    let oppUpdatedCount = 0;
    let needsReviewCount = 0;

    for (const item of unprocessed) {
      try {
        // ── Stage 1: deterministic candidate selection ──
        const candidates = selectCandidates(item, clients);

        if (candidates.length === 0) {
          await base44.asServiceRole.entities.RedditItem.update(item.id, {
            processed: true,
            processed_at: new Date().toISOString(),
          });
          processedCount++;
          skippedCount++;
          continue;
        }
        candidateCount++;

        // ── Stage 2: AI verification (candidates only) ──
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: buildPrompt(item, candidates, categoryDefs),
          response_json_schema: ANALYSIS_SCHEMA,
        });

        const analysis = result || {};
        const isLead = analysis.is_lead !== false;
        const needsReview = analysis.needs_review === true;
        const matchedClientId = analysis.matched_client_id || '';
        const matchedClient = matchedClientId ? clientMap.get(matchedClientId) : null;
        const existingOpp = oppByItemId.get(item.id);

        // Find the Stage 1 match summary for the AI-selected client.
        const matchedCandidate = matchedClientId
          ? candidates.find(c => c.client.id === matchedClientId)
          : null;

        const engagementData = {
          reddit_score: item.score || 0,
          reddit_num_comments: item.num_comments || 0,
        };

        if (existingOpp) {
          await base44.asServiceRole.entities.Opportunity.update(existingOpp.id, engagementData);
          oppUpdatedCount++;
        } else if (isLead && matchedClient) {
          if (needsReview) needsReviewCount++;

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
            category_confidence: analysis.category_confidence || 0,
            alternate_categories: analysis.alternate_categories || [],
            needs_review: needsReview,
            detected_service: analysis.detected_service || '',
            competitor_mentions: analysis.competitor_mentions || [],
            ai_summary: analysis.summary || '',
            match_reasoning: analysis.match_reasoning || '',
            draft_response: analysis.draft_response || '',
            status: 'new',
            matched_anchors: matchedCandidate ? matchedCandidate.matchedAnchors : [],
            matched_modifiers: matchedCandidate ? matchedCandidate.matchedModifiers : [],
            decision_path: matchedCandidate ? matchedCandidate.decisionPath : '',
            ...engagementData,
          });
          oppCreatedCount++;
        }

        await base44.asServiceRole.entities.RedditItem.update(item.id, {
          processed: true,
          processed_at: new Date().toISOString(),
        });
        processedCount++;
      } catch (e) {
        console.error(`Failed to process item ${item.id}:`, e.message);
      }
    }

    return Response.json({
      message: `Stage 1 selected ${candidateCount} candidates (skipped ${skippedCount}). Stage 2 processed ${processedCount} — created ${oppCreatedCount} opportunities (${needsReviewCount} need review), updated ${oppUpdatedCount} existing.`,
      processed: processedCount,
      candidates: candidateCount,
      skipped: skippedCount,
      opportunities_created: oppCreatedCount,
      opportunities_updated: oppUpdatedCount,
      needs_review: needsReviewCount,
    });
  } catch (error) {
    console.error('processRedditItems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});