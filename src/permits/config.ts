import { FieldDef, Rule } from './types';

export const CITIES = [
  'Surrey', 'Vancouver', 'Richmond', 'Burnaby',
  'Delta', 'Township of Langley', 'Coquitlam', 'White Rock',
];

export const CATEGORIES = [
  'Plumbing', 'Gas', 'Backflow', 'Sewer / Drainage', 'Fire Sprinkler',
  'Hydronic / Boiler', 'Water Heater', 'Renovation / Rough-in', 'Site Services',
  'Lawn Irrigation', 'Re-piping', 'Commercial Plumbing', 'Multi-family Plumbing',
  'Tenant Improvement',
];

export const WORK_TYPES = [
  'New installation', 'Addition', 'Alteration', 'Renovation', 'Repair',
  'Replacement', 'Re-piping', 'Rough-in', 'Final / Completion', 'Service work',
];

// ---- Canonical field catalog (curated MVP subset — config-driven) ----
export const FIELDS: FieldDef[] = [
  // Applicant
  { key: 'applicant_type', label: 'Applicant type', type: 'select', section: 'applicant', required: true, options: ['Contractor', 'Owner', 'Agent', 'Office admin'] },
  { key: 'applicant_name', label: 'Applicant name', type: 'text', section: 'applicant', required: true, placeholder: 'Jane Doe' },
  { key: 'applicant_company', label: 'Company', type: 'text', section: 'applicant' },
  { key: 'applicant_phone', label: 'Phone', type: 'phone', section: 'applicant', required: true },
  { key: 'applicant_email', label: 'Email', type: 'email', section: 'applicant', required: true },

  // Property
  { key: 'site_address', label: 'Site address', type: 'text', section: 'property', required: true, placeholder: '123 Main St' },
  { key: 'unit', label: 'Unit #', type: 'text', section: 'property' },
  { key: 'postal_code', label: 'Postal code', type: 'text', section: 'property' },
  { key: 'pid', label: 'PID', type: 'text', section: 'property', help: 'Parcel identifier' },
  { key: 'property_type', label: 'Property type', type: 'select', section: 'property', required: true, options: ['Single-family', 'Townhouse', 'Condo', 'Multi-family', 'Commercial', 'Industrial', 'Institutional', 'Mixed-use'] },

  // Owner / customer
  { key: 'customer_name', label: 'Customer name', type: 'text', section: 'owner', required: true },
  { key: 'customer_phone', label: 'Customer phone', type: 'phone', section: 'owner' },
  { key: 'owner_name', label: 'Property owner name', type: 'text', section: 'owner' },
  { key: 'is_strata', label: 'Is the property strata?', type: 'boolean', section: 'owner' },
  { key: 'has_tenant', label: 'Is there a tenant?', type: 'boolean', section: 'owner' },
  { key: 'tenant_contact_name', label: 'Site/tenant contact', type: 'text', section: 'owner', condition: { field: 'has_tenant', op: 'truthy' } },
  { key: 'site_access_instructions', label: 'Site access instructions', type: 'textarea', section: 'owner' },

  // Scope
  { key: 'scope_description', label: 'Scope of work', type: 'textarea', section: 'scope', required: true, placeholder: 'Describe the work…' },
  { key: 'project_value', label: 'Estimated project value', type: 'money', section: 'scope' },
  { key: 'connected_to_building_permit', label: 'Connected to a building permit?', type: 'boolean', section: 'scope' },
  { key: 'related_building_permit_number', label: 'Related building permit #', type: 'text', section: 'scope', condition: { field: 'connected_to_building_permit', op: 'truthy' } },
  { key: 'includes_gas', label: 'Includes gas work?', type: 'boolean', section: 'scope' },
  { key: 'includes_backflow', label: 'Includes backflow?', type: 'boolean', section: 'scope' },
  { key: 'includes_fire', label: 'Includes fire sprinkler?', type: 'boolean', section: 'scope' },
  { key: 'includes_hydronic', label: 'Includes hydronic heating?', type: 'boolean', section: 'scope' },
  { key: 'includes_site_service', label: 'Includes sewer/storm/water service?', type: 'boolean', section: 'scope' },
  { key: 'includes_underground', label: 'Includes underground piping?', type: 'boolean', section: 'scope' },

  // Fixtures (unlocked by category/scope)
  { key: 'fx_water_closets', label: 'Water closets / toilets', type: 'integer', section: 'tech_fixtures' },
  { key: 'fx_lavatories', label: 'Lavatories', type: 'integer', section: 'tech_fixtures' },
  { key: 'fx_kitchen_sinks', label: 'Kitchen sinks', type: 'integer', section: 'tech_fixtures' },
  { key: 'fx_showers', label: 'Showers', type: 'integer', section: 'tech_fixtures' },
  { key: 'fx_bathtubs', label: 'Bathtubs', type: 'integer', section: 'tech_fixtures' },
  { key: 'fx_floor_drains', label: 'Floor drains', type: 'integer', section: 'tech_fixtures' },
  { key: 'fx_hose_bibbs', label: 'Hose bibbs', type: 'integer', section: 'tech_fixtures' },
  { key: 'fx_water_heaters', label: 'Water heaters', type: 'integer', section: 'tech_fixtures' },
  { key: 'fx_urinals', label: 'Urinals', type: 'integer', section: 'tech_fixtures', condition: { field: 'is_commercial', op: 'truthy' } },
  { key: 'fx_grease_interceptors', label: 'Grease interceptors', type: 'integer', section: 'tech_fixtures', condition: { field: 'is_commercial', op: 'truthy' } },

  // Water heater
  { key: 'wh_type', label: 'Tank or tankless', type: 'select', section: 'tech_water_heater', options: ['Tank', 'Tankless'] },
  { key: 'wh_install', label: 'New install or replacement', type: 'select', section: 'tech_water_heater', options: ['New install', 'Replacement'] },
  { key: 'wh_fuel', label: 'Fuel type', type: 'select', section: 'tech_water_heater', options: ['Electric', 'Natural gas', 'Propane'] },
  { key: 'wh_btu', label: 'BTU input', type: 'number', section: 'tech_water_heater' },
  { key: 'wh_model', label: 'Manufacturer / model', type: 'text', section: 'tech_water_heater' },

  // Gas
  { key: 'gas_appliance_type', label: 'Appliance type', type: 'text', section: 'tech_gas' },
  { key: 'gas_total_btu', label: 'Total BTU', type: 'number', section: 'tech_gas' },
  { key: 'gas_pressure_test', label: 'Pressure test required?', type: 'boolean', section: 'tech_gas' },

  // Backflow
  { key: 'bf_device_type', label: 'Device type', type: 'text', section: 'tech_backflow' },
  { key: 'bf_manufacturer', label: 'Manufacturer / model', type: 'text', section: 'tech_backflow' },
  { key: 'bf_serial', label: 'Serial number', type: 'text', section: 'tech_backflow' },
  { key: 'bf_test_date', label: 'Test date', type: 'date', section: 'tech_backflow' },

  // Hydronic
  { key: 'hy_boiler_model', label: 'Boiler manufacturer / model', type: 'text', section: 'tech_hydronic' },
  { key: 'hy_btu_input', label: 'BTU input', type: 'number', section: 'tech_hydronic' },
  { key: 'hy_zones', label: 'Number of zones', type: 'integer', section: 'tech_hydronic' },

  // Fire sprinkler
  { key: 'fire_heads', label: 'Sprinkler heads', type: 'integer', section: 'tech_fire' },
  { key: 'fire_standpipes', label: 'Standpipes', type: 'integer', section: 'tech_fire' },
  { key: 'fire_service_line_len', label: 'Fire service line length (m)', type: 'number', section: 'tech_fire' },

  // Sewer / site
  { key: 'site_service_type', label: 'Service type', type: 'select', section: 'tech_sewer_site', options: ['Sanitary', 'Storm', 'Water', 'Fire service', 'Combined'] },
  { key: 'site_line_length', label: 'Line length (m)', type: 'number', section: 'tech_sewer_site' },
  { key: 'site_pipe_material', label: 'Pipe material', type: 'text', section: 'tech_sewer_site' },
];

