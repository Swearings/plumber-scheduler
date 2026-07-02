import { Permit, PermitStatus } from './types';
import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../lib/mockData';

// Demo in-memory store (used until Supabase keys are configured).
let counter = 42;

const seed: Permit[] = [
  {
    id: 'pm1', reference: 'PM-2026-0041', city: 'Surrey', category: 'Water Heater',
    workType: 'Replacement', status: 'submitted', screening: 'likely_required',
    answers: {
      applicant_type: 'Contractor', applicant_name: 'Mike Reyes', applicant_phone: '555-0142', applicant_email: 'mike@plumberpro.com',
      site_address: '142 Oak Street', property_type: 'Single-family', customer_name: 'Janet Cooper',
      scope_description: 'Replace 40-gal gas water heater, same location.',
      fx_water_heaters: 1, wh_type: 'Tank', wh_install: 'Replacement', wh_fuel: 'Natural gas', wh_btu: 40000,
    },
    documents: [{ type: 'doc_site_photos', name: 'before.jpg' }, { type: 'doc_business_licence', name: 'licence.pdf' }, { type: 'doc_tq_certificate', name: 'tq.pdf' }],
    createdAt: new Date(Date.now() - 4 * 864e5).toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'pm2', reference: 'PM-2026-0040', city: 'Richmond', category: 'Commercial Plumbing',
    workType: 'Alteration', status: 'needs_information', screening: 'likely_required',
    answers: {
      applicant_type: 'Contractor', applicant_name: 'Sara Lin', site_address: '88 No. 3 Road',
      property_type: 'Commercial', customer_name: 'Pacific Retail Ltd', includes_site_service: true,
      scope_description: 'Add fixtures + new water service for tenant unit.',
    },
    documents: [],
    createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'pm3', reference: 'PM-2026-0039', city: 'Burnaby', category: 'Backflow',
    workType: 'Replacement', status: 'approved', screening: 'likely_required',
    answers: {
      applicant_type: 'Contractor', applicant_name: 'Dan Patel', site_address: '290 Willingdon Ave',
      property_type: 'Commercial', customer_name: 'Metro Foods', includes_backflow: true,
      bf_device_type: 'RP', bf_manufacturer: 'Watts 909', bf_serial: 'WT-99812',
    },
    documents: [{ type: 'backflow_assembly_test_report', name: 'test.pdf' }],
    createdAt: new Date(Date.now() - 9 * 864e5).toISOString(), updatedAt: new Date().toISOString(),
  },
];

// ---- map between the DB row (snake_case) and the app Permit (camelCase) ----
function rowToPermit(r: any): Permit {
  return {
    id: r.id, customer_id: r.customer_id, reference: r.reference, city: r.city,
    category: r.category, workType: r.work_type, status: r.status, screening: r.screening,
    answers: r.answers || {}, documents: r.documents || [],
    forwardedAt: r.forwarded_at, forwardedTo: r.forwarded_to,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function permitToRow(p: Permit): any {
  return {
    customer_id: p.customer_id, reference: p.reference, city: p.city, category: p.category,
    work_type: p.workType, status: p.status, screening: p.screening,
    answers: p.answers, documents: p.documents,
    forwarded_at: p.forwardedAt, forwarded_to: p.forwardedTo,
  };
}

export async function listPermits(): Promise<Permit[]> {
  if (DEMO_MODE) return [...seed].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const { data, error } = await supabase.from('permits').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToPermit);
}

export async function getPermit(id: string): Promise<Permit | undefined> {
  if (DEMO_MODE) return seed.find(p => p.id === id);
  const { data } = await supabase.from('permits').select('*').eq('id', id).single();
  return data ? rowToPermit(data) : undefined;
}

export function newReference(): string {
  counter += 1;
  return `PM-${new Date().getFullYear()}-${String(counter).padStart(4, '0')}`;
}

export async function savePermit(p: Permit): Promise<Permit> {
  if (DEMO_MODE) {
    const idx = seed.findIndex(x => x.id === p.id);
    p.updatedAt = new Date().toISOString();
    if (idx >= 0) seed[idx] = p; else seed.unshift(p);
    return p;
  }
  // Live: let the DB generate the id/timestamps.
  const { data, error } = await supabase.from('permits').insert(permitToRow(p)).select().single();
  if (error) throw error;
  return rowToPermit(data);
}

export async function setStatus(id: string, status: PermitStatus): Promise<void> {
  if (DEMO_MODE) {
    const p = seed.find(x => x.id === id);
    if (p) { p.status = status; p.updatedAt = new Date().toISOString(); }
    return;
  }
  const { error } = await supabase.from('permits').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deletePermit(id: string): Promise<void> {
  if (DEMO_MODE) {
    const idx = seed.findIndex(x => x.id === id);
    if (idx >= 0) seed.splice(idx, 1);
    return;
  }
  const { error } = await supabase.from('permits').delete().eq('id', id);
  if (error) throw error;
}
