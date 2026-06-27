import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FieldDef } from './types';

interface Props {
  field: FieldDef;
  value: any;
  required: boolean;
  onChange: (key: string, value: any) => void;
}

export default function FieldRenderer({ field, value, required, onChange }: Props) {
  const set = (v: any) => onChange(field.key, v);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {field.label}{required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      {!!field.help && <Text style={styles.help}>{field.help}</Text>}

      {field.type === 'boolean' ? (
        <View style={styles.toggleRow}>
          {['Yes', 'No'].map(opt => {
            const on = (opt === 'Yes') === !!value;
            return (
              <TouchableOpacity key={opt} style={[styles.toggle, on && styles.toggleOn]} onPress={() => set(opt === 'Yes')}>
                <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : field.type === 'select' ? (
        <View style={styles.chips}>
          {field.options?.map(opt => {
            const on = value === opt;
            return (
              <TouchableOpacity key={opt} style={[styles.chip, on && styles.chipOn]} onPress={() => set(opt)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : field.type === 'textarea' ? (
        <TextInput
          style={[styles.input, styles.textarea]} multiline value={value ?? ''}
          onChangeText={set} placeholder={field.placeholder} placeholderTextColor="#475569"
        />
      ) : (
        <TextInput
          style={styles.input}
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={(t) => {
            if (field.type === 'number' || field.type === 'integer' || field.type === 'money') {
              const n = field.type === 'integer' ? parseInt(t, 10) : parseFloat(t);
              set(t === '' ? '' : (isNaN(n) ? '' : n));
            } else set(t);
          }}
          placeholder={field.placeholder}
          placeholderTextColor="#475569"
          keyboardType={
            field.type === 'number' || field.type === 'integer' || field.type === 'money' ? 'decimal-pad'
            : field.type === 'phone' ? 'phone-pad'
            : field.type === 'email' ? 'email-address' : 'default'
          }
          autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  req: { color: '#ef4444' },
  help: { color: '#64748b', fontSize: 12, marginBottom: 6, marginTop: -2 },
  input: { backgroundColor: '#1e293b', color: '#f1f5f9', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  textarea: { height: 70, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggle: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  toggleOn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  toggleText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  toggleTextOn: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  chipOn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextOn: { color: '#fff', fontWeight: '600' },
});
