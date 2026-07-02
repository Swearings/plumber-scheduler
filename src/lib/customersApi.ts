import { supabase } from './supabase';
import { Customer, CustomerStatus } from '../types';
import { DEMO_MODE } from './mockData';

const mockCustomers: Customer[] = [
  {
    id: 'c1', phone: '555-0345', name: 'Greg Tanaka', email: 'greg.t@example.com',
    address: '77 Birch Way, Springfield', source: 'Google', status: 'new',
    notes: 'Wants a quote on a tankless water heater.',
    created_by: 'd1', created_at: new Date(Date.now() - 1 * 864e5).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'c2', phone: '555-0678', name: 'Priya Singh',
    address: '12 Aspen Crt, Springfield', source: 'Referral', status: 'contacted',
    notes: 'Leaky main shutoff, called back — scheduling this week.',
    created_by: 'd1', created_at: new Date(Date.now() - 3 * 864e5).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'c3', phone: '555-0142', name: 'Janet Cooper', address: '142 Oak Street, Springfield',
    source: 'Repeat customer', status: 'active', notes: 'Long-time customer.',
    created_by: 'd1', created_at: new Date(Date.now() - 20 * 864e5).toISOString(), updated_at: new Date().toISOString(),
  },
];

export async function fetchCustomers(): Promise<Customer[]> {
  if (DEMO_MODE) return [...mockCustomers].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const { data, error } = await supabase.from('customers').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  if (DEMO_MODE) return mockCustomers.find(c => c.id === id);
  const { data } = await supabase.from('customers').select('*').eq('id', id).single();
  return data as Customer | undefined;
}

export type CustomerInput = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;

export async function saveCustomer(input: CustomerInput, existingId?: string): Promise<Customer> {
  if (DEMO_MODE) {
    if (existingId) {
      const idx = mockCustomers.findIndex(c => c.id === existingId);
      const updated: Customer = { ...mockCustomers[idx], ...input, updated_at: new Date().toISOString() };
      mockCustomers[idx] = updated;
      return updated;
    }
    const created: Customer = { ...input, id: 'c' + Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mockCustomers.unshift(created);
    return created;
  }
  // owner_id is set by the DB default (auth.uid()); created_by isn't a column.
  const { created_by, ...row } = input;
  if (existingId) {
    const { data, error } = await supabase.from('customers').update(row).eq('id', existingId).select().single();
    if (error) throw error;
    return data as Customer;
  }
  const { data, error } = await supabase.from('customers').insert(row).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomerStatus(id: string, status: CustomerStatus): Promise<void> {
  if (DEMO_MODE) {
    const c = mockCustomers.find(x => x.id === id);
    if (c) { c.status = status; c.updated_at = new Date().toISOString(); }
    return;
  }
  const { error } = await supabase.from('customers').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: string): Promise<void> {
  if (DEMO_MODE) {
    const idx = mockCustomers.findIndex(c => c.id === id);
    if (idx >= 0) mockCustomers.splice(idx, 1);
    return;
  }
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}
