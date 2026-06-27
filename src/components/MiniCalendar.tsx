import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

interface Props {
  value: string;            // YYYY-MM-DD
  onSelect: (date: string) => void;
  minDate?: string;         // YYYY-MM-DD — earlier days are disabled
}

export default function MiniCalendar({ value, onSelect, minDate }: Props) {
  const selected = dayjs(value);
  const [viewMonth, setViewMonth] = useState(selected.isValid() ? selected.startOf('month') : dayjs().startOf('month'));

  const startOffset = viewMonth.day();
  const daysInMonth = viewMonth.daysInMonth();
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) =>
    i < startOffset ? null : viewMonth.add(i - startOffset, 'day')
  );

  const min = minDate ? dayjs(minDate).startOf('day') : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setViewMonth(m => m.subtract(1, 'month'))} style={styles.nav}>
          <Ionicons name="chevron-back" size={18} color="#60a5fa" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{viewMonth.format('MMMM YYYY')}</Text>
        <TouchableOpacity onPress={() => setViewMonth(m => m.add(1, 'month'))} style={styles.nav}>
          <Ionicons name="chevron-forward" size={18} color="#60a5fa" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdays}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <Text key={d} style={styles.weekday}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={styles.cell} />;
          const isSel = day.isSame(selected, 'day');
          const isToday = day.isSame(dayjs(), 'day');
          const disabled = min ? day.isBefore(min, 'day') : false;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.cell, isSel && styles.cellSelected]}
              disabled={disabled}
              onPress={() => onSelect(day.format('YYYY-MM-DD'))}
            >
              <Text style={[
                styles.cellText,
                isToday && !isSel && styles.today,
                isSel && styles.cellTextSelected,
                disabled && styles.disabled,
              ]}>
                {day.date()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#1e293b', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  nav: { padding: 4 },
  monthLabel: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  weekdays: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: '#475569', fontSize: 11, paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellSelected: { backgroundColor: '#3b82f6' },
  cellText: { color: '#f1f5f9', fontSize: 13, fontWeight: '500' },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  today: { color: '#3b82f6' },
  disabled: { color: '#334155' },
});
