import { supabase } from './supabase';
import { Invoice } from '../types';
import { DEMO_MODE, mockInvoices } from './mockData';

export async function fetchInvoices(): Promise<Invoice[]> {
  if (DEMO_MODE) {
    return [...mockInvoices].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Invoice[];
}

export type InvoiceInput = Omit<Invoice, 'id' | 'created_at' | 'sent_at' | 'paid_at'>;

function nextInvoiceNumber(): string {
  const nums = mockInvoices
    .map(i => parseInt(i.invoice_number.replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `INV-${max + 1}`;
}

export function suggestInvoiceNumber(): string {
  return DEMO_MODE ? nextInvoiceNumber() : `INV-${Date.now().toString().slice(-6)}`;
}

export async function saveInvoice(input: InvoiceInput, existingId?: string): Promise<Invoice> {
  if (DEMO_MODE) {
    if (existingId) {
      const idx = mockInvoices.findIndex(i => i.id === existingId);
      const updated: Invoice = { ...mockInvoices[idx], ...input };
      mockInvoices[idx] = updated;
      return updated;
    }
    const created: Invoice = {
      ...input,
      id: 'inv' + Date.now(),
      created_at: new Date().toISOString(),
    };
    mockInvoices.unshift(created);
    return created;
  }

  if (existingId) {
    const { data, error } = await supabase.from('invoices').update(input).eq('id', existingId).select().single();
    if (error) throw error;
    return data as Invoice;
  }
  const { data, error } = await supabase.from('invoices').insert(input).select().single();
  if (error) throw error;
  return data as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  if (DEMO_MODE) {
    const idx = mockInvoices.findIndex(i => i.id === id);
    if (idx >= 0) mockInvoices.splice(idx, 1);
    return;
  }
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

export async function markInvoicePaid(id: string): Promise<void> {
  const paid_at = new Date().toISOString();
  if (DEMO_MODE) {
    const inv = mockInvoices.find(i => i.id === id);
    if (inv) { inv.status = 'paid'; inv.paid_at = paid_at; }
    return;
  }
  const { error } = await supabase.from('invoices').update({ status: 'paid', paid_at }).eq('id', id);
  if (error) throw error;
}

/**
 * Sends the invoice by email. In demo mode this just simulates success and
 * flips the status to "sent". In production it calls the `send-invoice`
 * Supabase Edge Function, which renders a PDF and emails it via Resend.
 */
export async function sendInvoice(id: string): Promise<void> {
  const sent_at = new Date().toISOString();

  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, 900)); // simulate network
    const inv = mockInvoices.find(i => i.id === id);
    if (inv && inv.status === 'draft') { inv.status = 'sent'; inv.sent_at = sent_at; }
    return;
  }

  const { error } = await supabase.functions.invoke('send-invoice', { body: { invoice_id: id } });
  if (error) throw error;
}
