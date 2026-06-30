import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function fetchWebsiteText(url) {
  try {
    let target = url.trim();
    if (!target.startsWith('http')) target = 'https://' + target;
    const resp = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadRadarBot/1.0)' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    return text.substring(0, 6000) || null;
  } catch (e) {
    console.error('Website fetch failed:', e.message);
    return null;
  }
}

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

    let websiteContent = '';
    if (website) {
      const fetched = await fetchWebsiteText(website);
      if (fetched) {
        websiteContent = `\nWEBSITE CONTENT (extracted from ${website}):\n${fetched}\n`;
      }
    }

    const prompt = `You are a Reddit marketing strategist for a lead generation agency. A new client is being onboarded. Research this business and suggest the optimal Reddit monitoring configuration.

BUSINESS NAME: ${business_name}
WEBSITE: ${website || '(not provided)'}
INDUSTRY: ${industry}
${websiteContent}

${websiteContent
  ? 'The website content above was extracted directly from their site. Use it as the PRIMARY source of truth for their services, locations, and specialties. Do NOT invent services they don\'t list. If their website clearly states they only handle car accidents and slip-and-fall, do NOT suggest medical malpractice.'
  : 'No website content was available. Infer services and locations from the business name and industry, but keep suggestions realistic for a business of this type and size.'
}

Provide recommendations for:

1. KEYWORDS: 10-15 keywords and phrases to monitor on Reddit. These should capture how real people talk about problems related to this business — not just industry jargon. Include both direct terms ("car accident lawyer") and conversational phrases ("got rear ended", "insurance won't pay").

2. EXPANDED_KEYWORDS: A flat list of 100-150 high-recall terms and phrases that real Reddit users type when describing problems this business can solve. This list powers DETERMINISTIC substring matching during monitoring — once generated, NO AI runs in monitoring, so coverage must be generous now or leads are missed forever. For EACH service the business offers, include ALL of the following categories of phrasing:

   - Synonyms: dictionary equivalents ("car accident", "auto accident", "motor vehicle accident", "car collision")
   - Common Reddit wording: how posters actually phrase titles/posts ("got into an accident", "was in a car wreck", "car got hit", "someone crashed into my car")
   - Slang & informal terms: "got T-boned", "got sideswiped", "totaled my car", "whiplash", "fender bender", "rear ended me", "rear ended"
   - Misspellings & common typos people actually type: "rearended", "car accidnet", "lawer", "aturny", "compinsation"
   - Conversational first-person phrases: "someone hit my car", "got hit at a red light", "my car got totaled", "got into a wreck", "hit by another driver", "my neck hurts after the accident", "hurt my back in a crash"
   - Long-tail intent phrases & questions: "should I get a lawyer after a car accident", "other driver's insurance won't pay", "insurance is denying my claim", "how much is my car accident case worth", "do I need a lawyer after an accident"

   Generate these for EVERY service in your SERVICES list — do not skip any. Also include the KEYWORDS and SERVICES verbatim. All lowercase, no duplicates (no entries that differ only by trailing punctuation). Err toward MORE phrases per service, not fewer. The goal is maximum recall — capture how real Reddit users naturally describe the situation, not just dictionary synonyms.

3. SUBREDDITS: 8-15 relevant subreddits to monitor. Include:
   - Local city/state subreddits where the business operates (infer from website or business name)
   - Industry-specific communities (r/legaladvice, r/personalfinance, r/AskReddit for broader reach)
   - Problem-focused communities (r/insurance, r/CarAccident, etc.)
   List subreddit names WITHOUT the r/ prefix.

4. LOCATIONS: Cities and states the business serves. Format as "City, State" entries. Pull these from the website content if available — do NOT invent locations they don't serve.

5. SERVICES: 5-10 specific services or practice areas this business offers. Pull these DIRECTLY from their website content if available. Each service should be specific enough to filter leads (e.g., "Car Accidents", not just "Personal Injury"). These must match what they actually do.

6. RESPONSE_TONE: A recommended tone for Reddit responses (e.g., "Empathetic and professional, avoid legal jargon, offer genuine helpful advice first").

Return your recommendations as JSON.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'string' } },
          expanded_keywords: { type: 'array', items: { type: 'string' } },
          subreddits: { type: 'array', items: { type: 'string' } },
          locations: { type: 'array', items: { type: 'string' } },
          services: { type: 'array', items: { type: 'string' } },
          response_tone: { type: 'string' },
          category: { type: 'string', description: 'Best-fit business category' },
        },
        required: ['keywords', 'expanded_keywords', 'subreddits', 'services', 'response_tone'],
      },
      add_context_from_internet: true,
    });

    return Response.json(result);
  } catch (error) {
    console.error('onboardClient error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});