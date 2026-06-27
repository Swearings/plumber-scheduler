// Supabase Edge Function: send-invoice
// Renders an invoice as an HTML email (with totals) and sends it via Resend.
//
// Setup (once you have Supabase + Resend):
//   1. supabase functions deploy send-invoice
//   2. supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="PlumberPro <invoices@yourdomain.com>"
//   3. The app calls it via supabase.functions.invoke('send-invoice', { body: { invoice_id } })
//
// To also attach a real PDF: render the HTML to PDF (e.g. with an external
// service or a Deno PDF lib) and add it to the Resend `attachments` array.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface LineItem { description: string; quantity: number; unit_price: number; }

const money = (n: number) => `$${n.toFixed(2)}`;

function buildHtml(inv: any) {
  const subtotal = inv.line_items.reduce((s: number, i: LineItem) => s + i.quantity * i.unit_price, 0);
  const tax = subtotal * (inv.tax_rate / 100);
  const total = subtotal + tax;

  const rows = inv.line_items.map((i: LineItem) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${i.description}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${i.quantity} × ${money(i.unit_price)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(i.quantity * i.unit_price)}</td>
    </tr>`).join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
    <h2 style="margin:0 0 4px">Invoice ${inv.invoice_number}</h2>
    <p style="color:#64748b;margin:0 0 16px">Issued ${inv.issued_date} · Due ${inv.due_date}</p>
    <p><strong>Bill to:</strong><br>${inv.customer_name}<br>${inv.customer_address || ''}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <thead>
        <tr style="text-align:left;color:#64748b;font-size:12px">
          <th style="padding-bottom:6px">Item</th><th style="text-align:right">Qty × Price</th><th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:16px;text-align:right">
      <div>Subtotal: ${money(subtotal)}</div>
      <div>Tax (${inv.tax_rate}%): ${money(tax)}</div>
      <div style="font-size:20px;font-weight:bold;margin-top:6px">Total: ${money(total)}</div>
    </div>
    ${inv.notes ? `<p style="margin-top:20px;color:#475569">${inv.notes}</p>` : ''}
    <p style="margin-top:24px;color:#94a3b8;font-size:12px">Thank you for your business.</p>
  </div>`;
}

Deno.serve(async (req) => {
  try {
    const { invoice_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: inv, error } = await supabase.from('invoices').select('*').eq('id', invoice_id).single();
    if (error || !inv) throw new Error('Invoice not found');
    if (!inv.customer_email) throw new Error('Invoice has no customer email');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL'),
        to: inv.customer_email,
        subject: `Invoice ${inv.invoice_number} from PlumberPro`,
        html: buildHtml(inv),
      }),
    });

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);

    await supabase.from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoice_id);

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
});
