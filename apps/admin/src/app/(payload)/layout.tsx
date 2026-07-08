import type { Metadata } from 'next';
import type { ServerFunctionClient } from 'payload';

import config from '@payload-config';
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts';

import { importMap } from './admin/importMap';

import './custom.scss';

type Args = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: 'Omnia Admin — Payload CMS',
};

const serverFunction: ServerFunctionClient = async (args) => {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) =>
  RootLayout({ children, config, importMap, serverFunction });

export default Layout;
