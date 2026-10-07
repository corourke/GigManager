---
title: Access requests & moderation
description: Ask for a higher role in an organization, and how Admins and platform moderators approve or reject the request.
draft: true
sidebar:
  order: 2
---

An access request is how a Viewer or Staff member asks for the Manager or Admin role in an organization they already belong to. An Admin of that organization decides it. If the organization has no Admin yet, a platform moderator does. For joining an organization in the first place, see [Getting into an organization](/getting-started/organizations/).

## Requesting access

Only Viewers and Staff see the button; Admins and Managers don't.

1. Open **Team**.
2. Select **Request Access** (top right).
3. Under **Requested role**, choose **Manager** or **Admin**.
4. Optionally, enter a **Message (optional)** saying why you need it.
5. Select **Submit Request**.

You see "Access request submitted". You can have one pending request per organization at a time; if you try to send a second, GigWrangler tells you that you already have one. Your role doesn't change until someone approves the request.

## Reviewing a request as an Admin

When someone asks for access, every Admin of the organization gets a notification in the bell (top right): "*Name* requested *Role* on *Organization*." Select it to open **Team**.

Pending requests are in the **Pending Access Requests** card on **Team**. Only Admins see the card, and only while a request is waiting. Each row shows the **Requester** (with email), the **Requested Role**, the **Message** and the date **Requested**.

- Select **Approve** to give the person the role they asked for. You see "Access request approved", and their role changes right away.
- Select **Reject** to decline. You see "Access request rejected", and their role stays as it was.

Either way the request leaves the list. You can't add a reply to the requester.

:::note
Admins can change a member's role directly, without a request, from **Team**. See [Roles & access](/reference/roles-and-access/).
:::

## What the requester sees

When the request is decided, the requester gets a notification in the bell: "Your request for *Role* on *Organization* was approved." or "…was rejected." Select the notification to dismiss it. They also get an email with the same news, with the subject "Your *Role* request for *Organization* was approved" (or "rejected"). The email can fail to send without affecting the decision, so the bell is the reliable notice.

## Platform moderators

A **platform moderator** is an account that GigWrangler marks with extra rights across all organizations. There's no setting for this in the app. Moderators do two things:

- **Decide access requests for unclaimed organizations.** An organization is unclaimed until it has an Admin, for example a venue someone registered with **Create without Joining**. Its first members have nobody to ask, so the request goes to the moderators.
- **Maintain the starter category lists.** These are the expense and equipment categories an organization is given the first time it needs a list.

A moderator has no say once an organization has an Admin, and has no access to its gigs or data.

### The moderator queue

Moderators have two extra items in the avatar menu (top right):

- **Access Requests** opens a queue of pending requests across every unclaimed organization. It has the same columns as the Admin's card, plus **Organization**, and the same **Approve** and **Reject** buttons. When it's empty you see "No Pending Requests". Select **Back to Select Organization** to leave.
- **Starter categories** opens the **Starter sets** that new organizations copy. Changing them doesn't change organizations that already have their own lists. See [Expense and equipment categories](/settings/categories/).

Moderators get a notification in the bell for each new request, and selecting it opens the queue.

### When a moderator approves an Admin request

If the request was for **Admin** on an unclaimed organization, approving it makes the person the organization's first Admin, and the organization becomes **claimed**. From then on its own Admins decide requests. Approving **Manager** on an unclaimed organization changes the person's role but leaves the organization unclaimed.

<!-- 📸 shot: reference/access-requests-pending-card — Team screen as Admin Alicia Hale, Pending Access Requests card with one request (seed: Victor Okafor requests Manager with a message; no pending requests exist now) -->

<!-- 📸 shot: reference/access-requests-moderator-queue — Access Requests queue as a platform moderator (needs a user with the moderator flag and one pending request on an unclaimed organization; neither exists in the demo data) -->

## Related

- [Getting into an organization](/getting-started/organizations/)
- [Roles & access](/reference/roles-and-access/)
- [Expense and equipment categories](/settings/categories/)
