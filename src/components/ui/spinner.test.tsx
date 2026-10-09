import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from '@/components/ui/spinner';

describe('Spinner', () => {
  it('exposes a loading status to assistive tech', () => {
    render(<Spinner />);

    expect(screen.getByRole('status')).toHaveAccessibleName('Loading');
  });
});
