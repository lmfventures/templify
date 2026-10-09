import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  api: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { ApiError } from '@/lib/api/errors';
import { renderWithQuery } from '@/test/render-with-query';
import { UserSearch } from './user-search';

const users = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com' },
];

beforeEach(() => {
  get.mockReset();
});

describe('UserSearch', () => {
  it('shows the loading state, then the list', async () => {
    get.mockResolvedValue(users);

    renderWithQuery(<UserSearch />);

    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('surfaces an ApiError as an alert', async () => {
    get.mockRejectedValue(new ApiError({ message: 'Upstream is down', status: 503 }));

    renderWithQuery(<UserSearch />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Upstream is down');
  });

  it('filters the rendered list by the debounced query', async () => {
    get.mockResolvedValue(users);
    const user = userEvent.setup();

    renderWithQuery(<UserSearch />);
    await screen.findByText('Ada Lovelace');

    await user.type(screen.getByLabelText('Search users'), 'grace');

    await waitFor(() => {
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('dedupes the read across two consumers sharing a client', async () => {
    get.mockResolvedValue(users);

    renderWithQuery(
      <>
        <UserSearch />
        <UserSearch />
      </>,
    );
    await screen.findAllByText('Ada Lovelace');

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('renders the detail panel for the user whose card is selected', async () => {
    get.mockImplementation((path: string) => {
      if (path === '/users/1') return Promise.resolve(users[0]);
      return Promise.resolve(users);
    });
    const user = userEvent.setup();

    renderWithQuery(<UserSearch />);
    await screen.findByText('Ada Lovelace');

    await user.click(screen.getByRole('button', { name: /Ada Lovelace/ }));

    expect(await screen.findByText('User #1')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/users/1', expect.anything());
  });
});
