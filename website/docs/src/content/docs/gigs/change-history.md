---
title: Change history
description: The audit trail of who changed what on a gig, and when.
sidebar:
  order: 8
---

Every gig keeps a **change history**. Open a gig and select the **History** tab.

Each entry shows:

- **who** made the change and which organization they were acting for,
- **what** changed, in plain language (for example, *"Renamed from 'Summer
  Festival' to 'Summer Festival — Main Stage'"* or *"Rescheduled from 20 Sep 14:00
  to 21 Sep 14:00"*),
- **when**, as a relative time, with the creation date pinned at the bottom.

The recorded name and role are a **snapshot from the moment of the change** — if
someone's role changes later, past history entries still show what it was at the
time.

:::note[What's tracked]
Change history currently covers the gig's own fields (title, dates, status).
The exact scope is still being finalized — see GitHub
[#55](https://github.com/corourke/GigManager/issues/55). Assets and kits have their
own history in the same style.
:::

<!-- TODO
  - 📸 History tab with a few entries (create, rename, reschedule).
  - Pin down the exact scope once #55 is resolved (currently gig fields only;
    participant/staff/financial/schedule changes are NOT logged).
  - Note #54: no-op "Rescheduled from X to X" entries can appear.
-->
