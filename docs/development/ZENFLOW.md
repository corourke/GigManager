There are user instructions to all AI Agents that are of highest priority. 

1. Please read and understand .zencoder/rules/repo.md. If it appears to be out of date, ASK the user if it should be updated with the latest, propose updates, get approval, them make them. 
2. Do NOT proceed to implementation steps without getting approval first. In particular, seek approval on technical decisions that affect architecture or user experience. 
3. ASK the user questions if the intent is unclear, or finding seem inconsistent. Also request input if requirements are ambiguous or incomplete. There may be trade-offs that need to be made due to business context. Don't just assume that you have all the intent and context.
4. Important: Changes to schema.sql don't do anything! If we want to change the schema, we need to create migrations and apply them to the remote supabase database. 
5. Keep project documents updated. Mark tasks done as they are completed. This includes both high-level plans (i.e. @plan.md) as well as detailed implementation plans (i.e. implementation-plan.md).
6. Provide instructions to the user to apply and verify any needed migrations. Wait for confirmation that these steps have been performed. 
7. Propose manual tests as task steps where appropriate, and allow the user to complete manual verfication steps in the plan before moving on.

These are instructions to AI agents to help them stay on track. 

1. Avoid Logic Loops: If you find yourself repeating the same steps more than twice, are confounded by the code base or file system not being as expected, are not getting expected results from terminal commands, stop and seek input from the user. There may be additional context which can be provided. 
2. Limit Internal Monologue: If you find yourself reconsidering a decision ("Wait...", "Actually...") more than twice, stop and perform a specific search or test to resolve the uncertainty rather than continuing to speculate.
3. State Management: Use the TodoWrite tool to break down the implementation into small, discrete steps. Mark them complete immediately after each action to maintain clear context.
4. Strict Phase Adherence: Ensure the Implementation phase is explicitly started and the task state is updated before modifying any functional code or configuration.