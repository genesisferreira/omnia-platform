'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isAllowedWhileGated } from '@omnia/intelligent-learning';

export function StudentAcademicGate(props: { academicAllowed: boolean }) {
  const pathname = usePathname() || '/aluno';
  const router = useRouter();
  useEffect(() => {
    if (props.academicAllowed) return;
    if (isAllowedWhileGated(pathname)) return;
    router.replace('/aluno/onboarding');
  }, [pathname, props.academicAllowed, router]);
  return null;
}
