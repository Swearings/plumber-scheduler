export type UserRole = 'dispatcher' | 'technician';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  color?: string; // for technician view color coding
}

export type JobStatus = 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  customer_name: string;
  address: string;
  phone: string;
  job_type: string;
  estimated_duration: number; // in minutes
  assigned_to: string; // technician user id
  technician?: User;
  status: JobStatus;
  scheduled_start: string; // ISO datetime
  notes?: string;
  created_by: string;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number; // dollars
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  job_id?: string;          // optional link to a job
  line_items: LineItem[];
  tax_rate: number;         // percent, e.g. 8.5
  notes?: string;
  status: InvoiceStatus;
  issued_date: string;      // YYYY-MM-DD
  due_date: string;         // YYYY-MM-DD
  sent_at?: string;         // ISO datetime
  paid_at?: string;         // ISO datetime
  created_by: string;
  created_at: string;
}

// Helpers for totals
export function lineItemAmount(item: LineItem): number {
  return item.quantity * item.unit_price;
}

export function invoiceSubtotal(inv: Invoice): number {
  return inv.line_items.reduce((sum, i) => sum + lineItemAmount(i), 0);
}

export function invoiceTax(inv: Invoice): number {
  return invoiceSubtotal(inv) * (inv.tax_rate / 100);
}

export function invoiceTotal(inv: Invoice): number {
  return invoiceSubtotal(inv) + invoiceTax(inv);
}
