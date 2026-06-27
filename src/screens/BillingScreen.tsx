import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { fetchInvoices } from '../lib/invoicesApi';
import { Invoice, InvoiceStatus, invoiceTotal } from '../types';
import InvoiceFormModal from '../components/InvoiceFormModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';

type Filter = 'all' | 'paid' | 'unpaid';

const PAID = '#10b981';
const UNPAID = '#ef4444'; // was orange, now red

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: '#6b7280', sent: '#ef4444', paid: '#10b981',
};
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid',
};

const HIDDEN = '••••••';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  userId: string;
}

export default function BillingScreen({ userId }: Props) {
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const [hideBilled, setHideBilled] = useState(true);
  const [hideCollected, setHideCollected] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [viewing, setViewing] = useState<Invoice | null>(null);

  async function load() {
    const data = await fetchInvoices();
    setInvoices(data);
  }
  useEffect(() => { load().finally(() => setLoading(false)); }, []);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const monthInvoices = useMemo(
    () => invoices.filter(i => dayjs(i.issued_date).isSame(month, 'month')),
    [invoices, month]
  );

  const billed = monthInvoices.reduce((s, i) => s + invoiceTotal(i), 0);
  const collected = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + invoiceTotal(i), 0);
  const outstanding = billed - collected;
  const avgInvoice = monthInvoices.length ? billed / monthInvoices.length : 0;

  // 6-month trend (collected per month)
  const trend = useMemo(() => {
    return Array.from({ length: 6 }, (_, idx) => {
      const m = month.subtract(5 - idx, 'month');
      const value = invoices
        .filter(i => i.status === 'paid' && dayjs(i.issued_date).isSame(m, 'month'))
        .reduce((s, i) => s + invoiceTotal(i), 0);
      return { label: m.format('MMM'), value, isCurrent: m.isSame(month, 'month') };
    });
  }, [invoices, month]);
  const maxTrend = Math.max(1, ...trend.map(t => t.value));

  // Invoice list shows ALL invoices (every month), sorted by issued date (newest first).
  const filtered = useMemo(() => {
    return invoices
      .filter(i => filter === 'all' ? true : filter === 'paid' ? i.status === 'paid' : i.status !== 'paid')
      .sort((a, b) => b.issued_date.localeCompare(a.issued_date));
  }, [invoices, filter]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* ===== REVENUE (top) ===== */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setMonth(m => m.subtract(1, 'month'))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#60a5fa" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{month.format('MMMM YYYY')}</Text>
          <TouchableOpacity onPress={() => setMonth(m => m.add(1, 'month'))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#60a5fa" />
          </TouchableOpacity>
        </View>

        {/* Total billed — hidden by default */}
        <View style={styles.hero}>
          <View style={styles.heroHead}>
            <Text style={styles.heroLabel}>Total Billed</Text>
            <TouchableOpacity onPress={() => setHideBilled(h => !h)} hitSlop={10}>
              <Ionicons name={hideBilled ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroValue}>{hideBilled ? HIDDEN : `$${billed.toFixed(2)}`}</Text>
          <Text style={styles.heroSub}>{monthInvoices.length} invoice{monthInvoices.length !== 1 ? 's' : ''} · avg ${avgInvoice.toFixed(0)}</Text>
        </View>

        <View style={styles.kpiRow}>
          {/* Collected — hidden by default */}
          <View style={[styles.kpi, { borderLeftColor: PAID }]}>
            <View style={styles.kpiHead}>
              <Text style={styles.kpiLabel}>Collected</Text>
              <TouchableOpacity onPress={() => setHideCollected(h => !h)} hitSlop={8}>
                <Ionicons name={hideCollected ? 'eye-off-outline' : 'eye-outline'} size={15} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.kpiValue, { color: PAID }]}>{hideCollected ? HIDDEN : `$${collected.toFixed(2)}`}</Text>
          </View>
          {/* Outstanding — always visible */}
          <View style={[styles.kpi, { borderLeftColor: UNPAID }]}>
            <Text style={styles.kpiLabel}>Outstanding</Text>
            <Text style={[styles.kpiValue, { color: UNPAID }]}>${outstanding.toFixed(2)}</Text>
          </View>
        </View>

        {/* 6-month trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collected — Last 6 Months</Text>
          <View style={styles.barChart}>
            {trend.map((t, i) => {
              const h = (t.value / maxTrend) * 120;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>{!hideCollected && t.value > 0 ? `$${Math.round(t.value)}` : ''}</Text>
                  <View style={styles.barStack}>
                    {h > 0
                      ? <View style={{ height: h, backgroundColor: t.isCurrent ? '#3b82f6' : '#334155', borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
                      : <View style={styles.barEmpty} />}
                  </View>
                  <Text style={[styles.barLabel, t.isCurrent && { color: '#60a5fa', fontWeight: '700' }]}>{t.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ===== INVOICES (below) ===== */}
        <View style={styles.invoicesHead}>
          <Text style={styles.invoicesTitle}>Invoices</Text>
          <View style={styles.filters}>
            {(['all', 'paid', 'unpaid'] as Filter[]).map(f => (
              <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Unpaid'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filtered.length === 0
          ? <Text style={styles.empty}>No {filter !== 'all' ? filter : ''} invoices</Text>
          : (
            <View style={styles.invoiceList}>
              {filtered.map((item, idx) => {
                const color = STATUS_COLORS[item.status];
                return (
                  <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => setViewing(item)}>
                    {idx > 0 && <View style={styles.rowDivider} />}
                    <View style={styles.row}>
                      <View style={[styles.avatar, { backgroundColor: color + '22' }]}>
                        <Text style={[styles.avatarText, { color }]}>{initials(item.customer_name)}</Text>
                      </View>
                      <View style={styles.rowMid}>
                        <Text style={styles.rowName} numberOfLines={1}>{item.customer_name}</Text>
                        <Text style={styles.rowMeta}>{item.invoice_number} · {dayjs(item.issued_date).format('MMM D')}</Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.rowAmount}>${invoiceTotal(item).toFixed(2)}</Text>
                        <Text style={[styles.rowStatus, { color }]}>{STATUS_LABELS[item.status]}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        }
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => { setEditing(null); setFormVisible(true); }} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <InvoiceFormModal
        visible={formVisible}
        invoice={editing}
        currentUserId={userId}
        onClose={() => setFormVisible(false)}
        onSaved={load}
      />
      <InvoiceDetailModal
        invoice={viewing}
        onClose={() => setViewing(null)}
        onChanged={load}
        onEdit={(inv) => { setViewing(null); setEditing(inv); setFormVisible(true); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { padding: 6 },
  monthLabel: { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },

  hero: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 12 },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#94a3b8', fontSize: 13 },
  heroValue: { color: '#f1f5f9', fontSize: 34, fontWeight: '800', marginTop: 2 },
  heroSub: { color: '#64748b', fontSize: 12, marginTop: 4 },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpi: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, borderLeftWidth: 3 },
  kpiHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  kpiValue: { fontSize: 19, fontWeight: '800' },

  section: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 165, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barStack: { width: 30, justifyContent: 'flex-end' },
  barEmpty: { height: 3, backgroundColor: '#334155', borderRadius: 2 },
  barLabel: { color: '#94a3b8', fontSize: 11, marginTop: 6 },
  barValue: { color: '#64748b', fontSize: 9, marginBottom: 3 },

  invoicesHead: { marginBottom: 10 },
  invoicesTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  filters: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  invoiceList: { backgroundColor: '#1e293b', borderRadius: 14, overflow: 'hidden' },
  rowDivider: { height: 1, backgroundColor: '#0f172a', marginLeft: 62 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700' },
  rowMid: { flex: 1, minWidth: 0 },
  rowName: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  rowMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  rowStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  empty: { color: '#475569', textAlign: 'center', paddingVertical: 24 },

  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
});
