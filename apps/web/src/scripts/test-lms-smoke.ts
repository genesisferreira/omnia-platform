import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

import { EmptyState } from '../../../../packages/ui/src/components/ui/empty-state';
import { Progress } from '../../../../packages/ui/src/components/ui/progress';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(root, '../../..');

const LMS_PAGES = [
  'app/lms/page.tsx',
  'app/lms/cursos/page.tsx',
  'app/lms/cursos/[courseId]/page.tsx',
  'app/lms/cursos/[courseId]/atividades/[activityId]/page.tsx',
  'app/lms/continuar/page.tsx',
  'app/lms/progresso/page.tsx',
  'app/lms/notas/page.tsx',
  'app/lms/layout.tsx',
  'app/api/lms/[...path]/route.ts',
];

describe('LMS smoke routes', () => {
  for (const rel of LMS_PAGES) {
    it(`exists: ${rel}`, () => {
      assert.equal(existsSync(join(root, rel)), true);
    });
  }

  it('does not embed moodle host URLs in LMS app sources', () => {
    const lmsDir = join(root, 'app/lms');
    const componentsDir = join(root, 'components/lms');
    const files: string[] = [];

    function walk(dir: string) {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(p);
      }
    }
    walk(lmsDir);
    walk(componentsDir);

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      assert.equal(
        /moodle\.(dev\.)?omniafrigo|https?:\/\/moodle/i.test(text),
        false,
        `Moodle URL found in ${file}`,
      );
    }
  });

  it('product and architecture docs exist', () => {
    for (const doc of [
      'docs/lms/OMNIA_LMS_PRODUCT_SPEC.md',
      'docs/lms/OMNIA_LMS_FRONTEND_ARCHITECTURE.md',
      'docs/lms/OMNIA_LMS_DESIGN_SYSTEM.md',
      'docs/lms/OMNIA_LMS_COMPONENT_CATALOG.md',
      'docs/lms/OMNIA_LMS_LEARNING_ENGINE.md',
      'docs/lms/OMNIA_LMS_EVENT_CATALOG.md',
      'docs/lms/OMNIA_LMS_LESSON_EXPERIENCE.md',
      'docs/lms/OMNIA_LMS_MATERIAL_EXPERIENCE.md',
      'docs/lms/OMNIA_LMS_MATERIAL_VIEWER.md',
      'docs/lms/OMNIA_LMS_RENDERERS.md',
      'docs/lms/OMNIA_LMS_CONTENT_ARCHITECTURE.md',
      'docs/lms/OMNIA_LMS_ASSESSMENT_ENGINE.md',
      'docs/lms/OMNIA_LMS_ASSESSMENT_EXPERIENCE.md',
      'docs/lms/OMNIA_LMS_ACTIVITY_RENDERERS.md',
    ]) {
      assert.equal(existsSync(join(repoRoot, doc)), true, doc);
    }
  });

  it('lesson experience components exist', () => {
    for (const rel of [
      'components/lms/LessonWorkspace.tsx',
      'components/lms/LessonSidebar.tsx',
      'components/lms/LessonNav.tsx',
      'components/lms/LessonStatusBadge.tsx',
      'components/lms/LessonSkeleton.tsx',
      'lib/lms/lesson-nav.ts',
    ]) {
      assert.equal(existsSync(join(root, rel)), true, rel);
    }
  });

  it('material experience components exist', () => {
    for (const rel of [
      'components/lms/material/MaterialViewer.tsx',
      'components/lms/material/MaterialProvider.tsx',
      'components/lms/material/MaterialExperience.tsx',
      'components/lms/material/MaterialNav.tsx',
      'components/lms/material/renderers/renderers.tsx',
      'components/lms/material/renderers/registry.tsx',
      'lib/lms/material/resolve-material.ts',
      'lib/lms/material/security-ports.ts',
    ]) {
      assert.equal(existsSync(join(root, rel)), true, rel);
    }
  });

  it('assessment experience components exist', () => {
    for (const rel of [
      'components/lms/assessment/AssessmentViewer.tsx',
      'components/lms/assessment/AssessmentProvider.tsx',
      'components/lms/assessment/AssessmentExperience.tsx',
      'components/lms/assessment/AssessmentNav.tsx',
      'components/lms/assessment/renderers/renderers.tsx',
      'components/lms/assessment/renderers/registry.tsx',
    ]) {
      assert.equal(existsSync(join(root, rel)), true, rel);
    }
  });
});

describe('LMS UI components', () => {
  it('Progress renders accessible meter', () => {
    const html = renderToStaticMarkup(
      createElement(Progress, { value: 40, label: 'Progresso' }),
    );
    assert.match(html, /Progresso/);
    assert.match(html, /40%/);
  });

  it('EmptyState renders title and description', () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, {
        title: 'Sem cursos',
        description: 'Nenhuma matrícula',
      }),
    );
    assert.match(html, /Sem cursos/);
    assert.match(html, /Nenhuma matrícula/);
  });
});
