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
    const invoiceNumber = await generateInvoiceNumber(c); // note await
    
    // Insert invoice
    const { results: invoiceResults } = await c.env.DB.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, subtotal, discount_amount, total_amount, balance_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      invoiceNumber,
      invoiceData.customer_id,
      invoiceData.invoice_date,
      invoiceData.due_date || null,
      invoiceData.subtotal,
      invoiceData.discount_amount || 0,
      invoiceData.total_amount,
      invoiceData.total_amount, // Initial balance equals total
      'pending',
      invoiceData.notes || null
    ).all();

    const invoice = invoiceResults[0];

    // Insert invoice items
    if (invoiceData.items && invoiceData.items.length > 0) {
      for (const item of invoiceData.items) {
        await c.env.DB.prepare(`
          INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, line_total, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          invoice.id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.line_total,
          item.description || null
        ).run();
      }
    }

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
    const invoice = await c.req.json();
    const { results } = await c.env.DB.prepare(`
      UPDATE invoices 
      SET customer_id = ?, invoice_date = ?, due_date = ?, subtotal = ?, discount_amount = ?, total_amount = ?, balance_amount = ?, status = ?, notes = ?
      WHERE id = ?
      RETURNING *
    `).bind(
      invoice.customer_id,
      invoice.invoice_date,
      invoice.due_date || null,
      invoice.subtotal,
      invoice.discount_amount || 0,
      invoice.total_amount,
      invoice.balance_amount ?? invoice.total_amount - (invoice.paid_amount ?? 0),
      invoice.status || 'pending',
      invoice.notes || null,
      id
    ).all();

    if (results.length === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Update invoice items if provided
    if (Array.isArray(invoice.items)) {
      await c.env.DB.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(id).run();
      for (const item of invoice.items) {
        await c.env.DB.prepare(`
          INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, line_total, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.line_total,
          item.description || null
        ).run();
      }
    }

    return c.json(results[0]);
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
        <title>Cotton Bags Billing System</title>
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
                        Cotton Bags Billing System
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
    // Fetch invoice header and items for print view
    const { results: invoiceResults } = await c.env.DB.prepare(`
      SELECT i.*, c.name as customer_name, c.business_name, c.address, c.city, c.state, c.pincode, c.phone, c.email, c.gst_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).bind(id).all();

    if (invoiceResults.length === 0) {
      return c.html('<h2>Invoice not found</h2>', 404);
    }

    const invoice = invoiceResults[0];

    const { results: itemResults } = await c.env.DB.prepare(`
      SELECT ii.*, p.name as product_name, p.description as product_description
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id
    `).bind(id).all();
    // Fetch invoice, customer, and items as before...
    // (see previous answer for SQL queries)

    // Assume invoice, itemResults are fetched as before
    // Add your company details here
    const company = {
      name: "Sai Connect",
      address: "No.3, 3rd Street, Sundaram Colony, West Tambaram, Chennai 600045",
      phone: "+91-9791119969",
      email: "info@cottonbags.com",
      gst: "",
      logo: "/static/logo.png"
    };

    let itemsHtml = itemResults.map(item => `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.description || ""}</td>
        <td>${item.quantity}</td>
        <td>₹${item.unit_price.toFixed(2)}</td>
        <td>₹${item.line_total.toFixed(2)}</td>
      </tr>
    `).join('');

    const itemsHtmlFixed = itemResults.map((item: any) => `
      <tr>
        <td>${item.product_name || ''}</td>
        <td>${item.description || item.product_description || ''}</td>
        <td>${item.quantity}</td>
        <td>&#8377;${Number(item.unit_price).toFixed(2)}</td>
        <td>&#8377;${Number(item.line_total).toFixed(2)}</td>
      </tr>
    `).join('');

    const embed = c.req.query('embed');
    const isEmbed = embed === '1' || embed === 'true';

    return c.html(`
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice #${invoice.invoice_number}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: Arial, sans-serif; margin: 12mm; }
          .header { display: flex; align-items: center; }
          .logo { width: 80px; margin-right: 20px; }
          .company-details { font-size: 1.1em; }
          .invoice-title { font-size: 2em; margin-top: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; table-layout: fixed; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background: #eee; }
          th:nth-child(1){width:28%}
          th:nth-child(2){width:42%}
          th:nth-child(3){width:10%}
          th:nth-child(4), th:nth-child(5){width:10%}
          td{word-wrap:break-word}
          .totals { text-align: right; font-size: 1.1em; }
          .no-print { margin-top: 16px; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr, td, th { page-break-inside: avoid; }
          @media print { .no-print { display: none; } body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${company.logo}" class="logo" alt="Logo"/>
          <div class="company-details">
            <strong>${company.name}</strong><br/>
            ${company.address}<br/>
            Phone: ${company.phone}<br/>
            Email: ${company.email}<br/>
          </div>
        </div>
        <div class="invoice-title">Invoice #${invoice.invoice_number}</div>
        <p><strong>Date:</strong> ${invoice.invoice_date}</p>
        <p><strong>Customer:</strong> ${invoice.customer_name}${invoice.business_name ? ` (${invoice.business_name})` : ''}<br/>
        ${[invoice.address, invoice.city, invoice.state, invoice.pincode].filter(Boolean).join(', ')}<br/>
        ${invoice.phone ? `Phone: ${invoice.phone} | ` : ''}${invoice.email ? `Email: ${invoice.email}` : ''}<br/>
        ${invoice.gst_number ? `GSTIN: ${invoice.gst_number}` : ''}</p>
        <table>
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
            ${itemsHtmlFixed}
          </tbody>
        </table>
        <div class="totals">
          <p>Subtotal: &#8377;${Number(invoice.subtotal).toFixed(2)}</p>
          <p>Discount: &#8377;${Number(invoice.discount_amount || 0).toFixed(2)}</p>
          <p><strong>Total: &#8377;${Number(invoice.total_amount).toFixed(2)}</strong></p>
        </div>
        ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
        ${isEmbed ? '' : '<button class="no-print" onclick="window.print()">Print</button>'}
      </body>
      </html>
    `);

    return c.html(`
      <html>
      <head>
        <title>Invoice #${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { display: flex; align-items: center; }
          .logo { width: 80px; margin-right: 20px; }
          .company-details { font-size: 1.1em; }
          .invoice-title { font-size: 2em; margin-top: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background: #eee; }
          .totals { text-align: right; font-size: 1.1em; }
          @media print {
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${company.logo}" class="logo" alt="Logo"/>
          <div class="company-details">
            <strong>${company.name}</strong><br/>
            ${company.address}<br/>
            Phone: ${company.phone}<br/>
            Email: ${company.email}<br/>
          </div>
        </div>
        <div class="invoice-title">Invoice #${invoice.invoice_number}</div>
        <p><strong>Date:</strong> ${invoice.invoice_date}</p>
        <p><strong>Customer:</strong> ${invoice.customer_name} (${invoice.business_name})<br/>
        ${invoice.address}, ${invoice.city}, ${invoice.state}, ${invoice.pincode}<br/>
        Phone: ${invoice.phone} | Email: ${invoice.email}<br/>
        GSTIN: ${invoice.gst_number}</p>
        <table>
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
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <p>Subtotal: ₹${invoice.subtotal.toFixed(2)}</p>
          <p>Discount: ₹${invoice.discount_amount.toFixed(2)}</p>
          <p><strong>Total: ₹${invoice.total_amount.toFixed(2)}</strong></p>
        </div>
        <p><strong>Notes:</strong> ${invoice.notes || ""}</p>
        <button class="no-print" onclick="window.print()">Print</button>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error printing invoice:', error);
    return c.html('<h2>Error generating invoice print</h2>', 500);
  }
});

// Download Invoice PDF
app.get('/download/invoice/:id', async (c) => {
  const id = c.req.param('id');
  try {
    // Fetch invoice and items as before
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
    
    invoice.items = itemResults;

    // Generate PDF using html2pdf
    const html = `
      <div style="font-family: Arial, sans-serif; margin: 40px;">
        <div style="display: flex; align-items: center;">
          <img src="/static/logo.png" style="width: 80px; margin-right: 20px;" />
          <div>
            <strong>Cotton Bags Pvt Ltd</strong><br/>
            123 Market Road, City, State, 123456<br/>
            Phone: +91-9876543210<br/>
            Email: info@cottonbags.com<br/>
            GSTIN: 27ABCDE1234F1Z5
          </div>
        </div>
        <h2 style="text-align: center;">Invoice #${invoice.invoice_number}</h2>
        <p><strong>Date:</strong> ${invoice.invoice_date}</p>
        <p><strong>Customer:</strong> ${invoice.customer_name} (${invoice.business_name})<br/>
        ${invoice.address}, ${invoice.city}, ${invoice.state}, ${invoice.pincode}<br/>
        Phone: ${invoice.phone} | Email: ${invoice.email}<br/>
        GSTIN: ${invoice.gst_number}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px;">Product</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Qty</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Unit Price</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemResults.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.product_name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.description || ""}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">₹${item.unit_price.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">₹${item.line_total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="text-align: right; margin-top: 20px;">
          <p>Subtotal: ₹${invoice.subtotal.toFixed(2)}</p>
          <p>Discount: ₹${invoice.discount_amount.toFixed(2)}</p>
          <p><strong>Total: ₹${invoice.total_amount.toFixed(2)}</strong></p>
        </div>
        <p><strong>Notes:</strong> ${invoice.notes || ""}</p>
      </div>
    `;

    // Convert HTML to PDF
    const pdfBuffer = await c.html2pdf.convert(html);

    // Return PDF as download
    c.res.setHeader('Content-Type', 'application/pdf');
    c.res.setHeader('Content-Disposition', `attachment; filename="invoice_${id}.pdf"`);
    c.res.setHeader('Content-Length', pdfBuffer.length);
    c.res.end(pdfBuffer);

    return;
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    return c.json({ error: 'Failed to download invoice PDF' }, 500);
  }
});

export default app
