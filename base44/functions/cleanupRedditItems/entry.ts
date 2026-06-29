import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Retention policy: delete processed Reddit items older than 30 days.
// The RedditItem table is a dedup registry + processing queue, not permanent storage.
// - Unprocessed / pending items: KEPT (so the AI queue isn't lost)
// - Failed items (processed: false): KEPT for debugging
// - Processed items older than 30 days: DELETED
// Safe for dedup: collection only fetches posts from the last 30 days, so by the
// time a processed item is eligible for deletion it's already outside the
// collection window and won't be re-fetched/re-processed.

const RETENTION_DAYS = 30;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin manual invocation OR scheduled (no-user) context
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.RedditItem.deleteMany({
      processed: true,
      processed_at: { $lt: cutoff }
    });

    return Response.json({
      message: `Cleaned up processed Reddit items older than ${RETENTION_DAYS} days.`,
      cutoff
    });
  } catch (error) {
    console.error('cleanupRedditItems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});