import { screen, within } from '@testing-library/react';

/**
 * #39 page frame: Back lives in PageHeader's slot, left of the title, named
 * for where it goes. Returns the button so a test can click it.
 */
export function getBackInHeaderSlot(name: string): HTMLElement {
  return within(screen.getByTestId('page-header-slot')).getByRole('button', { name });
}
