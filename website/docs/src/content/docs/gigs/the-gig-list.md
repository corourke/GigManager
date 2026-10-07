---
title: The gig list
description: Find, filter, and open gigs from the Gigs list, and export what you see to CSV.
draft: true
sidebar:
  order: 2
---

The gig list is where you find a gig, check its status at a glance, and open it.
Everyone in the organization can see it. Open **Gigs** in the top nav. For what a
gig contains, see the [Gigs overview](/gigs/overview/).

<!-- 📸 shot: gigs/the-gig-list-upcoming — Admin, Gigs list on the Upcoming tab with the toolbar (tabs, All Dates, All Statuses, row count, Columns) and a few demo gigs (Harvest Gala Dinner & Dance etc.) in the table -->

## Upcoming and Past

The list has two tabs, each with a live count: **Upcoming** and **Past**. It opens on
**Upcoming**. A gig stays under **Upcoming** until its last day is over in the gig's
own time zone, so a gig that ends tonight is still upcoming this afternoon.

The toolbar above the table also shows how many rows are in the current tab.

## Filtering the list

Two drop-down filters sit next to the tabs.

- **All Dates** narrows the list by start date. Under **Future**, choose **+7d**,
  **+14d**, **+30d** or **All** to show gigs starting from now up to that many days
  ahead. Under **Past**, choose **-7d**, **-14d**, **-30d** or **All** to look back
  the same way. You can use one Future and one Past option together. Choose
  **All Dates** to clear both.
- **All Statuses** shows only the statuses you tick: **Date Hold**, **Proposed**,
  **Booked**, **Completed**, **Cancelled** and **Settled**. Choose **All** to clear it.

When a filter is on, its button turns blue and shows your choice. GigWrangler
remembers both filters in this browser, so they're still set the next time you open
Gigs. The same filters apply on the [calendar](/gigs/calendar-view/).

:::note
The date filter looks at when a gig starts. A multi-day gig that started yesterday
doesn't match **+7d**, even though it's still running.
:::

To search within one column, select the filter (funnel) icon in the **Title**,
**Status**, **Venue**, **Act** or **Tags** header (**Notes** too, when its column is
showing), then enter text under **Search...**. Select **Clear filters** next to the
row count to remove them all.

## Sorting and choosing columns

Select a column header to sort by it. The **Title**, **Start**, **Status**, **Venue**
and **Act** columns sort.

Select **Columns** to turn columns on or off. By default the list shows **Title**,
**Start**, **Status**, **Venue**, **Act** and **Tags**. You can add:

- **End** and **Notes**
- **Number of Staff**, **Cost of Staff**, **Revenue**, **Expenses** and **Profit**,
  which total up your organization's numbers for each gig. These are read-only.

The columns you choose are remembered in this browser.

## Opening a gig

Select a gig's title to open it. You can also open the **⋯** menu at the end of the
row and choose **View**. Admins and Managers also see **Edit** (opens the gig in edit
mode), **Duplicate** and **Delete** in that menu. **Delete** asks you to confirm
before it removes the gig.

<!-- 📸 shot: gigs/the-gig-list-row-menu — Admin, the ⋯ menu open on one row showing View, Edit, Duplicate and Delete -->

## Changing a gig from the list

Admins and Managers can fix a gig without opening it. Select a cell in the **Start**,
**End**, **Status**, **Tags** or **Notes** column, then select it again (or
double-click) to edit it in place. Press <kbd>Enter</kbd> to save. The change saves
straight away. Staff and Viewers see these cells as read-only.

## Adding gigs

Admins and Managers see **New Gig** and **Import** at the top right, plus **Add Row**
under the table. **New Gig** and **Add Row** both open the form described in
[Creating a gig](/gigs/creating-a-gig/). If the organization has no gigs yet, the
page shows "No gigs yet" with **Create First Gig** and **Import** instead.

## Spotting conflicts

If any gig has a double-booked person, venue or kit, a banner above the table says
how many conflicts were detected. Each line names the gig and what clashes, with a
**View** button that opens the gig. See
[Conflict detection](/gigs/conflict-detection/).

## Exporting to CSV

Select **Export** to download the list as a CSV file named like
`gigs-export-2026-10-07.csv`. **Export** is greyed out when the list is empty.

GigWrangler first asks "Export gigs as shown?". The file contains exactly what the
table is showing: the date and status filters, any column searches, the sort order
and the columns you've turned on with **Columns**. Select **Continue** to download, or
**Cancel** to adjust the list first. A message confirms how many gigs were exported.

The export covers the tab you're on, so switch to **Past** to export past gigs.

## On a phone

On a phone, **Gigs** shows a card list instead of a table. **Upcoming** and **Past**
are two sections on one scrolling page, and a search box sits above the same date and
status filters. Cards open the gig, and the **+** button adds one. There's no CSV
export or calendar on the phone. See [Mobile](/mobile/overview/).

## Related

- [Gigs overview](/gigs/overview/)
- [The calendar view](/gigs/calendar-view/)
- [Creating a gig](/gigs/creating-a-gig/)
