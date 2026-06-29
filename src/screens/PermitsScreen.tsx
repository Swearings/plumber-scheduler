import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import {
  Permit, Section, STATUS_LABELS, STATUS_COLORS,
} from '../permits/types';
import { CITIES, CATEGORIES, WORK_TYPES, FIELDS, RULES_VERIFIED_ON } from '../permits/config';
import {
  getVisibleFields, isFieldRequired, computeCompleteness, runScreening,
  getRequiredDocs, docLabel,
} from '../permits/engine';
import { listPermits, savePermit, newReference, setStatus, deletePermit } from '../permits/permitsApi';
import FieldRenderer from '../permits/FieldRenderer';

type Mode = { kind: 'list' } | { kind: 'wizard' } | { kind: 'detail'; id: string };

const STEPS = ['basics', 'applicant', 'property', 'owner', 'scope', 'tech', 'uploads', 'review'] as const;
type Step = typeof STEPS[number];
const STEP_TITLES: Record<Step, string> = {
  basics: 'City & Work', applicant: 'Applicant', property: 'Property', owner: 'Owner / Customer',
  scope: 'Scope', tech: 'Technical Details', uploads: 'Documents', review: 'Review',
};

export default function PermitsScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { setPermits(await listPermits()); }
  useEffect(() => { load().finally(() => setLoading(false)); }, [mode]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  if (mode.kind === 'wizard') {
    return <Wizard insetTop={insets.top} onClose={() => setMode({ kind: 'list' })} onSaved={() => setMode({ kind: 'list' })} />;
  }
  if (mode.kind === 'detail') {
    return <Detail insetTop={insets.top} id={mode.id} onBack={() => setMode({ kind: 'list' })} onChanged={load} />;
  }

  // ---- Dashboard / list ----
  const counts: Record<string, number> = {};
  permits.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
  const tiles = [
    { label: 'Active', value: permits.filter(p => !['closed', 'archived'].includes(p.status)).length, color: '#3b82f6' },
    { label: 'Drafts', value: counts['draft'] || 0, color: '#6b7280' },
    { label: 'Needs Info', value: counts['needs_information'] || 0, color: '#f59e0b' },
    { label: 'Submitted', value: counts['submitted'] || 0, color: '#6366f1' },
    { label: 'Approved', value: counts['approved'] || 0, color: '#10b981' },
    { label: 'Inspections', value: permits.filter(p => p.status.startsWith('inspection')).length, color: '#06b6d4' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        <Text style={styles.h1}>Permits</Text>

        <View style={styles.tiles}>
          {tiles.map(t => (
            <View key={t.label} style={styles.tile}>
              <Text style={[styles.tileVal, { color: t.color }]}>{t.value}</Text>
              <Text style={styles.tileLabel}>{t.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>All Permits</Text>
        {permits.length === 0
          ? <Text style={styles.empty}>No permits yet. Tap + to start one.</Text>
          : permits.map(p => {
            const color = STATUS_COLORS[p.status];
            return (
              <TouchableOpacity key={p.id} style={styles.row} activeOpacity={0.8} onPress={() => setMode({ kind: 'detail', id: p.id })}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.answers.site_address || p.answers.customer_name || p.reference}</Text>
                  <Text style={styles.rowMeta}>{p.reference} · {p.city} · {p.category}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[p.status]}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        }
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setMode({ kind: 'wizard' })} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ================= WIZARD =================
function Wizard({ insetTop, onClose, onSaved }: { insetTop: number; onClose: () => void; onSaved: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [workType, setWorkType] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [docs, setDocs] = useState<{ type: string; name: string }[]>([]);

  const fullAnswers = { ...answers, work_type: workType, property_type: answers.property_type };
  const screening = useMemo(() => city ? runScreening(fullAnswers, city) : undefined, [fullAnswers, city]);
  const completeness = useMemo(
    () => computeCompleteness(city, category, fullAnswers, docs, screening),
    [city, category, fullAnswers, docs, screening]
  );

  function setAns(key: string, value: any) { setAnswers(a => ({ ...a, [key]: value })); }

  function fieldsForSections(sections: Section[]) {
    const visible = getVisibleFields(city, category, fullAnswers);
    return visible.filter(f => sections.includes(f.section));
  }

  function renderFields(sections: Section[], emptyMsg?: string) {
    const fields = fieldsForSections(sections);
    if (fields.length === 0) return <Text style={styles.empty}>{emptyMsg || 'Nothing required here for this permit.'}</Text>;
    return fields.map(f => (
      <FieldRenderer key={f.key} field={f} value={answers[f.key]} required={isFieldRequired(f, city, fullAnswers)} onChange={setAns} />
    ));
  }

  const canContinueBasics = !!city && !!category && !!workType;

  async function forward() {
    const ref = newReference();
    const permit: Permit = {
      id: 'pm' + Date.now(), reference: ref, city, category, workType,
      status: completeness.readiness === 'ready' ? 'submitted' : 'draft',
      screening, answers: fullAnswers, documents: docs,
      forwardedAt: completeness.readiness === 'ready' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await savePermit(permit);
    Alert.alert(
      completeness.readiness === 'ready' ? 'Packet forwarded' : 'Saved as draft',
      completeness.readiness === 'ready'
        ? `${ref} packet prepared and forwarded to you. File it with ${city} when ready.`
        : `${ref} saved. Finish the missing items before forwarding.`,
    );
    onSaved();
  }

  async function saveDraft() {
    const permit: Permit = {
      id: 'pm' + Date.now(), reference: newReference(), city: city || 'Surrey', category: category || 'Plumbing',
      workType, status: 'draft', screening, answers: fullAnswers, documents: docs,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await savePermit(permit);
    onSaved();
  }

  const requiredDocs = getRequiredDocs(city, fullAnswers);

  return (
    <View style={[styles.container, { paddingTop: insetTop }]}>
      {/* header */}
      <View style={styles.wizHeader}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
        <Text style={styles.wizTitle}>{STEP_TITLES[step]}</Text>
        <TouchableOpacity onPress={saveDraft}><Text style={styles.saveDraft}>Save</Text></TouchableOpacity>
      </View>

      {/* progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBarBg}><View style={[styles.progressBar, { width: `${completeness.pct}%` }]} /></View>
        <Text style={styles.progressText}>{completeness.pct}% complete · Step {stepIdx + 1}/{STEPS.length}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {step === 'basics' && (
          <>
            <Label text="City" />
            <Chips options={CITIES} value={city} onSelect={(v) => { setCity(v); setAns('city', v); }} />
            <Label text="Permit category" />
            <Chips options={CATEGORIES} value={category} onSelect={setCategory} />
            <Label text="Work type" />
            <Chips options={WORK_TYPES} value={workType} onSelect={setWorkType} />
            {!!city && (
              <Text style={styles.disclaimer}>
                Rules last verified {dayjs(RULES_VERIFIED_ON).format('MMM D, YYYY')} — confirm requirements with {city} before starting work.
              </Text>
            )}
          </>
        )}

        {step === 'applicant' && renderFields(['applicant'])}
        {step === 'property' && renderFields(['property'])}
        {step === 'owner' && renderFields(['owner'])}

        {step === 'scope' && (
          <>
            {renderFields(['scope'])}
            {screening && (
              <View style={[styles.screenCard, {
                borderColor: screening === 'likely_required' ? '#10b981' : screening === 'needs_review' ? '#f59e0b' : '#6b7280',
              }]}>
                <Text style={styles.screenTitle}>
                  {screening === 'likely_required' ? 'Permit likely required'
                    : screening === 'may_not_be_required' ? 'Permit may not be required'
                    : 'Needs manual review'}
                </Text>
                <Text style={styles.screenSub}>Permit requirements vary by municipality. Confirm with {city} before starting work.</Text>
              </View>
            )}
          </>
        )}

        {step === 'tech' && renderFields(
          ['tech_fixtures', 'tech_water_heater', 'tech_gas', 'tech_backflow', 'tech_hydronic', 'tech_fire', 'tech_sewer_site'],
          'No technical details needed based on your scope.'
        )}

        {step === 'uploads' && (
          <>
            <Text style={styles.help}>Attach the documents {city} needs for this permit.</Text>
            {requiredDocs.length === 0 && <Text style={styles.empty}>No required documents for this scope.</Text>}
            {requiredDocs.map(d => {
              const have = docs.some(x => x.type === d);
              return (
                <View key={d} style={styles.docRow}>
                  <Ionicons name={have ? 'checkmark-circle' : 'alert-circle-outline'} size={20} color={have ? '#10b981' : '#f59e0b'} />
                  <Text style={styles.docLabel}>{docLabel(d)}</Text>
                  <TouchableOpacity
                    style={styles.docBtn}
                    onPress={() => setDocs(prev => have ? prev.filter(x => x.type !== d) : [...prev, { type: d, name: 'attached.pdf' }])}
                  >
                    <Text style={styles.docBtnText}>{have ? 'Remove' : 'Attach'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {step === 'review' && (
          <>
            <View style={styles.reviewMeter}>
              <Text style={styles.reviewPct}>{completeness.pct}%</Text>
              <Text style={styles.reviewReadiness}>
                {completeness.readiness === 'ready' ? 'Ready to forward'
                  : completeness.readiness === 'needs_manual_review' ? 'Needs manual review'
                  : 'Not ready'}
              </Text>
            </View>

            {completeness.blockers.map((b, i) => (
              <View key={i} style={styles.blocker}><Ionicons name="warning-outline" size={15} color="#ef4444" /><Text style={styles.blockerText}>{b}</Text></View>
            ))}
            {completeness.missingFields.length > 0 && (
              <Text style={styles.missing}>Missing fields: {completeness.missingFields.map(f => f.label).join(', ')}</Text>
            )}
            {completeness.missingDocs.length > 0 && (
              <Text style={styles.missing}>Missing documents: {completeness.missingDocs.map(docLabel).join(', ')}</Text>
            )}

            <TouchableOpacity style={styles.forwardBtn} onPress={forward}>
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={styles.forwardText}>Forward packet to me</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>This prepares and forwards the packet to you. It does not submit to {city}. Confirm requirements before filing.</Text>
          </>
        )}
      </ScrollView>

      {/* nav */}
      <View style={[styles.navBar, { paddingBottom: 80 }]}>
        <TouchableOpacity style={styles.navBtn} disabled={stepIdx === 0} onPress={() => setStepIdx(i => Math.max(0, i - 1))}>
          <Text style={[styles.navBtnText, stepIdx === 0 && { color: '#475569' }]}>Back</Text>
        </TouchableOpacity>
        {stepIdx < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.navNext, step === 'basics' && !canContinueBasics && styles.navNextDisabled]}
            disabled={step === 'basics' && !canContinueBasics}
            onPress={() => setStepIdx(i => Math.min(STEPS.length - 1, i + 1))}
          >
            <Text style={styles.navNextText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
    </View>
  );
}

// ================= DETAIL =================
function Detail({ insetTop, id, onBack, onChanged }: { insetTop: number; id: string; onBack: () => void; onChanged: () => void }) {
  const [permit, setPermit] = useState<Permit | undefined>();
  useEffect(() => { import('../permits/permitsApi').then(m => m.getPermit(id).then(setPermit)); }, [id]);
  if (!permit) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

  const color = STATUS_COLORS[permit.status];
  const visible = getVisibleFields(permit.city, permit.category, permit.answers);

  return (
    <View style={[styles.container, { paddingTop: insetTop }]}>
      <View style={styles.wizHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="chevron-back" size={24} color="#60a5fa" /></TouchableOpacity>
        <Text style={styles.wizTitle}>{permit.reference}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={[styles.badge, { backgroundColor: color + '22', alignSelf: 'flex-start', marginBottom: 12 }]}>
          <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[permit.status]}</Text>
        </View>
        <Text style={styles.detailTitle}>{permit.answers.site_address || permit.answers.customer_name}</Text>
        <Text style={styles.rowMeta}>{permit.city} · {permit.category} · {permit.workType}</Text>

        <Text style={styles.h2}>Details</Text>
        {visible.filter(f => permit.answers[f.key] !== undefined && permit.answers[f.key] !== '').map(f => (
          <View key={f.key} style={styles.kv}>
            <Text style={styles.kvKey}>{f.label}</Text>
            <Text style={styles.kvVal}>{String(permit.answers[f.key] === true ? 'Yes' : permit.answers[f.key] === false ? 'No' : permit.answers[f.key])}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Documents</Text>
        {permit.documents.length === 0 ? <Text style={styles.empty}>No documents attached.</Text>
          : permit.documents.map((d, i) => (
            <View key={i} style={styles.kv}><Text style={styles.kvKey}>{docLabel(d.type)}</Text><Text style={styles.kvVal}>{d.name}</Text></View>
          ))}

        <TouchableOpacity style={[styles.deleteBtn]} onPress={async () => { await deletePermit(permit.id); onChanged(); onBack(); }}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text style={styles.deleteText}>Delete permit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ---- shared small components ----
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function Chips({ options, value, onSelect }: { options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={styles.chips}>
      {options.map(o => {
        const on = value === o;
        return (
          <TouchableOpacity key={o} style={[styles.chip, on && styles.chipOn]} onPress={() => onSelect(o)}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  h1: { color: '#f1f5f9', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  h2: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  empty: { color: '#475569', paddingVertical: 12 },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  tileVal: { fontSize: 22, fontWeight: '800' },
  tileLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  rowMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  fab: { position: 'absolute', right: 20, bottom: 80, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', elevation: 6 },

  wizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  wizTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  saveDraft: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  progressWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: '#1e293b', overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: '#3b82f6', borderRadius: 3 },
  progressText: { color: '#64748b', fontSize: 11, marginTop: 4 },

  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  help: { color: '#64748b', fontSize: 13, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  chipOn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  disclaimer: { color: '#64748b', fontSize: 12, marginTop: 16, lineHeight: 17, fontStyle: 'italic' },

  screenCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16, backgroundColor: '#1e293b' },
  screenTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  screenSub: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 17 },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  docLabel: { color: '#e2e8f0', fontSize: 14, flex: 1 },
  docBtn: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#334155' },
  docBtnText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },

  reviewMeter: { alignItems: 'center', marginBottom: 16 },
  reviewPct: { color: '#3b82f6', fontSize: 44, fontWeight: '800' },
  reviewReadiness: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  blocker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  blockerText: { color: '#ef4444', fontSize: 13, flex: 1 },
  missing: { color: '#f59e0b', fontSize: 13, marginTop: 6 },
  forwardBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 },
  forwardText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  navBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  navBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  navBtnText: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  navNext: { flex: 1, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  navNextDisabled: { backgroundColor: '#1e293b' },
  navNextText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  detailTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b', gap: 12 },
  kvKey: { color: '#94a3b8', fontSize: 13, flex: 1 },
  kvVal: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 14, marginTop: 24 },
  deleteText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
