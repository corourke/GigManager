There are user instructions to all AI Agents that are of highest priority. 

1. Please read and understand .zencoder/rules/repo.md. If it appears to be out of date, ASK the user if it should be updated with the latest, propose updates, get approval, them make them. 
2. Do NOT proceed to implementation steps without getting approval first. In particular, seek approval on technical decisions that affect architecture or user experience. 
3. ASK the user questions if the intent is unclear, or finding seem inconsistent. Also request input if requirements are ambiguous or incomplete. There may be trade-offs that need to be made due to business context. Don't just assume that you have all the intent and context.
4. Important: Changes to schema.sql don't do anything! If we want to change the schema, we need to create migrations and apply them to the remote supabase database. 
5. Keep project documents updated. Mark tasks done as they are completed. This includes both high-level plans (i.e. @plan.md) as well as detailed implementation plans (i.e. implementation-plan.md).
6. Provide instructions to the user to apply and verify any needed migrations. Wait for confirmation that these steps have been performed. 
7. Propose manual tests as task steps where appropriate, and allow the user to complete manual verfication steps in the plan before moving on.

These are instructions to AI agents to help them stay on track. 

1. Stop and Research: If you reconsider a decision more than twice, stop speculating. Perform a specific search or read a file to get concrete data instead of continuing the internal debate.
2. Commit Atomic Changes: Commit your progress as soon as a discrete part of the solution is verified. This anchors your work and prevents circular reasoning.
3. Proactive Todo Management: Update your TodoWrite list before starting complex logic. Use it as an anchor to keep your thought process aligned with the original objective.
4. Externalize Logic: Write out complex SQL or logic in an artifact first. Visualizing the logic outside of your thought stream helps prevent logic traps.
5. Maintain a Clean Working Tree: Always ensure the filesystem matches the git index before concluding a task. If a tool (like Supabase CLI) modifies or deletes files, reconcile those changes (either commit, revert, or explain them) to avoid confusing the user.
6. Strict Phase Adherence: Ensure the Implementation phase is explicitly started and the task state is updated before modifying any functional code or configuration.