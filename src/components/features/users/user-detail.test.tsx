import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  api: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { ApiError } from '@/lib/api/errors';
import { renderWithQuery } from '@/test/render-with-query';
import { UserDetail } from './user-detail';

const grace = { id: 3, name: 'Grace Hopper', email: 'grace@example.com' };

beforeEach(() => {
  get.mockReset();
});

describe('UserDetail', () => {
  it('does not query while no user is selected', () => {
    renderWithQuery(<UserDetail userId={null} />);

    expect(get).not.toHaveBeenCalled();
  });

  it('fetches and renders the selected user', async () => {
    get.mockResolvedValue(grace);

    renderWithQuery(<UserDetail userId={3} />);

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/users/3', expect.anything());
  });

  it('surfaces a 404 as an alert', async () => {
    get.mockRejectedValue(new ApiError({ message: 'User not found', status: 404 }));

    renderWithQuery(<UserDetail userId={99} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('User not found');
  });
});
