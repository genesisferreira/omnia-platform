import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { INSTITUTIONAL_NAV_ITEMS } from '../components/layout/nav-items';
import {
  isFocusLeavingContainer,
  isPointerOutsideContainer,
} from '../components/layout/partners-menu';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('partners nav items', () => {
  it('exposes real public routes for dropdown children', () => {
    const partners = INSTITUTIONAL_NAV_ITEMS.find((item) => item.label === 'Parceiros');
    assert.ok(partners?.children);
    assert.deepEqual(
      partners.children.map((child) => ({ href: child.href, label: child.label })),
      [
        { href: '/parceiros', label: 'Encontrar parceiros' },
        { href: '/parceiros/cadastro', label: 'Seja um parceiro' },
      ],
    );
  });

  it('footer flattens the same partner hrefs', () => {
    const footerLinks = INSTITUTIONAL_NAV_ITEMS.flatMap((item) =>
      item.children
        ? item.children.map((child) => ({ href: child.href, label: child.label }))
        : [{ href: item.href, label: item.label }],
    );

    assert.ok(
      footerLinks.some(
        (link) => link.href === '/parceiros' && link.label === 'Encontrar parceiros',
      ),
    );
    assert.ok(
      footerLinks.some(
        (link) => link.href === '/parceiros/cadastro' && link.label === 'Seja um parceiro',
      ),
    );
  });
});

describe('partners menu focus/pointer helpers', () => {
  it('keeps menu open when focus moves to a child link', () => {
    const link = { nodeType: 1 } as unknown as EventTarget;
    const container = {
      contains: (node: Node) => node === (link as unknown as Node),
    } as HTMLElement;
    assert.equal(isFocusLeavingContainer(container, link), false);
  });

  it('closes menu when focus leaves the container', () => {
    const container = { contains: () => false } as unknown as HTMLElement;
    const outside = { nodeType: 1 } as unknown as EventTarget;
    assert.equal(isFocusLeavingContainer(container, outside), true);
    assert.equal(isFocusLeavingContainer(container, null), true);
    assert.equal(isFocusLeavingContainer(null, outside), true);
  });

  it('detects outside pointer targets for click-away', () => {
    const inside = { nodeType: 1 } as unknown as EventTarget;
    const container = {
      contains: (node: Node) => node === (inside as unknown as Node),
    } as HTMLElement;
    assert.equal(isPointerOutsideContainer(container, inside), false);
    assert.equal(
      isPointerOutsideContainer(container, { nodeType: 1 } as unknown as EventTarget),
      true,
    );
    assert.equal(isPointerOutsideContainer(null, inside), true);
  });
});

describe('header partners dropdown regression', () => {
  const headerSource = readFileSync(join(root, 'components/layout/Header.tsx'), 'utf8');
  const accountNavSource = readFileSync(join(root, 'components/layout/AccountNav.tsx'), 'utf8');
  const linkSource = readFileSync(join(root, 'components/layout/InstitutionalNavLink.tsx'), 'utf8');

  it('does not use blur-timeout that unmounts links before click', () => {
    assert.equal(headerSource.includes('setTimeout'), false);
    assert.equal(
      headerSource.includes('onBlur={() => {\n                    window.setTimeout'),
      false,
    );
  });

  it('closes partners dropdown only when focus leaves the container', () => {
    assert.match(headerSource, /isFocusLeavingContainer/);
    assert.match(headerSource, /isPointerOutsideContainer/);
    assert.match(headerSource, /aria-expanded=\{partnersOpen\}/);
    assert.match(headerSource, /aria-controls=\{partnersId\}/);
  });

  it('renders partner children with InstitutionalNavLink (real links)', () => {
    assert.match(headerSource, /item\.children\.map\(\(child\) => \([\s\S]*InstitutionalNavLink/);
    assert.match(linkSource, /from 'next\/link'/);
    assert.match(linkSource, /<Link href=\{href\}/);
  });

  it('closes menu after partner link click without gating on auth', () => {
    assert.match(headerSource, /onClick=\{\(\) => setPartnersOpen\(false\)\}/);
    assert.match(headerSource, /onClick=\{closeMenu\}/);
    assert.equal(headerSource.includes('/api/me'), false);
    assert.equal(headerSource.includes('authenticated'), false);
  });

  it('treats /api/me failure as anonymous in AccountNav without blocking header', () => {
    assert.match(accountNavSource, /fetch\('\/api\/me'/);
    assert.match(accountNavSource, /setAuthenticated\(response\.ok\)/);
    assert.match(accountNavSource, /setAuthenticated\(false\)/);
  });

  it('Escape closes open menus', () => {
    assert.match(headerSource, /event\.key === 'Escape'/);
    assert.match(headerSource, /\[menuOpen, partnersOpen\]/);
  });
});

// eslint-disable-next-line no-console -- saída de script de teste
console.log('testes partners-nav ok');
