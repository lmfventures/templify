import { Spinner } from '@/components/ui/spinner';

export default function DashboardLoading() {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500">
      <Spinner /> Loading dashboard…
    </div>
  );
}
