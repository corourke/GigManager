-- Rows in the old fin_type shape, one gig per case. Ids are fixed; the last
-- two hex digits name the case (gig ...0gNN, financial rows ...0fNN).
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'conv@example.test');
INSERT INTO public.users (id, email, first_name, last_name)
  VALUES ('00000000-0000-0000-0000-0000000000a1', 'conv@example.test', 'Conv', 'Test');
INSERT INTO organizations (id, name, roles) VALUES ('00000000-0000-0000-0000-00000000000a', 'Org A', '{Sound}');

INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by)
SELECT ('00000000-0000-0000-0000-0000000000' || g.n)::uuid, g.title, g.status::gig_status,
       g.start::timestamptz, g.start::timestamptz + interval '4 hours', 'UTC',
       '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'
FROM (VALUES
  ('01', 'Imported, payment only',          'Settled',   '2025-05-03 20:00'),
  ('02', 'Terms then paid in full',         'Settled',   '2026-08-22 20:00'),
  ('03', 'Terms then overpaid',             'Settled',   '2026-05-30 20:00'),
  ('04', 'Terms revised by bid accepted',   'Completed', '2026-10-03 12:00'),
  ('05', 'Terms then invoice with due date','Completed', '2026-09-17 14:00'),
  ('06', 'Cancelled gig, unpaid terms',     'Cancelled', '2026-09-06 20:00'),
  ('07', 'Deposit then balance',            'Settled',   '2026-07-26 18:00'),
  ('08', 'Partly paid',                     'Completed', '2026-09-20 18:00'),
  ('09', 'Expenses',                        'Settled',   '2026-09-01 18:00'),
  ('10', 'Bid rejected',                    'Proposed',  '2026-12-01 18:00')
) AS g(n, title, status, start);

INSERT INTO gig_financials (id, gig_id, organization_id, type, amount, date, due_date, paid_at, description, notes, category, created_by, created_at)
SELECT ('00000000-0000-0000-0000-000000000' || f.id)::uuid, ('00000000-0000-0000-0000-0000000000' || f.g)::uuid,
       '00000000-0000-0000-0000-00000000000a', f.type::fin_type, f.amount, f.date::date, f.due::date, f.paid::timestamptz,
       f.descr, f.notes, f.cat::fin_category, '00000000-0000-0000-0000-0000000000a1', f.date::timestamptz
FROM (VALUES
  ('101', '01', 'Payment Received', 250.00,  '2025-05-03', NULL,         NULL,         'Payment from import', NULL, NULL),
  ('201', '02', 'Informal Terms',   1000.00, '2026-07-26', NULL,         NULL,         'Sound only', NULL, NULL),
  ('202', '02', 'Payment Received', 1000.00, '2026-08-22', NULL,         '2026-08-22', 'By Check', NULL, NULL),
  ('301', '03', 'Informal Terms',   300.00,  '2026-05-29', NULL,         NULL,         NULL, NULL, NULL),
  ('302', '03', 'Payment Received', 450.00,  '2026-06-04', NULL,         '2026-06-04', NULL, NULL, NULL),
  ('401', '04', 'Informal Terms',   1800.00, '2026-07-22', NULL,         NULL,         'All day festival', NULL, NULL),
  ('402', '04', 'Bid Accepted',     1000.00, '2026-07-29', NULL,         NULL,         NULL, 'Scaled back to one day', NULL),
  ('501', '05', 'Informal Terms',   750.00,  '2026-09-16', NULL,         NULL,         'Per Argyl', NULL, NULL),
  ('502', '05', 'Invoice Issued',   750.00,  '2026-09-26', '2026-10-26', NULL,         NULL, NULL, NULL),
  ('601', '06', 'Informal Terms',   1000.00, '2026-09-06', NULL,         NULL,         NULL, NULL, NULL),
  ('701', '07', 'Contract Signed',  2000.00, '2026-05-01', NULL,         NULL,         'Wedding', NULL, NULL),
  ('702', '07', 'Deposit Received', 500.00,  '2026-05-10', NULL,         '2026-05-10', NULL, NULL, NULL),
  ('703', '07', 'Payment Received', 1500.00, '2026-07-26', NULL,         '2026-07-26', 'Zelle', NULL, NULL),
  ('801', '08', 'Informal Terms',   1000.00, '2026-09-01', NULL,         NULL,         NULL, NULL, NULL),
  ('802', '08', 'Payment Received', 400.00,  '2026-09-20', NULL,         '2026-09-20', NULL, NULL, NULL),
  ('901', '09', 'Expense Incurred', 51.30,   '2026-09-01', NULL,         NULL,         'Mileage', NULL, 'Travel'),
  ('902', '09', 'Expense Incurred', 200.00,  '2026-09-02', NULL,         '2026-09-01', 'Labor: Stage Hand', NULL, 'Contract labor'),
  ('a01', '10', 'Bid Submitted',    900.00,  '2026-10-01', NULL,         NULL,         NULL, NULL, NULL),
  ('a02', '10', 'Bid Rejected',     900.00,  '2026-10-05', NULL,         NULL,         NULL, NULL, NULL)
) AS f(id, g, type, amount, date, due, paid, descr, notes, cat);

-- An attachment on the payment row that gets folded into the fee row (case 02).
INSERT INTO attachments (id, organization_id, file_path, file_name)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'x/check.pdf', 'check.pdf');
INSERT INTO entity_attachments (attachment_id, entity_type, entity_id)
  VALUES ('00000000-0000-0000-0000-0000000000c1', 'gig_financial', '00000000-0000-0000-0000-000000000202');
