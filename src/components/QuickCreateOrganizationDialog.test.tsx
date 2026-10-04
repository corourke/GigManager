import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickCreateOrganizationDialog from './QuickCreateOrganizationDialog';
import { createOrganization } from '../services/organization.service';

const invoke = vi.fn();
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }) },
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
  })),
}));

vi.mock('../services/organization.service', () => ({
  createOrganization: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const PLACE = {
  place_id: 'place-1',
  name: 'Riverside Amphitheater',
  formatted_address: '1200 Waterfront Dr, Portland, OR 97209, USA',
  formatted_phone_number: '(503) 555-0100',
  website: 'https://riverside.example',
  address_components: [
    { long_name: '1200', short_name: '1200', types: ['street_number'] },
    { long_name: 'Waterfront Dr', short_name: 'Waterfront Dr', types: ['route'] },
    { long_name: 'Portland', short_name: 'Portland', types: ['locality'] },
    { long_name: 'Oregon', short_name: 'OR', types: ['administrative_area_level_1'] },
    { long_name: '97209', short_name: '97209', types: ['postal_code'] },
    { long_name: 'United States', short_name: 'US', types: ['country'] },
  ],
};

function renderDialog(onCreated = vi.fn()) {
  render(
    <QuickCreateOrganizationDialog
      open
      onOpenChange={vi.fn()}
      initialRoles={['Venue']}
      onCreated={onCreated}
    />,
  );
  return onCreated;
}

// Issue #111: the Google Places lookup from onboarding, when adding an
// organization from a gig.
describe('QuickCreateOrganizationDialog — Google Places lookup (#111)', () => {
  beforeEach(() => {
    invoke.mockReset();
    (createOrganization as any).mockReset();
    (createOrganization as any).mockImplementation(async (data: any) => ({ id: 'org-1', ...data }));
  });

  it('fills name, address, phone and website from the picked place and sends them on create', async () => {
    invoke.mockImplementation(async (path: string) =>
      path.startsWith('server/integrations/google-places/search')
        ? { data: { results: [{ place_id: 'place-1', name: PLACE.name }] }, error: null }
        : { data: PLACE, error: null });
    const user = userEvent.setup();
    const onCreated = renderDialog();

    await user.type(screen.getByPlaceholderText('Search Google Places...'), 'Riverside');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: /Riverside Amphitheater/ }));

    expect(screen.getByLabelText('Name *')).toHaveValue('Riverside Amphitheater');
    expect(screen.getByLabelText('Phone')).toHaveValue('(503) 555-0100');
    expect(screen.getByLabelText('Website')).toHaveValue('https://riverside.example');
    expect(screen.getByLabelText('Address')).toHaveValue('1200 Waterfront Dr');
    expect(screen.getByLabelText('City')).toHaveValue('Portland');
    expect(screen.getByLabelText('State')).toHaveValue('OR');
    expect(screen.getByLabelText('Postal code')).toHaveValue('97209');
    expect(screen.getByLabelText('Country')).toHaveValue('United States');

    // Still editable after the fill.
    await user.clear(screen.getByLabelText('Phone'));
    await user.type(screen.getByLabelText('Phone'), '503-555-0199');
    await user.click(screen.getByRole('button', { name: 'Create Organization' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(createOrganization).toHaveBeenCalledWith({
      name: 'Riverside Amphitheater',
      roles: ['Venue'],
      autoJoin: false,
      phone_number: '503-555-0199',
      url: 'https://riverside.example',
      address_line1: '1200 Waterfront Dr',
      city: 'Portland',
      state: 'OR',
      postal_code: '97209',
      country: 'United States',
    });
  });

  it('still creates from Name and Roles alone with no search', async () => {
    const user = userEvent.setup();
    const onCreated = renderDialog();

    expect(screen.queryByLabelText('Phone')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Name *'), 'The Back Room');
    await user.click(screen.getByRole('button', { name: 'Create Organization' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(createOrganization).toHaveBeenCalledWith({ name: 'The Back Room', roles: ['Venue'], autoJoin: false });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('offers the search for every organization type', () => {
    render(<QuickCreateOrganizationDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} initialRoles={['Act']} />);
    expect(screen.getByPlaceholderText('Search Google Places...')).toBeInTheDocument();
  });
});
