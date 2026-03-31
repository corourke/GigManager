

| Event        | Type    | Status           | Financial Impact                                             | Show `category` |
| ------------ | ------- | ---------------- | ------------------------------------------------------------ | --------------- |
| Bid          | Revenue | Bid-Submitted    | None                                                         | No              |
|              |         | Bid-Accepted     | None                                                         |                 |
|              |         | Bid-Rejected     | None                                                         |                 |
| Contract     | Revenue | Submitted        | None                                                         |                 |
|              |         | Revisions        | None                                                         |                 |
|              |         | Signed           | Adds to projected revenue                                    |                 |
|              |         | Rejected         | None                                                         |                 |
|              |         | Cancelled        | Removes effect of 'Contract Signed'                          |                 |
|              |         | Settled          | Relieves outstanding (projected) revenue / adds to actual revenue |                 |
|              |         | Partial-Payment  | Relieves outstanding (projected) revenue / adds to actual revenue |                 |
| Depost       |         | Deposit-Received | Relieves outstanding (projected) revenue / adds to actual revenue |                 |
|              |         | Deposit-Refunded | Increases outstanding (projected) revenue                    |                 |
| Invoice      | Revenue | Issued           | None                                                         |                 |
|              |         | Settled          | None                                                         |                 |
| Sub-Contract | Expense | Submitted        | None                                                         |                 |
|              |         | Revisions        | None                                                         |                 |
|              |         | Signed           | Adds to projected expense                                    |                 |
|              |         | Rejected         | None                                                         |                 |
|              |         | Cancelled        | Removes effect of 'Sub-Contract Signed'                      |                 |
|              |         | Settled          | None                                                         |                 |
| Deposit      |         | Deposit-Paid     | Relieves projected expense / adds to actual expense          |                 |
| Expense      | Expense | Incurred         | Adds to actual expense                                       | Yes - Sched C   |
|              |         | Paid             | Relieves projected expense / adds to actual expense          |                 |
|              |         | Reimbursed       | Relieves actual expense                                      |                 |

