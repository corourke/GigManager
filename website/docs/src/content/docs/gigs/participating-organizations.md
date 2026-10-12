---
title: Participating organizations
description: Add the venue, acts, agencies and other organizations to a gig, set the client, and keep their day-of contacts.
sidebar:
  order: 6
---

Participants are the organizations working on a gig: the venue, the act, the client, the agency and any other vendors. Admins and Managers manage them in the **Participants** card in edit mode on the gig's **Overview** tab. Everyone else sees the same list, read-only. To staff your own crew, see [Staffing](/gigs/staffing-and-participants/).

Your organization is on every gig automatically, and you can't remove it or change its role.

## Adding an organization

1. Open the gig and select **Edit**.
2. In **Participants**, select **Add Participant**. A new row appears.
3. Choose a role from the first list: **Production**, **Sound**, **Lighting**, **Staging**, **Rentals**, **Venue**, **Act** or **Agency**.
4. Start typing in **Search organizations...** and choose a match.
5. If the organization isn't listed, select **Create "&lt;name&gt;"** and fill in the dialog. The new organization is added to the row.

The row saves as you go. To swap the organization on a row, select the X next to its name to clear it, then search again.

![The Participants card in edit mode with a new row: typing "Lumen" in the organization search shows No results found and a Create "Lumen" button](../../../assets/screenshots/gigs/participating-organizations-add.png)

:::note
The gig's venue comes from its **Venue** participant. It appears in the gig's header and in the **Venue** card, which also shows the venue's address and main contact. A gig can have more than one **Act**; the [schedule](/gigs/schedule/) lets you assign items to each.
:::

## Marking the client

Select the star on a participant's row. Its tooltip reads **Mark as client**, and once marked, **Client — click to unmark**. The star turns gold, and in read-only view the organization shows a gold star beside its name. You can mark more than one participant.

## Day-of contacts

Under each participant, GigWrangler lists the contacts for this gig. A contact here belongs to the gig, not to the organization's team, so you can list a venue manager without them having an account or being a member of the venue. Each contact shows their name, title, phone and email.

To add one:

1. Select the **More actions** (three dots) on the participant's row, then **Add Contact**.
2. Enter **First Name** and **Last Name**, and optionally **Email**, **Phone** and **Title**. While you type, matching people already in GigWrangler appear. Choose one to use them instead of creating a duplicate.
3. Leave **Set as primary contact for this gig** selected if this is the main contact. A new primary replaces the current one.
4. Select **Add New Person**, or choose a match from the list.

On an existing contact, select the star to set or unset them as primary. Hover over the row and select **Remove contact** (trash), then **Remove** to confirm. This takes them off this gig only.

![The Participants card in edit mode, each organization with its role and primary contact, and the venue's More actions menu open on Add Contact, Notes, View Organization and Edit Organization](../../../assets/screenshots/gigs/participating-organizations-contacts.png)

## More actions

The **More actions** menu on a participant also has:

- **Notes**: notes about this participant's part in the gig (for example, "Provides stage power").
- **View Organization**: the organization's details and your notes. Admins also see **Edit Organization** here.

To take an organization off the gig, select **Remove participant** (trash). See [Taking an organization off a gig](#taking-an-organization-off-a-gig) for when you can.

## The gig's owner

Every gig has an owner: the organization it was created in. When you create a gig, your organization owns it.

Only the owner's Admins and Managers can:

- change the gig's **status**, for example to **Cancelled**;
- hand the gig over to another organization on it, which becomes the owner (it can't be one that's [Inactive](#inactive-organizations));
- change which gig it's part of, for a gig that's part of a larger one.

Admins and Managers of the other organizations can still edit the gig's shared details: its title, times, time zone, notes and tags.

Only an Admin of the owner can delete the gig, and only while no other [claimed](/getting-started/organizations/) organization is on it, Inactive ones included. A claimed organization has its own Admin in GigWrangler; a venue or act you added that nobody has claimed doesn't count. Otherwise, the owner sets the gig to **Cancelled** instead.

## Taking an organization off a gig

The owner's Admins and Managers can take any organization off the gig, and an organization's own Admins and Managers can take it off. A venue or act that nobody has claimed can be taken off by an Admin or Manager of any organization on the gig that isn't Inactive. The owner can't be taken off.

An organization can come off only if it has no financials, kit assignments or staff slots on the gig. If it has any, mark it [Inactive](#inactive-organizations) instead.

When it comes off, its equipment scans and its contacts for the gig are deleted, and its purchases are no longer linked to the gig. If it has more than one role on the gig, such as **Venue** and **Act**, removing one role keeps the other, and nothing is deleted.

## Inactive organizations

An organization that has stepped back from a gig can be marked **Inactive** instead of being taken off. It keeps its role, and it still manages its own staffing, financials, kits and contacts on the gig. It can't change the gig's shared details, its schedule, or other organizations' contacts.

The owner's Admins and Managers, or the organization's own, can mark it Inactive and reactivate it. The owner is never Inactive.

## What everyone sees

In read-only view, the **Participants** card lists each organization's role, name, primary contact, phone, email and address. Select **Columns** to hide or show the optional ones. Your own organization is marked "(you)", and the eye icon opens the organization's details.

The participant list, schedule, venue and notes are shared with every organization on the gig. Each organization's staffing is private to that organization, so a venue or agency doesn't see who you've booked or what you pay.

## Related

- [Staffing](/gigs/staffing-and-participants/)
- [Schedule / run of day](/gigs/schedule/)
- [Gigs overview](/gigs/overview/)
