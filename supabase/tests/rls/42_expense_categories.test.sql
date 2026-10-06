-- #125: the shared expense-category list. Everyone signed in reads it; nobody writes it.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).
SELECT rls_test.expect('An admin sees the whole list',
  rls_test.visible(rls_test.u('a_admin'), 'expense_categories'), 16);
SELECT rls_test.expect('Staff in another org see the same list',
  rls_test.visible(rls_test.u('b_admin'), 'expense_categories'), 16);
SELECT rls_test.expect('The 2025 headings are filed on line 27b',
  (SELECT count(*)::int FROM expense_categories WHERE schedule_c_line = '27b'), 15);
SELECT rls_test.expect('Not signed in: nothing',
  rls_test.try_anon('SELECT * FROM expense_categories'), 0);
SELECT rls_test.expect('An admin cannot add a category',
  rls_test.try(rls_test.u('a_admin'), $$INSERT INTO expense_categories (name, sort_order) VALUES ('Mine', 1)$$), -1);
SELECT rls_test.expect('An admin cannot rename one',
  rls_test.try(rls_test.u('a_admin'), $$UPDATE expense_categories SET name = 'X' WHERE name = 'Supplies'$$), 0);
SELECT rls_test.expect('An admin cannot delete one',
  rls_test.try(rls_test.u('a_admin'), $$DELETE FROM expense_categories$$), 0);
SELECT rls_test.expect('The list is unchanged',
  (SELECT count(*)::int FROM expense_categories WHERE name = 'Supplies'), 1);