// Document types that may be required (driven by rules / scope)
export const DOC_TYPES: { key: string; label: string; condition?: any }[] = [
  { key: 'doc_site_photos', label: 'Site photos' },
  { key: 'doc_plumbing_drawings', label: 'Plumbing drawings' },
  { key: 'doc_strata_authorization', label: 'Strata authorization letter' },
  { key: 'doc_owner_authorization', label: 'Owner / agent authorization' },
  { key: 'doc_business_licence', label: 'Business licence' },
  { key: 'doc_tq_certificate', label: 'TQ / Red Seal certificate' },
  { key: 'gas_piping_test_certificate', label: 'Gas piping test certificate' },
  { key: 'backflow_assembly_test_report', label: 'Backflow assembly test report' },
  { key: 'doc_chlorination_certificate', label: 'Chlorination certificate' },
  { key: 'doc_manufacturer_spec', label: 'Manufacturer spec sheet' },
];

// ---- Section visibility (what unlocks each technical block) ----
export const SECTION_CONDITIONS: Record<string, (a: Record<string, any>, category: string) => boolean> = {
  tech_fixtures: (a, c) =>
    ['Plumbing', 'Renovation / Rough-in', 'Commercial Plumbing', 'Multi-family Plumbing', 'Tenant Improvement', 'Re-piping'].includes(c)
    || !!a.fixtures_changed,
  tech_water_heater: (a, c) => c === 'Water Heater' || (a.fx_water_heaters > 0),
  tech_gas: (a, c) => !!a.includes_gas || c === 'Gas',
  tech_backflow: (a, c) => !!a.includes_backflow || c === 'Backflow',
  tech_hydronic: (a, c) => !!a.includes_hydronic || c === 'Hydronic / Boiler',
  tech_fire: (a, c) => !!a.includes_fire || c === 'Fire Sprinkler',
  tech_sewer_site: (a, c) => !!a.includes_site_service || !!a.includes_underground || ['Sewer / Drainage', 'Site Services'].includes(c),
};

