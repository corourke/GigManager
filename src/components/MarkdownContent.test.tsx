import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MarkdownContent from './MarkdownContent';

describe('MarkdownContent', () => {
  // Most existing gig notes are plain text with single line breaks (13 of 19 in
  // prod, 10-08); rendering them as Markdown must not run the lines together.
  it('keeps a single line break as a line break (#169)', () => {
    const { container } = render(<MarkdownContent>{'Load in 4 PM\nDoors 7 PM'}</MarkdownContent>);
    expect(container.querySelectorAll('br')).toHaveLength(1);
    expect(container.querySelector('p')?.textContent).toBe('Load in 4 PM\nDoors 7 PM');
  });

  it('still starts a new paragraph at a blank line', () => {
    const { container } = render(<MarkdownContent>{'One\n\nTwo'}</MarkdownContent>);
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });
});
