-- Add discount metadata columns to invoices
ALTER TABLE invoices ADD COLUMN discount_type TEXT DEFAULT 'none';
ALTER TABLE invoices ADD COLUMN discount_value REAL DEFAULT 0;
