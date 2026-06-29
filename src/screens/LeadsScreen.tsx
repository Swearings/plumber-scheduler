import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import {
  Lead, LeadStatus, LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS,
} from '../types';
import { fetchLeads, updateLeadStatus } from '../lib/leadsApi';
import LeadFormModal from '../components/LeadFormModal';
import JobFormModal from '../components/JobFormModal';

interface Props {
  userId: string;
}

export default function LeadsScreen({ userId }: Props) {
  const insets = useSafeAreaInsets();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const [jobVisible, setJobVisible] = useState(false);
  const [jobPrefill, setJobPrefill] = useState<{ customer_name?: string; phone?: string; address?: string } | null>(null);

  async function load() { setLeads(await fetchLeads()); }
  useEffect(() => { load().finally(() => setLoading(false)); }, []);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function changeStatus(id: string, status: LeadStatus) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    setMenuFor(null);
    await updateLeadStatus(id, status);
  }

  function scheduleLead(lead: Lead) {
    setJobPrefill({ customer_name: lead.name || lead.phone, phone: lead.phone, address: lead.address });
    setJobVisible(true);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        <Text style={styles.h1}>Leads</Text>

        {/* filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', ...LEAD_STATUSES] as const).map(f => {
            const on = filter === f;
            const label = f === 'all' ? 'All' : LEAD_STATUS_LABELS[f as LeadStatus];
            return (
              <TouchableOpacity key={f} style={[styles.filterChip, on && styles.filterOn]} onPress={() => setFilter(f as any)}>
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filtered.length === 0
          ? <Text style={styles.empty}>No leads here. Tap + to add one.</Text>
          : filtered.map(lead => {
            const color = LEAD_STATUS_COLORS[lead.status];
            return (
              <View key={lead.id} style={[styles.card, menuFor === lead.id && styles.cardElevated]}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => { setEditing(lead); setFormVisible(true); }}>
                  <View style={styles.cardTop}>
                    <Text style={styles.name}>{lead.name || lead.phone}</Text>
                    {/* status dropdown */}
                    <View>
                      <TouchableOpacity style={[styles.badge, { backgroundColor: color + '22' }]} onPress={() => setMenuFor(menuFor === lead.id ? null : lead.id)}>
                        <Text style={[styles.badgeText, { color }]}>{LEAD_STATUS_LABELS[lead.status]}</Text>
                        <Ionicons name={menuFor === lead.id ? 'chevron-up' : 'chevron-down'} size={11} color={color} />
                      </TouchableOpacity>
                      {menuFor === lead.id && (
                        <View style={styles.menu}>
                          {LEAD_STATUSES.map(s => (
                            <TouchableOpacity key={s} style={styles.menuItem} onPress={() => changeStatus(lead.id, s)}>
                              <View style={[styles.dot, { backgroundColor: LEAD_STATUS_COLORS[s] }]} />
                              <Text style={[styles.menuText, s === lead.status && { color: LEAD_STATUS_COLORS[s], fontWeight: '700' }]}>{LEAD_STATUS_LABELS[s]}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  {!!lead.source && <Text style={styles.meta}>{lead.source}</Text>}
                  {!!lead.notes && <Text style={styles.notes} numberOfLines={2}>{lead.notes}</Text>}
                  {!!lead.address && <Text style={styles.meta}>{lead.address}</Text>}
                  <Text style={styles.date}>Added {dayjs(lead.created_at).format('MMM D')}</Text>
                </TouchableOpacity>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${lead.phone}`)}>
                    <Ionicons name="call-outline" size={15} color="#10b981" />
                    <Text style={[styles.actionText, { color: '#10b981' }]}>{lead.phone}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.scheduleBtn} onPress={() => scheduleLead(lead)}>
                    <Ionicons name="calendar-outline" size={15} color="#fff" />
                    <Text style={styles.scheduleText}>Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        }
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => { setEditing(null); setFormVisible(true); }} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <LeadFormModal
        visible={formVisible}
        lead={editing}
        currentUserId={userId}
        onClose={() => setFormVisible(false)}
        onSaved={load}
      />

      <JobFormModal
        visible={jobVisible}
        prefill={jobPrefill}
        currentUserId={userId}
        onClose={() => setJobVisible(false)}
        onSaved={() => setJobVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  h1: { color: '#f1f5f9', fontSize: 28, fontWeight: '800', marginBottom: 14 },
  empty: { color: '#475569', paddingVertical: 24, textAlign: 'center' },

  filters: { gap: 8, paddingBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterOn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  filterTextOn: { color: '#fff' },

  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10, position: 'relative', zIndex: 1 },
  cardElevated: { zIndex: 100, elevation: 100 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  menu: { position: 'absolute', top: 28, right: 0, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingVertical: 4, minWidth: 130, zIndex: 50, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  menuText: { color: '#cbd5e1', fontSize: 13 },
  meta: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  notes: { color: '#cbd5e1', fontSize: 13, marginTop: 6 },
  date: { color: '#64748b', fontSize: 11, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#0f172a', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  actionText: { fontSize: 14, fontWeight: '600' },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  scheduleText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
