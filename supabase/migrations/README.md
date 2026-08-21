# Migrations

These files mirror, in order, what has actually been applied to the Supabase
project. Filenames use a local `000N_` sequence; the database records its own
timestamp versions in `supabase_migrations.schema_migrations`. The mapping:

| File | Applied version | Name in the ledger |
|---|---|---|
| `0001_auth_profiles.sql` | `20260821165105` | `auth_profiles` |
| `0002_lock_down_trigger_functions.sql` | `20260821165212` | `lock_down_trigger_functions` |
| `0003_password_recovery_questions.sql` | `20260821172359` | `password_recovery_questions` |
| `0004_password_recovery_functions.sql` | `20260821172437` | `password_recovery_functions` |
| `0005_fix_recovery_column_grants.sql` | `20260821172556` | `fix_recovery_column_grants` |
| `0006_fix_decoy_question_collision.sql` | `20260821174723` | `fix_decoy_question_collision` |
| `0007_groups_and_members.sql` | `20260821181655` | `groups_and_members` |
| `0008_ledger_tables.sql` | `20260821181726` | `ledger_tables` |
| `0009_ledger_rls_policies.sql` | `20260821181757` | `ledger_rls_policies` |
| `0010_save_expense_and_recurring_rpcs.sql` | `20260821181939` | `save_expense_and_recurring_rpcs` |
| `0011_group_delete_unwinds_ledger.sql` | `20260821182156` | `group_delete_unwinds_ledger` |
| `0012_pin_search_path_on_save_rpcs.sql` | `20260821182239` | `pin_search_path_on_save_rpcs` |
| `0013_save_rpcs_accept_client_ids.sql` | `20260821183625` | `save_rpcs_accept_client_ids` |

Deliberately kept as applied rather than squashed: `0003` ships a column-level
`REVOKE` that turns out to be a no-op against a table-wide grant, and `0005` is
the fix. Folding the fix back into `0003` would read more cleanly but would no
longer match the ledger above, which is what `supabase db push` diffs against.
