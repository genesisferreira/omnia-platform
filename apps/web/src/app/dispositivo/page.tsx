import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { safePortalNextPath } from '@omnia/shared';

import { DeviceAccessPanel } from '@/components/device/DeviceAccessPanel';
import { fetchDeviceStatus, isBlockingState } from '@/lib/auth/device';
import { requirePortalSession } from '@/lib/auth/require-session';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Autorização de dispositivo — Omnia',
  robots: { index: false, follow: false },
};

export default async function DispositivoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safePortalNextPath(next, '/aluno');
  await requirePortalSession(`/dispositivo?next=${encodeURIComponent(nextPath)}`);
  const token = await getSessionToken();
  const status = token ? await fetchDeviceStatus(token) : null;
  if (!status || !isBlockingState(status.state)) redirect(nextPath);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <DeviceAccessPanel
        nextPath={nextPath}
        state={status.state}
        limit={status.limit ?? null}
        authorizedCount={status.authorizedCount ?? null}
        devices={(status.authorizedDevices ?? []).map((d) => ({
          label: d.label,
          deviceType: d.deviceType,
          createdAt: d.createdAt,
          lastSeenAt: d.lastSeenAt,
        }))}
        openRequest={
          status.openRequest
            ? { createdAt: status.openRequest.createdAt, status: status.openRequest.status }
            : null
        }
      />
    </main>
  );
}
