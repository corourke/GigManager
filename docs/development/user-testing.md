## When logged in as an Admin user. 

### At the Gig List Screen
- [x] There is no way to navigate to the Gig Edit Screen because when clicking the Edit row menu choice, the Time and Date dialog appears instead. The Edit choice should take the user to the Gig Edit screen. 

- [x] The Gig List table is different from all other tables in that it has a row menu (the three dots at the beginning of each row) instead of the Edit, View, Duplicate and Trash Actions that are seen at the end of each row on the Team, Assets and Kits lists. Make all Lists work the same
    - [x] Gigs List rows should have View, Edit, Duplicate and Trash
    - [x] Teams List rows should have View and Edit
    - [x] Assets List rows should have View, Edit, Duplicate and Trash
    - [x] Kit List rows already have View, Edit, Duplicate and Trash
    
- [x] The View Gig screen should have the Edit, Duplicate and Trash buttons in the upper right, as has been implemented with the KitDetailScreen.tsx.

- [x] The 'Edit Profile' menu item under the user avatar menu should always be present. In other works, the user avatar menu should be the same everywhere. 

- [x] In the Team screen, when attempting to add a new team member, when I fill out the user form and click 'Send Invitation' I get this error: `TeamScreen.tsx:295 Error inviting user: {code: 'PGRST202', details: 'Searched for the function public.invite_user_to_or…r, but no matches were found in the schema cache.', hint: 'Perhaps you meant to call the function public.user_organization_ids', message: 'Could not find the function public.invite_user_to_…e, p_organization_id, p_role) in the schema cache'}`

- [x] If I navigate to another browser tab and come back, the browser is refreshed

- [x] In the GIg List, the Start and End dates are not populating correctly, it also appears that time zone conversion isn't working properly. Simply follow what is done in src/components/gig/GigBasicInfoSection.tsx

- [x] I'm unable to get to the Edit Gig screen via the edit icon in the Gig List. 

- [x] Gig detail view should not show financials -- replace with a condensed list of the participants. 

- [x] Note that if the End date/time goes into another day, we should only show the starting date and end time, unless the gig is more than 24 hours long

- [x] On the Team page, Active Members table, lets add a column to show the default staffing role -- show just the short value, and label it 'Position'. 

### User Invitation Flow

- [x] The profile completion screen should not allow the user to skip inputting their name and password at a minimum
- [x] If the invitation link is navigated to after the invitation has been accepted, it should give some kind of message, not just a blank page. We are getting this URL: `http://localhost:3000/accept-invitation#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`
- [x] When a member is removed from the Team screen, we need to redraw the table so that it displays the current state
- [x] In Add Team Member, Add Existing User when searching for existing users, no users are shown. We should show existing users that are not already members of the current organization. 
- [ ] If you Invite a New User for a user that is already in the system and Pending, it will give you a message that an invitation has been sent (which is the correct thing to do) but it appears that no message is being sent out. The purpose is to get the user into the UserProfileCompletionScreen workflow as they never set a password or signed in. 
- [x] When inviting a new user, if you enter an email address that is already present in the system, you get: "Edge Function returned a non-2xx status code". Instead you should get the other error returned by the API call: "A user with this email already exists and is active. Please use "Add Existing User" instead."



- [ ] When opening an invite link that was sent a few hours ago, I'm seeing a blank page, and the URL is: `http://localhost:3000/accept-invitation#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`
- [ ] Links should last a few days at least, and should display a message if they have expired, not just a blank page. 


**Tests**

- [x] Invitation Flow: As an Admin or Manager, attempt to invite a new user to an organization. Verify that the invitation is created without RLS errors, and that the pending user record is properly linked.
- [x] User Activation: Have a test user accept an invitation and sign up. Confirm that the pending user is converted to active status and that all organization memberships and invitations are updated correctly.
- [x] Role Permissions: Verify that only Admins/Managers can perform invitations, and that other roles are blocked appropriately.