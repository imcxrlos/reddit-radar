import { base44 } from '@/api/base44Client';

/**
 * Centralized AI service.
 *
 * All AI capabilities — onboarding, Stage-2 matching, semantic verification, and
 * draft generation — are reached through this module. The rest of the app never
 * calls the AI provider (or the underlying backend functions) directly, so a
 * future swap of the AI backend only requires changing this single file.
 *
 * Today these delegate to Base44 backend functions, which in turn call the LLM
 * integration server-side. The frontend stays unaware of the provider.
 */
export const ai = {
  /**
   * Research a business and generate its monitoring config (keywords,
   * expanded keywords, subreddits, services, locations, tone). Used during
   * client onboarding.
   * @param {{ business_name: string, website?: string, industry: string }} payload
   * @returns {Promise<object>} generated onboarding data
   */
  onboardClient: (payload) =>
    base44.functions.invoke('onboardClient', payload).then((r) => r.data || r),

  /**
   * Run the two-stage pipeline (Stage 1 deterministic keyword match + Stage 2
   * AI verification / client matching / draft generation) over collected Reddit
   * items. Admin-only; triggered manually for now.
   * @returns {Promise<object>} processing summary
   */
  processRedditItems: () =>
    base44.functions.invoke('processRedditItems').then((r) => r.data || r),
};