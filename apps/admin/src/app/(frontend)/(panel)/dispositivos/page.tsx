import { redirect } from 'next/navigation';

import { DeviceAdminPanel } from '@/components/devices/DeviceAdminPanel';
import { requireStaffSession } from '@/lib/auth';
import { canChangeDevicePolicy, canManageDevices } from '@/services/devices/policy';

export const dynamic = 'force-dynamic';

/** Master Admin — Device Access Control (super_admin: política; super_admin/admin: ações). */
export default async function DispositivosPage() {
  const { user } = await requireStaffSession();
  if (!canManageDevices(user)) redirect('/unauthorized');
  return <DeviceAdminPanel canChangePolicy={canChangeDevicePolicy(user)} />;
}
