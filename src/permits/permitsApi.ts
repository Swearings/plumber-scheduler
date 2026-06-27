import { Permit, PermitStatus } from './types';

// Demo in-memory store (same pattern as jobsApi/invoicesApi). Swap for Supabase later.
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

export async function listPermits(): Promise<Permit[]> {
  return [...seed].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPermit(id: string): Promise<Permit | undefined> {
  return seed.find(p => p.id === id);
}

export function newReference(): string {
  counter += 1;
  return `PM-2026-${String(counter).padStart(4, '0')}`;
}

export async function savePermit(p: Permit): Promise<Permit> {
  const idx = seed.findIndex(x => x.id === p.id);
  p.updatedAt = new Date().toISOString();
  if (idx >= 0) seed[idx] = p;
  else seed.unshift(p);
  return p;
}

export async function setStatus(id: string, status: PermitStatus): Promise<void> {
  const p = seed.find(x => x.id === id);
  if (p) { p.status = status; p.updatedAt = new Date().toISOString(); }
}

export async function deletePermit(id: string): Promise<void> {
  const idx = seed.findIndex(x => x.id === id);
  if (idx >= 0) seed.splice(idx, 1);
}
