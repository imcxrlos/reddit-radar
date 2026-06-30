import { base44 } from '@/api/base44Client';

/**
 * Centralized auth surface.
 *
 * Keeps platform auth details out of pages so the rest of the app doesn't
 * import the platform client directly.
 */
export const auth = {
  /** @returns {Promise<object|null>} the current user */
  me: () => base44.auth.me(),
};