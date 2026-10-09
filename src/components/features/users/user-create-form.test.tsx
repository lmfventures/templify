import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  api: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { ApiError } from '@/lib/api/errors';
import { renderWithQuery } from '@/test/render-with-query';
import { UserCreateForm } from './user-create-form';
import { UserSearch } from './user-search';

const ada = { id: 11, name: 'Ada Lovelace', email: 'ada@example.com' };

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('UserCreateForm', () => {
  it('refetches the list after a successful create', async () => {
    get.mockResolvedValue([]);
    post.mockResolvedValue(ada);
    const user = userEvent.setup();

    renderWithQuery(
      <>
        <UserSearch />
        <UserCreateForm />
      </>,
    );
    await screen.findByText('No users found.');
    expect(get).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    get.mockResolvedValue([ada]);
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(2);
    });
    expect(post).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ body: { name: 'Ada Lovelace', email: 'ada@example.com' } }),
    );
  });

  it('clears the inputs once the create succeeds', async () => {
    get.mockResolvedValue([]);
    post.mockResolvedValue(ada);
    const user = userEvent.setup();

    renderWithQuery(<UserCreateForm />);
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('');
    });
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('renders field messages from its own validation without sending a request', async () => {
    const user = userEvent.setup();

    renderWithQuery(<UserCreateForm />);
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(post).not.toHaveBeenCalled();
  });

  it('surfaces a root-level (unkeyed) field message instead of failing silently', async () => {
    post.mockRejectedValue(
      new ApiError({
        message: 'Invalid request body',
        status: 422,
        code: 'validation_error',
        fields: { _: ['Name and email must differ'] },
      }),
    );
    const user = userEvent.setup();

    renderWithQuery(<UserCreateForm />);
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Name and email must differ',
    );
  });
});
