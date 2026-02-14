There are user instructions to all AI Agents that are of highest priority. 

1. Check .zencoder/rules/repo.md for context before starting.
2. NEVER proceed from requirements to technical specification to planning to implementation without getting user approval first. ALWYAS propose a solution and get approval BEFORE proceeing with code changes.
3. ALWAYS ask the user for clarification if intent is unclear, findings seem inconsistent, or requirements are ambiguous or incomplete. There may be trade-offs that need to be made due to business context.
4. Before fixing bugs ALWAYS implement a failing test case first. This proves you understand the bug and ensures it doesn't return.
5. IMPORTANT: Changes to schema.sql don't do anything! If we want to change the schema, we need to create migrations and apply them to the remote supabase database. After writing new migrations, Ask the user to apply them to the databse. Wait for confirmation that these steps have been performed. 
6. STAY FOCUSED: If you discover potential performance issues or unrelated bugs during investigation, document them as "Future Considerations" rather than pursuing them immediately.
7. After implementing changes, if there are manual deployment or verification steps, you MUST enumerate these steps to the user for implementation. 
8. Keep project documents updated. Mark tasks done as they are completed. This includes both high-level plans (i.e. @plan.md) as well as detailed implementation plans (i.e. implementation-plan.md).
9. If you are confused by something, ASK!
