import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  Invoice, InvoiceStatus, lineItemAmount, invoiceSubtotal, invoiceTax, invoiceTotal,
} from '../types';
import { sendInvoice, markInvoicePaid, deleteInvoice } from '../lib/invoicesApi';

const STATUS_COLORS: Record<InvoiceStatus, string> = { draft: '#6b7280', sent: '#ef4444', paid: '#10b981' };
const STATUS_LABELS: Record<InvoiceStatus, string> = { draft: 'Draft', sent: 'Sent', paid: 'Paid' };

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (inv: Invoice) => void;
}

export default function InvoiceDetailModal({ invoice, onClose, onChanged, onEdit }: Props) {
  const [busy, setBusy] = useState(false);
  if (!invoice) return null;
  const color = STATUS_COLORS[invoice.status];

  async function handleSend() {
    if (!invoice!.customer_email) {
      Alert.alert('No email', 'Add a customer email before sending.');
      return;
    }
    setBusy(true);
    try {
      await sendInvoice(invoice!.id);
      onChanged();
      Alert.alert('Invoice sent', `Emailed to ${invoice!.customer_email}.`);
      onClose();
    } catch (e: any) {
      Alert.alert('Send failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkPaid() {
    setBusy(true);
    try {
      await markInvoicePaid(invoice!.id);
      onChanged();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete invoice?', `Remove ${invoice!.invoice_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteInvoice(invoice!.id); onChanged(); onClose(); } },
    ]);
  }

  return (
    <Modal visible={!!invoice} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.invNum}>{invoice.invoice_number}</Text>
              <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[invoice.status]}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Bill to */}
            <Text style={styles.sectionLabel}>BILL TO</Text>
            <Text style={styles.customerName}>{invoice.customer_name}</Text>
            {!!invoice.customer_email && <Text style={styles.muted}>{invoice.customer_email}</Text>}
            {!!invoice.customer_address && <Text style={styles.muted}>{invoice.customer_address}</Text>}

            <View style={styles.datesRow}>
              <View><Text style={styles.dateLabel}>Issued</Text><Text style={styles.dateVal}>{dayjs(invoice.issued_date).format('MMM D, YYYY')}</Text></View>
              <View><Text style={styles.dateLabel}>Due</Text><Text style={styles.dateVal}>{dayjs(invoice.due_date).format('MMM D, YYYY')}</Text></View>
            </View>

            {/* Line items */}
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ITEMS</Text>
            {invoice.line_items.map(item => (
              <View key={item.id} style={styles.lineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineDesc}>{item.description}</Text>
                  <Text style={styles.lineMeta}>{item.quantity} × ${item.unit_price.toFixed(2)}</Text>
                </View>
                <Text style={styles.lineAmount}>${lineItemAmount(item).toFixed(2)}</Text>
              </View>
            ))}

            {/* Totals */}
            <View style={styles.totals}>
              <Row label="Subtotal" value={invoiceSubtotal(invoice)} />
              <Row label={`Tax (${invoice.tax_rate}%)`} value={invoiceTax(invoice)} />
              <View style={styles.totalDivider} />
              <Row label="Total" value={invoiceTotal(invoice)} bold />
            </View>

            {!!invoice.notes && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>NOTES</Text>
                <Text style={styles.muted}>{invoice.notes}</Text>
              </>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {invoice.status === 'draft' && (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSend} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="mail-outline" size={18} color="#fff" /><Text style={styles.primaryText}>Send by Email</Text></>
                  )}
                </TouchableOpacity>
              )}
              {invoice.status === 'sent' && (
                <TouchableOpacity style={styles.successBtn} onPress={handleMarkPaid} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.primaryText}>Mark as Paid</Text></>
                  )}
                </TouchableOpacity>
              )}
              {invoice.status === 'paid' && (
                <View style={styles.paidBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.paidText}>Paid {invoice.paid_at ? dayjs(invoice.paid_at).format('MMM D, YYYY') : ''}</Text>
                </View>
              )}

              <View style={styles.secondaryRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => onEdit(invoice)}>
                  <Ionicons name="create-outline" size={16} color="#60a5fa" />
                  <Text style={styles.secondaryText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={[styles.secondaryText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.totalBold]}>${value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  invNum: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sectionLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  customerName: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
  muted: { color: '#94a3b8', fontSize: 13, marginTop: 1 },
  datesRow: { flexDirection: 'row', gap: 40, marginTop: 12 },
  dateLabel: { color: '#64748b', fontSize: 11 },
  dateVal: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginTop: 2 },
  lineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  lineDesc: { color: '#e2e8f0', fontSize: 14 },
  lineMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  lineAmount: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  totals: { marginTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { color: '#94a3b8', fontSize: 14 },
  totalValue: { color: '#e2e8f0', fontSize: 14 },
  totalDivider: { height: 1, backgroundColor: '#334155', marginVertical: 6 },
  totalBold: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  actions: { marginTop: 20, gap: 10 },
  primaryBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  successBtn: { backgroundColor: '#10b981', borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  paidBanner: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#10b98115', borderRadius: 12 },
  paidText: { color: '#10b981', fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, borderRadius: 10, backgroundColor: '#1e293b' },
  secondaryText: { color: '#60a5fa', fontSize: 14, fontWeight: '600' },
});
