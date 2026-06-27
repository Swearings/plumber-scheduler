// Permit Packet Builder — core types (config-driven, trade-extensible)

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'integer' | 'money'
  | 'select' | 'boolean' | 'date' | 'phone' | 'email' | 'file';

export type Cond =
  | { field: string; op: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'truthy'; value?: any }
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  section: Section;
  options?: string[];        // for select
  help?: string;
  placeholder?: string;
  required?: boolean;        // base requirement (cities can add more)
  condition?: Cond;          // base visibility (cities can hide/show further)
}

export type Section =
  | 'applicant' | 'property' | 'owner' | 'scope'
  | 'tech_fixtures' | 'tech_water_heater' | 'tech_gas' | 'tech_backflow'
  | 'tech_hydronic' | 'tech_fire' | 'tech_sewer_site'
  | 'uploads';

export interface Rule {
  city: string;
  permitType?: string;       // category; undefined = all
  fieldKey: string;
  visible?: boolean;
  required?: boolean;
  documentRequired?: boolean;
  condition?: Cond;          // rule applies only when this passes
  notes?: string;
}

export type PermitStatus =
  | 'draft' | 'needs_information' | 'ready_to_submit' | 'submitted'
  | 'under_review' | 'approved' | 'rejected' | 'revision_required'
  | 'inspection_requested' | 'inspection_scheduled' | 'inspection_passed'
  | 'inspection_failed' | 'reinspection_required' | 'closed' | 'archived';

export type ScreeningResult = 'likely_required' | 'may_not_be_required' | 'needs_review';

export interface Permit {
  id: string;
  reference: string;
  city: string;
  category: string;          // permit category
  workType: string;
  status: PermitStatus;
  screening?: ScreeningResult;
  answers: Record<string, any>;
  documents: { type: string; name: string }[];
  forwardedAt?: string;
  forwardedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Completeness {
  pct: number;
  missingFields: FieldDef[];
  missingDocs: string[];
  blockers: string[];
  readiness: 'ready' | 'not_ready' | 'needs_manual_review';
}

export const STATUS_LABELS: Record<PermitStatus, string> = {
  draft: 'Draft', needs_information: 'Needs Info', ready_to_submit: 'Ready',
  submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved',
  rejected: 'Rejected', revision_required: 'Revision Required',
  inspection_requested: 'Insp. Requested', inspection_scheduled: 'Insp. Scheduled',
  inspection_passed: 'Insp. Passed', inspection_failed: 'Insp. Failed',
  reinspection_required: 'Reinspection', closed: 'Closed', archived: 'Archived',
};

export const STATUS_COLORS: Record<PermitStatus, string> = {
  draft: '#6b7280', needs_information: '#f59e0b', ready_to_submit: '#3b82f6',
  submitted: '#6366f1', under_review: '#6366f1', approved: '#10b981',
  rejected: '#ef4444', revision_required: '#f59e0b',
  inspection_requested: '#06b6d4', inspection_scheduled: '#06b6d4',
  inspection_passed: '#10b981', inspection_failed: '#ef4444',
  reinspection_required: '#f59e0b', closed: '#475569', archived: '#334155',
};
