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
    const { business_name, website, industry, client_id } = body;

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

    // When regenerating for an existing client, pull its authoritative locations
    // and services so the prompt (and the geographic cleanup) respects the
    // client's real service area rather than inferring a new one.
    let existingLocations = null;
    let existingServices = null;
    if (client_id) {
      try {
        const existing = await base44.asServiceRole.entities.Client.get(client_id);
        if (existing) {
          existingLocations = (existing.locations || []).length ? existing.locations : null;
          existingServices = (existing.services || []).length ? existing.services : null;
        }
      } catch (e) {
        console.error('Failed to load existing client for regen:', e.message);
      }
    }

    const serviceAreaNote = existingLocations
      ? `\nCLIENT'S AUTHORITATIVE SERVICE AREA (use EXACTLY these locations — do not invent others, do not embed them in keyword phrases):\n${JSON.stringify(existingLocations)}\n`
      : '';
    const servicesNote = existingServices
      ? `\nCLIENT'S AUTHORITATIVE SERVICES (generate conversational phrases for EXACTLY these services):\n${JSON.stringify(existingServices)}\n`
      : '';

    const prompt = `You are a Reddit marketing strategist for a lead generation agency. A new client is being onboarded. Research this business and suggest the optimal Reddit monitoring configuration.

BUSINESS NAME: ${business_name}
WEBSITE: ${website || '(not provided)'}
INDUSTRY: ${industry}
${websiteContent}${serviceAreaNote}${servicesNote}

${websiteContent
  ? 'The website content above was extracted directly from their site. Use it as the PRIMARY source of truth for their services, locations, and specialties. Do NOT invent services they don\'t list. If their website clearly states they only handle car accidents and slip-and-fall, do NOT suggest medical malpractice.'
  : 'No website content was available. Infer services and locations from the business name and industry, but keep suggestions realistic for a business of this type and size.'
}

Provide recommendations for:

1. KEYWORDS: 10-15 keywords and phrases to monitor on Reddit. These should capture how real people talk about problems related to this business — not just industry jargon. Include both direct terms ("car accident lawyer") and conversational phrases ("got rear ended", "insurance won't pay").

2. EXPANDED_KEYWORDS: A flat list of 50-100 high-quality phrases that real Reddit users type when describing problems this business can solve. This list powers DETERMINISTIC substring matching during monitoring — quality and natural speech matter far more than quantity.

   CRITICAL GEOGRAPHIC RULE: Do NOT generate ANY geographic variations. Never include a country, continent, state, region, or city name inside a phrase. No "lawyer in Sudan", no "attorney in Europe", no "near me", no "[city] lawyer", no "[state] attorney". The client's service area is handled separately — your phrases are ONLY about the SITUATION the poster is describing, never the location.

   FORBIDDEN (do NOT generate any of these):
   - "[profession] in/near [location]" or "[location] [profession]"
   - "near me" or any "near me" phrasing
   - SEO/marketing phrases ("best personal injury lawyer", "top rated attorney", "cheap lawyer")
   - Any phrase containing a country, continent, state, city, or region name
   - Any phrase that reads like a Google search query rather than a real person's post

   For EACH service the business offers, generate 8-15 phrases covering ALL of these categories (mix them, do not just list service names):
   - Synonyms: "car accident", "auto accident", "motor vehicle accident", "car collision", "car wreck"
   - Common Reddit wording (how posters phrase titles/posts): "got into an accident", "was in a car wreck", "car got hit", "someone crashed into my car", "got rear ended", "got t-boned"
   - Slang & informal terms: "fender bender", "totaled my car", "whiplash", "rear ended me", "sideswiped", "slipped and fell", "wiped out"
   - Misspellings people actually type: "rearended", "car accidnet", "compinsation", "lawer"
   - First-person situation phrases: "someone hit my car", "got hit at a red light", "my car got totaled", "hit by another driver", "my neck hurts after the accident", "hurt my back in a crash", "slipped on wet floor", "fell at the store", "hurt at work", "got hurt on the job"
   - Insurance/claim issues: "insurance won't pay", "other driver's insurance denied my claim", "at-fault driver's insurance won't pay", "insurance is denying my claim", "my claim got denied"
   - Questions posters ask: "should I get a lawyer after a car accident", "do I need a lawyer after an accident", "how much is my car accident case worth", "is it worth getting a lawyer"
   - Injury descriptions: "whiplash from car accident", "concussion after fall", "back pain after crash", "neck pain after accident"

   Generate these for EVERY service in your SERVICES list. All lowercase, no duplicates, no entries differing only by trailing punctuation. Prioritize natural Reddit speech — a phrase a real injured person would actually type in a post title. Do NOT pad the list with service-name repetitions.

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
      model: 'gemini_3_1_pro',
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

    // ── Validation / cleanup of keywords ──
    // Same geographic and SEO rules apply to the short keyword list, since it
    // feeds Stage 1 matching as a fallback. Strip junk so neither list carries
    // geographic/SEO noise the user flagged.
    // Prefer the client's authoritative locations when regenerating; fall back
    // to whatever the LLM proposed for fresh onboarding.
    const clientLocations = (existingLocations || result.locations || []).map(l => String(l).toLowerCase());
    const rawKeywords = (result.keywords || []).map(k => String(k).toLowerCase().trim()).filter(Boolean);

    // ── Validation / cleanup of expanded_keywords ──
    // Enforce the geographic and SEO rules programmatically, since the LLM
    // occasionally drifts despite the prompt. This is the deterministic backstop
    // that protects Stage 1 matching quality.
    const rawExpanded = (result.expanded_keywords || []).map(k => String(k).toLowerCase().trim()).filter(Boolean);

    // Terms that mark a phrase as SEO-style or geographic noise.
    const geoNoise = /\b(in|near|around|outside)\s+(me|the\s+us|usa|canada|mexico|europe|asia|africa|australia|south america|north america|sudan|nigeria|india|uk|united kingdom|germany|france|china|brazil|argentina|russia|japan|korea|spain|italy|sweden|norway|poland|egypt|iran|iraq|pakistan|turkey|greece|portugal|netherlands|belgium|switzerland|austria|ireland|scotland|wales)\b/;
    const seoNoise = /\b(near me|best (car accident|personal injury|slip and fall|auto accident|injury)?\s*(lawyer|attorney|law firm)|top rated|top-ranked|#1|cheap |affordable (lawyer|attorney)|find a (lawyer|attorney)|looking for a (lawyer|attorney))\b/;
    const professionGeo = /\b(lawyer|attorney|law firm|solicitor|advocate|counsel)\s+in\s+/;
    const continentList = /\b(europe|asia|africa|australia|south america|north america|antarctica|middle east|latin america|central america|scandinavia|balkans|caucasus|caribbean|south asia|east asia|western europe|eastern europe|north africa|south africa)\b/;

    const cleaned = [];
    const seen = new Set();
    for (const phrase of rawExpanded) {
      if (seen.has(phrase)) continue;
      if (phrase.length < 4 || phrase.length > 120) continue;
      if (geoNoise.test(phrase)) continue;
      if (seoNoise.test(phrase)) continue;
      if (professionGeo.test(phrase)) continue;
      if (continentList.test(phrase)) continue;
      // Reject "lawyer/attorney + city/state" style if the location isn't one of the client's own
      const profCityMatch = phrase.match(/\b(lawyer|attorney|law firm|solicitor)\s+([a-z\s]+)$/);
      if (profCityMatch) {
        const tail = profCityMatch[2].trim();
        const isClientLoc = clientLocations.some(loc => loc.includes(tail) || tail.includes(loc));
        if (!isClientLoc) continue;
      }
      seen.add(phrase);
      cleaned.push(phrase);
    }

    // Cap at 100 high-confidence phrases; quality over quantity.
    const finalExpanded = cleaned.slice(0, 100);

    result.expanded_keywords = finalExpanded;

    // Clean the short keywords list with the same rules, capped at 20.
    const cleanedKeywords = [];
    const seenKw = new Set();
    for (const phrase of rawKeywords) {
      if (seenKw.has(phrase)) continue;
      if (phrase.length < 4 || phrase.length > 120) continue;
      if (geoNoise.test(phrase)) continue;
      if (seoNoise.test(phrase)) continue;
      if (professionGeo.test(phrase)) continue;
      if (continentList.test(phrase)) continue;
      const profCityMatch = phrase.match(/\b(lawyer|attorney|law firm|solicitor)\s+([a-z\s]+)$/);
      if (profCityMatch) {
        const tail = profCityMatch[2].trim();
        const isClientLoc = clientLocations.some(loc => loc.includes(tail) || tail.includes(loc));
        if (!isClientLoc) continue;
      }
      seenKw.add(phrase);
      cleanedKeywords.push(phrase);
    }
    result.keywords = cleanedKeywords.slice(0, 20);

    // If a client_id was supplied, persist the cleaned lists back to the Client
    // record so regeneration updates the stored monitoring configuration.
    if (client_id) {
      try {
        const patch = { keywords: result.keywords, expanded_keywords: result.expanded_keywords };
        if (existingLocations) patch.locations = existingLocations;
        if (existingServices) patch.services = existingServices;
        await base44.asServiceRole.entities.Client.update(client_id, patch);
      } catch (e) {
        console.error('Failed to persist regenerated keywords:', e.message);
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('onboardClient error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});