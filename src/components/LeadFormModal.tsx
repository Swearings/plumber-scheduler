import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lead, LeadStatus, LEAD_STATUSES, LEAD_STATUS_LABELS } from '../types';
import { saveLead, deleteLead, LeadInput } from '../lib/leadsApi';

interface Props {
  visible: boolean;
  lead?: Lead | null;
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function LeadFormModal({ visible, lead, currentUserId, onClose, onSaved }: Props) {
  const isEdit = !!lead;
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');

  useEffect(() => {
    if (!visible) return;
    if (lead) {
      setPhone(lead.phone); setName(lead.name || ''); setEmail(lead.email || '');
      setAddress(lead.address || ''); setSource(lead.source || ''); setNotes(lead.notes || '');
      setStatus(lead.status);
    } else {
      setPhone(''); setName(''); setEmail(''); setAddress(''); setSource(''); setNotes(''); setStatus('new');
    }
  }, [visible, lead]);

  async function handleSave() {
    if (!phone.trim()) {
      Alert.alert('Phone required', 'A phone number is the only required field.');
      return;
    }
    const input: LeadInput = {
      phone: phone.trim(),
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      created_by: currentUserId,
    };
    setSaving(true);
    try {
      await saveLead(input, lead?.id);
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!lead) return;
    Alert.alert('Delete lead?', `Remove ${lead.name || lead.phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteLead(lead.id); onSaved(); onClose(); } },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{isEdit ? 'Edit Lead' : 'New Lead'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.label}>Phone<Text style={styles.req}> *</Text></Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="555-0100" placeholderTextColor="#475569" keyboardType="phone-pad" />

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Optional" placeholderTextColor="#475569" />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Optional" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" />

            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Optional" placeholderTextColor="#475569" />

            <Text style={styles.label}>Source</Text>
            <TextInput style={styles.input} value={source} onChangeText={setSource} placeholder="Google, referral, repeat…" placeholderTextColor="#475569" />

            <Text style={styles.label}>Status</Text>
            <View style={styles.chips}>
              {LEAD_STATUSES.map(s => {
                const on = status === s;
                return (
                  <TouchableOpacity key={s} style={[styles.chip, on && styles.chipOn]} onPress={() => setStatus(s)}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{LEAD_STATUS_LABELS[s]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline placeholder="What do they need?" placeholderTextColor="#475569" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Add Lead'}</Text>}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={styles.deleteText}>Delete Lead</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  req: { color: '#ef4444' },
  input: { backgroundColor: '#1e293b', color: '#f1f5f9', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  notes: { height: 70, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  chipOn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 22 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 14, marginTop: 8 },
  deleteText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
