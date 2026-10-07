---
title: Roles & permissions
description: What each role can do on the Team screen, how to change a role, and how job positions work.
draft: true
sidebar:
  order: 2
---

Every member of an organization has one **system role**: **Admin**, **Manager**,
**Staff** or **Viewer**. Roles are per organization, so the same person can be an
Admin of one organization and a Viewer of another. Open **Team** in the top nav to
see and change them. For what each role can do across GigWrangler, see
[Roles & access](/reference/roles-and-access/).

## The Team screen

**Active Members** lists everyone in the organization, including people who haven't
signed in yet and people without a login. The columns are **Name**, **Email**,
**Position**, **System Role** and **Last Login**, plus an optional **Timezone**
column you can turn on from the table's column controls. A **You** badge marks your
own row, and **Pending** in **Last Login** means the person has been invited but
hasn't signed in.

Everyone can open the screen. What else you see depends on your role:

- **Admins and Managers** see **Add Team Member**, can edit cells in place, and
  see **Pending Invitations**.
- **Admins** also see **Pending Access Requests**, with **Approve** and **Reject**
  buttons for each request.
- **Staff and Viewers** see the list read-only, plus a **Request Access** button
  to ask for a higher role.

## Changing a role

Admins and Managers can change a role two ways:

- In the table, select a **System Role** cell and choose a role.
- Open the row's **⋯** menu → **Edit Permissions**, choose **Organization Role** in
  **Edit Team Member**, and select **Save Changes**.

Only Admins can make someone an Admin, change an Admin's role, or remove an Admin.
If a Manager tries, GigWrangler shows an error and nothing changes. **Edit Team
Member** doesn't show the role fields for your own row.

## Removing a member

Open the row's **⋯** menu → **Remove from Team**, then select **Remove Member**.
GigWrangler warns that the person loses access to all of the organization's data.
Admins and Managers can do this, except on their own row, where the menu item is
turned off.

## Positions

**Position** is a job title such as **FOH Engineer**, **Monitor Engineer**,
**Lighting Tech**, **Stage Manager**, **Stage Hand**, **Rigger**, **Video**,
**CameraOp** or **Runner**. It is separate from the system role: the role controls what
someone can do in GigWrangler, and the position is the job you'd normally staff
them for.

To set one, select a person's **Position** cell, or choose **Default Staffing Role**
in **Edit Team Member**. The default is **None**. GigWrangler uses it as the
starting role when you assign that person to a gig. The list of positions is shared
by all organizations, and you can't add or rename positions in the app.

<!-- 📸 shot: team/team-and-roles-members-table — Team screen as Admin Alicia Hale, Active Members table with Position and System Role columns visible, one System Role cell open to show the four roles -->

## Related

- [Roles & access](/reference/roles-and-access/)
- [Getting into an organization](/getting-started/organizations/)
