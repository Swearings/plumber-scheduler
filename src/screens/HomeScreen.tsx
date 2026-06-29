import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { fetchJobs, updateJobStatus } from '../lib/jobsApi';
import { fetchInvoices } from '../lib/invoicesApi';
import { fetchLeads } from '../lib/leadsApi';
import { Job, JobStatus, Invoice, invoiceTotal, Lead, LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '../types';
import { COMPANY_NAME } from '../lib/config';
import JobCard from '../components/JobCard';

type Period = 'day' | 'week' | 'month' | 'year';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

interface Props {
  userId: string;
  isDispatcher: boolean;
}

export default function HomeScreen({ userId, isDispatcher }: Props) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('week');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [hideRevenue, setHideRevenue] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [todayJobs, setTodayJobs] = useState<Job[]>([]);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [inv, jobs, leads] = await Promise.all([
      fetchInvoices(),
      fetchJobs({
        userId,
        isDispatcher,
        rangeStart: dayjs().startOf('day').toISOString(),
        rangeEnd: dayjs().endOf('day').toISOString(),
      }),
      fetchLeads(),
    ]);
    setInvoices(inv);
    setTodayJobs(jobs);
    setNewLeads(leads.filter(l => l.status === 'new'));
  }
  useEffect(() => { load().finally(() => setLoading(false)); }, []);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function changeStatus(jobId: string, status: JobStatus) {
    // Optimistic update for snappy feedback, then persist.
    setTodayJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
    await updateJobStatus(jobId, status);
  }

  const { revenue, label } = useMemo(() => {
    const start = dayjs().subtract(1, period).startOf('day');
    // Revenue = total billed (all invoices in the period, regardless of status)
    const inRange = invoices.filter(i => dayjs(i.issued_date).isAfter(start));
    const total = inRange.reduce((s, i) => s + invoiceTotal(i), 0);
    const labels: Record<Period, string> = {
      day: 'last 24 hours', week: 'last 7 days', month: 'last month', year: 'last year',
    };
    return { revenue: total, label: labels[period] };
  }, [invoices, period]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 96 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      {/* Welcome */}
      <Text style={styles.welcome}>Welcome,</Text>
      <Text style={styles.company}>{COMPANY_NAME}</Text>

      {/* Revenue */}
      <View style={styles.revCard}>
        <View style={styles.revHead}>
          <View style={styles.revHeadLeft}>
            <Text style={styles.revLabel}>Revenue</Text>
            <TouchableOpacity onPress={() => setHideRevenue(h => !h)} hitSlop={10}>
              <Ionicons name={hideRevenue ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Period dropdown */}
          <View>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setPeriodOpen(o => !o)} activeOpacity={0.8}>
              <Text style={styles.dropdownText}>{PERIODS.find(p => p.key === period)?.label}</Text>
              <Ionicons name={periodOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#94a3b8" />
            </TouchableOpacity>
            {periodOpen && (
              <View style={styles.dropdownMenu}>
                {PERIODS.map(p => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.dropdownItem, period === p.key && styles.dropdownItemActive]}
                    onPress={() => { setPeriod(p.key); setPeriodOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, period === p.key && styles.dropdownItemTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <Text style={styles.revValue}>{hideRevenue ? '••••••' : `$${revenue.toFixed(2)}`}</Text>
        <Text style={styles.revPeriod}>{label}</Text>
      </View>

      {/* Jobs today */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Jobs Today</Text>
        <Text style={styles.sectionCount}>{dayjs().format('ddd, MMM D')}</Text>
      </View>

      {todayJobs.length === 0
        ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={28} color="#334155" />
            <Text style={styles.emptyText}>Nothing scheduled today</Text>
          </View>
        )
        : todayJobs.map(job => (
            <JobCard key={job.id} job={job} onStatusChange={(s) => changeStatus(job.id, s)} />
          ))
      }

      {/* New leads */}
      {newLeads.length > 0 && (
        <>
          <View style={[styles.sectionHead, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>New Leads</Text>
            <Text style={styles.sectionCount}>{newLeads.length}</Text>
          </View>
          {newLeads.map(lead => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={[styles.leadDot, { backgroundColor: LEAD_STATUS_COLORS[lead.status] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.leadName}>{lead.name || lead.phone}</Text>
                <Text style={styles.leadMeta}>
                  {lead.source ? `${lead.source} · ` : ''}{LEAD_STATUS_LABELS[lead.status]}
                </Text>
              </View>
              <TouchableOpacity style={styles.leadCall} onPress={() => Linking.openURL(`tel:${lead.phone}`)}>
                <Ionicons name="call-outline" size={15} color="#10b981" />
                <Text style={styles.leadCallText}>{lead.phone}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  welcome: { color: '#94a3b8', fontSize: 18, marginTop: 4 },
  company: { color: '#f1f5f9', fontSize: 28, fontWeight: '800', marginBottom: 20 },

  revCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 24 },
  revHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 },
  revHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  revPeriod: { color: '#64748b', fontSize: 12, marginTop: 4 },
  revValue: { color: '#10b981', fontSize: 36, fontWeight: '800', marginTop: 10 },

  dropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  dropdownText: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  dropdownMenu: { position: 'absolute', top: 40, right: 0, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', minWidth: 110, zIndex: 20 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemActive: { backgroundColor: '#1e293b' },
  dropdownItemText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  dropdownItemTextActive: { color: '#60a5fa' },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  sectionCount: { color: '#64748b', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: '#475569', fontSize: 14 },

  leadCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8 },
  leadDot: { width: 8, height: 8, borderRadius: 4 },
  leadName: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  leadMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  leadCall: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  leadCallText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
});
