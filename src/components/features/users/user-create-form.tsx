'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api/errors';
import { userMutations } from '@/lib/queries/users';

/**
 * Mutation demo. The new row appears because the mutation invalidates the
 * users cache — never because this component pushed data into a list.
 */
export function UserCreateForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation(userMutations.create(queryClient));

  // Field messages come from parseOrThrow's 422 in usersApi.create, carried by ApiError.
  const fields = error instanceof ApiError ? error.fields : undefined;
  // Messages for keys this form doesn't render a field next to (e.g. `_` for a
  // root-level zod issue such as a cross-field `.refine()`) must still surface
  // somewhere, or a 422 with only such issues fails silently.
  const unrenderedMessages = fields
    ? Object.entries(fields)
        .filter(([key]) => key !== 'name' && key !== 'email')
        .flatMap(([, messages]) => messages)
    : [];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // A mutate-level onSuccess composes with the factory's; it does not replace it.
    mutate(
      { name, email },
      {
        onSuccess: () => {
          setName('');
          setEmail('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            aria-label="Name"
            aria-invalid={fields?.name ? true : undefined}
          />
          {fields?.name?.map((message) => (
            <p key={message} className="text-xs text-red-600">
              {message}
            </p>
          ))}
        </div>

        <div className="space-y-1">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            aria-label="Email"
            aria-invalid={fields?.email ? true : undefined}
          />
          {fields?.email?.map((message) => (
            <p key={message} className="text-xs text-red-600">
              {message}
            </p>
          ))}
        </div>
      </div>

      {error && !fields ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : unrenderedMessages.length > 0 ? (
        <p className="text-sm text-red-600" role="alert">
          {unrenderedMessages.join(' ')}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? <Spinner /> : 'Add user'}
      </Button>
    </form>
  );
}
