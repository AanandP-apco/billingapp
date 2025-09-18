-- Seed data for Cotton Bag Billing Application

-- Insert sample customers
INSERT OR IGNORE INTO customers (name, business_name, phone, email, address, city, state, pincode, gst_number) VALUES
('Rajesh Kumar', 'Kumar Retail Store', '9876543210', 'rajesh@kumarretail.com', '123 Market Street', 'Mumbai', 'Maharashtra', '400001', '27ABCDE1234F1Z5'),
('Priya Sharma', 'Sharma Enterprises', '9876543211', 'priya@sharmaent.com', '456 Commercial Road', 'Delhi', 'Delhi', '110001', '07BCDEF2345G2A6'),
('Amit Patel', 'Patel Trading Co', '9876543212', 'amit@pateltrading.com', '789 Business Park', 'Ahmedabad', 'Gujarat', '380001', '24CDEFG3456H3B7'),
('Sunita Reddy', 'Reddy Wholesale', '9876543213', 'sunita@reddywholesale.com', '321 Industrial Area', 'Hyderabad', 'Telangana', '500001', '36DEFGH4567I4C8'),
('Vikram Singh', 'Singh Distributors', '9876543214', 'vikram@singhdistr.com', '654 Trade Center', 'Bangalore', 'Karnataka', '560001', '29EFGHI5678J5D9');

-- Insert sample cotton bag products
INSERT OR IGNORE INTO products (name, description, category, size, color, material, unit_price, stock_quantity, minimum_stock) VALUES
('Plain Cotton Tote Bag', 'Simple cotton tote bag for everyday use', 'Cotton Bag', 'Medium (14x16 inch)', 'Natural', 'Cotton', 45.00, 100, 20),
('Cotton Shopping Bag with Handles', 'Durable shopping bag with reinforced handles', 'Cotton Bag', 'Large (16x18 inch)', 'White', 'Cotton', 55.00, 80, 15),
('Printed Cotton Bag - Logo', 'Custom printed cotton bag with company logo', 'Cotton Bag', 'Medium (14x16 inch)', 'Multi Color', 'Cotton', 65.00, 50, 10),
('Organic Cotton Drawstring Bag', 'Eco-friendly organic cotton drawstring bag', 'Cotton Bag', 'Small (12x14 inch)', 'Natural', 'Organic Cotton', 40.00, 120, 25),
('Cotton Canvas Tote Bag', 'Heavy-duty canvas tote bag', 'Cotton Bag', 'Large (16x18 inch)', 'Navy Blue', 'Cotton Canvas', 75.00, 60, 12),
('Folding Cotton Shopping Bag', 'Compact folding cotton bag', 'Cotton Bag', 'Medium (14x16 inch)', 'Green', 'Cotton', 50.00, 90, 18),
('Cotton Bag with Zipper', 'Cotton tote bag with secure zipper closure', 'Cotton Bag', 'Medium (14x16 inch)', 'Black', 'Cotton', 70.00, 40, 8),
('Jute-Cotton Blend Bag', 'Eco-friendly jute-cotton blend bag', 'Cotton Bag', 'Large (16x18 inch)', 'Brown', 'Jute-Cotton', 60.00, 70, 14),
('Cotton Produce Bags (Set of 3)', 'Set of 3 mesh cotton produce bags', 'Cotton Bag', 'Small (10x12 inch)', 'White', 'Cotton Mesh', 85.00, 35, 7),
('Premium Cotton Gift Bag', 'Premium quality cotton gift bag with ribbon', 'Cotton Bag', 'Medium (14x16 inch)', 'Red', 'Premium Cotton', 90.00, 25, 5);

-- Insert a sample invoice
INSERT OR IGNORE INTO invoices (invoice_number, customer_id, invoice_date, due_date, subtotal, discount_type, discount_value, discount_amount, total_amount, status) VALUES
('INV-2024-001', 1, '2024-09-15', '2024-10-15', 265.00, 'percent', 6, 15.00, 250.00, 'pending');

-- Insert sample invoice items
INSERT OR IGNORE INTO invoice_items (invoice_id, product_id, quantity, unit_price, line_total, description) VALUES
(1, 1, 2, 45.00, 90.00, 'Plain Cotton Tote Bag - Medium'),
(1, 2, 1, 55.00, 55.00, 'Cotton Shopping Bag with Handles - Large'),
(1, 4, 3, 40.00, 120.00, 'Organic Cotton Drawstring Bag - Small');

-- Update the invoice totals (this would normally be done by application logic)
UPDATE invoices SET 
    subtotal = (SELECT SUM(line_total) FROM invoice_items WHERE invoice_id = 1),
    discount_type = 'percent',
    discount_value = 6,
    discount_amount = 15.00,
    total_amount = (SELECT SUM(line_total) FROM invoice_items WHERE invoice_id = 1) - 15.00,
    balance_amount = (SELECT SUM(line_total) FROM invoice_items WHERE invoice_id = 1) - 15.00
WHERE id = 1;