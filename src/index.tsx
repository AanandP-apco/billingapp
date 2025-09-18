import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Utility function to generate monthly sequential invoice number: INV-YYYY-MM-XXX
async function generateInvoiceNumber(c: any): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Count existing invoices for current month
  const period = `${year}-${month}`;
  const { results } = await c.env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM invoices
    WHERE strftime('%Y-%m', invoice_date) = ?
  `).bind(period).all();

  const count = Number(results?.[0]?.count ?? 0);
  const seq = String(count + 1).padStart(3, '0');
  return `INV-${year}-${month}-${seq}`;
}

type InvoiceTemplateItem = {
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type InvoiceTemplateOptions = {
  showPrintButton?: boolean;
  isPdf?: boolean;
  includeLogo?: boolean;
};

function formatCurrency(value: number | string | null | undefined): string {
  const numeric = Number(value ?? 0);
  return `&#8377;${numeric.toFixed(2)}`;
}

function numberToWordsIndian(amount: number): string {
  const numeric = Number.isFinite(amount) ? Number(amount) : 0;
  const safeAmount = Math.max(0, numeric);
  const ones = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertWhole = (num: number): string => {
    if (num === 0) {
      return 'Zero';
    }

    const segments = [
      { value: 10000000, label: 'Crore' },
      { value: 100000, label: 'Lakh' },
      { value: 1000, label: 'Thousand' },
      { value: 100, label: 'Hundred' }
    ];

    const parts: string[] = [];
    let remaining = Math.floor(num);

    for (const segment of segments) {
      if (remaining >= segment.value) {
        const count = Math.floor(remaining / segment.value);
        parts.push(`${convertWhole(count)} ${segment.label}`);
        remaining %= segment.value;
      }
    }

    if (remaining > 0) {
      if (parts.length > 0 && remaining < 100) {
        parts.push('and');
      }

      if (remaining < 20) {
        parts.push(ones[remaining]);
      } else {
        const ten = Math.floor(remaining / 10);
        const unit = remaining % 10;
        const tenWord = tens[ten];
        parts.push(unit ? `${tenWord}-${ones[unit]}` : tenWord);
      }
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };

  const [rupeesPart, paisePart] = safeAmount.toFixed(2).split('.');
  const rupees = parseInt(rupeesPart, 10);
  const paise = parseInt(paisePart, 10);

  let result = `Rupees ${convertWhole(rupees)}`;

  if (paise > 0) {
    result += ` and ${convertWhole(paise)} Paise`;
  }

  return `${result} Only`;
}

function buildInvoiceHtml(invoice: any, items: InvoiceTemplateItem[], company: any, options: InvoiceTemplateOptions = {}): string {
  const showPrintButton = options.showPrintButton ?? true;
  const bodyClass = options.isPdf ? 'pdf' : 'screen';
  const addressLine = [invoice.address, invoice.city, invoice.state, invoice.pincode].filter(Boolean).join(', ');
  const contactLine = [
    invoice.phone ? `Phone: ${invoice.phone}` : '',
    invoice.email ? `Email: ${invoice.email}` : ''
  ].filter(Boolean).join(' | ');
  const gstLine = invoice.gst_number ? `GSTIN: ${invoice.gst_number}` : '';
  const customerLines = [addressLine, contactLine, gstLine].filter(Boolean);
  const customerDetailsHtml = customerLines.length ? customerLines.join('<br/>') : '';
  const amountInWords = numberToWordsIndian(Number(invoice.total_amount ?? 0));
  const notesHtml = invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : '';
  const includeLogo = options.includeLogo ?? true;
  const logoHtml = includeLogo && company.logo ? `<img src="${company.logo}" class="logo" alt="Logo"/>` : '';
  const containerMaxWidth = options.isPdf ? '190mm' : '186mm';
  const containerMargin = options.isPdf ? '12mm auto' : '24px auto';
  const containerPadding = options.isPdf ? '10mm 12mm' : '12mm';
  const subtotalValue = Number(invoice.subtotal ?? 0);
  const discountNumeric = Number(invoice.discount_amount ?? 0);
  const discountTypeLabel = invoice.discount_type === 'percent'
    ? `Discount (${Number(invoice.discount_value ?? 0).toFixed(2)}%)`
    : 'Discount';
  const itemRows = items.length
    ? items.map(item => `
            <tr>
              <td>${item.productName || ''}</td>
              <td>${item.description || ''}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.unitPrice)}</td>
              <td>${formatCurrency(item.lineTotal)}</td>
            </tr>
          `).join('')
    : '<tr><td colspan="5" class="no-items">No line items</td></tr>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${invoice.invoice_number}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; margin: 0; color: #111; background: #fff; }
    body.screen { background: #f5f5f5; }
    body.pdf { background: #fff; width: 210mm; min-height: 297mm; margin: 0 auto; }
    .invoice-container { background: #fff; width: 100%; max-width: ${containerMaxWidth}; margin: ${containerMargin}; padding: ${containerPadding}; box-sizing: border-box; }
    body.screen .invoice-container { box-shadow: 0 0 12px rgba(0, 0, 0, 0.08); }
    body.pdf .invoice-container { box-shadow: none; }
    .header { display: flex; align-items: flex-start; gap: 16px; }
    .logo { width: 80px; height: auto; display: block; }
    .company-details { font-size: 1.05em; line-height: 1.4; }
    .company-details strong { font-size: 1.15em; }
    .invoice-title { font-size: 1.8em; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; table-layout: fixed; }
    th, td { border: 1px solid #ccc; padding: 8px; font-size: 0.95em; vertical-align: top; }
    th { background: #f1f1f1; }
    td:nth-child(2) { white-space: pre-wrap; word-break: break-word; }
    th:nth-child(3), td:nth-child(3) { text-align: center; }
    th:nth-child(4), th:nth-child(5), td:nth-child(4), td:nth-child(5) { text-align: right; white-space: nowrap; }
    colgroup col:nth-child(1) { width: 26%; }
    colgroup col:nth-child(2) { width: 38%; }
    colgroup col:nth-child(3) { width: 10%; }
    colgroup col:nth-child(4) { width: 13%; }
    colgroup col:nth-child(5) { width: 13%; }
    .totals { text-align: right; margin-top: 16px; }
    .totals p { margin: 4px 0; }
    .amount-words { margin-top: 12px; font-style: italic; }
    .notes { margin-top: 12px; }
    .print-action { margin-top: 20px; text-align: right; }
    .print-action button { background: #2c7be5; color: #fff; border: none; padding: 10px 18px; border-radius: 4px; font-size: 1em; cursor: pointer; }
    .print-action button:hover { background: #1a5fbe; }
    .no-items { text-align: center; font-style: italic; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr, td, th { page-break-inside: avoid; }
    @media print {
      body { background: #fff; }
      .invoice-container { margin: 0 auto; box-shadow: none; }
      .print-action { display: none; }
    }
  </style>
</head>
<body class="${bodyClass}">
  <div class="invoice-container">
    <div class="header">
      ${logoHtml}
      <div class="company-details">
        <strong>${company.name}</strong><br/>
        ${company.address}<br/>
        ${company.phone ? `Phone: ${company.phone}<br/>` : ''}
        ${company.email ? `Email: ${company.email}<br/>` : ''}
        ${company.gst ? `GSTIN: ${company.gst}<br/>` : ''}
      </div>
    </div>
    <div class="invoice-title">Invoice #${invoice.invoice_number}</div>
    <div><strong>Date:</strong> ${invoice.invoice_date}</div>
    <div class="customer" style="margin-top: 10px;">
      <strong>Customer:</strong> ${invoice.customer_name}${invoice.business_name ? ` (${invoice.business_name})` : ''}
      ${customerDetailsHtml ? `<div>${customerDetailsHtml}</div>` : ''}
    </div>
    <table>
      <colgroup>
        <col />
        <col />
        <col />
        <col />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th>Product</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    <div class="totals">
      <p>Subtotal: ${formatCurrency(subtotalValue)}</p>
      ${discountNumeric > 0 ? `<p>${discountTypeLabel}: -${formatCurrency(discountNumeric)}</p>` : ''}
      <p><strong>Total: ${formatCurrency(invoice.total_amount)}</strong></p>
    </div>
    <div class="amount-words"><strong>Amount in Words:</strong> ${amountInWords}</div>
    ${notesHtml}
    ${showPrintButton ? '<div class="print-action"><button type="button" onclick="window.print()">Print</button></div>' : ''}
  </div>
</body>
</html>`;
}

type DiscountType = 'none' | 'amount' | 'percent';

function calculateDiscount(subtotalInput: number, typeInput?: string, valueInput?: number) {
  const subtotal = Number.isFinite(subtotalInput) ? Number(subtotalInput) : 0;
  const normalizedSubtotal = subtotal > 0 ? subtotal : 0;
  const rawType = (typeInput || '').toLowerCase();
  const discountType: DiscountType = rawType === 'percent' ? 'percent' : rawType === 'amount' ? 'amount' : 'none';
  let discountValue = Number(valueInput ?? 0);
  if (!Number.isFinite(discountValue)) {
    discountValue = 0;
  }
  let discountAmount = 0;
  if (discountType === 'percent') {
    const percent = Math.min(Math.max(discountValue, 0), 100);
    discountValue = percent;
    discountAmount = Number((normalizedSubtotal * percent / 100).toFixed(2));
  } else if (discountType === 'amount') {
    const absolute = Math.min(Math.max(discountValue, 0), normalizedSubtotal);
    discountValue = absolute;
    discountAmount = Number(absolute.toFixed(2));
  } else {
    discountValue = 0;
  }
  const totalAmount = Number((normalizedSubtotal - discountAmount).toFixed(2));
  return {
    subtotal: normalizedSubtotal,
    discountAmount,
    discountType,
    discountValue,
    totalAmount
  };
}

// API Routes for Customers
app.get('/api/customers', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM customers ORDER BY name ASC'
    ).all();
    return c.json(results);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return c.json({ error: 'Failed to fetch customers' }, 500);
  }
});

app.post('/api/customers', async (c) => {
  try {
    const customer = await c.req.json();
    const { results } = await c.env.DB.prepare(`
      INSERT INTO customers (name, business_name, phone, email, address, city, state, pincode, gst_number, credit_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      customer.name,
      customer.business_name || null,
      customer.phone || null,
      customer.email || null,
      customer.address || null,
      customer.city || null,
      customer.state || null,
      customer.pincode || null,
      customer.gst_number || null,
      customer.credit_limit || 0
    ).all();
    
    return c.json(results[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    return c.json({ error: 'Failed to create customer' }, 500);
  }
});

app.get('/api/customers/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM customers WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    return c.json(results[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return c.json({ error: 'Failed to fetch customer' }, 500);
  }
});

app.put('/api/customers/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const customer = await c.req.json();
    const { results } = await c.env.DB.prepare(`
      UPDATE customers 
      SET name = ?, business_name = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, pincode = ?, gst_number = ?, credit_limit = ?
      WHERE id = ?
      RETURNING *
    `).bind(
      customer.name,
      customer.business_name || null,
      customer.phone || null,
      customer.email || null,
      customer.address || null,
      customer.city || null,
      customer.state || null,
      customer.pincode || null,
      customer.gst_number || null,
      customer.credit_limit || 0,
      id
    ).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    return c.json(results[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    return c.json({ error: 'Failed to update customer' }, 500);
  }
});

app.delete('/api/customers/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(id).run();
    return c.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return c.json({ error: 'Failed to delete customer' }, 500);
  }
});

// API Routes for Products
app.get('/api/products', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC'
    ).all();
    return c.json(results);
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

app.post('/api/products', async (c) => {
  try {
    const product = await c.req.json();
    const { results } = await c.env.DB.prepare(`
      INSERT INTO products (name, description, category, size, color, material, unit_price, stock_quantity, minimum_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      product.name,
      product.description || null,
      product.category || 'Cotton Bag',
      product.size || null,
      product.color || null,
      product.material || 'Cotton',
      product.unit_price,
      product.stock_quantity || 0,
      product.minimum_stock || 10
    ).all();
    
    return c.json(results[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    return c.json(results[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

app.put('/api/products/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const product = await c.req.json();
    const { results } = await c.env.DB.prepare(`
      UPDATE products 
      SET name = ?, description = ?, category = ?, size = ?, color = ?, material = ?, unit_price = ?, stock_quantity = ?, minimum_stock = ?
      WHERE id = ?
      RETURNING *
    `).bind(
      product.name,
      product.description || null,
      product.category || 'Cotton Bag',
      product.size || null,
      product.color || null,
      product.material || 'Cotton',
      product.unit_price,
      product.stock_quantity || 0,
      product.minimum_stock || 10,
      id
    ).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    return c.json(results[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

app.delete('/api/products/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    return c.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

// API Routes for Invoices
app.get('/api/invoices', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT i.*, c.name as customer_name, c.business_name 
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.invoice_date DESC
    `).all();
    return c.json(results);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return c.json({ error: 'Failed to fetch invoices' }, 500);
  }
});

app.post('/api/invoices', async (c) => {
  try {
    const invoiceData = await c.req.json();
    const invoiceNumber = await generateInvoiceNumber(c);

    const rawItems = Array.isArray(invoiceData.items) ? invoiceData.items : [];
    const sanitizedItems: any[] = [];
    let subtotal = 0;

    for (const raw of rawItems) {
      const productId = Number(raw?.product_id);
      const quantity = Number(raw?.quantity);
      const unitPrice = Number(raw?.unit_price);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        continue;
      }
      const normalizedUnitPrice = Number(unitPrice.toFixed(2));
      const normalizedQuantity = Number(quantity.toFixed(2));
      const lineTotal = Number((normalizedQuantity * normalizedUnitPrice).toFixed(2));
      subtotal += lineTotal;
      sanitizedItems.push({
        product_id: productId,
        quantity: normalizedQuantity,
        unit_price: normalizedUnitPrice,
        line_total: lineTotal,
        description: raw?.description ? String(raw.description) : null
      });
    }

    if (sanitizedItems.length === 0) {
      return c.json({ error: 'Invoice requires at least one item' }, 400);
    }

    const discountInfo = calculateDiscount(subtotal, invoiceData.discount_type, invoiceData.discount_value);
    const notes = invoiceData.notes ? String(invoiceData.notes) : null;

    const { results: invoiceResults } = await c.env.DB.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, subtotal, discount_amount, discount_type, discount_value, total_amount, balance_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      invoiceNumber,
      Number(invoiceData.customer_id),
      invoiceData.invoice_date,
      invoiceData.due_date || null,
      discountInfo.subtotal,
      discountInfo.discountAmount,
      discountInfo.discountType,
      discountInfo.discountValue,
      discountInfo.totalAmount,
      discountInfo.totalAmount,
      'pending',
      notes
    ).all();

    const invoice = invoiceResults[0];

    for (const item of sanitizedItems) {
      await c.env.DB.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, line_total, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        invoice.id,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.line_total,
        item.description
      ).run();
    }

    invoice.items = sanitizedItems;
    invoice.subtotal = discountInfo.subtotal;
    invoice.discount_amount = discountInfo.discountAmount;
    invoice.discount_type = discountInfo.discountType;
    invoice.discount_value = discountInfo.discountValue;
    invoice.total_amount = discountInfo.totalAmount;
    invoice.balance_amount = discountInfo.totalAmount;

    return c.json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return c.json({ error: 'Failed to create invoice' }, 500);
  }
});

app.get('/api/invoices/:id', async (c) => {
  const id = c.req.param('id');
  try {
    // Get invoice with customer details
    const { results: invoiceResults } = await c.env.DB.prepare(`
      SELECT i.*, c.name as customer_name, c.business_name, c.address, c.city, c.state, c.pincode, c.phone, c.email, c.gst_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).bind(id).all();
    
    if (invoiceResults.length === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }
    
    const invoice = invoiceResults[0];
    
    // Get invoice items with product details
    const { results: itemResults } = await c.env.DB.prepare(`
      SELECT ii.*, p.name as product_name, p.description as product_description
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id
    `).bind(id).all();
    
    invoice.items = itemResults;
    
    return c.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return c.json({ error: 'Failed to fetch invoice' }, 500);
  }
});

// Update invoice (basic fields, not items)
app.put('/api/invoices/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const invoiceData = await c.req.json();

    let subtotal = Number(invoiceData.subtotal ?? 0);
    let sanitizedItems: any[] | null = null;

    if (Array.isArray(invoiceData.items)) {
      sanitizedItems = [];
      subtotal = 0;
      for (const raw of invoiceData.items) {
        const productId = Number(raw?.product_id);
        const quantity = Number(raw?.quantity);
        const unitPrice = Number(raw?.unit_price);
        if (!productId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
          continue;
        }
        const normalizedUnitPrice = Number(unitPrice.toFixed(2));
        const normalizedQuantity = Number(quantity.toFixed(2));
        const lineTotal = Number((normalizedQuantity * normalizedUnitPrice).toFixed(2));
        subtotal += lineTotal;
        sanitizedItems.push({
          product_id: productId,
          quantity: normalizedQuantity,
          unit_price: normalizedUnitPrice,
          line_total: lineTotal,
          description: raw?.description ? String(raw.description) : null
        });
      }
      if (sanitizedItems.length === 0) {
        return c.json({ error: 'Invoice requires at least one item' }, 400);
      }
    }

    const discountInfo = calculateDiscount(subtotal, invoiceData.discount_type, invoiceData.discount_value);
    const notes = invoiceData.notes ? String(invoiceData.notes) : null;
    const balanceFromPayload = Number(invoiceData.balance_amount);
    const paidAmount = Number(invoiceData.paid_amount ?? 0);
    const balanceAmount = Number.isFinite(balanceFromPayload)
      ? Number(balanceFromPayload.toFixed(2))
      : Number((discountInfo.totalAmount - paidAmount).toFixed(2));
    const status = invoiceData.status || (balanceAmount <= 0 ? 'paid' : 'pending');

    const { results } = await c.env.DB.prepare(`
      UPDATE invoices 
      SET customer_id = ?, invoice_date = ?, due_date = ?, subtotal = ?, discount_amount = ?, discount_type = ?, discount_value = ?, total_amount = ?, balance_amount = ?, status = ?, notes = ?
      WHERE id = ?
      RETURNING *
    `).bind(
      Number(invoiceData.customer_id),
      invoiceData.invoice_date,
      invoiceData.due_date || null,
      discountInfo.subtotal,
      discountInfo.discountAmount,
      discountInfo.discountType,
      discountInfo.discountValue,
      discountInfo.totalAmount,
      balanceAmount,
      status,
      notes,
      id
    ).all();

    if (results.length === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    if (Array.isArray(invoiceData.items) && sanitizedItems) {
      await c.env.DB.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(id).run();
      for (const item of sanitizedItems) {
        await c.env.DB.prepare(`
          INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, line_total, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.line_total,
          item.description
        ).run();
      }
    }

    const updatedInvoice = results[0];
    updatedInvoice.subtotal = discountInfo.subtotal;
    updatedInvoice.discount_amount = discountInfo.discountAmount;
    updatedInvoice.discount_type = discountInfo.discountType;
    updatedInvoice.discount_value = discountInfo.discountValue;
    updatedInvoice.total_amount = discountInfo.totalAmount;
    updatedInvoice.balance_amount = balanceAmount;

    return c.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return c.json({ error: 'Failed to update invoice' }, 500);
  }
});

// Record a payment for an invoice and update balances
app.post('/api/invoices/:id/payments', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid payment amount' }, 400);
    }
    const paymentDate = body.payment_date || new Date().toISOString().split('T')[0];
    const method = body.payment_method || 'cash';
    const reference = body.reference_number || null;
    const notes = body.notes || null;

    // Insert payment record
    await c.env.DB.prepare(`
      INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference_number, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, paymentDate, amount, method, reference, notes).run();

    // Update invoice paid/balance/status
    const { results: invRes } = await c.env.DB.prepare('SELECT total_amount, paid_amount FROM invoices WHERE id = ?').bind(id).all();
    if (invRes.length === 0) return c.json({ error: 'Invoice not found' }, 404);
    const paid = Number(invRes[0].paid_amount || 0) + amount;
    const total = Number(invRes[0].total_amount || 0);
    const balance = Math.max(0, total - paid);
    const status = balance <= 0 ? 'paid' : 'partial';

    const { results: upd } = await c.env.DB.prepare(`
      UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ? RETURNING *
    `).bind(paid, balance, status, id).all();

    return c.json({ payment: { amount, payment_date: paymentDate, method, reference, notes }, invoice: upd[0] });
  } catch (error) {
    console.error('Error recording payment:', error);
    return c.json({ error: 'Failed to record payment' }, 500);
  }
});

// Delete invoice and its items
app.delete('/api/invoices/:id', async (c) => {
  const id = c.req.param('id');
  try {
    // Delete invoice items first
    await c.env.DB.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(id).run();
    // Then delete invoice
    await c.env.DB.prepare('DELETE FROM invoices WHERE id = ?').bind(id).run();
    return c.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return c.json({ error: 'Failed to delete invoice' }, 500);
  }
});

// API Route for Dashboard Stats
app.get('/api/dashboard/stats', async (c) => {
  try {
    // Get customer count
    const { results: customerCount } = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM customers'
    ).all();
    
    // Get product count
    const { results: productCount } = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM products WHERE is_active = 1'
    ).all();
    
    // Get invoice stats
    const { results: invoiceStats } = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
        SUM(total_amount) as total_revenue,
        SUM(balance_amount) as outstanding_amount
      FROM invoices
    `).all();
    
    // Get recent invoices
    const { results: recentInvoices } = await c.env.DB.prepare(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `).all();
    
    return c.json({
      customers: customerCount[0]?.count || 0,
      products: productCount[0]?.count || 0,
      invoices: invoiceStats[0] || {},
      recentInvoices: recentInvoices || []
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
  }
});

// Main application route
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sai Connect (Eco Bags) Billing System</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app">
            <nav class="bg-blue-600 text-white p-4 shadow-lg">
                <div class="container mx-auto flex items-center justify-between">
                    <h1 class="text-xl font-bold">
                        <i class="fas fa-shopping-bag mr-2"></i>
                        Sai Connect (Eco Bags) Billing System
                    </h1>
                    <div class="flex space-x-4">
                        <button onclick="showDashboard()" class="nav-btn px-4 py-2 bg-blue-500 rounded hover:bg-blue-400">
                            <i class="fas fa-home mr-1"></i> Dashboard
                        </button>
                        <button onclick="showCustomers()" class="nav-btn px-4 py-2 bg-blue-500 rounded hover:bg-blue-400">
                            <i class="fas fa-users mr-1"></i> Customers
                        </button>
                        <button onclick="showProducts()" class="nav-btn px-4 py-2 bg-blue-500 rounded hover:bg-blue-400">
                            <i class="fas fa-box mr-1"></i> Products
                        </button>
                        <button onclick="showInvoices()" class="nav-btn px-4 py-2 bg-blue-500 rounded hover:bg-blue-400">
                            <i class="fas fa-file-invoice mr-1"></i> Invoices
                        </button>
                    </div>
                </div>
            </nav>

            <main class="container mx-auto p-6">
                <div id="content">
                    <!-- Dynamic content will be loaded here -->
                    <div class="text-center py-20">
                        <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                        <p class="mt-4 text-gray-600">Loading...</p>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// Print Invoice Route
app.get('/print/invoice/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { results: invoiceResults } = await c.env.DB.prepare(`
      SELECT i.*, c.name as customer_name, c.business_name, c.address, c.city, c.state, c.pincode, c.phone, c.email, c.gst_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).bind(id).all();

    if (invoiceResults.length === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const invoice = invoiceResults[0];

    const { results: itemResults } = await c.env.DB.prepare(`
      SELECT ii.*, p.name as product_name, p.description as product_description
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id
    `).bind(id).all();

    const company = {
      name: 'Sai Connect',
      address: 'No.3, 3rd Street, Sundaram Colony, West Tambaram, Chennai 600045',
      phone: '+91-9791119969',
      email: 'a.vinothini@gmail.com',
      gst: '',
      logo: '/static/logo.png'
    };

    const items: InvoiceTemplateItem[] = itemResults.map((item: any) => ({
      productName: item.product_name || '',
      description: item.description || item.product_description || '',
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      lineTotal: Number(item.line_total) || 0
    }));

    const embed = c.req.query('embed');
    const isEmbed = embed === '1' || embed === 'true';

    const html = buildInvoiceHtml(invoice, items, company, { showPrintButton: !isEmbed, isPdf: isEmbed, includeLogo: true });

    return c.html(html);
  } catch (error) {
    console.error('Error printing invoice:', error);
    return c.html('<h2>Error generating invoice print</h2>', 500);
  }
});

