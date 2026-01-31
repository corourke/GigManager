## When logged in as an Admin user. 

### At the Gig List Screen
- [x] There is no way to navigate to the Gig Edit Screen because when clicking the Edit row menu choice, the Time and Date dialog appears instead. The Edit choice should take the user to the Gig Edit screen. 
- [ ] The Gig List was intended to be a spreadsheet-like experience that allows for rapid entry and editing of rows. Right now you click into controls, rather than tabbing between columns. This needs to be more fluid, similar to the way tables operate in Coda or Notion. 
    - [ ] Make the table dimensions fixed so that it is not changing all the time.
    - [ ] Allow TAB to go forward a column, and Shift-TAB to go backwards. 
    - [ ] When in a cell, make the cell selection less jarring. Don't add a large outline, a subtle shading will do, don't allow the data to shift around due to padding, don't change the column width. 
    - [ ] For select lists, allow typing in the field and allow the typing to narrow a list of selections, with a TAB selecting the highlighted selection. Similar to how Excel works. Also Coda does a good job of this. 
    - [ ] When adding tags, a TAB or Enter selects the tag, and a second TAB will move to the next column. 
    - [ ] The Edit Date & Time dialog is a regression. It used to be that you could efficiently edit the date and time inline. Use the same date and time editing control that is used on the Gig Edit screen (GigBasicInfoSection.tsx).
- [x] The Gig List table is different from all other tables in that it has a row menu (the three dots at the beginning of each row) instead of the Edit, View, Duplicate and Trash Actions that are seen at the end of each row on the Team, Assets and Kits lists. Make all Lists work the same
    - [x] Gigs List rows should have View, Edit, Duplicate and Trash
    - [x] Teams List rows should have View and Edit
    - [x] Assets List rows should have View, Edit, Duplicate and Trash
    - [x] Kit List rows already have View, Edit, Duplicate and Trash

- [ ] The View Gig screen should have the Edit, Duplicate and Trash buttons in the upper right, as has been implemented with the KitDetailScreen.tsx.
- [ ] The 'Edit Profile' menu item under the user avatar menu should always be present. In other works, the user avatar menu should be the same everywhere. 
- [ ] In the Team screen, when attempting to add a new team member, when I fill out the user form and click 'Send Invitation' 
- [ ] If I navigate to another browser tab and come back, the browser is refreshed
- [x] In the GIg List, the Start and End dates are not populating correctly, it also appears that time zone conversion isn't working properly. Simply follow what is done in src/components/gig/GigBasicInfoSection.tsx
- [x] I'm unable to get to the Edit Gig screen via the edit icon in the Gig List. 
- [ ] Gig detail view should not show financials if we are not the gig owner. 
- [ ] Note that if the End date/time goes into another day, we only show the starting date and end time, unless the gig is more than 24 hours long

## Smoke Tests to Perform
After applying migrations and before proceeding to the next issue, perform these manual smoke tests to ensure the changes work as intended:

- [ ] Invitation Flow: As an Admin or Manager, attempt to invite a new user to an organization. Verify that the invitation is created without RLS errors, and that the pending user record is properly linked.
- [ ] User Activation: Have a test user accept an invitation and sign up. Confirm that the pending user is converted to active status and that all organization memberships and invitations are updated correctly.
- [ ] Global Navigation: Navigate through all authenticated routes (e.g., organization selection, admin screens, gig lists). Ensure the "Edit Profile" menu item is consistently visible and functional in the header.
- [ ] Role Permissions: Verify that only Admins/Managers can perform invitations, and that other roles are blocked appropriately.