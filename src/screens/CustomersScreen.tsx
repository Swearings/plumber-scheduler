import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import {
  Customer, CustomerStatus, CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS, CUSTOMER_STATUS_COLORS,
  Job, Invoice, invoiceTotal, STATUS_LABELS as JOB_STATUS_LABELS,
} from '../types';
import { fetchCustomers, updateCustomerStatus, getCustomer } from '../lib/customersApi';
import { fetchJobs } from '../lib/jobsApi';
import { fetchInvoices } from '../lib/invoicesApi';
import { listPermits } from '../permits/permitsApi';
import { Permit } from '../permits/types';
import CustomerFormModal from '../components/CustomerFormModal';
import JobFormModal from '../components/JobFormModal';
import InvoiceFormModal from '../components/InvoiceFormModal';

type Mode = { kind: 'list' } | { kind: 'detail'; id: string };

interface Props { userId: string; }

export default function CustomersScreen({ userId }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CustomerStatus | 'all'>('all');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  async function load() { setCustomers(await fetchCustomers()); }
  useEffect(() => { load().finally(() => setLoading(false)); }, [mode]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function changeStatus(id: string, status: CustomerStatus) {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    setMenuFor(null);
    await updateCustomerStatus(id, status);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  if (mode.kind === 'detail') {
    return <CustomerDetail insetTop={insets.top} id={mode.id} userId={userId} onBack={() => setMode({ kind: 'list' })} />;
  }

  const filtered = filter === 'all' ? customers : customers.filter(c => c.status === filter);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        <Text style={styles.h1}>Customers</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', ...CUSTOMER_STATUSES] as const).map(f => {
            const on = filter === f;
            const label = f === 'all' ? 'All' : CUSTOMER_STATUS_LABELS[f as CustomerStatus];
            return (
              <TouchableOpacity key={f} style={[styles.filterChip, on && styles.filterOn]} onPress={() => setFilter(f as any)}>
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filtered.length === 0
          ? <Text style={styles.empty}>No customers here. Tap + to add one.</Text>
          : filtered.map(c => {
            const color = CUSTOMER_STATUS_COLORS[c.status];
            return (
              <View key={c.id} style={[styles.card, menuFor === c.id && styles.cardElevated]}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setMode({ kind: 'detail', id: c.id })}>
                  <View style={styles.cardTop}>
                    <Text style={styles.name}>{c.name || c.phone}</Text>
                    <View>
                      <TouchableOpacity style={[styles.badge, { backgroundColor: color + '22' }]} onPress={() => setMenuFor(menuFor === c.id ? null : c.id)}>
                        <Text style={[styles.badgeText, { color }]}>{CUSTOMER_STATUS_LABELS[c.status]}</Text>
                        <Ionicons name={menuFor === c.id ? 'chevron-up' : 'chevron-down'} size={11} color={color} />
                      </TouchableOpacity>
                      {menuFor === c.id && (
                        <View style={styles.menu}>
                          {CUSTOMER_STATUSES.map(s => (
                            <TouchableOpacity key={s} style={styles.menuItem} onPress={() => changeStatus(c.id, s)}>
                              <View style={[styles.dot, { backgroundColor: CUSTOMER_STATUS_COLORS[s] }]} />
                              <Text style={[styles.menuText, s === c.status && { color: CUSTOMER_STATUS_COLORS[s], fontWeight: '700' }]}>{CUSTOMER_STATUS_LABELS[s]}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  {!!c.address && <Text style={styles.meta}>{c.address}</Text>}
                  {!!c.notes && <Text style={styles.notes} numberOfLines={2}>{c.notes}</Text>}
                </TouchableOpacity>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                    <Ionicons name="call-outline" size={15} color="#10b981" />
                    <Text style={[styles.actionText, { color: '#10b981' }]}>{c.phone}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.openBtn} onPress={() => setMode({ kind: 'detail', id: c.id })}>
                    <Text style={styles.openText}>Open</Text>
                    <Ionicons name="chevron-forward" size={14} color="#60a5fa" />
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

      <CustomerFormModal visible={formVisible} customer={editing} currentUserId={userId} onClose={() => setFormVisible(false)} onSaved={load} />
    </View>
  );
}

// ============ DETAIL (the hub) ============
function CustomerDetail({ insetTop, id, userId, onBack }: { insetTop: number; id: string; userId: string; onBack: () => void }) {
  const [customer, setCustomer] = useState<Customer | undefined>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [tab, setTab] = useState<'jobs' | 'invoices' | 'permits'>('jobs');
  const [editVisible, setEditVisible] = useState(false);
  const [jobVisible, setJobVisible] = useState(false);
  const [invoiceVisible, setInvoiceVisible] = useState(false);

  async function load() {
    const c = await getCustomer(id);
    setCustomer(c);
    if (!c) return;
    const [allJobs, allInv, allPerm] = await Promise.all([
      fetchJobs({ userId, isDispatcher: true, rangeStart: dayjs().subtract(2, 'year').toISOString(), rangeEnd: dayjs().add(2, 'year').toISOString() }),
      fetchInvoices(),
      listPermits(),
    ]);
    const match = (name?: string, cid?: string) => cid === c.id || (!!c.name && name === c.name) || (name === c.phone);
    setJobs(allJobs.filter(j => match(j.customer_name, j.customer_id)));
    setInvoices(allInv.filter(i => match(i.customer_name, i.customer_id)));
    setPermits(allPerm.filter(p => match(p.answers?.customer_name, p.customer_id)));
  }
  useEffect(() => { load(); }, [id]);

  if (!customer) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;
  const color = CUSTOMER_STATUS_COLORS[customer.status];

  return (
    <View style={[styles.container, { paddingTop: insetTop }]}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="chevron-back" size={24} color="#60a5fa" /></TouchableOpacity>
        <TouchableOpacity onPress={() => setEditVisible(true)}><Ionicons name="create-outline" size={22} color="#60a5fa" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={styles.detailName}>{customer.name || customer.phone}</Text>
        <View style={[styles.badge, { backgroundColor: color + '22', alignSelf: 'flex-start', marginTop: 6 }]}>
          <Text style={[styles.badgeText, { color }]}>{CUSTOMER_STATUS_LABELS[customer.status]}</Text>
        </View>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
            <Ionicons name="call-outline" size={16} color="#10b981" /><Text style={styles.contactText}>{customer.phone}</Text>
          </TouchableOpacity>
          {!!customer.email && (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
              <Ionicons name="mail-outline" size={16} color="#60a5fa" /><Text style={[styles.contactText, { color: '#60a5fa' }]}>Email</Text>
            </TouchableOpacity>
          )}
        </View>
        {!!customer.address && <Text style={styles.detailMeta}>{customer.address}</Text>}
        {!!customer.notes && <Text style={styles.detailNotes}>{customer.notes}</Text>}

        {/* cross-create */}
        <View style={styles.createRow}>
          <TouchableOpacity style={styles.createBtn} onPress={() => setJobVisible(true)}>
            <Ionicons name="calendar-outline" size={18} color="#fff" /><Text style={styles.createText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={() => setInvoiceVisible(true)}>
            <Ionicons name="receipt-outline" size={18} color="#fff" /><Text style={styles.createText}>Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* tabs */}
        <View style={styles.tabs}>
          {(['jobs', 'invoices', 'permits'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                {t === 'jobs' ? `Jobs (${jobs.length})` : t === 'invoices' ? `Invoices (${invoices.length})` : `Permits (${permits.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'jobs' && (jobs.length === 0 ? <Text style={styles.empty}>No jobs yet.</Text> : jobs.map(j => (
          <View key={j.id} style={styles.item}>
            <Text style={styles.itemTitle}>{j.job_type || 'Job'}</Text>
            <Text style={styles.itemMeta}>{dayjs(j.scheduled_start).format('MMM D, YYYY · h:mm A')} · {JOB_STATUS_LABELS[j.status]}</Text>
          </View>
        )))}
        {tab === 'invoices' && (invoices.length === 0 ? <Text style={styles.empty}>No invoices yet.</Text> : invoices.map(i => (
          <View key={i.id} style={styles.item}>
            <Text style={styles.itemTitle}>{i.invoice_number} · ${invoiceTotal(i).toFixed(2)}</Text>
            <Text style={styles.itemMeta}>Issued {dayjs(i.issued_date).format('MMM D')} · {i.status}</Text>
          </View>
        )))}
        {tab === 'permits' && (permits.length === 0 ? <Text style={styles.empty}>No permits yet.</Text> : permits.map(p => (
          <View key={p.id} style={styles.item}>
            <Text style={styles.itemTitle}>{p.reference} · {p.city}</Text>
            <Text style={styles.itemMeta}>{p.category} · {p.status.replace(/_/g, ' ')}</Text>
          </View>
        )))}
      </ScrollView>

      <CustomerFormModal visible={editVisible} customer={customer} currentUserId={userId} onClose={() => setEditVisible(false)} onSaved={load} />
      <JobFormModal
        visible={jobVisible}
        prefill={{ customer_name: customer.name || customer.phone, phone: customer.phone, address: customer.address, customer_id: customer.id }}
        currentUserId={userId}
        onClose={() => setJobVisible(false)}
        onSaved={() => { setJobVisible(false); load(); }}
      />
      <InvoiceFormModal
        visible={invoiceVisible}
        prefill={{ customer_name: customer.name || customer.phone, customer_address: customer.address || '', customer_email: customer.email, customer_id: customer.id }}
        currentUserId={userId}
        onClose={() => setInvoiceVisible(false)}
        onSaved={() => { setInvoiceVisible(false); load(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  h1: { color: '#f1f5f9', fontSize: 28, fontWeight: '800', marginBottom: 14 },
  empty: { color: '#475569', paddingVertical: 20, textAlign: 'center' },

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
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#0f172a', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  actionText: { fontSize: 14, fontWeight: '600' },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },

  fab: { position: 'absolute', right: 20, bottom: 80, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', elevation: 6 },

  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  detailName: { color: '#f1f5f9', fontSize: 24, fontWeight: '800' },
  contactRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  detailMeta: { color: '#94a3b8', fontSize: 14, marginTop: 10 },
  detailNotes: { color: '#cbd5e1', fontSize: 14, marginTop: 8, lineHeight: 20 },

  createRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  createBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12 },
  createText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  tabs: { flexDirection: 'row', gap: 8, marginTop: 22, marginBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  tabOn: { backgroundColor: '#0f172a', borderColor: '#3b82f6' },
  tabText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  tabTextOn: { color: '#60a5fa' },
  item: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 8 },
  itemTitle: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  itemMeta: { color: '#64748b', fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
});
