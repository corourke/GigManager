---
title: Roles & permissions
description: What each role can do, and how per-org roles work.
draft: true
sidebar:
  order: 2
---

## Cover

- The four roles: **Admin, Manager, Staff, Viewer** — a capability matrix (create/
  edit/delete gigs, read financials, manage members, edit the org).
- Roles are **per organization** — the same person can be Admin of one and Viewer
  of another.
- `canManage` gating: create/edit/delete controls are hidden for Staff/Viewer;
  Financials and gig creation are Admin/Manager only.
- **Seeded staff roles** (the job roles used on staff slots — FOH, Monitor,
  Lighting, Stage, etc.), how they differ from the account roles above, and how to
  add/rename them.
- Changing a member's role (Team screen → inline Role cell); only an Admin can
  create another Admin.

## Screenshots

- 📸 Team screen with the Role column.
- 📸 The capability matrix (build as a table, not a screenshot).

## Source

Plan §2 and §10. `src/components/team/*`, `supabase/functions/server/routes/organizations.ts`.
