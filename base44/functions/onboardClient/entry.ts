import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { business_name, website, industry } = body;

    if (!business_name || !industry) {
      return Response.json({ error: 'business_name and industry are required' }, { status: 400 });
    }

    const prompt = `You are a Reddit marketing strategist for a lead generation agency. A new client is being onboarded. Research this business and suggest the optimal Reddit monitoring configuration.

BUSINESS NAME: ${business_name}
WEBSITE: ${website || '(not provided)'}
INDUSTRY: ${industry}

Use web search to research this business and its industry. Then provide recommendations for:

1. KEYWORDS: 10-15 keywords and phrases to monitor on Reddit. These should capture how real people talk about problems related to this industry — not just industry jargon. Include both direct terms ("car accident lawyer") and conversational phrases ("got rear ended", "insurance won't pay").

2. SUBREDDITS: 8-15 relevant subreddits to monitor. Include:
   - Local city/state subreddits where the business likely operates
   - Industry-specific communities (r/legaladvice, r/personalfinance, r/AskReddit for broader reach)
   - Problem-focused communities (r/insurance, r/CarAccident, etc.)
   List subreddit names WITHOUT the r/ prefix.

3. LOCATIONS: Cities and states the business likely serves (infer from the business name, website, and industry). Format as "City, State" entries. If you cannot determine specific locations, provide the most likely major cities for this industry type.

4. SERVICES: 5-10 specific services or practice areas this type of business offers.

5. COMPETITORS: 3-8 competitor names in the same space and area.

6. RESPONSE_TONE: A recommended tone for Reddit responses (e.g., "Empathetic and professional, avoid legal jargon, offer genuine helpful advice first").

Return your recommendations as JSON.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'string' } },
          subreddits: { type: 'array', items: { type: 'string' } },
          locations: { type: 'array', items: { type: 'string' } },
          services: { type: 'array', items: { type: 'string' } },
          competitors: { type: 'array', items: { type: 'string' } },
          response_tone: { type: 'string' },
          category: { type: 'string', description: 'Best-fit business category' },
        },
        required: ['keywords', 'subreddits', 'services', 'response_tone'],
      },
      add_context_from_internet: true,
    });

    return Response.json(result);
  } catch (error) {
    console.error('onboardClient error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});