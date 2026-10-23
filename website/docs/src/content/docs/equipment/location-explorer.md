---
title: Locations
description: See where your equipment is right now, grouped by status and place, and correct a record that's wrong.
sidebar:
  order: 5
---

**Equipment → Locations** shows where your equipment is right now: what's checked out,
on a truck, at a venue or back in the warehouse. Every scan on the phone, and every
correction, updates it. Everyone in the organization can see it; Admins and Managers
can also correct a record.

![Locations: the Location, Gig, Item and Status filters, then Checked Out with the Staging Area (6 pieces) and Truck groups, each listing equipment under its kit, lots such as "XLR Cable, 50 ft 2 of 10"](../../../assets/screenshots/equipment/location-explorer-overview.png)

## Reading the page

The page is grouped by status, such as **Checked Out** or **In Warehouse**, and then by
place, such as "Staging Area" or "Warehouse, Bay 2", with how many pieces are there.
Inside each place, equipment is listed under its kit, which has an **Items** badge.
Each line shows the **Item**, its **Tag #**, the **Gig** of its latest record and when
it was **Last Scanned**. A lot's line also shows how many of its pieces are at that
place, such as "2 of 10". Equipment in maintenance has an **In maintenance** tag, with
its maintenance location when it has one, and equipment flagged to go when it comes home
has a **Flagged to maintenance** tag.

Each piece of equipment shows where its newest record puts it, across all gigs. A
monitor that went out to one gig and then on to another shows once, at the second gig.

### Cases

A case, such as the "Mic Case", has a **Container** badge. Open it to see what's
inside. When you scan a case, its contents are recorded with it, so they normally show
under the case.

If the case and its contents end up in different places, for example after you
correct the case's location by hand, the contents are listed in full under the case's
name with a **Contents** badge, at the place their own records give.

### Items without tags

Items without tags, such as cables, stands and the mics in a case, are counted rather
than tagged.

- **Inside a case,** they're one place: wherever their newest record in that case puts
  them.
- **Loose,** they show at each gig where pieces are still out, and once at home for
  the pieces that came back. A box of cables split between two gigs shows at both.

## Filtering

Use the filters at the top to narrow the list:

- **Item:** one item, such as "XLR Cable, 50 ft". A card above the list sums up where
  all of it is, for example "XLR Cable, 50 ft: 2 at Harvest Gala Dinner & Dance (Staging
  Area) · 8 not checked out". Pieces at home read "not checked out", unless they all came back
  on an **Unload** scan; then the card names where they were unloaded, such as
  "6 at Warehouse". Pieces in maintenance read, for example, "2 in maintenance · Repair
  Bench", and pieces flagged at a gig add "2 flagged to maintenance". The item's own page
  lists the same places under **Where they are**.
- **Location:** one place, such as "Truck".
- **Gig:** equipment whose current record is from that gig. Equipment that has since
  moved on to another gig isn't listed.
- **Status Filter:** select a status to hide or show it. All four are on to start with.

The filters look at where things are now, not at older records. If nothing matches,
you'll see "No items found matching the selected filters."

## Correcting a record

Admins and Managers can fix a record that's wrong, such as a case that came back
without being scanned.

1. Select the pencil button at the end of the item's line, or of the case's line.
2. In **Manual Tracking Override**, choose the **Gig**, the **Status** and the
   **Location**, and add **Notes** if you like.
3. Select **Save Override**.

To send a unit or lot for repair instead, see
[Sending to maintenance](#sending-to-maintenance) below.

The correction is a new record, so the item moves to its new place right away, and
the history of earlier records stays. Correcting a case moves the case. What's in it
keeps its own records.

### Moving part of a lot

You can move some of the pieces on a lot's line, such as "4 of 6", to another gig, or
bring them home with **In Warehouse**. The dialog asks how many: "Move 2 of the 4 at
Cedar Hall Fall Songwriter Showcase (Staging Area)". Below it, a line shows the result,
such as "After: 2 stay at Cedar Hall Fall Songwriter Showcase (Staging Area) · 2 back
home", and the button reads **Move 2**.

A new status at the same gig, such as **In Transit**, applies to all the pieces on the
line, so the count goes away.

If the pieces are in a case and you move some to another gig, the dialog warns "These
2 leave Mic Case. The case stays at Cedar Hall Fall Songwriter Showcase." The pieces you
move are loose at the new gig, and the rest stay in the case.

### Sending to maintenance

In **Manual Tracking Override**, tick **Mark for Maintenance**. The gig and status fields
give way to:

- **Send** *N* **of the** *M* **at** … for a lot, such as 2 of the 12 at Warehouse, Bay 2;
- **Maintenance location**, such as "Repair Bench", and **Expected back**;
- **Notes**, which become its condition notes.

Select **Send to maintenance**. Something at home goes into maintenance now; pieces of a
lot split off into their own entry. Something still out at a gig is flagged and goes in
when it comes home. Either way it's on the
[Maintenance](/equipment/inventory-reports/#maintenance) list.

For a unit or lot that's already in maintenance or flagged, the dialog says so instead of
offering the box.

## Related

- [Scanning equipment on your phone](/mobile/field-inventory/)
- [Assigning equipment to a gig](/equipment/assigning-to-a-gig/)
