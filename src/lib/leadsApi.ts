import { supabase } from './supabase';
import { Lead, LeadStatus } from '../types';
import { DEMO_MODE } from './mockData';

const mockLeads: Lead[] = [
  {
    id: 'l1', phone: '555-0345', name: 'Greg Tanaka', email: 'greg.t@example.com',
    address: '77 Birch Way, Springfield', source: 'Google', status: 'new',
    notes: 'Wants a quote on a tankless water heater.',
    created_by: 'd1', created_at: new Date(Date.now() - 1 * 864e5).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'l2', phone: '555-0678', name: 'Priya Singh',
    address: '12 Aspen Crt, Springfield', source: 'Referral', status: 'contacted',
    notes: 'Leaky main shutoff, called back — scheduling this week.',
    created_by: 'd1', created_at: new Date(Date.now() - 3 * 864e5).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'l3', phone: '555-0911', name: 'Marcus Webb', source: 'Repeat customer', status: 'quoted',
    notes: 'Sent quote for bathroom re-pipe, $2,400.',
    created_by: 'd1', created_at: new Date(Date.now() - 5 * 864e5).toISOString(), updated_at: new Date().toISOString(),
  },
];

export async function fetchLeads(): Promise<Lead[]> {
  if (DEMO_MODE) return [...mockLeads].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Lead[];
}

export type LeadInput = Omit<Lead, 'id' | 'created_at' | 'updated_at'>;

export async function saveLead(input: LeadInput, existingId?: string): Promise<Lead> {
  if (DEMO_MODE) {
    if (existingId) {
      const idx = mockLeads.findIndex(l => l.id === existingId);
      const updated: Lead = { ...mockLeads[idx], ...input, updated_at: new Date().toISOString() };
      mockLeads[idx] = updated;
      return updated;
    }
    const created: Lead = { ...input, id: 'l' + Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mockLeads.unshift(created);
    return created;
  }
  if (existingId) {
    const { data, error } = await supabase.from('leads').update(input).eq('id', existingId).select().single();
    if (error) throw error;
    return data as Lead;
  }
  const { data, error } = await supabase.from('leads').insert(input).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  if (DEMO_MODE) {
    const l = mockLeads.find(x => x.id === id);
    if (l) { l.status = status; l.updated_at = new Date().toISOString(); }
    return;
  }
  const { error } = await supabase.from('leads').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  if (DEMO_MODE) {
    const idx = mockLeads.findIndex(l => l.id === id);
    if (idx >= 0) mockLeads.splice(idx, 1);
    return;
  }
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}
