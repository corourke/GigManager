---
title: Inventory reports
description: The packing list for a gig, the manifest of what's at each location, and the maintenance queue.
draft: true
sidebar:
  order: 6
---

GigWrangler has three equipment reports. The **packing list** shows what a gig needs
and what's been packed for it. The **manifest** lists what's at a location, and the
**maintenance queue** lists what needs service.

<!-- TODO: write the Manifest and Maintenance queue sections. Still to cover:
- **Manifest**: **Equipment → Locations → Print manifest**. Dedupes assets across kit
  levels; interactive checkboxes on screen.
- **Maintenance queue**: **Equipment → Maintenance**. What needs service.
- When a field tech reaches for each.
Screenshots: Manifest with checkboxes.
Source: Plan §4, Prompt 7. Commits `Inventory reports` (2026-05-31) + 2026-08-26 fixes. -->

## Packing list

The packing list shows every piece of your organization's equipment a gig needs, kit
by kit, and how much of it is packed. To open it, open the gig and select the
**Equipment** tab. The **Packing list** card is at the bottom, below the gig's
equipment table, **Equipment needed** and **Not returned**.

Above the list, a line counts the pieces and how many are packed, such as
"54 pieces · 6 packed". A piece is one thing you pick up: a unit, one cable from a
lot, or a whole container. A packed piece is one that's been scanned out to this gig
and hasn't come back. Pieces that are checked back in at the warehouse don't count as
packed.

If the gig has no kits yet, you'll see "No kits assigned to this gig."

<!-- 📸 The Harvest Gala Dinner & Dance Equipment tab: the Packing list card with "54 pieces · 6 packed", the Full Band Sound Package heading and its lines, and the Club Lighting Package heading. -->

### How the list is laid out

Each kit assigned to the gig is a heading in bold, A to Z, with an **Items** or
**Container** badge. What's in the kit is listed under it, indented. Nested kits don't
get headings of their own. For example, the gear in "FOH Console Package" and
"Main PA: 4 Top / 2 Sub" is listed straight under "Full Band Sound Package". If the
same item or lot appears in two nested kits, it's one line with the quantities added
up.

The columns are:

- **✓**: a box to check off on screen. See [Checking items off](#checking-items-off).
- **Name**: the kit, item or container.
- **Tag #**: the tag of a unit, a container or a kit, or "—".
- **Qty**: how many the kit asks for.
- **Status**, **Last Scanned**, **Location**, **Scanned By** and **Notes**: the line's
  newest scan at this gig. A line that hasn't been scanned shows "Not scanned" under
  **Status**.

Select **Columns** to hide or show the last five columns. Your choice lasts until you
leave the page.

A kit that's also on another gig at overlapping times shows a **Conflict** badge. See
[Conflict detection](/gigs/conflict-detection/).

### Specific units and lots

A specific unit is one line with its tag, such as "Quillon QM-32 Digital Mixing
Console" with tag `DSL-0041`. Its **Qty** is 1.

A lot is a counted group of pieces with no tag. Its line shows how many the kit needs
under **Qty**, and the size of the lot you're taking them from underneath, such as
"XLR Cable, 50 ft", **Qty** 2, "from a lot of 10".

### "Any" lines

An "any" line asks for a number of whatever units of an item you own. It shows the
item's name with an **Any** badge, and the number under **Qty**. For example, the
Main PA asks for 4 × any "Halden HX-12P Powered Speaker".

How you pack it depends on whether the item's units have tags:

- **Tagged items are scanned.** Scan any of your units out to the gig. **Status** shows
  how many are scanned, such as "1 of 4". The tags of the units you scanned appear
  under the name.
- **Items with no tags are counted.** Count the pieces out instead. **Status** shows
  how many were counted, and how many are still missing, such as "7 counted · 3 short".
  Once they're all there, it reads "10 counted".

A unit that's on its own line elsewhere in the same kit doesn't fill an "any" line.

<!-- 📸 The Main PA lines under Full Band Sound Package: "Halden HX-12P Powered Speaker" with the Any badge, Qty 4 and "0 of 4". -->

### Containers

A container, such as the "Mic Case" or the "XLR Cable Box", is one line, because it
travels as one sealed case. It has a **Container** badge and its tag, and you scan the
case, not what's in it. Underneath, it lists what the case holds, such as
"16 × XLR Cable, 25 ft · 4 × XLR Cable, 50 ft".

A container inside a kit is indented under that kit. A container assigned to the gig on
its own is a heading of its own.

<!-- 📸 The Mic Case and XLR Cable Box lines under Full Band Sound Package, each with the Container badge and its contents. -->

### Checking items off

When you pack, you can check lines off on screen as you go.

1. On the gig's **Equipment** tab, find the line in **Packing list**.
2. Select the box in the **✓** column.

The line's name is crossed out. Select the box again to undo it.

:::note
Checks are a scratchpad for one packing pass. They aren't saved, and they clear when you
reload the page or the list refreshes. To record that something is packed, scan it.
:::

### Printing the packing list

1. Open the gig.
2. Select **Print → Packing list**.

**Print** is at the top of the gig page. It's hidden while you're editing the gig; select
**Done** first.

The printout starts with "Packing list" and your organization's name, then the gig's
title and date. On the right, it shows how many kits and lines there are, such as
"2 kits · 21 lines", and the date it was printed. Below that is the pieces line, such
as "54 pieces · 6 packed", and the full list with every column.

To fill in by hand:

- **A tagged "any" line** gets a blank to write in for each piece, up to 24. Write the
  tag of each unit you pack.
- **A counted "any" line** gets a box and a blank: "☐ count ______". Write the number
  you counted.
- **Every line** has an empty box in the **✓** column to tick.

<!-- 📸 The printed packing list for the Harvest Gala Dinner & Dance (print preview): the header with "2 kits · 21 lines", and the "Halden HX-12P Powered Speaker" line with four write-in blanks. -->

## Related

- [Kits (including nested kits)](/equipment/kits/)
- [Assigning equipment to a gig](/equipment/assigning-to-a-gig/)
- [Barcode scanning](/equipment/barcode-scanning/)
