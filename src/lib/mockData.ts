import dayjs from 'dayjs';
import { Job, User, Invoice } from '../types';

export const DEMO_MODE = true; // set to false once Supabase is configured

export const mockTechnicians: User[] = [
  { id: 't1', email: 'mike@plumberpro.com', full_name: 'Mike Reyes', role: 'technician', color: '#3b82f6' },
  { id: 't2', email: 'sara@plumberpro.com', full_name: 'Sara Lin', role: 'technician', color: '#10b981' },
  { id: 't3', email: 'dan@plumberpro.com', full_name: 'Dan Patel', role: 'technician', color: '#f59e0b' },
];

export const mockDispatcher: User = {
  id: 'd1', email: 'dispatch@plumberpro.com', full_name: 'Alex Dispatcher', role: 'dispatcher', color: '#8b5cf6',
};

function at(dayOffset: number, hour: number, minute = 0) {
  return dayjs().add(dayOffset, 'day').hour(hour).minute(minute).second(0).toISOString();
}

export const mockJobs: Job[] = [
  {
    id: 'j1', customer_name: 'Janet Cooper', address: '142 Oak Street, Springfield', phone: '555-0142',
    job_type: 'Leak Repair', estimated_duration: 90, assigned_to: 't1', technician: mockTechnicians[0],
    status: 'scheduled', scheduled_start: at(0, 8, 30), created_by: 'd1', created_at: at(-1, 9),
  },
  {
    id: 'j2', customer_name: 'Robert Hayes', address: '88 Maple Ave, Springfield', phone: '555-0188',
    job_type: 'Water Heater Install', estimated_duration: 180, assigned_to: 't1', technician: mockTechnicians[0],
    status: 'en_route', scheduled_start: at(0, 11, 0), created_by: 'd1', created_at: at(-1, 9),
  },
  {
    id: 'j3', customer_name: 'Maria Gonzalez', address: '23 Pine Road, Springfield', phone: '555-0223',
    job_type: 'Drain Cleaning', estimated_duration: 60, assigned_to: 't2', technician: mockTechnicians[1],
    status: 'in_progress', scheduled_start: at(0, 9, 0), created_by: 'd1', created_at: at(-1, 9),
  },
  {
    id: 'j4', customer_name: 'Tom Becker', address: '405 Elm Court, Springfield', phone: '555-0405',
    job_type: 'Toilet Replacement', estimated_duration: 120, assigned_to: 't2', technician: mockTechnicians[1],
    status: 'scheduled', scheduled_start: at(0, 13, 30), created_by: 'd1', created_at: at(-1, 9),
  },
  {
    id: 'j5', customer_name: 'Linda Park', address: '17 Cedar Lane, Springfield', phone: '555-0017',
    job_type: 'Pipe Inspection', estimated_duration: 45, assigned_to: 't3', technician: mockTechnicians[2],
    status: 'completed', scheduled_start: at(0, 8, 0), created_by: 'd1', created_at: at(-1, 9),
  },
  {
    id: 'j6', customer_name: 'George White', address: '290 Birch Blvd, Springfield', phone: '555-0290',
    job_type: 'Faucet Repair', estimated_duration: 60, assigned_to: 't3', technician: mockTechnicians[2],
    status: 'scheduled', scheduled_start: at(1, 10, 0), created_by: 'd1', created_at: at(-1, 9),
  },
  {
    id: 'j7', customer_name: 'Emily Stone', address: '56 Walnut Way, Springfield', phone: '555-0056',
    job_type: 'Sump Pump Install', estimated_duration: 150, assigned_to: 't1', technician: mockTechnicians[0],
    status: 'scheduled', scheduled_start: at(2, 9, 30), created_by: 'd1', created_at: at(-1, 9),
  },
  {
    id: 'j8', customer_name: 'Frank Miller', address: '311 Spruce St, Springfield', phone: '555-0311',
    job_type: 'Garbage Disposal', estimated_duration: 75, assigned_to: 't2', technician: mockTechnicians[1],
    status: 'scheduled', scheduled_start: at(3, 14, 0), created_by: 'd1', created_at: at(-1, 9),
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv1', invoice_number: 'INV-1001',
    customer_name: 'Janet Cooper', customer_email: 'janet.cooper@example.com', customer_address: '142 Oak Street, Springfield',
    job_id: 'j1',
    line_items: [
      { id: 'li1', description: 'Leak repair labor (1.5 hrs)', quantity: 1.5, unit_price: 95 },
      { id: 'li2', description: 'Replacement valve', quantity: 1, unit_price: 38 },
    ],
    tax_rate: 8.5, status: 'paid',
    issued_date: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
    due_date: dayjs().subtract(-4, 'day').format('YYYY-MM-DD'),
    sent_at: dayjs().subtract(10, 'day').toISOString(),
    paid_at: dayjs().subtract(6, 'day').toISOString(),
    created_by: 'd1', created_at: dayjs().subtract(10, 'day').toISOString(),
  },
  {
    id: 'inv2', invoice_number: 'INV-1002',
    customer_name: 'Robert Hayes', customer_email: 'rhayes@example.com', customer_address: '88 Maple Ave, Springfield',
    job_id: 'j2',
    line_items: [
      { id: 'li3', description: 'Water heater installation', quantity: 1, unit_price: 650 },
      { id: 'li4', description: 'Labor (3 hrs)', quantity: 3, unit_price: 95 },
    ],
    tax_rate: 8.5, status: 'sent',
    issued_date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
    due_date: dayjs().add(11, 'day').format('YYYY-MM-DD'),
    sent_at: dayjs().subtract(3, 'day').toISOString(),
    created_by: 'd1', created_at: dayjs().subtract(3, 'day').toISOString(),
  },
  {
    id: 'inv3', invoice_number: 'INV-1003',
    customer_name: 'Maria Gonzalez', customer_email: 'maria.g@example.com', customer_address: '23 Pine Road, Springfield',
    line_items: [
      { id: 'li5', description: 'Drain cleaning', quantity: 1, unit_price: 120 },
    ],
    tax_rate: 8.5, status: 'draft',
    issued_date: dayjs().format('YYYY-MM-DD'),
    due_date: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    created_by: 'd1', created_at: dayjs().toISOString(),
  },
];

// Toggle this to preview the app as a technician instead of dispatcher
export const demoUser: User = mockDispatcher;
