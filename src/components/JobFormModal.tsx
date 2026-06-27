import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Job, JobStatus } from '../types';
import { saveJob, deleteJob, JobInput } from '../lib/jobsApi';
import MiniCalendar from './MiniCalendar';

const STATUSES: JobStatus[] = ['scheduled', 'en_route', 'in_progress', 'completed', 'cancelled'];
const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: 'Scheduled', en_route: 'En Route', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
};

interface Props {
  visible: boolean;
  job?: Job | null;        // null/undefined = create mode
  defaultDate?: string;    // ISO for prefilling new jobs
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
  onCreateInvoice?: (job: Job) => void; // shown in edit mode
}

export default function JobFormModal({ visible, job, defaultDate, currentUserId, onClose, onSaved, onCreateInvoice }: Props) {
  const isEdit = !!job;
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [jobType, setJobType] = useState('');
  const [duration, setDuration] = useState('');
  const [status, setStatus] = useState<JobStatus>('scheduled');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState(''); // HH:mm
  const [notes, setNotes] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShowCalendar(false);

    if (job) {
      setCustomerName(job.customer_name);
      setAddress(job.address);
      setPhone(job.phone);
      setJobType(job.job_type);
      setDuration(job.estimated_duration ? String(job.estimated_duration) : '');
      setStatus(job.status);
      setDate(dayjs(job.scheduled_start).format('YYYY-MM-DD'));
      setTime(dayjs(job.scheduled_start).format('HH:mm'));
      setNotes(job.notes || '');
    } else {
      const base = defaultDate ? dayjs(defaultDate) : dayjs();
      setCustomerName(''); setAddress(''); setPhone('');
      setJobType(''); setDuration('');
      setStatus('scheduled'); setDate(base.format('YYYY-MM-DD'));
      setTime('09:00'); setNotes('');
    }
  }, [visible, job]);

  async function handleSave() {
    if (!customerName.trim()) {
      Alert.alert('Missing info', 'A name or title is required.');
      return;
    }
    if (!jobType.trim()) {
      Alert.alert('Missing type', 'Enter a type (e.g. Leak Repair, Meeting).');
      return;
    }
    if (!date) {
      Alert.alert('Pick a date', 'Please choose a date from the calendar.');
      return;
    }

    // Strict time validation: must be HH:mm, 00-23 hours and 00-59 minutes.
    const timeMatch = /^([0-9]{1,2}):([0-9]{2})$/.exec(time.trim());
    if (!timeMatch) {
      Alert.alert('Invalid time', 'Enter the time as HH:mm — for example 09:30 or 14:00.');
      return;
    }
    const hh = parseInt(timeMatch[1], 10);
    const mm = parseInt(timeMatch[2], 10);
    if (hh > 23 || mm > 59) {
      Alert.alert('Invalid time', `${time} isn't a real time. Hours must be 00–23 and minutes 00–59.`);
      return;
    }

    const normalizedTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const scheduled = dayjs(`${date}T${normalizedTime}`);
    if (!scheduled.isValid()) {
      Alert.alert('Invalid date', `That date and time can't be scheduled. Please re-check.`);
      return;
    }

    // Duration is optional. If provided it must be a positive number.
    let durationNum = 0;
    if (duration.trim()) {
      durationNum = parseInt(duration, 10);
      if (isNaN(durationNum) || durationNum <= 0) {
        Alert.alert('Invalid duration', 'Duration must be a positive number of minutes, or left blank.');
        return;
      }
    }

    const input: JobInput = {
      customer_name: customerName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      job_type: jobType.trim(),
      estimated_duration: durationNum,
      assigned_to: currentUserId,
      status,
      scheduled_start: scheduled.toISOString(),
      notes: notes.trim() || undefined,
      created_by: currentUserId,
    };

    setSaving(true);
    try {
      await saveJob(input, job?.id);
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!job) return;
    Alert.alert('Delete job?', `Remove the job for ${job.customer_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteJob(job.id);
          onSaved();
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{isEdit ? 'Edit Job' : 'New Job'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Label text="Name / Title" />
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Jane Doe, or Team Meeting" placeholderTextColor="#475569" />

            <Label text="Type" />
            <TextInput style={styles.input} value={jobType} onChangeText={setJobType} placeholder="Leak Repair, Meeting, etc." placeholderTextColor="#475569" />

            <Label text="Address (optional)" />
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="123 Main St" placeholderTextColor="#475569" />

            <Label text="Phone (optional)" />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="555-0100" placeholderTextColor="#475569" keyboardType="phone-pad" />

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <Label text="Date" />
                <TouchableOpacity style={styles.dateField} onPress={() => setShowCalendar(s => !s)} activeOpacity={0.8}>
                  <Text style={date ? styles.dateText : styles.datePlaceholder}>
                    {date ? dayjs(date).format('ddd, MMM D, YYYY') : 'Select date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#60a5fa" />
                </TouchableOpacity>
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Label text="Time" />
                <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="HH:mm" placeholderTextColor="#475569" />
              </View>
            </View>

            {showCalendar && (
              <MiniCalendar
                value={date}
                onSelect={(d) => { setDate(d); setShowCalendar(false); }}
              />
            )}

            <Label text="Estimated Duration — minutes (optional)" />
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="e.g. 60" placeholderTextColor="#475569" />

            <Label text="Status" />
            <Chips
              options={STATUSES.map(s => STATUS_LABELS[s])}
              values={STATUSES}
              selected={status}
              onSelect={(v) => setStatus(v as JobStatus)}
            />

            <Label text="Notes (optional)" />
            <TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline placeholder="Gate code, special instructions…" placeholderTextColor="#475569" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Create Job'}</Text>}
            </TouchableOpacity>

            {isEdit && onCreateInvoice && (
              <TouchableOpacity style={styles.invoiceBtn} onPress={() => onCreateInvoice(job!)}>
                <Ionicons name="receipt-outline" size={18} color="#60a5fa" />
                <Text style={styles.invoiceText}>Create Invoice</Text>
              </TouchableOpacity>
            )}

            {isEdit && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={styles.deleteText}>Delete Job</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

interface ChipsProps {
  options: string[];
  values?: string[];
  selected: string;
  onSelect: (v: string) => void;
}
function Chips({ options, values, selected, onSelect }: ChipsProps) {
  return (
    <View style={styles.chips}>
      {options.map((opt, i) => {
        const val = values ? values[i] : opt;
        const active = selected === val;
        return (
          <TouchableOpacity key={val} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(val)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#1e293b', color: '#f1f5f9', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  dateField: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { color: '#f1f5f9', fontSize: 14 },
  datePlaceholder: { color: '#475569', fontSize: 14 },
  notes: { height: 70, textAlignVertical: 'top' },
  rowSplit: { flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  invoiceBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6' },
  invoiceText: { color: '#60a5fa', fontSize: 15, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 14, marginTop: 8 },
  deleteText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
