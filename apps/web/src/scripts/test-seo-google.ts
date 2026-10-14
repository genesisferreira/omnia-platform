import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isForeignSitemapHost, isPrivatePath } from '../lib/seo/indexing';
import { sanitizePublicCopy } from '../lib/seo/public-copy';
import { buildRobotsDocument } from '../lib/seo/robots-policy';
import {
  assembleSitemapEntries,
  assertSitemapPagination,
  SitemapSourceError,
  toPublicSitemapUrl,
} from '../lib/seo/sitemap-entries';

describe('sitemap', () => {
  it('emite URLs canônicas e exclui rotas privadas', () => {
    const entries = assembleSitemapEntries({
      origin: 'https://www.omniafrigo.com.br',
      pages: [
        { pathname: '/' },
        { pathname: '/sobre' },
        { pathname: '/aluno', noIndex: false },
        { pathname: '/contato', noIndex: true },
      ],
      companySlugs: ['renovacao', 'fred-do-frio', '../admin'],
      posts: [
        { slug: 'refrigeracao-eficiente-no-brasil', publishedAt: '2026-07-17T12:00:00.000Z' },
        { slug: 'rascunho interno', noIndex: true },
      ],
      categorySlugs: ['tecnologia'],
      tagSlugs: ['refrigeracao'],
    });
    const urls = entries.map((entry) => entry.url);
    assert.ok(urls.includes('https://omniafrigo.com.br/'));
    assert.ok(urls.includes('https://omniafrigo.com.br/sobre'));
    assert.ok(urls.includes('https://omniafrigo.com.br/empresas/renovacao'));
    assert.ok(urls.includes('https://omniafrigo.com.br/empresas/fred-do-frio'));
    assert.ok(urls.includes('https://omniafrigo.com.br/blog/refrigeracao-eficiente-no-brasil'));
    assert.equal(urls.some((url) => url.includes('/aluno') || url.includes('/contato')), false);
    assert.equal(urls.some((url) => url.includes('admin') || url.includes('www.')), false);
  });

  it('recusa paginação acima do limite em vez de cortar em silêncio', () => {
    assert.throws(() => assertSitemapPagination(51), SitemapSourceError);
  });

  it('não publica path privado mesmo com origem válida', () => {
    assert.equal(toPublicSitemapUrl('https://omniafrigo.com.br', '/lms/cursos'), null);
    assert.equal(isPrivatePath('/escola/fred/login'), true);
    assert.equal(isPrivatePath('/cursos'), false);
  });

  it('não deixa host DEV entrar no sitemap de produção', () => {
    assert.equal(isForeignSitemapHost('omniafrigo.com.br', 'dev.omniafrigo.com.br'), true);
    assert.equal(isForeignSitemapHost('dev.omniafrigo.com.br', 'dev.omniafrigo.com.br'), false);
  });
});

describe('robots', () => {
  it('separa busca e treinamento e bloqueia áreas privadas', () => {
    const robots = buildRobotsDocument('https://www.omniafrigo.com.br');
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    const googlebot = rules.find((rule) => rule.userAgent === 'Googlebot');
    const gptbot = rules.find((rule) => rule.userAgent === 'GPTBot');
    const extended = rules.find((rule) => rule.userAgent === 'Google-Extended');
    assert.equal(robots.sitemap, 'https://omniafrigo.com.br/sitemap.xml');
    assert.ok(googlebot);
    assert.deepEqual(googlebot?.allow, '/');
    assert.ok(
      Array.isArray(googlebot?.disallow) && googlebot.disallow.includes('/aluno'),
    );
    assert.deepEqual(gptbot?.disallow, '/');
    assert.deepEqual(extended?.disallow, '/');
    assert.ok(rules.some((rule) => rule.userAgent === 'OAI-SearchBot' && rule.allow === '/'));
    assert.ok(rules.some((rule) => rule.userAgent === 'ClaudeBot' && rule.disallow === '/'));
  });
});

describe('copy pública', () => {
  it('remove jargão interno e placeholder de contato', () => {
    assert.equal(
      sanitizePublicCopy('Conteúdo gerenciado via Payload CMS no painel admin.'),
      'Informações da holding e das empresas reunidas para quem visita o site.',
    );
    assert.match(sanitizePublicCopy('Em breve, formulário e canais dedicados.'), /formulário de interesse/);
    assert.equal(sanitizePublicCopy('Texto institucional já aprovado.'), 'Texto institucional já aprovado.');
  });
});
