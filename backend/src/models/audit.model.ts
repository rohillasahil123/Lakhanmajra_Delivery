import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAudit extends Document {
  actorId?: Types.ObjectId | null;
  action: string; // e.g., 'create', 'update', 'delete', 'assign'
  resource: string; // e.g., 'product', 'category', 'role', 'user'
  resourceId?: Types.ObjectId | string | null;
  before?: any;
  after?: any;
  meta?: any;
  createdAt: Date;
}

const AuditSchema = new Schema<IAudit>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: Schema.Types.Mixed, default: null },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditSchema.index({ resource: 1, resourceId: 1 });

export const Audit = mongoose.model<IAudit>('Audit', AuditSchema);
