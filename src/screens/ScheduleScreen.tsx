import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { fetchJobs } from '../lib/jobsApi';
import { Job } from '../types';
import JobCard from '../components/JobCard';
import JobFormModal from '../components/JobFormModal';
import InvoiceFormModal, { InvoicePrefill } from '../components/InvoiceFormModal';

interface Props {
  userId: string;
  isDispatcher: boolean;
}

export default function ScheduleScreen({ userId, isDispatcher }: Props) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false); // false = week, true = month
  const [anchor, setAnchor] = useState(dayjs());     // drives which week/month is shown
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf('day'));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [invoicePrefill, setInvoicePrefill] = useState<InvoicePrefill | null>(null);

  // Fetch a generous range (whole month around the anchor) so both views have data.
  async function load() {
    setLoading(true);
    const rangeStart = anchor.startOf('month').subtract(7, 'day').toISOString();
    const rangeEnd = anchor.endOf('month').add(7, 'day').toISOString();
    const data = await fetchJobs({ userId, isDispatcher, rangeStart, rangeEnd });
    setJobs(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [anchor]);

  function jobsOn(day: dayjs.Dayjs) {
    return jobs.filter(j => dayjs(j.scheduled_start).isSame(day, 'day'));
  }

  function goPrev() {
    setAnchor(a => expanded ? a.subtract(1, 'month') : a.subtract(1, 'week'));
  }
  function goNext() {
    setAnchor(a => expanded ? a.add(1, 'month') : a.add(1, 'week'));
  }

  function selectDay(day: dayjs.Dayjs) {
    setSelectedDate(day.startOf('day'));
    setAnchor(day);
  }

  function goToday() {
    const now = dayjs();
    setSelectedDate(now.startOf('day'));
    setAnchor(now);
  }

  function startInvoiceForJob(job: Job) {
    setModalVisible(false);
    setInvoicePrefill({
      customer_name: job.customer_name,
      customer_address: job.address,
      job_id: job.id,
      job_type: job.job_type,
    });
    setInvoiceVisible(true);
  }

  // ----- Week strip -----
  const weekStart = anchor.startOf('week');
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));

  // ----- Month grid -----
  const monthStart = anchor.startOf('month');
  const startOffset = monthStart.day();
  const daysInMonth = monthStart.daysInMonth();
  const monthCells = Array.from({ length: startOffset + daysInMonth }, (_, i) =>
    i < startOffset ? null : monthStart.add(i - startOffset, 'day')
  );

  const dayJobs = jobsOn(selectedDate);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: range label + prev/next */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>
          {expanded ? anchor.format('MMMM YYYY') : `${weekStart.format('MMM D')} – ${weekStart.add(6, 'day').format('MMM D')}`}
        </Text>
        <TouchableOpacity onPress={goNext} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Jump-to-today shortcut, shown only when not already on today */}
      {!selectedDate.isSame(dayjs(), 'day') && (
        <TouchableOpacity style={styles.todayBtn} onPress={goToday} activeOpacity={0.8}>
          <Ionicons name="today-outline" size={14} color="#60a5fa" />
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
      )}

      {/* Weekday header (month only) */}
      {expanded && (
        <View style={styles.weekdays}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <Text key={d} style={styles.weekday}>{d}</Text>
          ))}
        </View>
      )}

      {/* Week strip */}
      {!expanded && (
        <View style={styles.weekRow}>
          {weekDays.map((day, i) => {
            const isSel = day.isSame(selectedDate, 'day');
            const isToday = day.isSame(dayjs(), 'day');
            const has = jobsOn(day).length > 0;
            return (
              <TouchableOpacity key={i} style={[styles.weekCell, isToday && !isSel && styles.cellToday, isSel && styles.cellSelected]} onPress={() => selectDay(day)}>
                <Text style={[styles.weekDayName, isSel && styles.textSelected]}>{day.format('dd')}</Text>
                <Text style={[styles.weekDayNum, isSel && styles.textSelected, isToday && !isSel && styles.today]}>{day.format('D')}</Text>
                {has && <View style={[styles.dot, isSel && styles.dotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Month grid */}
      {expanded && (
        <View style={styles.grid}>
          {monthCells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={styles.monthCell} />;
            const isSel = day.isSame(selectedDate, 'day');
            const isToday = day.isSame(dayjs(), 'day');
            const count = jobsOn(day).length;
            return (
              <TouchableOpacity key={i} style={[styles.monthCell, isToday && !isSel && styles.cellToday, isSel && styles.cellSelected]} onPress={() => selectDay(day)}>
                <Text style={[styles.monthNum, isToday && !isSel && styles.today, isSel && styles.textSelected]}>{day.date()}</Text>
                {count > 0 && (
                  <View style={[styles.countBadge, isSel && styles.countBadgeSel]}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Expand / collapse handle */}
      <TouchableOpacity style={styles.expandHandle} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Selected day's jobs */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.dayHeadingRow}>
            <Text style={styles.dayHeading}>{selectedDate.format('dddd, MMM D')}</Text>
            {selectedDate.isSame(dayjs(), 'day') && (
              <View style={styles.todayPill}><Text style={styles.todayPillText}>TODAY</Text></View>
            )}
          </View>
          {dayJobs.length === 0
            ? <Text style={styles.empty}>No jobs this day</Text>
            : dayJobs.map(job => (
                <JobCard key={job.id} job={job} onPress={() => { setEditingJob(job); setModalVisible(true); }} />
              ))
          }
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { setEditingJob(null); setModalVisible(true); }} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <JobFormModal
        visible={modalVisible}
        job={editingJob}
        defaultDate={selectedDate.hour(9).minute(0).toISOString()}
        currentUserId={userId}
        onClose={() => setModalVisible(false)}
        onSaved={load}
        onCreateInvoice={startInvoiceForJob}
      />

      <InvoiceFormModal
        visible={invoiceVisible}
        prefill={invoicePrefill}
        currentUserId={userId}
        onClose={() => setInvoiceVisible(false)}
        onSaved={() => setInvoiceVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { paddingVertical: 40, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  navBtn: { padding: 8 },
  navText: { color: '#60a5fa', fontSize: 24, fontWeight: '300' },
  headerLabel: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },

  weekdays: { flexDirection: 'row', paddingHorizontal: 8, marginTop: 8 },
  weekday: { flex: 1, textAlign: 'center', color: '#475569', fontSize: 12, paddingBottom: 4 },

  weekRow: { flexDirection: 'row', paddingHorizontal: 8, marginTop: 6 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, marginHorizontal: 2 },
  weekDayName: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  weekDayNum: { fontSize: 17, fontWeight: '700', color: '#f1f5f9' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  monthCell: { width: '14.28%', aspectRatio: 1.1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  monthNum: { color: '#f1f5f9', fontSize: 14, fontWeight: '500' },
  countBadge: { backgroundColor: '#3b82f6', borderRadius: 4, paddingHorizontal: 4, marginTop: 1 },
  countBadgeSel: { backgroundColor: '#1d4ed8' },
  countText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  cellSelected: { backgroundColor: '#3b82f6' },
  cellToday: { borderWidth: 1.5, borderColor: '#3b82f6' },
  textSelected: { color: '#fff' },
  today: { color: '#3b82f6' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#3b82f6', marginTop: 3 },
  dotSelected: { backgroundColor: '#fff' },

  expandHandle: { alignItems: 'center', paddingVertical: 6 },
  divider: { height: 1, backgroundColor: '#1e293b' },

  todayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginTop: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  todayBtnText: { color: '#60a5fa', fontSize: 12, fontWeight: '600' },

  list: { padding: 16, paddingBottom: 96 },
  dayHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dayHeading: { fontSize: 15, fontWeight: '600', color: '#94a3b8' },
  todayPill: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  todayPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  empty: { color: '#475569', textAlign: 'center', marginTop: 30 },

  fab: {
    position: 'absolute', right: 20, bottom: 80, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
});
