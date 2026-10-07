---
title: Staffing
description: Add staff slots for the roles you need, assign people, track their status and pay, and finalize completed work.
draft: true
sidebar:
  order: 5
---

Staffing is your own organization's crew for a gig: which roles you need, how many of each, who fills them, and what you pay. Admins and Managers set it up in the **Staff Assignments** card in edit mode on the gig's **Overview** tab. Other organizations on the gig can't see your staffing.

## Adding a staff slot

A slot is one role and the number of people you need in it.

1. Open the gig and select **Edit**.
2. In **Staff Assignments**, select **Add Staff Slot**.
3. Choose a role from **Select role**, such as **FOH Engineer** or **Stage Manager**.
4. Next to **Required:**, enter how many people you need. Each place appears as its own row below.
5. To add a note for the whole slot, select **Notes**, enter it and select **Save Notes**.

To delete a slot, select the trash button at the right of its header. There's no confirmation.

The role list is the same for every organization. Changes save as you make them.

## Assigning people

Each row in a slot is one person.

1. In the row, select the **Search for user...** field and type a name. The search covers people in your organization and the other organizations on the gig.
2. Choose the person. If they aren't there, select **Add new person** to quick-add them without a login. See [Adding people without a login](/team/people-without-logins/).
3. Set the **status**:
   - **Open**: no one has been asked yet.
   - **Requested**: you've asked them.
   - **Confirmed**: they're booked.
   - **Declined**: they said no. A declined person no longer fills a place, so an open row appears for a replacement.
4. Choose **Rate** or **Fee**, then enter the amount. A rate is per unit, such as hours or days. A fee is a flat amount.
5. To keep a note on the person, select the notes button (document icon) at the end of the row.

A row with no person selected isn't saved. If you lower **Required:**, GigWrangler removes open rows first and keeps the people you've assigned.

<!-- 📸 shot: gigs/staffing-assignments — Harvest Gala Dinner & Dance in edit mode (admin), Staff Assignments card with FOH Engineer (Sofia Lindqvist, Confirmed, fee) and Stage Manager (Marcus Reyes) plus an Open row, and the Total Staff Cost footer -->

## Finalizing completed work

When the work is done, finalize each assignment so it counts as a cost.

- For a **Confirmed** person, select **Finalize Assignment** (the green check). For a **Rate**, a **Finalize Rate-based Labor** dialog asks for **Units Completed**, such as the hours worked. Enter them and select **Finalize**.
- To finalize every confirmed fee in one step, select **Finalize All**. It skips rates, because it can't know the units.
- To reverse one, select **Undo Finalize**.

Finalizing adds a money-out entry for the gig (category Contract labor, description "Labor: &lt;role&gt;") to the **Financials** tab. Undoing it removes the entry. A finalized row is locked until you undo it.

## Staff cost

The footer shows **Total Staff Cost** in three parts:

- **Finalized**: finalized assignments (rate times units, or the fee).
- **Projected**: **Confirmed** and **Requested** assignments not yet finalized.
- **Total**: the two added together.

## Viewing staffing

Everyone in your organization who can open the gig sees a read-only **Staffing** card, headed with a summary such as "3 of 4 filled · 2 confirmed". Each row shows the role, the person (or **Open**), and a status badge. **Columns** adds phone, email and notes.

**Rate / Fee** and the staff cost line are for Admins and Managers only. Staff and Viewers don't see pay.

## Related

- [Participating organizations](/gigs/participating-organizations/)
- [Adding people without a login](/team/people-without-logins/)
- [Gigs overview](/gigs/overview/)