// ---- City rules (Surrey detailed; others seeded lighter) ----
export const RULES: Rule[] = [
  // Surrey — detailed fixture + fire requirements, TQ required
  { city: 'Surrey', fieldKey: 'doc_tq_certificate', documentRequired: true, notes: 'Surrey requires TQ/Red Seal.' },
  { city: 'Surrey', fieldKey: 'fire_heads', required: true, condition: { field: 'includes_fire', op: 'truthy' } },
  { city: 'Surrey', fieldKey: 'fire_standpipes', required: true, condition: { field: 'includes_fire', op: 'truthy' } },
  { city: 'Surrey', fieldKey: 'doc_business_licence', documentRequired: true },

  // Vancouver — separate gas note, floors matter, business licence
  { city: 'Vancouver', fieldKey: 'doc_business_licence', documentRequired: true, notes: 'Vancouver or intermunicipal licence.' },
  { city: 'Vancouver', fieldKey: 'gas_piping_test_certificate', documentRequired: true, condition: { field: 'includes_gas', op: 'truthy' }, notes: 'Gas is a separate Vancouver permit workflow.' },

  // Richmond — chlorination + drawings + naming
  { city: 'Richmond', fieldKey: 'doc_chlorination_certificate', documentRequired: true, condition: { field: 'includes_site_service', op: 'truthy' } },
  { city: 'Richmond', fieldKey: 'doc_plumbing_drawings', documentRequired: true, condition: { field: 'is_commercial', op: 'truthy' } },

  // Burnaby
  { city: 'Burnaby', fieldKey: 'doc_plumbing_drawings', documentRequired: true, condition: { field: 'includes_site_service', op: 'truthy' } },

  // Delta — non-SFD needs drawings
  { city: 'Delta', fieldKey: 'doc_plumbing_drawings', documentRequired: true, condition: { field: 'is_non_sfd', op: 'truthy' } },

  // Township of Langley — checklist + business licence
  { city: 'Township of Langley', fieldKey: 'doc_owner_authorization', documentRequired: true },

  // Coquitlam — drawings for fire/underground
  { city: 'Coquitlam', fieldKey: 'doc_plumbing_drawings', documentRequired: true, condition: { field: 'includes_fire', op: 'truthy' } },

  // White Rock — agent authorization is a hard requirement
  { city: 'White Rock', fieldKey: 'doc_owner_authorization', required: true, documentRequired: true, condition: { field: 'applicant_type', op: '=', value: 'Agent' }, notes: 'Application rejected without agent authorization.' },

  // Cross-city document requirements driven by scope
  { city: '*', fieldKey: 'gas_piping_test_certificate', documentRequired: true, condition: { field: 'includes_gas', op: 'truthy' } },
  { city: '*', fieldKey: 'backflow_assembly_test_report', documentRequired: true, condition: { field: 'includes_backflow', op: 'truthy' } },
  { city: '*', fieldKey: 'doc_strata_authorization', documentRequired: true, condition: { field: 'is_strata', op: 'truthy' } },
];

export const RULES_VERIFIED_ON = '2026-06-01';
