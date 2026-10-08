import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsScreen from '../SettingsScreen';

// #176: Settings links straight to the organization's Edit Organization screen.
vi.mock('../AppHeader', () => ({ default: () => null }));
vi.mock('../CalendarIntegrationSettings', () => ({ default: () => null }));
vi.mock('./CategoriesSettings', () => ({ default: () => null }));

const noop = () => {};
const settings = (userRole: any, onEditOrganization = vi.fn()) => {
  render(
    <SettingsScreen organization={{ id: 'org-1', claimed: true } as any} user={{ id: 'u1' } as any} userRole={userRole}
      onBack={noop} onNavigateToDashboard={noop} onNavigateToGigs={noop} onNavigateToAssets={noop}
      onSwitchOrganization={noop} onLogout={noop} onEditOrganization={onEditOrganization} />,
  );
  return onEditOrganization;
};

describe('Settings → Edit Organization (#176)', () => {
  it('an Admin opens Edit Organization from Settings', async () => {
    const onEditOrganization = settings('Admin');
    await userEvent.click(screen.getByRole('button', { name: /Edit Organization/ }));
    expect(onEditOrganization).toHaveBeenCalledTimes(1);
  });
  it.each(['Manager', 'Staff', 'Viewer'])('a %s doesn\'t get the link', (role) => {
    settings(role);
    expect(screen.queryByRole('button', { name: /Edit Organization/ })).not.toBeInTheDocument();
  });
});
