## When logged in as an Admin user. 

### At the Gig List Screen
[ ] There is no way to navigate to the Gig Edit Screen because when clicking the Edit row menu choice, the Time and Date dialog appears instead. The Edit choice should take the user to the Gig Edit screen. 
[ ] The Gig List was intended to be a spreadsheet-like experience that allows for rapid entry and editing of rows. Right now you click into controls, rather than tabbing between columns. This needs to be more fluid, similar to the way tables operate in Coda or Notion. 
    [ ] Allow TAB to go forward a column, and Shift-TAB to go backwards. 
    [ ] When in a cell, make the cell selection less jarring. Don't add a large outline, a subtle shading will do, don't allow the data to shift around due to padding, don't change the column width. 
    [ ] For select lists, allow typing in the field and allow the typing to narrow a list of selections, with a TAB selecting the highlighted selection. Similar to how Excel works. Also Coda does a good job of this. 
    [ ] When adding tags, a TAB or Enter selects the tag, and a second TAB will move to the next column. 
    [ ] The Edit Date & Time dialog is a regression. It used to be that you could efficiently edit the date and time inline. Use the same date and time editing control that is used on the Gig Edit screen (GigBasicInfoSection.tsx).
[ ] The Gig List table is different from all other tables in that it has a row menu (the three dots at the beginning of each row) instead of the Edit, View, Duplicate and Trash Actions that are seen at the end of each row on the Team, Assets and Kits lists. Make all Lists work the same
    [ ] Gigs List rows should have View, Edit, Duplicate and Trash
    [ ] Teams List rows should have View and Edit
    [ ] Assets List rows should have View, Edit, Duplicate and Trash
    [ ] Kit List rows already have View, Edit, Duplicate and Trash
[ ] When you 'View' a row, it should display a compact, read-only screen that is optimized for display, with Edit, Duplicate and Trash buttons in the upper right, as has been implemented with the KitDetailScreen.tsx.
[ ] The 'Edit Profile' menu item under the user avatar menu should always be present. In other works, the user avatar menu should be the same everywhere. 
[ ] In the Team screen, when attempting to add a new team member, when I fill out the user form and click 'Send Invitation' I'm seeing console errors: 
    currentRoute: team
    POST @supabase_supabase-js.js?v=624f4b5c:5827  POST https://qcrzwsazasaojqoqxwnr.supabase.co/rest/v1/users?select=* 
    403 (Forbidden)
    (anonymous) @ @supabase_supabase-js.js?v=624f4b5c:5827
    (anonymous) @ @supabase_supabase-js.js?v=624f4b5c:5845
    await in (anonymous)
    then @ @supabase_supabase-js.js?v=624f4b5c:85
    
    api-error-utils.ts:29 Error invite user to organization: {code: '42501', details: null, hint: null, message: 'new row violates row-level security policy for table "users"'}
    handleApiError @ api-error-utils.ts:29
    inviteUserToOrganization @ organization.service.ts:400
    await in inviteUserToOrganization
    handleInviteNewUser @ TeamScreen.tsx:260
    callCallback2 @ chunk-3LEBMX3J.js?v=624f4b5c:3680
    invokeGuardedCallbackDev @ chunk-3LEBMX3J.js?v=624f4b5c:3705
    invokeGuardedCallback @ chunk-3LEBMX3J.js?v=624f4b5c:3739
    invokeGuardedCallbackAndCatchFirstError @ chunk-3LEBMX3J.js?v=624f4b5c:3742
    executeDispatch @ chunk-3LEBMX3J.js?v=624f4b5c:7046
    processDispatchQueueItemsInOrder @ chunk-3LEBMX3J.js?v=624f4b5c:7066
    processDispatchQueue @ chunk-3LEBMX3J.js?v=624f4b5c:7075
    dispatchEventsForPlugins @ chunk-3LEBMX3J.js?v=624f4b5c:7083
    (anonymous) @ chunk-3LEBMX3J.js?v=624f4b5c:7206
    batchedUpdates$1 @ chunk-3LEBMX3J.js?v=624f4b5c:18966
    batchedUpdates @ chunk-3LEBMX3J.js?v=624f4b5c:3585
    dispatchEventForPluginEventSystem @ chunk-3LEBMX3J.js?v=624f4b5c:7205
    dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-3LEBMX3J.js?v=624f4b5c:5484
    dispatchEvent @ chunk-3LEBMX3J.js?v=624f4b5c:5478
    dispatchDiscreteEvent @ chunk-3LEBMX3J.js?v=624f4b5c:5455
    TeamScreen.tsx:292 Error inviting user: {code: '42501', details: null, hint: null, message: 'new row violates row-level security policy for table "users"'}
    handleInviteNewUser @ TeamScreen.tsx:292
    await in handleInviteNewUser
    callCallback2 @ chunk-3LEBMX3J.js?v=624f4b5c:3680
    invokeGuardedCallbackDev @ chunk-3LEBMX3J.js?v=624f4b5c:3705
    invokeGuardedCallback @ chunk-3LEBMX3J.js?v=624f4b5c:3739
    invokeGuardedCallbackAndCatchFirstError @ chunk-3LEBMX3J.js?v=624f4b5c:3742
    executeDispatch @ chunk-3LEBMX3J.js?v=624f4b5c:7046
    processDispatchQueueItemsInOrder @ chunk-3LEBMX3J.js?v=624f4b5c:7066
    processDispatchQueue @ chunk-3LEBMX3J.js?v=624f4b5c:7075
    dispatchEventsForPlugins @ chunk-3LEBMX3J.js?v=624f4b5c:7083
    (anonymous) @ chunk-3LEBMX3J.js?v=624f4b5c:7206
    batchedUpdates$1 @ chunk-3LEBMX3J.js?v=624f4b5c:18966
    batchedUpdates @ chunk-3LEBMX3J.js?v=624f4b5c:3585
    dispatchEventForPluginEventSystem @ chunk-3LEBMX3J.js?v=624f4b5c:7205
    dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-3LEBMX3J.js?v=624f4b5c:5484
    dispatchEvent @ chunk-3LEBMX3J.js?v=624f4b5c:5478
    dispatchDiscreteEvent @ chunk-3LEBMX3J.js?v=624f4b5c:5455Understand this error