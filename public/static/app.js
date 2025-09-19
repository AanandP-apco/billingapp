// Cotton Bags Billing System Frontend
class BillingApp {
    constructor() {
        this.currentView = 'dashboard';
        this.customers = [];
        this.products = [];
        this.invoices = [];
        this.quickActionsMounted = false;
        this.quickActionsOpen = false;
        this.mobileNavInitialized = false;
        this.mediaQuery = null;
        this.init();
        this.setupMobileNav();
        this.setupQuickActions();
    }

    setupMobileNav() {
        if (this.mobileNavInitialized) {
            return;
        }
        const toggle = document.getElementById('mobile-nav-toggle');
        const menu = document.getElementById('mobile-nav');
        if (!toggle || !menu) {
            return;
        }
        const closeMenu = () => {
            if (!menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
                toggle.setAttribute('aria-expanded', 'false');
            }
        };
        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const willOpen = menu.classList.contains('hidden');
            menu.classList.toggle('hidden');
            toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });
        menu.querySelectorAll('button').forEach((btn) => {
            btn.addEventListener('click', () => closeMenu());
        });
        document.addEventListener('click', (event) => {
            if (!menu.contains(event.target) && event.target !== toggle && !toggle.contains(event.target)) {
                closeMenu();
            }
        });
        this.mobileNavInitialized = true;
    }

    setupQuickActions() {
        if (this.quickActionsMounted || typeof document === 'undefined') {
            return;
        }
        const container = document.createElement('div');
        container.className = 'quick-action-container';
        container.id = 'quick-action-container';

        const menu = document.createElement('div');
        menu.className = 'quick-action-menu';
        menu.id = 'quick-action-menu';
        menu.setAttribute('aria-hidden', 'true');

        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'quick-action-toggle';
        button.className = 'quick-action-button';
        button.setAttribute('aria-label', 'Quick actions');
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = '<i class="fas fa-plus"></i>';

        const actions = [
            { label: 'Create Invoice', icon: 'fa-file-circle-plus', handler: () => this.showNewInvoice() },
            { label: 'Add Customer', icon: 'fa-user-plus', handler: () => this.showNewCustomer() },
            { label: 'Record Payment', icon: 'fa-money-bill-wave', handler: () => this.openRecordPaymentPrompt() }
        ];

        actions.forEach((action) => {
            const actionButton = document.createElement('button');
            actionButton.type = 'button';
            actionButton.className = 'quick-action-item';
            actionButton.innerHTML = `<i class="fas ${action.icon}"></i><span>${action.label}</span>`;
            actionButton.addEventListener('click', () => {
                this.closeQuickActions();
                action.handler();
            });
            menu.appendChild(actionButton);
        });

        container.appendChild(menu);
        container.appendChild(button);
        document.body.appendChild(container);

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleQuickActions();
        });

        this.boundQuickActionOutside = (event) => {
            if (!container.contains(event.target)) {
                this.closeQuickActions();
            }
        };
        document.addEventListener('click', this.boundQuickActionOutside);

        if (typeof window !== 'undefined' && window.matchMedia) {
            this.mediaQuery = this.mediaQuery || window.matchMedia('(min-width: 768px)');
            const mediaHandler = (event) => {
                if (event.matches) {
                    this.closeQuickActions();
                }
            };
            if (this.mediaQuery.addEventListener) {
                this.mediaQuery.addEventListener('change', mediaHandler);
            } else if (this.mediaQuery.addListener) {
                this.mediaQuery.addListener(mediaHandler);
            }
        }

        this.quickActionMenu = menu;
        this.quickActionToggle = button;
        this.quickActionsContainer = container;
        this.quickActionsMounted = true;
    }

    toggleQuickActions(forceOpen) {
        if (!this.quickActionMenu) {
            return;
        }
        const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !this.quickActionsOpen;
        if (shouldOpen) {
            this.quickActionMenu.classList.add('visible');
            this.quickActionMenu.setAttribute('aria-hidden', 'false');
            if (this.quickActionToggle) {
                this.quickActionToggle.setAttribute('aria-expanded', 'true');
            }
            this.quickActionsOpen = true;
        } else {
            this.quickActionMenu.classList.remove('visible');
            this.quickActionMenu.setAttribute('aria-hidden', 'true');
            if (this.quickActionToggle) {
                this.quickActionToggle.setAttribute('aria-expanded', 'false');
            }
            this.quickActionsOpen = false;
        }
    }

    closeQuickActions() {
        this.toggleQuickActions(false);
    }

    openRecordPaymentPrompt() {
        this.closeQuickActions();
        if (!Array.isArray(this.invoices) || this.invoices.length === 0) {
            alert('No invoices available yet. Create an invoice before recording a payment.');
            return;
        }
        const overlay = document.createElement('div');
        overlay.id = 'quick-action-record-payment';
        overlay.className = 'modal-overlay';
        const optionMarkup = this.invoices.map((invoice) => {
            const labelParts = [];
            if (invoice.invoice_number) {
                labelParts.push(invoice.invoice_number);
            } else {
                labelParts.push(`Invoice #${invoice.id}`);
            }
            if (invoice.customer_name) {
                labelParts.push(invoice.customer_name);
            }
            return `<option value="${invoice.id}">${labelParts.join(' - ')}</option>`;
        }).join('');
        overlay.innerHTML = `
          <div class="modal-content max-w-sm w-full space-y-4">
            <h3 class="text-lg font-semibold">
              <i class="fas fa-money-bill-wave mr-2 text-green-600"></i>
              Record Payment
            </h3>
            <form class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Select Invoice</label>
                <select class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Choose invoice</option>
                  ${optionMarkup}
                </select>
              </div>
              <div class="flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" data-dismiss>Cancel</button>
                <button type="submit" class="btn btn-success">Continue</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(overlay);
        const form = overlay.querySelector('form');
        const select = overlay.querySelector('select');
        const removeOverlay = () => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const invoiceId = parseInt(select.value, 10);
            if (!invoiceId) {
                select.focus();
                return;
            }
            removeOverlay();
            this.showRecordPayment(invoiceId);
        });
        const dismiss = overlay.querySelector('[data-dismiss]');
        if (dismiss) {
            dismiss.addEventListener('click', removeOverlay);
        }
    }

    setActiveView(view) {
        this.currentView = view;
        const buttons = document.querySelectorAll('.nav-btn[data-view]');
        buttons.forEach((btn) => {
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        if (this.mobileNavInitialized) {
            const mobileMenu = document.getElementById('mobile-nav');
            const toggle = document.getElementById('mobile-nav-toggle');
            if (mobileMenu && toggle && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
                toggle.setAttribute('aria-expanded', 'false');
            }
        }
        this.closeQuickActions();
    }
    async editCustomer(id) {
        try {
            const { data: customer } = await axios.get(`/api/customers/${id}`);
            document.getElementById('content').innerHTML = `
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-user-edit mr-2"></i>Edit Customer
                    </h2>
                    <form onsubmit="app.updateCustomer(event, ${id})" class="bg-white p-6 rounded-lg shadow-md">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                                <input type="text" name="name" required value="${customer.name || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                                <input type="text" name="business_name" value="${customer.business_name || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                <input type="tel" name="phone" value="${customer.phone || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input type="email" name="email" value="${customer.email || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                <textarea name="address" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">${customer.address || ''}</textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
                                <input type="text" name="city" value="${customer.city || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">State</label>
                                <input type="text" name="state" value="${customer.state || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                                <input type="text" name="pincode" value="${customer.pincode || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                                <input type="text" name="gst_number" value="${customer.gst_number || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
                                <input type="number" name="credit_limit" step="0.01" value="${customer.credit_limit ?? 0}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                        <div class="flex justify-end mt-6 space-x-3">
                            <button type="button" onclick="app.showCustomers()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update Customer</button>
                        </div>
                    </form>
                </div>
            `;
        } catch (error) {
            console.error('Error loading customer:', error);
            this.showError('Failed to load customer');
        }
    }

    async exportReport(type, format, filters = {}) {
        const validTypes = ['customers', 'invoices', 'sales'];
        const normalizedType = String(type || '').toLowerCase();
        const normalizedFormat = String(format || 'csv').toLowerCase();
        if (!validTypes.includes(normalizedType)) {
            console.warn(`Unsupported report type: ${type}`);
            return;
        }
        if (!['csv', 'pdf'].includes(normalizedFormat)) {
            alert('Only CSV or PDF exports are available.');
            return;
        }

        this.closeQuickActions();

        const params = new URLSearchParams({ format: normalizedFormat });
        Object.entries(filters || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, String(value));
            }
        });

        try {
            const response = await fetch(`/api/reports/${normalizedType}?${params.toString()}`, { method: 'GET' });
            if (!response.ok) {
                const message = normalizedFormat === 'pdf' && response.status === 501
                    ? 'PDF generation is not available on this environment.'
                    : `Failed to download ${normalizedType} report (status ${response.status}).`;
                console.error(message);
                alert(message);
                return;
            }

            const blob = await response.blob();
            const extension = normalizedFormat === 'pdf' ? 'pdf' : 'csv';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${normalizedType}_report_${timestamp}.${extension}`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`Error exporting ${normalizedType} report:`, error);
            alert('Failed to download report. Please try again.');
        }
    }

    openSalesReportModal() {
        this.closeQuickActions();
        const existing = document.getElementById('sales-report-modal');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'sales-report-modal';
        overlay.className = 'modal-overlay';
        const today = new Date();
        const todayIso = today.toISOString().split('T')[0];
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

        overlay.innerHTML = `
          <div class="modal-content max-w-lg w-full space-y-4">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <i class="fas fa-chart-pie text-blue-600"></i>
              Sales Report
            </h3>
            <form class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Start Date</label>
                  <input type="date" name="start" class="form-input" value="${firstOfMonth}">
                </div>
                <div>
                  <label class="form-label">End Date</label>
                  <input type="date" name="end" class="form-input" value="${todayIso}">
                </div>
              </div>
              <div>
                <label class="form-label">Format</label>
                <select name="format" class="form-input">
                  <option value="csv">CSV (spreadsheet)</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <p class="text-xs text-gray-500">Leave the dates blank to export the entire sales history.</p>
              <div class="flex justify-end gap-2">
                <button type="button" class="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50" data-dismiss>Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Download</button>
              </div>
            </form>
          </div>
        `;

        document.body.appendChild(overlay);

        const form = overlay.querySelector('form');
        const removeOverlay = () => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
            document.removeEventListener('keydown', onKeyDown);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                removeOverlay();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                removeOverlay();
            }
        });

        const cancelButton = overlay.querySelector('[data-dismiss]');
        if (cancelButton) {
            cancelButton.addEventListener('click', removeOverlay);
        }

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            const data = new FormData(form);
            const formatValue = (data.get('format') || 'csv').toString();
            const start = (data.get('start') || '').toString();
            const end = (data.get('end') || '').toString();
            const filters = {};
            if (start) {
                filters.start = start;
            }
            if (end) {
                filters.end = end;
            }
            removeOverlay();
            this.exportReport('sales', formatValue, filters);
        });
    }
    async updateCustomer(event, id) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const payload = Object.fromEntries(formData);
        if (payload.credit_limit !== undefined && payload.credit_limit !== '') {
            payload.credit_limit = parseFloat(payload.credit_limit);
        }
        try {
            await axios.put(`/api/customers/${id}`, payload);
            this.showSuccess('Customer updated successfully');
            await this.loadInitialData();
            this.showCustomers();
        } catch (error) {
            console.error('Error updating customer:', error);
            this.showError('Failed to update customer');
        }
    }

    async editProduct(id) {
        try {
            const { data: product } = await axios.get(`/api/products/${id}`);
            document.getElementById('content').innerHTML = `
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-pen-to-square mr-2"></i>Edit Product
                    </h2>
                    <form onsubmit="app.updateProduct(event, ${id})" class="bg-white p-6 rounded-lg shadow-md">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                                <input type="text" name="name" required value="${product.name || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea name="description" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">${product.description || ''}</textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <select name="category" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    ${['Cotton Bag','Jute Bag','Canvas Bag','Other'].map(c => `<option value="${c}" ${product.category===c?'selected':''}>${c}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Size</label>
                                <input type="text" name="size" value="${product.size || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
                                <input type="text" name="color" value="${product.color || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Material</label>
                                <input type="text" name="material" value="${product.material || 'Cotton'}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Unit Price</label>
                                <input type="number" name="unit_price" step="0.01" required value="${product.unit_price}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                                <input type="number" name="stock_quantity" value="${product.stock_quantity || 0}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Minimum Stock</label>
                                <input type="number" name="minimum_stock" value="${product.minimum_stock ?? 10}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                        <div class="flex justify-end mt-6 space-x-3">
                            <button type="button" onclick="app.showProducts()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update Product</button>
                        </div>
                    </form>
                </div>
            `;
        } catch (error) {
            console.error('Error loading product:', error);
            this.showError('Failed to load product');
        }
    }

    async updateProduct(event, id) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const payload = Object.fromEntries(formData);
        // Normalize numeric fields
        if (payload.unit_price !== undefined) payload.unit_price = parseFloat(payload.unit_price);
        if (payload.stock_quantity !== undefined && payload.stock_quantity !== '') payload.stock_quantity = parseInt(payload.stock_quantity);
        if (payload.minimum_stock !== undefined && payload.minimum_stock !== '') payload.minimum_stock = parseInt(payload.minimum_stock);
        try {
            await axios.put(`/api/products/${id}`, payload);
            this.showSuccess('Product updated successfully');
            await this.loadInitialData();
            this.showProducts();
        } catch (error) {
            console.error('Error updating product:', error);
            this.showError('Failed to update product');
        }
    }

    async init() {
        await this.loadInitialData();
        this.showDashboard();
    }

    async loadInitialData() {
        try {
            const [customersRes, productsRes, invoicesRes] = await Promise.all([
                axios.get('/api/customers'),
                axios.get('/api/products'),
                axios.get('/api/invoices')
            ]);
            
            this.customers = customersRes.data;
            this.products = productsRes.data;
            this.invoices = invoicesRes.data;
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load application data');
        }
    }

    showError(message) {
        document.getElementById('content').innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <i class="fas fa-exclamation-triangle text-red-600 text-2xl mb-2"></i>
                <p class="text-red-700">${message}</p>
            </div>
        `;
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle mr-2"></i>
            ${message}
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 3000);
    }

    async showDashboard() {
        this.setActiveView('dashboard');
        try {
            const response = await axios.get('/api/dashboard/stats');
            const stats = response.data || {};
            const invoiceStats = stats.invoices || {};
            const recentInvoices = Array.isArray(stats.recentInvoices) ? stats.recentInvoices : [];
            const outstanding = Number(invoiceStats.outstanding_amount || 0);
            const totalRevenue = Number(invoiceStats.total_revenue || 0);
            const pendingInvoices = Number(invoiceStats.pending_invoices || 0);
            const totalInvoices = Number(invoiceStats.total_invoices || 0);
            const todayLabel = new Date().toLocaleDateString('en-IN');

            document.getElementById('content').innerHTML = `
                <div class="space-y-6">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <i class="fas fa-chart-line"></i>
                            Dashboard
                        </h2>
                        <p class="text-sm text-gray-500">Updated ${todayLabel}</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">Total Customers</p>
                                    <p class="text-2xl font-bold text-blue-600">${stats.customers || 0}</p>
                                </div>
                                <i class="fas fa-users text-blue-500 text-2xl"></i>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">Active Products</p>
                                    <p class="text-2xl font-bold text-green-600">${stats.products || 0}</p>
                                </div>
                                <i class="fas fa-box text-green-500 text-2xl"></i>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">Total Invoices</p>
                                    <p class="text-2xl font-bold text-purple-600">${totalInvoices}</p>
                                    <p class="text-sm text-gray-500 mt-1">${pendingInvoices} pending</p>
                                </div>
                                <i class="fas fa-file-invoice text-purple-500 text-2xl"></i>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">Outstanding Amount</p>
                                    <p class="text-2xl font-bold text-red-600">&#8377;${outstanding.toFixed(2)}</p>
                                    <p class="text-sm text-gray-500 mt-1">Collected &#8377;${totalRevenue.toFixed(2)}</p>
                                </div>
                                <i class="fas fa-rupee-sign text-red-500 text-2xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <h3 class="text-lg font-semibold mb-4">Recent Invoices</h3>
                            <div class="space-y-3">
                                ${recentInvoices.map(invoice => `
                                    <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                                        <div>
                                            <p class="font-medium">${invoice.invoice_number}</p>
                                            <p class="text-sm text-gray-600">${invoice.customer_name || ''}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="font-medium">&#8377;${Number(invoice.total_amount || 0).toFixed(2)}</p>
                                            <span class="text-xs px-2 py-1 rounded ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : invoice.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${invoice.status}</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${recentInvoices.length === 0 ? '<p class="text-gray-500 text-center py-4">No invoices found</p>' : ''}
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button onclick="app.showNewInvoice()" class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center gap-2">
                                    <i class="fas fa-file-circle-plus"></i>
                                    New Invoice
                                </button>
                                <button onclick="app.showNewCustomer()" class="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 flex items-center justify-center gap-2">
                                    <i class="fas fa-user-plus"></i>
                                    New Customer
                                </button>
                                <button onclick="app.showNewProduct()" class="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 flex items-center justify-center gap-2">
                                    <i class="fas fa-box"></i>
                                    New Product
                                </button>
                                <button onclick="app.openRecordPaymentPrompt()" class="w-full bg-amber-500 text-white py-2 px-4 rounded hover:bg-amber-600 flex items-center justify-center gap-2">
                                    <i class="fas fa-money-bill-wave"></i>
                                    Record Payment
                                </button>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <h3 class="text-lg font-semibold mb-4">Reports &amp; Exports</h3>
                            <div class="space-y-4">
                                <div>
                                    <p class="text-sm font-medium text-gray-600 mb-2">Customers</p>
                                    <div class="flex flex-wrap gap-2">
                                        <button onclick="app.exportReport('customers','csv')" class="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-md text-blue-600 hover:bg-blue-50 text-sm font-medium">
                                            <i class="fas fa-file-csv"></i> CSV
                                        </button>
                                        <button onclick="app.exportReport('customers','pdf')" class="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-md text-blue-600 hover:bg-blue-50 text-sm font-medium">
                                            <i class="fas fa-file-pdf"></i> PDF
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-600 mb-2">Invoices</p>
                                    <div class="flex flex-wrap gap-2">
                                        <button onclick="app.exportReport('invoices','csv')" class="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-md text-blue-600 hover:bg-blue-50 text-sm font-medium">
                                            <i class="fas fa-file-csv"></i> CSV
                                        </button>
                                        <button onclick="app.exportReport('invoices','pdf')" class="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-md text-blue-600 hover:bg-blue-50 text-sm font-medium">
                                            <i class="fas fa-file-pdf"></i> PDF
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-600 mb-2">Sales Summary</p>
                                    <div class="flex flex-wrap gap-2">
                                        <button onclick="app.openSalesReportModal()" class="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium w-full sm:w-auto">
                                            <i class="fas fa-chart-pie"></i> Choose Range
                                        </button>
                                    </div>
                                    <p class="text-xs text-gray-500 mt-2">Pick a date range and export the sales performance as CSV or PDF.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard');
        }
    }

    async showCustomers() {
        this.setActiveView('customers');
        try {
            const response = await axios.get('/api/customers');
            this.customers = response.data;
            
            document.getElementById('content').innerHTML = `
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-users mr-2"></i>Customers
                        </h2>
                        <button onclick="app.showNewCustomer()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Add New Customer
                        </button>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-md overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${this.customers.map(customer => `
                                        <tr>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-medium text-gray-900">${customer.name}</div>
                                                <div class="text-sm text-gray-500">${customer.email || ''}</div>
                                            </td>
                                            <td class="px-6 py-4 text-sm text-gray-900">${customer.business_name || '-'}</td>
                                            <td class="px-6 py-4 text-sm text-gray-900">${customer.phone || '-'}</td>
                                            <td class="px-6 py-4 text-sm text-gray-900">${customer.city || '-'}</td>
                                            <td class="px-6 py-4 text-sm font-medium">
                                                <button onclick="app.editCustomer(${customer.id})" class="text-blue-600 hover:text-blue-800 mr-3">
                                                    <i class="fas fa-edit"></i> Edit
                                                </button>
                                                <button onclick="app.deleteCustomer(${customer.id})" class="text-red-600 hover:text-red-800">
                                                    <i class="fas fa-trash"></i> Delete
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                    ${this.customers.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No customers found</td></tr>' : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Failed to load customers');
        }
    }

    async showProducts() {
        this.setActiveView('products');
        try {
            const response = await axios.get('/api/products');
            this.products = response.data;
            
            document.getElementById('content').innerHTML = `
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-box mr-2"></i>Products
                        </h2>
                        <button onclick="app.showNewProduct()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Add New Product
                        </button>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-md overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${this.products.map(product => `
                                        <tr>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-medium text-gray-900">${product.name}</div>
                                                <div class="text-sm text-gray-500">${product.description || ''}</div>
                                            </td>
                                            <td class="px-6 py-4 text-sm text-gray-900">${product.size || '-'}</td>
                                            <td class="px-6 py-4 text-sm text-gray-900">${product.color || '-'}</td>
                                            <td class="px-6 py-4 text-sm text-gray-900">₹${parseFloat(product.unit_price).toFixed(2)}</td>
                                            <td class="px-6 py-4 text-sm">
                                                <span class="px-2 py-1 text-xs rounded ${product.stock_quantity <= product.minimum_stock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                                    ${product.stock_quantity}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 text-sm font-medium">
                                                <button onclick="app.editProduct(${product.id})" class="text-blue-600 hover:text-blue-800 mr-3">
                                                    <i class="fas fa-edit"></i> Edit
                                                </button>
                                                <button onclick="app.deleteProduct(${product.id})" class="text-red-600 hover:text-red-800">
                                                    <i class="fas fa-trash"></i> Delete
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                    ${this.products.length === 0 ? '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No products found</td></tr>' : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Failed to load products');
        }
    }

    async showInvoices() {
        this.setActiveView('invoices');
        try {
            const response = await axios.get('/api/invoices');
            this.invoices = response.data;
            
            document.getElementById('content').innerHTML = `
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-file-invoice mr-2"></i>Invoices
                        </h2>
                        <button onclick="app.showNewInvoice()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Create New Invoice
                        </button>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-md overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${this.invoices.map(invoice => `
                                        <tr>
                                            <td class="px-6 py-4 text-sm font-medium text-gray-900">${invoice.invoice_number}</td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-medium text-gray-900">${invoice.customer_name}</div>
                                                <div class="text-sm text-gray-500">${invoice.business_name || ''}</div>
                                            </td>
                                            <td class="px-6 py-4 text-sm text-gray-900">${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</td>
                                            <td class="px-6 py-4 text-sm text-gray-900">₹${parseFloat(invoice.total_amount).toFixed(2)}</td>
                                            <td class="px-6 py-4">
                                                <span class="px-2 py-1 text-xs rounded ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                                                    ${invoice.status}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 text-sm font-medium">
                                                <button onclick="app.viewInvoice(${invoice.id})" class="text-blue-600 hover:text-blue-800 mr-3">
                                                    <i class="fas fa-eye"></i> View
                                                </button>
                                                <button onclick="app.printInvoice(${invoice.id})" class="text-green-600 hover:text-green-800">
                                                    <i class="fas fa-print"></i> Print
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                    ${this.invoices.length === 0 ? '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No invoices found</td></tr>' : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading invoices:', error);
            this.showError('Failed to load invoices');
        }
    }

    showNewCustomer() {
        this.setActiveView('customers');
        document.getElementById('content').innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-user-plus mr-2"></i>Add New Customer
                </h2>
                
                <form onsubmit="app.saveCustomer(event)" class="bg-white p-6 rounded-lg shadow-md">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                            <input type="text" name="name" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                            <input type="text" name="business_name" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <input type="tel" name="phone" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" name="email" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <textarea name="address" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
                            <input type="text" name="city" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">State</label>
                            <input type="text" name="state" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                            <input type="text" name="pincode" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                            <input type="text" name="gst_number" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    
                    <div class="flex justify-end mt-6 space-x-3">
                        <button type="button" onclick="app.showCustomers()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Save Customer
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    showNewProduct() {
        this.setActiveView('products');
        document.getElementById('content').innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-box mr-2"></i>Add New Product
                </h2>
                
                <form onsubmit="app.saveProduct(event)" class="bg-white p-6 rounded-lg shadow-md">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                            <input type="text" name="name" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea name="description" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select name="category" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="Cotton Bag">Cotton Bag</option>
                                <option value="Jute Bag">Jute Bag</option>
                                <option value="Canvas Bag">Canvas Bag</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Size</label>
                            <input type="text" name="size" placeholder="e.g., Medium (14x16 inch)" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
                            <input type="text" name="color" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Material</label>
                            <input type="text" name="material" value="Cotton" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Unit Price (₹) *</label>
                            <input type="number" name="unit_price" step="0.01" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                            <input type="number" name="stock_quantity" value="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    
                    <div class="flex justify-end mt-6 space-x-3">
                        <button type="button" onclick="app.showProducts()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Save Product
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    
    showNewInvoice() {
        this.setActiveView('invoices');
        document.getElementById('content').innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-plus mr-2"></i>Create New Invoice
                </h2>

                <form onsubmit="app.saveInvoice(event)" class="bg-white p-6 rounded-lg shadow-md">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                            <select name="customer_id" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Customer</option>
                                ${this.customers.map(customer =>
                                    `<option value="${customer.id}">${customer.name}${customer.business_name ? ' - ' + customer.business_name : ''}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Invoice Date *</label>
                            <input type="date" name="invoice_date" value="${new Date().toISOString().split('T')[0]}" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>

                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3">Invoice Items</h3>
                        <div id="invoice-items">
                            <div class="invoice-item grid grid-cols-12 gap-2 mb-2">
                                <div class="col-span-5">
                                    <select name="product_id" required onchange="app.updateProductPrice(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                        <option value="">Select Product</option>
                                        ${this.products.map(product =>
                                            `<option value="${product.id}" data-price="${product.unit_price}">${product.name} - &#8377;${product.unit_price}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="col-span-2">
                                    <input type="number" name="quantity" placeholder="Qty" min="1" required onchange="app.calculateLineTotal(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                </div>
                                <div class="col-span-2">
                                    <input type="number" name="unit_price" placeholder="Price" step="0.01" required onchange="app.calculateLineTotal(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                </div>
                                <div class="col-span-2">
                                    <input type="number" name="line_total" placeholder="Total" readonly class="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50">
                                </div>
                                <div class="col-span-1">
                                    <button type="button" onclick="app.removeInvoiceItem(this)" class="text-red-600 hover:text-red-800">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button type="button" onclick="app.addInvoiceItem()" class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-plus mr-1"></i>Add Item
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                            <select name="discount_type" onchange="app.onDiscountTypeChange(this)" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="none" selected>No Discount</option>
                                <option value="amount">Flat Amount</option>
                                <option value="percent">Percentage</option>
                            </select>
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Discount Value</label>
                            <div class="flex items-center gap-2">
                                <input type="number" name="discount_value" min="0" step="0.01" placeholder="Enter amount" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 opacity-50" disabled oninput="app.calculateInvoiceTotal()">
                                <span data-discount-suffix class="text-gray-600 font-medium">&#8377;</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">Select percentage for a % based discount or flat amount for a fixed reduction.</p>
                        </div>
                    </div>
                    <input type="hidden" name="subtotal" value="0">
                    <input type="hidden" name="discount_amount" value="0">
                    <input type="hidden" name="total_amount" value="0">

                    <div class="border-t pt-4 space-y-1">
                        <div class="flex justify-between items-center text-sm text-gray-700">
                            <span>Subtotal:</span>
                            <span id="invoice-subtotal">&#8377;0.00</span>
                        </div>
                        <div id="invoice-discount-row" class="flex justify-between items-center text-sm text-emerald-700 hidden">
                            <span id="invoice-discount-label">Discount</span>
                            <span id="invoice-discount">-&#8377;0.00</span>
                        </div>
                        <div class="flex justify-between items-center text-lg font-semibold">
                            <span>Total Amount:</span>
                            <span id="invoice-total">&#8377;0.00</span>
                        </div>
                    </div>

                    <div class="flex justify-end mt-6 space-x-3">
                        <button type="button" onclick="app.showInvoices()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Create Invoice
                        </button>
                    </div>
                </form>
            </div>
        `;
        const discountTypeSelect = document.querySelector('select[name="discount_type"]');
        if (discountTypeSelect) {
            this.onDiscountTypeChange(discountTypeSelect);
        } else {
            this.calculateInvoiceTotal();
        }
    }

    updateProductPrice(select) {
        const option = select.options[select.selectedIndex];
        const price = option.dataset.price;
        const row = select.closest('.invoice-item');
        const priceInput = row.querySelector('input[name="unit_price"]');
        if (price) {
            priceInput.value = price;
            this.calculateLineTotal(priceInput);
        }
    }

    calculateLineTotal(input) {
        const row = input.closest('.invoice-item');
        const quantity = parseFloat(row.querySelector('input[name="quantity"]').value) || 0;
        const unitPrice = parseFloat(row.querySelector('input[name="unit_price"]').value) || 0;
        const lineTotal = quantity * unitPrice;
        
        row.querySelector('input[name="line_total"]').value = lineTotal.toFixed(2);
        this.calculateInvoiceTotal();
    }


    computeDiscount(subtotal, type, rawValue) {
        const normalizedSubtotal = Math.max(0, Number(subtotal) || 0);
        const normalizedType = (type || 'none').toString().toLowerCase();
        const discountType = normalizedType === 'percent' ? 'percent' : normalizedType === 'amount' ? 'amount' : 'none';
        let value = Number(rawValue ?? 0);
        if (!Number.isFinite(value)) {
            value = 0;
        }
        let discountAmount = 0;
        if (discountType === 'percent') {
            value = Math.min(Math.max(value, 0), 100);
            discountAmount = Number((normalizedSubtotal * value / 100).toFixed(2));
        } else if (discountType === 'amount') {
            value = Math.min(Math.max(value, 0), normalizedSubtotal);
            discountAmount = Number(value.toFixed(2));
        } else {
            value = 0;
        }
        const total = Number((normalizedSubtotal - discountAmount).toFixed(2));
        return { discountAmount, discountType, discountValue: value, total };
    }

    onDiscountTypeChange(select) {
        const type = select?.value || 'none';
        const valueInput = document.querySelector('input[name="discount_value"]');
        const suffix = document.querySelector('[data-discount-suffix]');
        if (valueInput) {
            valueInput.disabled = type === 'none';
            valueInput.classList.toggle('opacity-50', type === 'none');
            if (type === 'percent') {
                valueInput.placeholder = 'Enter percent';
                valueInput.step = '0.01';
                valueInput.min = '0';
                valueInput.max = '100';
            } else if (type === 'amount') {
                valueInput.placeholder = 'Enter amount';
                valueInput.step = '0.01';
                valueInput.min = '0';
                valueInput.removeAttribute('max');
            } else {
                valueInput.placeholder = 'Enter amount';
                valueInput.value = '';
            }
        }
        if (suffix) {
            suffix.textContent = type === 'percent' ? '%' : '\u20B9';
        }
        this.calculateInvoiceTotal();
    }

    calculateInvoiceTotal() {
        const lineTotals = document.querySelectorAll('input[name="line_total"]');
        let subtotal = 0;
        lineTotals.forEach(input => {
            subtotal += parseFloat(input.value) || 0;
        });
        const typeField = document.querySelector('select[name="discount_type"]');
        const valueField = document.querySelector('input[name="discount_value"]');
        const discountType = typeField ? typeField.value : 'none';
        const rawValue = valueField ? valueField.value : 0;
        const { discountAmount, discountType: normalizedType, discountValue, total } = this.computeDiscount(subtotal, discountType, rawValue);
        if (valueField && normalizedType === 'none') {
            valueField.value = '';
        } else if (valueField) {
            valueField.value = discountValue.toFixed(2);
        }
        const subtotalEl = document.getElementById('invoice-subtotal');
        if (subtotalEl) {
            subtotalEl.textContent = `\u20B9${subtotal.toFixed(2)}`;
        }
        const discountRow = document.getElementById('invoice-discount-row');
        const discountEl = document.getElementById('invoice-discount');
        const discountLabelEl = document.getElementById('invoice-discount-label');
        const showDiscount = normalizedType !== 'none' && discountAmount > 0;
        if (discountRow) {
            discountRow.classList.toggle('hidden', !showDiscount);
        }
        if (discountEl) {
            discountEl.textContent = `-\u20B9${discountAmount.toFixed(2)}`;
        }
        if (discountLabelEl) {
            if (normalizedType === 'percent' && discountAmount > 0) {
                discountLabelEl.textContent = `Discount (${discountValue.toFixed(2)}%)`;
            } else {
                discountLabelEl.textContent = 'Discount';
            }
        }
        const totalEl = document.getElementById('invoice-total');
        if (totalEl) {
            totalEl.textContent = `\u20B9${total.toFixed(2)}`;
        }
        const hiddenDiscount = document.querySelector('input[name="discount_amount"]');
        if (hiddenDiscount) {
            hiddenDiscount.value = discountAmount.toFixed(2);
        }
        const hiddenSubtotal = document.querySelector('input[name="subtotal"]');
        if (hiddenSubtotal) {
            hiddenSubtotal.value = subtotal.toFixed(2);
        }
        const hiddenTotal = document.querySelector('input[name="total_amount"]');
        if (hiddenTotal) {
            hiddenTotal.value = total.toFixed(2);
        }
        if (typeField) {
            typeField.value = normalizedType;
        }
    }

    addInvoiceItem() {
        const container = document.getElementById('invoice-items');
        const newItem = document.createElement('div');
        newItem.className = 'invoice-item grid grid-cols-12 gap-2 mb-2';
        newItem.innerHTML = `
            <div class="col-span-5">
                <select name="product_id" required onchange="app.updateProductPrice(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Select Product</option>
                    ${this.products.map(product =>
                        `<option value="${product.id}" data-price="${product.unit_price}">${product.name} - &#8377;${product.unit_price}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="col-span-2">
                <input type="number" name="quantity" placeholder="Qty" min="1" required onchange="app.calculateLineTotal(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
            </div>
            <div class="col-span-2">
                <input type="number" name="unit_price" placeholder="Price" step="0.01" required onchange="app.calculateLineTotal(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
            </div>
            <div class="col-span-2">
                <input type="number" name="line_total" placeholder="Total" readonly class="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50">
            </div>
            <div class="col-span-1">
                <button type="button" onclick="app.removeInvoiceItem(this)" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(newItem);
        this.calculateInvoiceTotal();
    }

    removeInvoiceItem(button) {
        const item = button.closest('.invoice-item');
        item.remove();
        this.calculateInvoiceTotal();
    }

    async saveCustomer(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const customer = Object.fromEntries(formData);
        
        try {
            await axios.post('/api/customers', customer);
            this.showSuccess('Customer added successfully');
            await this.loadInitialData();
            this.showCustomers();
        } catch (error) {
            console.error('Error saving customer:', error);
            this.showError('Failed to save customer');
        }
    }

    async saveProduct(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const product = Object.fromEntries(formData);
        
        try {
            await axios.post('/api/products', product);
            this.showSuccess('Product added successfully');
            await this.loadInitialData();
            this.showProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            this.showError('Failed to save product');
        }
    }

    async saveInvoice(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        // Collect invoice items
        const items = [];
        const itemRows = document.querySelectorAll('.invoice-item');
        
        itemRows.forEach(row => {
            const productId = row.querySelector('select[name="product_id"]').value;
            const quantity = parseInt(row.querySelector('input[name="quantity"]').value);
            const unitPrice = parseFloat(row.querySelector('input[name="unit_price"]').value);
            const lineTotal = parseFloat(row.querySelector('input[name="line_total"]').value);
            
            if (productId && quantity && unitPrice) {
                items.push({
                    product_id: parseInt(productId),
                    quantity,
                    unit_price: unitPrice,
                    line_total: lineTotal
                });
            }
        });

        if (items.length === 0) {
            this.showError('Please add at least one item to the invoice');
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
        
        const discountType = (formData.get('discount_type') || 'none').toString();
        const discountValueRaw = parseFloat(formData.get('discount_value')) || 0;
        const { discountAmount, discountType: normalizedType, discountValue, total } = this.computeDiscount(subtotal, discountType, discountValueRaw);

        const invoice = {
            customer_id: parseInt(formData.get('customer_id')),
            invoice_date: formData.get('invoice_date'),
            subtotal,
            discount_type: normalizedType,
            discount_value: discountValue,
            discount_amount: discountAmount,
            total_amount: total,
            items
        };
        
        try {
            await axios.post('/api/invoices', invoice);
            this.showSuccess('Invoice created successfully');
            await this.loadInitialData();
            this.showInvoices();
        } catch (error) {
            console.error('Error saving invoice:', error);
            this.showError('Failed to create invoice');
        }
    }

    async viewInvoice(id) {
        try {
            const response = await axios.get(`/api/invoices/${id}`);
            const invoice = response.data;
            
            document.getElementById('content').innerHTML = `
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">Invoice ${invoice.invoice_number}</h2>
                        <div class="space-x-2">
                            <button onclick="app.printInvoice(${id})" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                                <i class="fas fa-print mr-2"></i>Print
                            </button>
                            <button onclick="app.downloadInvoicePDFById(${id}, '${invoice.invoice_number || ''}')" class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                                <i class="fas fa-file-pdf mr-2"></i>Download PDF
                            </button>
                            <button onclick="app.editInvoice(${id})" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                <i class="fas fa-pen-to-square mr-2"></i>Edit
                            </button>
                            <button onclick="app.showRecordPayment(${id})" class="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">
                                <i class="fas fa-indian-rupee-sign mr-2"></i>Record Payment
                            </button>
                            <button onclick="app.showInvoices()" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                                Back
                            </button>
                        </div>
                    </div>
                    
                    <div id="invoice-content" class="bg-white p-8 rounded-lg shadow-md">
                        <div class="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <h3 class="font-semibold text-lg mb-2">Bill To:</h3>
                                <div class="text-gray-700">
                                    <div class="font-medium">${invoice.customer_name}</div>
                                    ${invoice.business_name ? `<div>${invoice.business_name}</div>` : ''}
                                    ${invoice.address ? `<div>${invoice.address}</div>` : ''}
                                    ${invoice.city || invoice.state ? `<div>${invoice.city || ''}${invoice.city && invoice.state ? ', ' : ''}${invoice.state || ''}</div>` : ''}
                                    ${invoice.pincode ? `<div>${invoice.pincode}</div>` : ''}
                                    ${invoice.phone ? `<div>Phone: ${invoice.phone}</div>` : ''}
                                    ${invoice.gst_number ? `<div>GST: ${invoice.gst_number}</div>` : ''}
                                </div>
                            </div>
                            <div class="text-right">
                                <h3 class="font-semibold text-lg mb-2">Invoice Details:</h3>
                                <div class="text-gray-700">
                                    <div><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</div>
                                    <div><strong>Status:</strong> <span class="px-2 py-1 text-xs rounded ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${invoice.status}</span></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-8">
                            <table class="w-full border border-gray-300">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="border border-gray-300 px-4 py-2 text-left">Description</th>
                                        <th class="border border-gray-300 px-4 py-2 text-center">Quantity</th>
                                        <th class="border border-gray-300 px-4 py-2 text-right">Rate</th>
                                        <th class="border border-gray-300 px-4 py-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoice.items.map(item => `
                                        <tr>
                                            <td class="border border-gray-300 px-4 py-2">
                                                <div class="font-medium">${item.product_name}</div>
                                                ${item.description ? `<div class="text-sm text-gray-600">${item.description}</div>` : ''}
                                            </td>
                                            <td class="border border-gray-300 px-4 py-2 text-center">${item.quantity}</td>
                                            <td class="border border-gray-300 px-4 py-2 text-right">₹${parseFloat(item.unit_price).toFixed(2)}</td>
                                            <td class="border border-gray-300 px-4 py-2 text-right">₹${parseFloat(item.line_total).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot class="bg-gray-50">
                                    <tr>
                                        <td colspan="3" class="border border-gray-300 px-4 py-2 text-right font-semibold">Subtotal:</td>
                                        <td class="border border-gray-300 px-4 py-2 text-right font-semibold">&#8377;${Number(invoice.subtotal || 0).toFixed(2)}</td>
                                    </tr>
                                    ${Number(invoice.discount_amount || 0) > 0 ? `
                                    <tr>
                                        <td colspan="3" class="border border-gray-300 px-4 py-2 text-right font-semibold">${invoice.discount_type === 'percent' ? `Discount (${Number(invoice.discount_value || 0).toFixed(2)}%)` : 'Discount'}</td>
                                        <td class="border border-gray-300 px-4 py-2 text-right font-semibold">-&#8377;${Number(invoice.discount_amount || 0).toFixed(2)}</td>
                                    </tr>` : ''}
                                    <tr>
                                        <td colspan="3" class="border border-gray-300 px-4 py-2 text-right font-semibold">Total Amount:</td>
                                        <td class="border border-gray-300 px-4 py-2 text-right font-semibold">&#8377;${Number(invoice.total_amount || 0).toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        
                        ${invoice.notes ? `
                            <div class="mb-4">
                                <strong>Notes:</strong> ${invoice.notes}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading invoice:', error);
            this.showError('Failed to load invoice');
        }
    }


async editInvoice(id) {
    try {
        const { data: invoice } = await axios.get(`/api/invoices/${id}`);
        const itemsHtml = invoice.items.map(item => `
          <div class="invoice-item grid grid-cols-12 gap-2 mb-2">
            <div class="col-span-5">
              <select name="product_id" required onchange="app.updateProductPrice(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                <option value="">Select Product</option>
                ${this.products.map(p => `<option value="${p.id}" data-price="${p.unit_price}" ${p.id===item.product_id?'selected':''}>${p.name} - &#8377;${p.unit_price}</option>`).join('')}
              </select>
            </div>
            <div class="col-span-2">
              <input type="number" name="quantity" placeholder="Qty" min="1" required value="${item.quantity}" onchange="app.calculateLineTotal(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
            </div>
            <div class="col-span-2">
              <input type="number" name="unit_price" placeholder="Price" step="0.01" required value="${item.unit_price}" onchange="app.calculateLineTotal(this)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
            </div>
            <div class="col-span-2">
              <input type="number" name="line_total" placeholder="Total" readonly value="${item.line_total}" class="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50">
            </div>
            <div class="col-span-1">
              <button type="button" onclick="app.removeInvoiceItem(this)" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('');

        document.getElementById('content').innerHTML = `
          <div class="mb-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold text-gray-800">
                <i class="fas fa-pen-to-square mr-2"></i>Edit Invoice ${invoice.invoice_number}
              </h2>
            </div>
            <form onsubmit="app.updateInvoice(event, ${id})" class="bg-white p-6 rounded-lg shadow-md">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                  <select name="customer_id" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    ${this.customers.map(c => `<option value="${c.id}" ${c.id===invoice.customer_id?'selected':''}>${c.name}${c.business_name ? ' - ' + c.business_name : ''}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Invoice Date *</label>
                  <input type="date" name="invoice_date" value="${invoice.invoice_date}" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
              </div>
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-3">Invoice Items</h3>
                <div id="invoice-items">${itemsHtml}</div>
                <button type="button" onclick="app.addInvoiceItem()" class="text-blue-600 hover:text-blue-800 text-sm"><i class="fas fa-plus mr-1"></i>Add Item</button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                  <select name="discount_type" onchange="app.onDiscountTypeChange(this)" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="none" ${!invoice.discount_type || invoice.discount_type === 'none' ? 'selected' : ''}>No Discount</option>
                    <option value="amount" ${invoice.discount_type === 'amount' ? 'selected' : ''}>Flat Amount</option>
                    <option value="percent" ${invoice.discount_type === 'percent' ? 'selected' : ''}>Percentage</option>
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Discount Value</label>
                  <div class="flex items-center gap-2">
                    <input type="number" name="discount_value" min="0" step="0.01" placeholder="Enter amount" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${invoice.discount_type && invoice.discount_type !== 'none' ? '' : 'opacity-50'}" ${invoice.discount_type && invoice.discount_type !== 'none' ? '' : 'disabled'} value="${invoice.discount_type && invoice.discount_type !== 'none' ? Number(invoice.discount_value || 0).toFixed(2) : ''}" oninput="app.calculateInvoiceTotal()">
                    <span data-discount-suffix class="text-gray-600 font-medium">&#8377;</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">Select percentage for a % based discount or flat amount for a fixed reduction.</p>
                </div>
              </div>
              <input type="hidden" name="subtotal" value="${Number(invoice.subtotal || 0).toFixed(2)}">
              <input type="hidden" name="discount_amount" value="${Number(invoice.discount_amount || 0).toFixed(2)}">
              <input type="hidden" name="total_amount" value="${Number(invoice.total_amount || 0).toFixed(2)}">
              <div class="border-t pt-4 space-y-1">
                <div class="flex justify-between items-center text-sm text-gray-700">
                  <span>Subtotal:</span>
                  <span id="invoice-subtotal">&#8377;${Number(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                <div id="invoice-discount-row" class="flex justify-between items-center text-sm text-emerald-700 ${Number(invoice.discount_amount || 0) > 0 ? '' : 'hidden'}">
                  <span id="invoice-discount-label">${invoice.discount_type === 'percent' && Number(invoice.discount_amount || 0) > 0 ? `Discount (${Number(invoice.discount_value || 0).toFixed(2)}%)` : 'Discount'}</span>
                  <span id="invoice-discount">-&#8377;${Number(invoice.discount_amount || 0).toFixed(2)}</span>
                </div>
                <div class="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span id="invoice-total">&#8377;${Number(invoice.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
              <div class="flex justify-end mt-6 space-x-3">
                <button type="button" onclick="app.viewInvoice(${id})" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update Invoice</button>
              </div>
            </form>
          </div>
        `;
        const discountTypeSelect = document.querySelector('select[name="discount_type"]');
        if (discountTypeSelect) {
          discountTypeSelect.value = invoice.discount_type || 'none';
          const discountValueInput = document.querySelector('input[name="discount_value"]');
          if (discountValueInput) {
            if (discountTypeSelect.value === 'none') {
              discountValueInput.value = '';
            } else {
              discountValueInput.value = Number(invoice.discount_value || 0).toFixed(2);
            }
          }
          this.onDiscountTypeChange(discountTypeSelect);
        }
        this.calculateInvoiceTotal();
      } catch (e) {
        console.error('Error loading invoice for edit:', e);
        this.showError('Failed to load invoice');
      }
}

async updateInvoice(event, id) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const items = [];
        document.querySelectorAll('.invoice-item').forEach(row => {
            const productId = row.querySelector('select[name="product_id"]').value;
            const quantity = parseInt(row.querySelector('input[name="quantity"]').value);
            const unitPrice = parseFloat(row.querySelector('input[name="unit_price"]').value);
            const lineTotal = parseFloat(row.querySelector('input[name="line_total"]').value);
            if (productId && quantity && unitPrice) {
                items.push({ product_id: parseInt(productId), quantity, unit_price: unitPrice, line_total: lineTotal });
            }
        });
        const subtotal = items.reduce((s,i)=>s+i.line_total,0);
        const discountType = (formData.get('discount_type') || 'none').toString();
        const discountValueRaw = parseFloat(formData.get('discount_value')) || 0;
        const { discountAmount, discountType: normalizedType, discountValue, total } = this.computeDiscount(subtotal, discountType, discountValueRaw);
        const payload = {
            customer_id: parseInt(formData.get('customer_id')),
            invoice_date: formData.get('invoice_date'),
            subtotal,
            discount_type: normalizedType,
            discount_value: discountValue,
            discount_amount: discountAmount,
            total_amount: total,
            status: 'pending',
            items
        };
        try {
            await axios.put(`/api/invoices/${id}`, payload);
            this.showSuccess('Invoice updated successfully');
            await this.loadInitialData();
            this.viewInvoice(id);
        } catch (e) {
            console.error('Error updating invoice:', e);
            this.showError('Failed to update invoice');
        }
    }

    showRecordPayment(id) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('content').insertAdjacentHTML('beforeend', `
          <div id="payment-modal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 class="text-lg font-semibold mb-4"><i class="fas fa-money-bill mr-2"></i>Record Payment</h3>
              <form onsubmit="app.recordPayment(event, ${id})">
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                    <input type="date" name="payment_date" value="${today}" class="w-full border border-gray-300 rounded px-2 py-1" required />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input type="number" name="amount" step="0.01" min="0.01" class="w-full border border-gray-300 rounded px-2 py-1" required />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select name="payment_method" class="w-full border border-gray-300 rounded px-2 py-1">
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                    <input type="text" name="reference_number" class="w-full border border-gray-300 rounded px-2 py-1" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea name="notes" rows="2" class="w-full border border-gray-300 rounded px-2 py-1"></textarea>
                  </div>
                </div>
                <div class="flex justify-end gap-2 mt-5">
                  <button type="button" class="btn btn-secondary" onclick="document.getElementById('payment-modal').remove()">Cancel</button>
                  <button type="submit" class="btn btn-success">Save Payment</button>
                </div>
              </form>
            </div>
          </div>
        `);
    }

    async recordPayment(event, id) {
        event.preventDefault();
        const fd = new FormData(event.target);
        const payload = Object.fromEntries(fd);
        payload.amount = parseFloat(payload.amount);
        try {
            await axios.post(`/api/invoices/${id}/payments`, payload);
            this.showSuccess('Payment recorded');
            document.getElementById('payment-modal')?.remove();
            await this.loadInitialData();
            this.viewInvoice(id);
        } catch (e) {
            console.error('Error recording payment:', e);
            this.showError('Failed to record payment');
        }
    }

    printInvoice(id) {
        window.open(`/print/invoice/${id}`, '_blank');
    }

    downloadInvoicePDF(fileSuffix) {
        try {
            const target = document.getElementById('invoice-content') || document.body;
            const filename = `invoice_${fileSuffix || Date.now()}.pdf`;
            html2pdf()
                .set({
                    margin: 10,
                    filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                })
                .from(target)
                .save();
        } catch (e) {
            console.error('Error generating PDF:', e);
        }
    }

    async downloadInvoicePDFById(id, invoiceNumber) {
        const filename = `invoice_${invoiceNumber || id}.pdf`;

        const tryServerPdf = async () => {
            try {
                const res = await fetch(`/download/invoice/${id}`, {
                    method: 'GET',
                    headers: { Accept: 'application/pdf' },
                    cache: 'no-store'
                });

                if (!res.ok) {
                    console.warn('Server PDF download not available', res.status);
                    return false;
                }

                const blob = await res.blob();
                if (!blob || blob.size === 0) {
                    console.warn('Server PDF download returned empty file');
                    return false;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                return true;
            } catch (error) {
                console.warn('Server PDF download failed, will fallback to client render', error);
                return false;
            }
        };

        const fallbackClientPdf = async () => {
            const res = await fetch(`/print/invoice/${id}?embed=1`, { cache: 'no-store' });
            if (!res.ok) {
                throw new Error(`Failed to fetch invoice HTML for PDF fallback (status ${res.status})`);
            }

            const html = await res.text();
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-10000px';
            iframe.style.top = '0';
            iframe.style.width = '210mm';
            iframe.style.minHeight = '297mm';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                doc.open();
                doc.write(html);
                doc.close();

                try { if (doc.fonts && doc.fonts.ready) { await doc.fonts.ready; } } catch (_) {}

                const images = Array.from(doc.images || []);
                await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
                    img.onload = img.onerror = resolve;
                })));

                await new Promise((resolve) => setTimeout(resolve, 200));

                const target = doc.body;
                const ww = Math.max(794, target.scrollWidth || 0);

                await html2pdf()
                    .set({
                        margin: 10,
                        filename,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: ww },
                        pagebreak: { mode: ['css', 'legacy', 'avoid-all'] },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    })
                    .from(target)
                    .save();
            } finally {
                document.body.removeChild(iframe);
            }
        };

        try {
            const serverSuccess = await tryServerPdf();
            if (serverSuccess) {
                return;
            }

            await fallbackClientPdf();
        } catch (error) {
            console.error('Error downloading invoice PDF:', error);
            this.showError('Failed to download invoice PDF');
        }
    }

    async deleteCustomer(id) {
        if (!confirm('Are you sure you want to delete this customer?')) return;
        
        try {
            await axios.delete(`/api/customers/${id}`);
            this.showSuccess('Customer deleted successfully');
            await this.loadInitialData();
            this.showCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            this.showError('Failed to delete customer');
        }
    }

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        try {
            await axios.delete(`/api/products/${id}`);
            this.showSuccess('Product deleted successfully');
            await this.loadInitialData();
            this.showProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showError('Failed to delete product');
        }
    }
}

// Global functions for navigation
function showDashboard() {
    app.showDashboard();
}

function showCustomers() {
    app.showCustomers();
}

function showProducts() {
    app.showProducts();
}

function showInvoices() {
    app.showInvoices();
}

// Initialize the application
const app = new BillingApp();

// The PDF download is triggered via app.downloadInvoicePDF()











