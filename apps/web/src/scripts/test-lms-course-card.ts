import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CourseCard } from '../components/lms/CourseCard';

describe('CourseCard', () => {
  it('renders title, status and actions', () => {
    const html = renderToStaticMarkup(
      createElement(CourseCard, {
        courseId: 12,
        title: 'Refrigeração básica',
        summary: '<p>Introdução</p>',
        progressPercent: 25,
        status: 'em_andamento',
      }),
    );
    assert.match(html, /Refrigeração básica/);
    assert.match(html, /Em andamento/);
    assert.match(html, /\/lms\/cursos\/12/);
    assert.match(html, /Introdução/);
    assert.doesNotMatch(html, /<p>/);
  });
});
