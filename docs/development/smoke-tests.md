Manual smoke tests for Phase 2A:

[x] The assignment must be displayed for another potential assignment (default to ‘Open’ and unassigned.)
[x] The correct number of slots should always display (as set by the ‘required’ field.)
[x] Only assigned slots are currently displayed in the UI. Open and unassigned slots should also display.

[x] On Edit Gig, Duplicate does not work. It gives an error: ‘null value in column “start” of relation “gigs” violates not-null constraint’.
[x] When editing Gig title or changing the Gig Status, the ‘saving… saved’ message displays twice.
[x] If you make a change and quickly hit the ‘Back to Gigs’ link before the debounce timeout, the data is not saved. The ‘Back to Gigs’ link should trigger a save.
[x] When attempting to add a Bid, repeated errors are given: ‘null value in column “amount” of relation “gig_bids” violates not-null constraint’ before user has had a chance to input the number.
[x] Under Team, when editing a team member, changing a phone number field and hitting submit does not save it to the database.
[x] Attempting to delete an expired pending invitation gives an error: ‘duplicate key value violates unique constraint “uniquependinginvitation”’.
[x] The ‘Back to Gigs’ link should be duplicated at the bottom of the page for user convenience.
[x] On 'Duplicate Gig' all data is replicated correctly except for Bids and staff slot assignments.

[x] On unassigned staff slots, I need the number of assignment rows to equal the slot count, but do not count any slots that have status of "Declined". Also, I need a new slot assignment status: "Open" (for unassigned slots).

[x] On Create Gig, there is no way to submit a new Gig. There is no Submit button.
[x] On the GIg List screen, if I choose 'Duplicate', the list is not refreshed to show the newly duplicated Gig. 

[x] If the network is disconnected immediately after a change is made, the wrong toast error is shown repeatedly: ‘Access denied - no participants found’.
