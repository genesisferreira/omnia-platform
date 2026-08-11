'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import {
  createControlledSecurityPorts,
  resolveMaterial,
  type MaterialDescriptor,
  type MaterialSecurityPorts,
  type ResolvedMaterial,
} from '@/lib/lms/material';

type MaterialProviderValue = {
  resolve: (descriptor: MaterialDescriptor, opts?: { offline?: boolean }) => ResolvedMaterial;
  security: MaterialSecurityPorts;
};

const MaterialContext = createContext<MaterialProviderValue | null>(null);

export function MaterialProvider(props: { children: ReactNode; security?: MaterialSecurityPorts }) {
  const security = props.security ?? createControlledSecurityPorts();
  const value = useMemo<MaterialProviderValue>(
    () => ({
      security,
      resolve: (descriptor, opts) => resolveMaterial({ descriptor, offline: opts?.offline }),
    }),
    [security],
  );

  return <MaterialContext.Provider value={value}>{props.children}</MaterialContext.Provider>;
}

export function useMaterialProvider(): MaterialProviderValue {
  const ctx = useContext(MaterialContext);
  if (!ctx) {
    throw new Error('useMaterialProvider must be used within MaterialProvider');
  }
  return ctx;
}
