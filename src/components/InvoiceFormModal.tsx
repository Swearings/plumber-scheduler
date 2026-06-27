import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Invoice, LineItem } from '../types';
import { saveInvoice, suggestInvoiceNumber, InvoiceInput } from '../lib/invoicesApi';
import MiniCalendar from './MiniCalendar';

export interface InvoicePrefill {
  customer_name: string;
  customer_address: string;
  job_id?: string;
  job_type?: string; // becomes the first line item description
}

interface Props {
  visible: boolean;
  invoice?: Invoice | null;
  prefill?: InvoicePrefill | null;
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}

type DraftItem = { id: string; description: string; quantity: string; unit_price: string };

function emptyItem(): DraftItem {
  return { id: 'tmp' + Math.random().toString(36).slice(2), description: '', quantity: '1', unit_price: '' };
}

export default function InvoiceFormModal({ visible, invoice, prefill, currentUserId, onClose, onSaved }: Props) {
  const isEdit = !!invoice;
  const [saving, setSaving] = useState(false);
  const [jobId, setJobId] = useState<string | undefined>(undefined);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [taxRate, setTaxRate] = useState('8.5');
  const [notes, setNotes] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [calendarFor, setCalendarFor] = useState<'issued' | 'due' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCalendarFor(null);
    if (invoice) {
      setInvoiceNumber(invoice.invoice_number);
      setCustomerName(invoice.customer_name);
      setCustomerEmail(invoice.customer_email);
      setCustomerAddress(invoice.customer_address);
      setItems(invoice.line_items.map(li => ({
        id: li.id, description: li.description, quantity: String(li.quantity), unit_price: String(li.unit_price),
      })));
      setTaxRate(String(invoice.tax_rate));
      setNotes(invoice.notes || '');
      setIssuedDate(invoice.issued_date);
      setDueDate(invoice.due_date);
      setJobId(invoice.job_id);
    } else {
      // New invoice — optionally pre-filled from a job on the schedule.
      setInvoiceNumber(suggestInvoiceNumber());
      setCustomerName(prefill?.customer_name || '');
      setCustomerEmail('');
      setCustomerAddress(prefill?.customer_address || '');
      setItems([{ ...emptyItem(), description: prefill?.job_type || '' }]);
      setTaxRate('8.5'); setNotes('');
      setIssuedDate(dayjs().format('YYYY-MM-DD'));
      setDueDate(dayjs().add(14, 'day').format('YYYY-MM-DD'));
      setJobId(prefill?.job_id);
    }
  }, [visible, invoice]);

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }
  function addItem() { setItems(prev => [...prev, emptyItem()]); }
  function removeItem(id: string) { setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev); }

  // Live totals
  const parsedItems = items.map(it => ({
    qty: parseFloat(it.quantity) || 0,
    price: parseFloat(it.unit_price) || 0,
  }));
  const subtotal = parsedItems.reduce((s, it) => s + it.qty * it.price, 0);
  const taxNum = parseFloat(taxRate) || 0;
  const tax = subtotal * (taxNum / 100);
  const total = subtotal + tax;

  async function handleSave() {
    if (!customerName.trim()) { Alert.alert('Missing info', 'Customer name is required.'); return; }
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid customer email, or leave it blank.');
      return;
    }
    const cleanItems: LineItem[] = [];
    for (const it of items) {
      if (!it.description.trim()) continue;
      const quantity = parseFloat(it.quantity);
      const unit_price = parseFloat(it.unit_price);
      if (isNaN(quantity) || quantity <= 0) { Alert.alert('Invalid quantity', `Check the quantity for "${it.description}".`); return; }
      if (isNaN(unit_price) || unit_price < 0) { Alert.alert('Invalid price', `Check the price for "${it.description}".`); return; }
      cleanItems.push({ id: it.id, description: it.description.trim(), quantity, unit_price });
    }
    if (cleanItems.length === 0) { Alert.alert('Add an item', 'Add at least one line item with a description.'); return; }
    if (isNaN(taxNum) || taxNum < 0) { Alert.alert('Invalid tax', 'Tax rate must be 0 or higher.'); return; }
    if (dayjs(dueDate).isBefore(dayjs(issuedDate), 'day')) {
      Alert.alert('Invalid dates', 'Due date cannot be before the issued date.');
      return;
    }

    const input: InvoiceInput = {
      invoice_number: invoiceNumber.trim(),
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_address: customerAddress.trim(),
      job_id: jobId,
      line_items: cleanItems,
      tax_rate: taxNum,
      notes: notes.trim() || undefined,
      status: invoice?.status || 'draft',
      issued_date: issuedDate,
      due_date: dueDate,
      created_by: currentUserId,
    };

    setSaving(true);
    try {
      await saveInvoice(input, invoice?.id);
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Label text="Invoice #" />
            <TextInput style={styles.input} value={invoiceNumber} onChangeText={setInvoiceNumber} placeholderTextColor="#475569" />

            <Label text="Customer Name" />
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Jane Doe" placeholderTextColor="#475569" />

            <Label text="Customer Email" />
            <TextInput style={styles.input} value={customerEmail} onChangeText={setCustomerEmail} placeholder="jane@example.com" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" />

            <Label text="Billing Address" />
            <TextInput style={styles.input} value={customerAddress} onChangeText={setCustomerAddress} placeholder="123 Main St" placeholderTextColor="#475569" />

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <Label text="Issued" />
                <TouchableOpacity style={styles.dateField} onPress={() => setCalendarFor(c => c === 'issued' ? null : 'issued')}>
                  <Text style={styles.dateText}>{dayjs(issuedDate).format('MMM D, YYYY')}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#60a5fa" />
                </TouchableOpacity>
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Label text="Due" />
                <TouchableOpacity style={styles.dateField} onPress={() => setCalendarFor(c => c === 'due' ? null : 'due')}>
                  <Text style={styles.dateText}>{dayjs(dueDate).format('MMM D, YYYY')}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#60a5fa" />
                </TouchableOpacity>
              </View>
            </View>

            {calendarFor === 'issued' && (
              <MiniCalendar value={issuedDate} onSelect={(d) => { setIssuedDate(d); setCalendarFor(null); }} />
            )}
            {calendarFor === 'due' && (
              <MiniCalendar value={dueDate} minDate={issuedDate} onSelect={(d) => { setDueDate(d); setCalendarFor(null); }} />
            )}

            {/* Line items */}
            <View style={styles.itemsHeader}>
              <Label text="Line Items" />
              <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
                <Ionicons name="add" size={16} color="#60a5fa" />
                <Text style={styles.addItemText}>Add item</Text>
              </TouchableOpacity>
            </View>

            {items.map((it) => (
              <View key={it.id} style={styles.itemCard}>
                <TextInput
                  style={styles.itemDesc}
                  value={it.description}
                  onChangeText={(t) => updateItem(it.id, { description: t })}
                  placeholder="Description (e.g. Labor 2 hrs)"
                  placeholderTextColor="#475569"
                />
                <View style={styles.itemNumsRow}>
                  <View style={styles.itemNumBox}>
                    <Text style={styles.itemNumLabel}>Qty</Text>
                    <TextInput style={styles.itemNumInput} value={it.quantity} onChangeText={(t) => updateItem(it.id, { quantity: t })} keyboardType="decimal-pad" placeholderTextColor="#475569" />
                  </View>
                  <View style={styles.itemNumBox}>
                    <Text style={styles.itemNumLabel}>Unit $</Text>
                    <TextInput style={styles.itemNumInput} value={it.unit_price} onChangeText={(t) => updateItem(it.id, { unit_price: t })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#475569" />
                  </View>
                  <View style={styles.itemAmountBox}>
                    <Text style={styles.itemNumLabel}>Amount</Text>
                    <Text style={styles.itemAmount}>${((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)).toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(it.id)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <Label text="Tax Rate (%)" />
            <TextInput style={styles.input} value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" placeholderTextColor="#475569" />

            {/* Totals preview */}
            <View style={styles.totals}>
              <TotalRow label="Subtotal" value={subtotal} />
              <TotalRow label={`Tax (${taxNum}%)`} value={tax} />
              <View style={styles.totalDivider} />
              <TotalRow label="Total" value={total} bold />
            </View>

            <Label text="Notes (optional)" />
            <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} multiline placeholder="Payment terms, thank-you note…" placeholderTextColor="#475569" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Create Invoice'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function TotalRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.totalBold]}>${value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '94%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#1e293b', color: '#f1f5f9', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  notesInput: { height: 64, textAlignVertical: 'top' },
  rowSplit: { flexDirection: 'row' },
  dateField: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { color: '#f1f5f9', fontSize: 14 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addItemText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
  itemCard: { backgroundColor: '#1e293b', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  itemDesc: { color: '#f1f5f9', fontSize: 14, paddingVertical: 4 },
  itemNumsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
  itemNumBox: { width: 64 },
  itemAmountBox: { flex: 1 },
  itemNumLabel: { color: '#64748b', fontSize: 10, marginBottom: 2 },
  itemNumInput: { backgroundColor: '#0f172a', color: '#f1f5f9', borderRadius: 8, padding: 8, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  itemAmount: { color: '#f1f5f9', fontSize: 15, fontWeight: '700', paddingVertical: 8 },
  removeBtn: { padding: 8 },
  totals: { marginTop: 14, backgroundColor: '#1e293b', borderRadius: 10, padding: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { color: '#94a3b8', fontSize: 14 },
  totalValue: { color: '#e2e8f0', fontSize: 14 },
  totalDivider: { height: 1, backgroundColor: '#334155', marginVertical: 6 },
  totalBold: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
