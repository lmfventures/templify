import { useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryProvider } from './provider';

function Probe() {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => Promise.resolve('ready'),
  });

  return <p>{data ?? 'pending'}</p>;
}

describe('QueryProvider', () => {
  it('supplies a QueryClient to its descendants', async () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );

    expect(await screen.findByText('ready')).toBeInTheDocument();
  });
});
