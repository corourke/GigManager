---
title: Assets
description: The asset library — individual, trackable items.
draft: true
sidebar:
  order: 2
---

## Cover

- What an asset is (unique item, serial number, value, insurance, purchase link).
- The Asset Library: search, filter, columns, in-place editing (SmartDataTable).
- Creating an asset: Category from the organization list; Type as a comma path (general to specific) with suggestions from the types used in that category.
- Tracking a purchase line as equipment (Equipment switch + Equipment details pop-up on the receipt review screen).
- Asset detail / panel: view vs edit navigation.
- Statuses: Active, Inactive, Maintenance, Disposed, Returned, and **Missing** (set only by a
  write-off on a gig; see [Writing off missing equipment](/equipment/assigning-to-a-gig/#writing-off-missing-equipment)).
  On a Missing record the **Status** field is locked, with "Written off as missing. To bring it back,
  use Undo in the gig's Not returned list." Only Admins and Managers can set or clear Disposed or Returned.
- Item page: **Inventory** adds **Written off** "N missing"; **Owned**, **Available** and **Total value**
  leave out Missing pieces; in **Units and lots** a split-off lot reads "Lot of 2 · Missing".

## Screenshots

- 📸 Asset Library with filters.
- 📸 Asset detail panel.

## Source

Plan §4. `docs/technical/*`.
