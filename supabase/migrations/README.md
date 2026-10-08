# Migrations

These files mirror, in order, what has actually been applied to the Supabase
project (`emsdruoczxumkpybvxot`, rebuilt from these files on 2026-10-08 after
the original project was lost). Filenames use a local `000N_` sequence; the database records its own
timestamp versions in `supabase_migrations.schema_migrations`. The mapping:

| File | Applied version | Name in the ledger |
|---|---|---|
| `0001_auth_profiles.sql` | `20261008182107` | `auth_profiles` |
| `0002_lock_down_trigger_functions.sql` | `20261008182113` | `lock_down_trigger_functions` |
| `0003_password_recovery_questions.sql` | `20261008182147` | `password_recovery_questions` |
| `0004_password_recovery_functions.sql` | `20261008182151` | `password_recovery_functions` |
| `0005_fix_recovery_column_grants.sql` | `20261008182155` | `fix_recovery_column_grants` |
| `0006_fix_decoy_question_collision.sql` | `20261008182214` | `fix_decoy_question_collision` |
| `0007_groups_and_members.sql` | `20261008182241` | `groups_and_members` |
| `0008_ledger_tables.sql` | `20261008182246` | `ledger_tables` |
| `0009_ledger_rls_policies.sql` | `20261008182302` | `ledger_rls_policies` |
| `0010_save_expense_and_recurring_rpcs.sql` | `20261008182328` | `save_expense_and_recurring_rpcs` |
| `0011_group_delete_unwinds_ledger.sql` | `20261008182332` | `group_delete_unwinds_ledger` |
| `0012_pin_search_path_on_save_rpcs.sql` | `20261008182336` | `pin_search_path_on_save_rpcs` |
| `0013_save_rpcs_accept_client_ids.sql` | `20261008182407` | `save_rpcs_accept_client_ids` |
| `0014_dashboard_summary_rpcs.sql` | `20261008182433` | `dashboard_summary_rpcs` |
| `0015_member_avatar_colour_from_palette.sql` | `20261008182442` | `member_avatar_colour_from_palette` |
| `0016_member_seats_mirror_profile.sql` | `20261008182446` | `member_seats_mirror_profile` |
| `0017_claim_seats_by_email.sql` | `20261008183816` | `claim_seats_by_email` |
| `0018_search_accounts.sql` | `20261008185010` | `search_accounts` |

Deliberately kept as applied rather than squashed: `0003` ships a column-level
`REVOKE` that turns out to be a no-op against a table-wide grant, and `0005` is
the fix. Folding the fix back into `0003` would read more cleanly but would no
longer match the ledger above, which is what `supabase db push` diffs against.

`0006` now guards its `rls_auto_enable()` revoke: that function was specific to
the original project and does not exist on a fresh one.
