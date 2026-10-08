import { describe, it, expect } from 'vitest';
import { pickProfileUpdates } from './memberUpdate';

describe('pickProfileUpdates', () => {
  it('saves a member\'s timezone, as the Edit Team Member dialog sends it (#173)', () => {
    expect(pickProfileUpdates({ timezone: 'America/Denver' })).toEqual({ timezone: 'America/Denver' });
  });

  it('keeps the profile fields and drops anything else', () => {
    expect(pickProfileUpdates({ first_name: 'Sofia', phone: '555', role: 'Admin', email: 'x@y.z', platform_moderator: true }))
      .toEqual({ first_name: 'Sofia', phone: '555' });
  });

  it('leaves out fields that were not sent', () => {
    expect(pickProfileUpdates({ role: 'Staff' })).toEqual({});
  });
});
