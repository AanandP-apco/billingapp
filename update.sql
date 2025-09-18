 UPDATE invoices
     SET total_amount = ROUND(subtotal - discount_amount, 2)
   WHERE ABS(total_amount - (subtotal - discount_amount)) > 0.01;