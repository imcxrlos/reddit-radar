import { base44 } from '@/api/base44Client';

/**
 * Centralized data-access layer.
 *
 * Every entity read/write in the app goes through this module. Components and
 * pages never import the platform client or call `base44.entities.*` directly,
 * so migrating to another backend (Firebase, etc.) only requires re-implementing
 * the functions below — the rest of the codebase stays unchanged.
 */

export const opportunities = {
  list: (sort, limit) => base44.entities.Opportunity.list(sort, limit),
  filter: (query, sort, limit) => base44.entities.Opportunity.filter(query, sort, limit),
  get: (id) => base44.entities.Opportunity.get(id),
  update: (id, data) => base44.entities.Opportunity.update(id, data),
};

export const clients = {
  list: () => base44.entities.Client.list(),
  get: (id) => base44.entities.Client.get(id),
  create: (data) => base44.entities.Client.create(data),
  update: (id, data) => base44.entities.Client.update(id, data),
};

export const feedback = {
  filter: (query, sort, limit) => base44.entities.FeedbackRecord.filter(query, sort, limit),
  create: (data) => base44.entities.FeedbackRecord.create(data),
  bulkCreate: (records) => base44.entities.FeedbackRecord.bulkCreate(records),
};