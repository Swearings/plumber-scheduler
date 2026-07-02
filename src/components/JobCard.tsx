import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job, JobStatus } from '../types';

const STATUS_ORDER: JobStatus[] = ['scheduled', 'en_route', 'in_progress', 'completed', 'cancelled'];

const STATUS_COLORS: Record<JobStatus, string> = {
  scheduled: '#3b82f6',
  en_route: '#f59e0b',
  in_progress: '#10b981',
  completed: '#6b7280',
  cancelled: '#ef4444',
};

const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: 'Scheduled',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface Props {
  job: Job;
  onPress?: () => void;
  onStatusChange?: (status: JobStatus) => void;
}

export default function JobCard({ job, onPress, onStatusChange }: Props) {
  const statusColor = STATUS_COLORS[job.status];
  const [menuOpen, setMenuOpen] = useState(false);

  function callCustomer() {
    Linking.openURL(`tel:${job.phone}`);
  }

  function openMaps() {
    const encoded = encodeURIComponent(job.address);
    Linking.openURL(`https://maps.google.com/?q=${encoded}`);
  }

  const startTime = new Date(job.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const durationHrs = Math.floor(job.estimated_duration / 60);
  const durationMins = job.estimated_duration % 60;
  const durationLabel = durationHrs > 0
    ? `${durationHrs}h ${durationMins > 0 ? durationMins + 'm' : ''}`.trim()
    : `${durationMins}m`;

  return (
    <TouchableOpacity style={[styles.card, menuOpen && styles.cardElevated]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.customerName}>{job.customer_name}</Text>
          {onStatusChange ? (
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}
              onPress={() => setMenuOpen(o => !o)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[job.status]}</Text>
              <Ionicons name={menuOpen ? 'chevron-up' : 'chevron-down'} size={11} color={statusColor} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[job.status]}</Text>
            </View>
          )}
        </View>

        <View style={styles.row}>
          <Ionicons name="construct-outline" size={13} color="#94a3b8" />
          <Text style={styles.meta}>{job.job_type}</Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons name="time-outline" size={13} color="#94a3b8" />
          <Text style={styles.meta}>{startTime}{job.estimated_duration > 0 ? ` · ${durationLabel}` : ''}</Text>
        </View>

        {(!!job.address || !!job.phone) && (
          <View style={styles.footer}>
            {!!job.address && (
              <TouchableOpacity style={styles.footerBtn} onPress={openMaps}>
                <Ionicons name="location-outline" size={14} color="#60a5fa" />
                <Text style={styles.footerBtnText} numberOfLines={1}>{job.address}</Text>
              </TouchableOpacity>
            )}
            {!!job.phone && (
              <TouchableOpacity style={styles.callBtn} onPress={callCustomer}>
                <Ionicons name="call-outline" size={14} color="#10b981" />
                <Text style={styles.callText}>{job.phone}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Status menu rendered last so it paints above the footer/rows */}
        {onStatusChange && menuOpen && (
          <View style={styles.statusMenu}>
            {STATUS_ORDER.map(s => (
              <TouchableOpacity
                key={s}
                style={styles.statusItem}
                onPress={() => { setMenuOpen(false); if (s !== job.status) onStatusChange(s); }}
              >
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[s] }]} />
                <Text style={[styles.statusItemText, s === job.status && { color: STATUS_COLORS[s], fontWeight: '700' }]}>
                  {STATUS_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 10,
    flexDirection: 'row', position: 'relative', zIndex: 1,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  cardElevated: { zIndex: 100, elevation: 100 },
  statusBar: { width: 4, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  content: { flex: 1, padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  customerName: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusMenu: { position: 'absolute', top: 38, right: 0, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingVertical: 4, minWidth: 140, zIndex: 999, elevation: 20 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusItemText: { color: '#cbd5e1', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  meta: { fontSize: 13, color: '#94a3b8' },
  dot: { color: '#475569', fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  footerBtnText: { fontSize: 12, color: '#60a5fa', flex: 1 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  callText: { fontSize: 12, color: '#10b981' },
});