// Download Invoice PDF
app.get('/download/invoice/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { results: invoiceResults } = await c.env.DB.prepare(`
      SELECT i.*, c.name as customer_name, c.business_name, c.address, c.city, c.state, c.pincode, c.phone, c.email, c.gst_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).bind(id).all();

    if (invoiceResults.length === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const invoice = invoiceResults[0];

    const { results: itemResults } = await c.env.DB.prepare(`
      SELECT ii.*, p.name as product_name, p.description as product_description
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id
    `).bind(id).all();

    const company = {
      name: 'Sai Connect',
      address: 'No.3, 3rd Street, Sundaram Colony, West Tambaram, Chennai 600045',
      phone: '+91-9791119969',
      email: 'a.vinothini@gmail.com',
      gst: '',
      logo: '/static/logo.png'
    };

    const items: InvoiceTemplateItem[] = itemResults.map((item: any) => ({
      productName: item.product_name || '',
      description: item.description || item.product_description || '',
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      lineTotal: Number(item.line_total) || 0
    }));

    const html = buildInvoiceHtml(invoice, items, company, { showPrintButton: false, isPdf: true, includeLogo: false });

    if (!c.html2pdf || typeof c.html2pdf.convert !== 'function') {
      console.warn('html2pdf binding not available for invoice download');
      return c.json({ error: 'PDF generator unavailable' }, 501);
    }

    const pdfBuffer = await c.html2pdf.convert(html);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('PDF conversion returned empty buffer', { invoiceId: id });
      return c.json({ error: 'Failed to render invoice PDF' }, 500);
    }

    c.res.setHeader('Content-Type', 'application/pdf');
    c.res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoice.invoice_number}.pdf"`);
    c.res.setHeader('Content-Length', pdfBuffer.length);
    c.res.end(pdfBuffer);

    return;
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    return c.json({ error: 'Failed to download invoice PDF' }, 500);
  }
});

export default app
