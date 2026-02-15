import { Audit } from '../models/audit.model';

export const recordAudit = async (payload: {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: any;
  after?: any;
  meta?: any;
}) => {
  try {
    const a = await Audit.create({
      actorId: payload.actorId || null,
      action: payload.action,
      resource: payload.resource,
      resourceId: payload.resourceId || null,
      before: payload.before || undefined,
      after: payload.after || undefined,
      meta: payload.meta || undefined,
    });
    return a;
  } catch (err) {
    // do not throw from audit (non‑blocking)
    console.error('Audit write failed', err);
    return null;
  }
};
