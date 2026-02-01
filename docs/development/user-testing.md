## When logged in as an Admin user. 

### At the Gig List Screen
- [x] There is no way to navigate to the Gig Edit Screen because when clicking the Edit row menu choice, the Time and Date dialog appears instead. The Edit choice should take the user to the Gig Edit screen. 
- [ ] The Gig List was intended to be a spreadsheet-like experience that allows for rapid entry and editing of rows. Right now you click into controls, rather than tabbing between columns. This needs to be more fluid, similar to the way tables operate in Coda or Notion. 
    - [x] Make the table dimensions fixed so that it is not changing all the time.
    - [ ] Allow TAB to go forward a column, and Shift-TAB to go backwards. It is working in some places but not consistently. 
    - [ ] When in an editable cell, don't add an outline around the content, put a blue outline around the inside of the cell borders. Don't change the way the cell contents are displayed to make them editable, keep the formatting essentially the same. 
      - [ ] For Status, Venue and Act -- these are select lists. 
        - [ ] I want the selected item to be displayed as a pill. 
        - [ ] If the user starts to type, then the cell immediately becomes text entry for the select list and the list is filtered as the user types. Pressing Enter or TAB selects the highlighted choice. The effect is natural, intuitive, and efficient.	
        - [ ] I want each item in the list to automatically display using a different, rotating color. 
        - [ ] Clicking into any of these columns causes the column width to change.
        - [ ] The filtering action is not working on Venue and Act. 
      - [ ] For tags, I want the way tags display when not being edited, and when being edited to be the same. I want to be able to type in the cell like a text field in order to select tags. This is similar to how Coda works. 
        - [ ] If no tag yet, typing filters the select list, then the highlighted tag can be selected with Tab or Return. 
        - [ ] If there is already one or more tags, then the user is given a text edit cursor to the right of the existing tags, and if they type, they are selecting from a list of tags. If they instead hit backspace, the tag is deleted. 
    - [ ] For select lists, allow typing in the field and allow the typing to narrow a list of selections, with a TAB selecting the highlighted selection. Similar to how Excel works. Also Coda does a good job of this. 
    - [ ] When adding tags, a TAB or Enter selects the tag, and a second TAB will move to the next column. 
    - [x] The Edit Date & Time dialog is a regression. It used to be that you could efficiently edit the date and time inline. Use the same date and time editing control that is used on the Gig Edit screen (GigBasicInfoSection.tsx).
    - [ ] Fields should not be updated in the database unless they have changed. Just tabbing over columns should not trigger database updates.
      - [ ] Some columns are fixed, but dates are still saving to the databse when there are no changes. 
    - [ ] The tab order is bizarre. Tabs should advance the user within the table from left to right. 
- [x] The Gig List table is different from all other tables in that it has a row menu (the three dots at the beginning of each row) instead of the Edit, View, Duplicate and Trash Actions that are seen at the end of each row on the Team, Assets and Kits lists. Make all Lists work the same
    - [x] Gigs List rows should have View, Edit, Duplicate and Trash
    - [x] Teams List rows should have View and Edit
    - [x] Assets List rows should have View, Edit, Duplicate and Trash
    - [x] Kit List rows already have View, Edit, Duplicate and Trash
- [x] The View Gig screen should have the Edit, Duplicate and Trash buttons in the upper right, as has been implemented with the KitDetailScreen.tsx.
- [x] The 'Edit Profile' menu item under the user avatar menu should always be present. In other works, the user avatar menu should be the same everywhere. 
- [ ] In the Team screen, when attempting to add a new team member, when I fill out the user form and click 'Send Invitation' I get this error:
```
@supabase_supabase-js.js?v=92888a97:5827  POST https://qcrzwsazasaojqoqxwnr.supabase.co/rest/v1/rpc/invite_user_to_organization 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=92888a97:5827
(anonymous) @ @supabase_supabase-js.js?v=92888a97:5845
await in (anonymous)
then @ @supabase_supabase-js.js?v=92888a97:85Understand this error
api-error-utils.ts:29 Error invite user to organization: {code: 'PGRST202', details: 'Searched for the function public.invite_user_to_or…r, but no matches were found in the schema cache.', hint: 'Perhaps you meant to call the function public.user_organization_ids', message: 'Could not find the function public.invite_user_to_…e, p_organization_id, p_role) in the schema cache'}
handleApiError @ api-error-utils.ts:29
inviteUserToOrganization @ organization.service.ts:348
await in inviteUserToOrganization
handleInviteNewUser @ TeamScreen.tsx:263
callCallback2 @ chunk-3LEBMX3J.js?v=2d1d51c2:3680
invokeGuardedCallbackDev @ chunk-3LEBMX3J.js?v=2d1d51c2:3705
invokeGuardedCallback @ chunk-3LEBMX3J.js?v=2d1d51c2:3739
invokeGuardedCallbackAndCatchFirstError @ chunk-3LEBMX3J.js?v=2d1d51c2:3742
executeDispatch @ chunk-3LEBMX3J.js?v=2d1d51c2:7046
processDispatchQueueItemsInOrder @ chunk-3LEBMX3J.js?v=2d1d51c2:7066
processDispatchQueue @ chunk-3LEBMX3J.js?v=2d1d51c2:7075
dispatchEventsForPlugins @ chunk-3LEBMX3J.js?v=2d1d51c2:7083
(anonymous) @ chunk-3LEBMX3J.js?v=2d1d51c2:7206
batchedUpdates$1 @ chunk-3LEBMX3J.js?v=2d1d51c2:18966
batchedUpdates @ chunk-3LEBMX3J.js?v=2d1d51c2:3585
dispatchEventForPluginEventSystem @ chunk-3LEBMX3J.js?v=2d1d51c2:7205
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-3LEBMX3J.js?v=2d1d51c2:5484
dispatchEvent @ chunk-3LEBMX3J.js?v=2d1d51c2:5478
dispatchDiscreteEvent @ chunk-3LEBMX3J.js?v=2d1d51c2:5455Understand this error
TeamScreen.tsx:295 Error inviting user: {code: 'PGRST202', details: 'Searched for the function public.invite_user_to_or…r, but no matches were found in the schema cache.', hint: 'Perhaps you meant to call the function public.user_organization_ids', message: 'Could not find the function public.invite_user_to_…e, p_organization_id, p_role) in the schema cache'}
```

- [x] If I navigate to another browser tab and come back, the browser is refreshed
- [x] In the GIg List, the Start and End dates are not populating correctly, it also appears that time zone conversion isn't working properly. Simply follow what is done in src/components/gig/GigBasicInfoSection.tsx
- [x] I'm unable to get to the Edit Gig screen via the edit icon in the Gig List. 
- [x] Gig detail view should not show financials -- replace with a condensed list of the participants. 
- [ ] Note that if the End date/time goes into another day, we should only show the starting date and end time, unless the gig is more than 24 hours long

## Smoke Tests to Perform
After applying migrations and before proceeding to the next issue, perform these manual smoke tests to ensure the changes work as intended:

- [ ] Invitation Flow: As an Admin or Manager, attempt to invite a new user to an organization. Verify that the invitation is created without RLS errors, and that the pending user record is properly linked.
- [ ] User Activation: Have a test user accept an invitation and sign up. Confirm that the pending user is converted to active status and that all organization memberships and invitations are updated correctly.
- [ ] Global Navigation: Navigate through all authenticated routes (e.g., organization selection, admin screens, gig lists). Ensure the "Edit Profile" menu item is consistently visible and functional in the header.
- [ ] Role Permissions: Verify that only Admins/Managers can perform invitations, and that other roles are blocked appropriately.