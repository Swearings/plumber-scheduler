import { Cond, FieldDef, Rule, Completeness, ScreeningResult } from './types';
import { FIELDS, RULES, DOC_TYPES, SECTION_CONDITIONS } from './config';

// Derived flags some conditions reference
function withDerived(answers: Record<string, any>): Record<string, any> {
  const pt = answers.property_type;
  return {
    ...answers,
    is_commercial: ['Commercial', 'Industrial', 'Institutional', 'Mixed-use', 'Multi-family'].includes(pt),
    is_non_sfd: pt && pt !== 'Single-family',
  };
}

export function evalCond(cond: Cond | undefined, answers: Record<string, any>): boolean {
  if (!cond) return true;
  if ('all' in cond) return cond.all.every(c => evalCond(c, answers));
  if ('any' in cond) return cond.any.some(c => evalCond(c, answers));
  if ('not' in cond) return !evalCond(cond.not, answers);
  const v = answers[cond.field];
  switch (cond.op) {
    case 'truthy': return !!v;
    case '=': return v === cond.value;
    case '!=': return v !== cond.value;
    case '>': return Number(v) > Number(cond.value);
    case '<': return Number(v) < Number(cond.value);
    case '>=': return Number(v) >= Number(cond.value);
    case '<=': return Number(v) <= Number(cond.value);
    default: return false;
  }
}

function cityRules(city: string): Rule[] {
  return RULES.filter(r => r.city === city || r.city === '*');
}

export function isSectionVisible(section: string, answers: Record<string, any>, category: string): boolean {
  const a = withDerived(answers);
  const fn = SECTION_CONDITIONS[section];
  if (!fn) return true; // always-on sections (applicant, property, owner, scope, uploads)
  return fn(a, category);
}

export function getVisibleFields(city: string, category: string, answers: Record<string, any>): FieldDef[] {
  const a = withDerived(answers);
  const rules = cityRules(city);
  return FIELDS.filter(f => {
    if (!isSectionVisible(f.section, answers, category)) return false;
    if (!evalCond(f.condition, a)) return false;
    // a city rule can explicitly hide a field
    const hide = rules.find(r => r.fieldKey === f.key && r.visible === false && evalCond(r.condition, a));
    return !hide;
  });
}

export function isFieldRequired(field: FieldDef, city: string, answers: Record<string, any>): boolean {
  const a = withDerived(answers);
  if (field.required) return true;
  return cityRules(city).some(r =>
    r.fieldKey === field.key && r.required === true && evalCond(r.condition, a)
  );
}

export function getRequiredDocs(city: string, answers: Record<string, any>): string[] {
  const a = withDerived(answers);
  const set = new Set<string>();
  cityRules(city).forEach(r => {
    if (r.documentRequired && evalCond(r.condition, a)) set.add(r.fieldKey);
  });
  return Array.from(set);
}

export function docLabel(key: string): string {
  return DOC_TYPES.find(d => d.key === key)?.label || key;
}

export function runScreening(answers: Record<string, any>, city: string): ScreeningResult {
  const a = withDerived(answers);
  // Vancouver basic-work carve-out
  if (city === 'Vancouver' && a.work_type === 'Repair'
      && a.same_location_replacement && !a.includes_gas && !a.new_piping) {
    return 'may_not_be_required';
  }
  if (a.includes_gas || a.includes_site_service || a.includes_underground
      || a.includes_fire || a.work_type === 'New installation' || a.new_piping) {
    return 'likely_required';
  }
  if (['Addition', 'Alteration', 'Renovation', 'Rough-in', 'Re-piping'].includes(a.work_type)) {
    return 'likely_required';
  }
  return 'needs_review';
}

function isEmpty(v: any): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

export function computeCompleteness(
  city: string,
  category: string,
  answers: Record<string, any>,
  documents: { type: string }[],
  screening?: ScreeningResult,
): Completeness {
  const a = withDerived(answers);
  const visible = getVisibleFields(city, category, answers);
  const requiredFields = visible.filter(f => isFieldRequired(f, city, answers));
  const missingFields = requiredFields.filter(f => isEmpty(answers[f.key]));

  const requiredDocs = getRequiredDocs(city, answers);
  const hasDoc = (t: string) => documents.some(d => d.type === t);
  const missingDocs = requiredDocs.filter(t => !hasDoc(t));

  const blockers: string[] = [];
  if (city === 'White Rock' && a.applicant_type === 'Agent' && !hasDoc('doc_owner_authorization'))
    blockers.push('White Rock requires an agent authorization form before submission.');
  if (a.includes_gas && !hasDoc('gas_piping_test_certificate'))
    blockers.push('Gas selected: gas piping test certificate required.');
  if (a.includes_backflow && !hasDoc('backflow_assembly_test_report'))
    blockers.push('Backflow selected: assembly test report required.');
  if (a.is_strata && !hasDoc('doc_strata_authorization'))
    blockers.push('Strata property: strata authorization letter required.');
  if (a.connected_to_building_permit && isEmpty(a.related_building_permit_number))
    blockers.push('Related building permit number required.');

  const totalRequired = requiredFields.length + requiredDocs.length;
  const satisfied = totalRequired - missingFields.length - missingDocs.length;
  const pct = totalRequired === 0 ? 100 : Math.max(0, Math.round((satisfied / totalRequired) * 100));

  const readiness =
    blockers.length === 0 && missingFields.length === 0 && missingDocs.length === 0
      ? 'ready'
      : screening === 'needs_review'
        ? 'needs_manual_review'
        : 'not_ready';

  return { pct, missingFields, missingDocs, blockers, readiness };
}
