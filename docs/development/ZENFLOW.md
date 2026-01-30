There are user instructions to all AI Agents that are of highest priority. 

### Understanding the Problem 

1. Please read and understand .zencoder/rules/repo.md. If it appears to be out of date, ASK the user if it should be updated with the latest, propose updates, get approval, them make them. 
2. ASK the user questions if the intent is unclear, or finding seem inconsistent. Also request input if requirements are ambiguous or incomplete. There may be trade-offs that need to be made due to business context. Don't just assume that you have all the intent and context.

### Formulating a Solution

1. Propose a solution and get approval BEFORE proceeing with code changes.
2. Confer with the user before going in new research directions. 
3. Do NOT proceed to implementation steps without getting approval first. In particular, seek approval on technical decisions that affect architecture or user experience.
4. If you find additional areas for improvement outside the immediate scope, list them at the end of your message and wait for my instruction before investigating them.
5. Before applying any fix, show me the test code you have written that currently fails but will pass after your changes.

### Implementing the Solution
 
1. Test-Driven Fixes: Always implement a failing test case first. This proves you understand the bug and ensures it doesn't return.
2. Important: Changes to schema.sql don't do anything! If we want to change the schema, we need to create migrations and apply them to the remote supabase database. 
3. Clean Code: Avoid committing or proposing code that contains console.log or "hacks" like hardcoded timeouts unless they are the only viable solution (which should be discussed).
4. Stay Focused: If you discover potential performance issues or unrelated bugs during investigation, document them as "Future Considerations" rather than pursuing them immediately.

### After Coding

1. Provide instructions to the user to apply and verify any needed migrations. Wait for confirmation that these steps have been performed. 
2. Propose manual smoke tests as task steps where appropriate, and allow the user to complete these manual verfication steps in the plan before moving on.
3. Keep project documents updated. Mark tasks done as they are completed. This includes both high-level plans (i.e. @plan.md) as well as detailed implementation plans (i.e. implementation-plan.md).

### Staying on Track and Avoiding Thought Loops 

1. Stop and Research: If you reconsider a decision more than twice, stop speculating. Perform a specific search or read a file to get concrete data instead of continuing the internal debate.
2. Commit Atomic Changes: Commit your progress as soon as a discrete part of the solution is verified. This anchors your work and prevents circular reasoning.
3. Proactive Todo Management: Update your TodoWrite list before starting complex logic. Use it as an anchor to keep your thought process aligned with the original objective.
4. Externalize Logic: Write out complex SQL or logic in an artifact first. Visualizing the logic outside of your thought stream helps prevent logic traps.
5. Maintain a Clean Working Tree: Always ensure the filesystem matches the git index before concluding a task. If a tool (like Supabase CLI) modifies or deletes files, reconcile those changes (either commit, revert, or explain them) to avoid confusing the user.
6. Strict Phase Adherence: You must stop after the "Investigation" phase. Present your findings and the specific code/SQL you intend to change. Wait for explicit user approval before moving to "Implementation."