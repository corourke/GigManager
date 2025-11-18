// Helper to get role options for select dropdowns
export const getRoleSelectItems = () => [
  {
    value: 'Admin',
    label: 'Admin - Full access',
    icon: 'crown',
    color: 'amber'
  },
  {
    value: 'Manager',
    label: 'Manager - Can manage gigs and team',
    icon: 'shield',
    color: 'blue'
  },
  {
    value: 'Staff',
    label: 'Staff - Can be assigned to gigs',
    icon: 'user',
    color: 'gray'
  },
  {
    value: 'Viewer',
    label: 'Viewer - Read-only access',
    icon: 'user',
    color: 'gray'
  }
];
