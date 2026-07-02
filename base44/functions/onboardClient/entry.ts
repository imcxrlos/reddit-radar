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
    // and services so the prompt respects the client's real service area.
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
      ? `\nCLIENT'S AUTHORITATIVE SERVICE AREA (use EXACTLY these locations — do not invent others):\n${JSON.stringify(existingLocations)}\n`
      : '';
    const servicesNote = existingServices
      ? `\nCLIENT'S AUTHORITATIVE SERVICES (generate phrases for EXACTLY these services):\n${JSON.stringify(existingServices)}\n`
      : '';

    const prompt = `You are a Reddit marketing strategist for a lead generation agency. A client is being onboarded. Research this business and suggest the optimal Reddit monitoring configuration.

BUSINESS NAME: ${business_name}
WEBSITE: ${website || '(not provided)'}
INDUSTRY: ${industry}
${websiteContent}${serviceAreaNote}${servicesNote}

${websiteContent
  ? 'The website content above was extracted directly from their site. Use it as the PRIMARY source of truth for their services, locations, and specialties. Do NOT invent services they don\'t list.'
  : 'No website content was available. Infer services and locations from the business name and industry, but keep suggestions realistic.'
}

Provide recommendations for:

1. KEYWORDS: 10-15 broad keywords and phrases related to this business. These are for reference only — the expanded_keywords list below is what powers monitoring.

2. EXPANDED_KEYWORDS: A curated list of phrases classified into TWO tiers. QUALITY OVER QUANTITY — prefer 30-50 excellent phrases over 100 mediocre ones. Each phrase must be classified as either "anchor" or "modifier".

   ANCHOR phrases describe WHAT HAPPENED to a person — the specific incident, injury, or problem they are experiencing. These are phrases a real Reddit user would type when describing their own situation in a post title or body. A post containing an anchor phrase is very likely describing a real problem this business can solve.

   ANCHOR examples (for a personal injury lawyer):
   - "got rear ended", "someone hit my car", "car got totaled", "hit by another driver"
   - "got rear ended at a red light", "someone crashed into my car"
   - "slipped and fell", "fell at the store", "slipped on wet floor"
   - "work injury", "injured at work", "hurt on the job", "got hurt at work"
   - "whiplash", "concussion after fall", "back pain after crash", "my neck hurts after the accident"
   - "insurance denied my claim", "insurance won't pay", "other driver's insurance denied my claim"
   - "truck accident", "hit by a drunk driver", "dog bit me", "got attacked by a dog"

   MODIFIER terms are generic professional or industry words that describe WHO a person might need or what process they're in, but NOT what happened to them. These NEVER qualify a post alone — they only add context when they appear alongside an anchor phrase.

   MODIFIER examples:
   - "lawyer", "attorney", "legal", "law firm", "solicitor"
   - "employer", "work", "claim", "insurance", "compensation"
   - "sued", "lawsuit", "settlement", "damages"

   CRITICAL RULES:
   - Every phrase must be lowercase.
   - ANCHOR phrases must describe a specific incident, injury, or problem — NOT a profession, service name, or generic concept. "car accident" is an anchor; "lawyer" is a modifier.
   - MODIFIER terms are single words or short generic phrases — never incident descriptions.
   - NEVER include geographic terms: no cities, states, countries, continents, "near me", or any location. Phrases describe SITUATIONS only, never locations.
   - NEVER include SEO/marketing phrases: "best lawyer", "top rated", "affordable attorney", "find a lawyer".
   - No duplicates. No entries differing only by trailing punctuation.
   - Generate anchors for EVERY service the business offers — 5-10 anchors per service minimum.
   - Prioritize natural Reddit speech: how a real person describes their problem in a post, not how someone searches for a business.

   Return as a JSON array of objects: [{"phrase": "got rear ended", "tier": "anchor"}, {"phrase": "lawyer", "tier": "modifier"}, ...]

3. SUBREDDITS: 8-12 subreddits to monitor WITHOUT the r/ prefix. ONLY include subreddits where a potential client — someone experiencing a problem this business solves — would realistically post. Use exactly three categories:
   (a) LOCAL community subreddits for each city/state the business serves (e.g., Atlanta, Georgia, CummingGA, MariettaGA).
   (b) LEGAL / professional-advice communities where people ask for help with the relevant problem (e.g., legaladvice, Insurance).
   (c) Problem- or incident-specific communities directly tied to a service the business actually offers (e.g., CarAccident, PersonalInjury, WorkersCompensation, SlipAndFall).
   NEVER include: enthusiast or hobby communities (cars, motorcycles, gaming), entertainment, general discussion, news, true crime, or any community tied to a profession this business does NOT practice (e.g., do NOT suggest MedicalMalpractice for a car-accident firm). Every subreddit must map to a service the business offers or a location it serves. Prefer real, active subreddits.

4. LOCATIONS: Cities and states the business serves, formatted as "City, State". Pull from website content if available. Do NOT invent locations they don't serve.

5. SERVICES: 5-10 specific services this business offers. Pull DIRECTLY from their website content if available. Each service should be specific enough to filter leads (e.g., "Car Accidents", not just "Personal Injury").

6. RESPONSE_TONE: A recommended tone for Reddit responses (e.g., "Empathetic and professional, avoid legal jargon, offer genuine helpful advice first").

Return your recommendations as JSON.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'string' } },
          expanded_keywords: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                phrase: { type: 'string' },
                tier: { type: 'string', enum: ['anchor', 'modifier'] },
              },
              required: ['phrase', 'tier'],
            },
          },
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

    // ── Validation / cleanup of expanded_keywords ──
    // Enforce geographic/SEO rules programmatically as a deterministic backstop,
    // and ensure tier classification is correct (generic terms never anchor).
    const clientLocations = (existingLocations || result.locations || []).map(l => String(l).toLowerCase());

    // Known generic professional terms that should never be anchors.
    const genericProfessionTerms = new Set([
      'lawyer', 'attorney', 'legal', 'law firm', 'law', 'solicitor', 'advocate', 'counsel',
      'employer', 'work', 'claim', 'insurance', 'compensation', 'sued', 'lawsuit', 'settlement',
      'damages', 'help', 'advice', 'service', 'consultation', 'doctor', 'dentist',
      'chiropractor', 'clinic', 'hospital', 'firm', 'agency', 'company', 'business',
      'therapist', 'counselor', 'contractor', 'realtor', 'agent', 'broker',
    ]);

    const geoNoise = /\b(in|near|around|outside)\s+(me|the\s+us|usa|canada|mexico|europe|asia|africa|australia|south america|north america|sudan|nigeria|india|uk|united kingdom|germany|france|china|brazil|argentina|russia|japan|korea|spain|italy|sweden|norway|poland|egypt|iran|iraq|pakistan|turkey|greece|portugal|netherlands|belgium|switzerland|austria|ireland|scotland|wales)\b/;
    const seoNoise = /\b(near me|best (car accident|personal injury|slip and fall|auto accident|injury)?\s*(lawyer|attorney|law firm)|top rated|top-ranked|#1|cheap |affordable (lawyer|attorney)|find a (lawyer|attorney)|looking for a (lawyer|attorney))\b/;
    const professionGeo = /\b(lawyer|attorney|law firm|solicitor|advocate|counsel)\s+in\s+/;
    const continentList = /\b(europe|asia|africa|australia|south america|north america|antarctica|middle east|latin america|central america|scandinavia|balkans|caucasus|caribbean|south asia|east asia|western europe|eastern europe|north africa|south africa)\b/;

    const rawExpanded = (result.expanded_keywords || []);
    const cleaned = [];
    const seen = new Set();

    for (const entry of rawExpanded) {
      const phrase = String(entry.phrase || '').toLowerCase().trim();
      if (!phrase) continue;
      if (seen.has(phrase)) continue;
      if (phrase.length < 4 || phrase.length > 120) continue;
      if (geoNoise.test(phrase)) continue;
      if (seoNoise.test(phrase)) continue;
      if (professionGeo.test(phrase)) continue;
      if (continentList.test(phrase)) continue;

      // Reject "profession + city/state" style unless the location is the client's own.
      const profCityMatch = phrase.match(/\b(lawyer|attorney|law firm|solicitor)\s+([a-z\s]+)$/);
      if (profCityMatch) {
        const tail = profCityMatch[2].trim();
        const isClientLoc = clientLocations.some(loc => loc.includes(tail) || tail.includes(loc));
        if (!isClientLoc) continue;
      }

      let tier = (entry.tier === 'modifier') ? 'modifier' : 'anchor';

      // Downgrade: if classified as anchor but is a known generic term, make it a modifier.
      if (tier === 'anchor' && genericProfessionTerms.has(phrase)) {
        tier = 'modifier';
      }

      seen.add(phrase);
      cleaned.push({ phrase, tier });
    }

    // Separate and cap: quality over quantity.
    const anchors = cleaned.filter(c => c.tier === 'anchor');
    const modifiers = cleaned.filter(c => c.tier === 'modifier');
    result.expanded_keywords = [...anchors.slice(0, 60), ...modifiers.slice(0, 30)];

    // ── Clean short keywords list (same geographic rules, capped at 20) ──
    const rawKeywords = (result.keywords || []).map(k => String(k).toLowerCase().trim()).filter(Boolean);
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

    // ── Clean subreddits: strip r/ prefix, case-insensitive dedup, cap ──
    result.subreddits = (result.subreddits || [])
      .map(s => String(s).replace(/^r\//i, '').trim())
      .filter(Boolean)
      .filter((s, i, arr) => arr.findIndex(x => x.toLowerCase() === s.toLowerCase()) === i)
      .slice(0, 15);

    // ── Persist back to client when regenerating ──
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