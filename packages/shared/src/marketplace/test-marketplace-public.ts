import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildListingPublicSlug,
  computeProposalTotals,
  describePrice,
  formatCentsForInput,
  isMarketplaceListingPubliclyVisible,
  mapPublicMarketplaceListing,
  MARKETPLACE_LISTING_PRIVATE_FIELD_KEYS,
  parseBrlToCents,
  parseListingPublicSlug,
  parsePublicMarketplaceQuery,
  validateProposalBody,
  validateQuoteRequestBody,
} from '../index';

const visiblePartner = {
  id: 7,
  slug: 'frio-sul',
  companyName: 'Frio Sul LTDA',
  tradeName: 'Frio Sul',
  status: 'approved',
  active: true,
  publishedAt: '2026-01-01T00:00:00.000Z',
  verified: true,
  city: 'Curitiba',
  state: 'PR',
  document: '00000000000000',
  email: 'interno@frio.sul',
  approvalNotes: 'segredo',
};

const listing = (overrides: Record<string, unknown> = {}) => ({
  id: 12,
  slug: 'compressor-scroll',
  title: 'Compressor scroll',
  status: 'published',
  priceMode: 'fixed',
  price: 12990,
  description: 'Compressor para câmara fria.',
  brand: 'Copeland',
  sku: 'SKU-INTERNO',
  moderationNotes: 'nota interna',
  createdBy: 3,
  partner: visiblePartner,
  images: [{ image: { id: 1, url: '/media/a.png', alt: 'Foto' }, alt: 'Compressor' }],
  ...overrides,
});

describe('visibilidade pública do marketplace', () => {
  it('exige listing published e parceiro aprovado+ativo+publicado', () => {
    assert.equal(
      isMarketplaceListingPubliclyVisible({ status: 'published' }, visiblePartner),
      true,
    );
    assert.equal(isMarketplaceListingPubliclyVisible({ status: 'pending' }, visiblePartner), false);
    assert.equal(isMarketplaceListingPubliclyVisible({ status: 'draft' }, visiblePartner), false);
    assert.equal(
      isMarketplaceListingPubliclyVisible(
        { status: 'published' },
        { ...visiblePartner, status: 'pending' },
      ),
      false,
    );
    assert.equal(
      isMarketplaceListingPubliclyVisible(
        { status: 'published' },
        { ...visiblePartner, active: false },
      ),
      false,
    );
    assert.equal(
      isMarketplaceListingPubliclyVisible(
        { status: 'published' },
        { ...visiblePartner, publishedAt: null },
      ),
      false,
    );
    assert.equal(isMarketplaceListingPubliclyVisible({ status: 'published' }, 3 as never), false);
    assert.equal(isMarketplaceListingPubliclyVisible(null, visiblePartner), false);
  });

  it('mapeia DTO público sem campos privados', () => {
    const dto = mapPublicMarketplaceListing('product', listing());
    assert.ok(dto);
    assert.equal(dto.publicSlug, 'compressor-scroll-12');
    assert.equal(dto.priceCents, 12990);
    assert.equal(dto.partner.displayName, 'Frio Sul');
    assert.equal(dto.images[0]?.alt, 'Compressor');
    const serialized = JSON.stringify(dto);
    for (const key of MARKETPLACE_LISTING_PRIVATE_FIELD_KEYS) {
      assert.equal(serialized.includes(`"${key}"`), false, `vazou ${key}`);
    }
    for (const leaked of [
      'SKU-INTERNO',
      'nota interna',
      'segredo',
      'interno@frio.sul',
      '00000000000000',
    ]) {
      assert.equal(serialized.includes(leaked), false, `vazou ${leaked}`);
    }
  });

  it('arquivos com public:false nunca saem; ficha técnica só PDF liberado', () => {
    const dto = mapPublicMarketplaceListing(
      'product',
      listing({
        images: [
          { image: { id: 1, url: '/f/a.jpg', alt: 'ok', public: true } },
          { image: { id: 2, url: '/f/b.jpg', alt: 'rascunho', public: false } },
        ],
        datasheet: {
          id: 9,
          url: '/f/ficha.pdf',
          mimeType: 'application/pdf',
          alt: 'Ficha',
          public: true,
        },
      }),
    );
    assert.ok(dto);
    assert.deepEqual(
      dto.images.map((image) => image.id),
      ['1'],
    );
    assert.equal(dto.datasheet?.url, '/f/ficha.pdf');

    const hidden = mapPublicMarketplaceListing(
      'product',
      listing({
        datasheet: { id: 9, url: '/f/ficha.pdf', mimeType: 'application/pdf', public: false },
      }),
    );
    assert.equal(hidden?.datasheet, null);
    const notPdf = mapPublicMarketplaceListing(
      'product',
      listing({ datasheet: { id: 9, url: '/f/x.png', mimeType: 'image/png', public: true } }),
    );
    assert.equal(notPdf?.datasheet, null);
  });

  it('retorna null para listing/parceiro invisível ou parceiro não populado', () => {
    assert.equal(mapPublicMarketplaceListing('product', listing({ status: 'draft' })), null);
    assert.equal(mapPublicMarketplaceListing('product', listing({ partner: 7 })), null);
    assert.equal(
      mapPublicMarketplaceListing(
        'service',
        listing({ partner: { ...visiblePartner, status: 'suspended' } }),
      ),
      null,
    );
  });

  it('sob consulta nunca expõe preço; serviço não expõe marca', () => {
    const onRequest = mapPublicMarketplaceListing(
      'service',
      listing({ priceMode: 'on_request', price: 500 }),
    );
    assert.equal(onRequest?.priceCents, null);
    assert.equal(onRequest?.brand, null);
    assert.equal(describePrice('on_request', 500), 'Sob consulta');
  });
});

describe('slug público', () => {
  it('compõe e separa slug-id', () => {
    assert.equal(buildListingPublicSlug('compressor', 5), 'compressor-5');
    assert.deepEqual(parseListingPublicSlug('compressor-scroll-12'), {
      slug: 'compressor-scroll',
      id: '12',
    });
    assert.deepEqual(parseListingPublicSlug('sem-id'), { slug: 'sem-id', id: null });
  });
});

describe('preço em centavos', () => {
  it('converte reais para centavos inteiros', () => {
    assert.equal(parseBrlToCents('129,90'), 12990);
    assert.equal(parseBrlToCents('R$ 1.299,9'), 129990);
    assert.equal(parseBrlToCents('129'), 12900);
    assert.equal(parseBrlToCents('0'), 0);
    assert.equal(parseBrlToCents('12.5'), 1250);
  });
  it('rejeita valores inválidos', () => {
    assert.equal(parseBrlToCents(''), null);
    assert.equal(parseBrlToCents('abc'), null);
    assert.equal(parseBrlToCents('-5'), null);
    assert.equal(parseBrlToCents('1,234'), null);
    assert.equal(parseBrlToCents(12.5), null);
  });
  it('formata para input', () => {
    assert.equal(formatCentsForInput(12990), '129,90');
    assert.equal(formatCentsForInput(5), '0,05');
    assert.equal(formatCentsForInput(null), '');
  });
});

describe('validateQuoteRequestBody', () => {
  const base = {
    sourceType: 'product',
    listingId: 4,
    description: 'Preciso de 3 unidades urgentes.',
  };

  it('aceita produto com listing e normaliza campos', () => {
    const result = validateQuoteRequestBody({
      ...base,
      partnerId: '7',
      quantity: '3',
      city: ' Curitiba ',
      state: 'pr',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.quantity, 3);
      assert.equal(result.data.state, 'PR');
      assert.equal(result.data.city, 'Curitiba');
      assert.equal(result.data.partnerId, '7');
    }
  });
  it('projeto exige parceiro e ignora listing', () => {
    assert.equal(
      validateQuoteRequestBody({ sourceType: 'project', description: base.description }).ok,
      false,
    );
    const ok = validateQuoteRequestBody({
      sourceType: 'project',
      partnerId: 9,
      listingId: 3,
      description: base.description,
    });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.listingId, null);
  });
  it('rejeita origem, descrição, quantidade e UF inválidas', () => {
    assert.equal(validateQuoteRequestBody({ ...base, sourceType: 'x' }).ok, false);
    assert.equal(validateQuoteRequestBody({ ...base, listingId: undefined }).ok, false);
    assert.equal(validateQuoteRequestBody({ ...base, description: 'curto' }).ok, false);
    assert.equal(
      validateQuoteRequestBody({ ...base, description: '<script>alert(1)</script> aaaaaaaa' }).ok,
      false,
    );
    assert.equal(validateQuoteRequestBody({ ...base, quantity: 0 }).ok, false);
    assert.equal(validateQuoteRequestBody({ ...base, quantity: 1.5 }).ok, false);
    assert.equal(validateQuoteRequestBody({ ...base, state: 'PRR' }).ok, false);
    assert.equal(validateQuoteRequestBody(null).ok, false);
  });
});

describe('parsePublicMarketplaceQuery', () => {
  it('aplica limites e normaliza', () => {
    const q = parsePublicMarketplaceQuery(
      new URLSearchParams('q=%20  compressor   scroll&page=0&limit=999&brand=X'),
    );
    assert.equal(q.q, 'compressor scroll');
    assert.equal(q.page, 1);
    assert.equal(q.limit, 48);
    assert.equal(q.brand, 'X');
    assert.equal(q.category, null);
  });
});

describe('proposta comercial', () => {
  const item = { description: 'Compressor', quantity: 2, unitPriceCents: 150000 };

  it('calcula totais em centavos inteiros', () => {
    assert.deepEqual(computeProposalTotals([item], 10000, 2500), {
      subtotalCents: 300000,
      totalCents: 292500,
    });
    assert.equal(computeProposalTotals([item], 400000, 0), null);
    assert.equal(computeProposalTotals([{ quantity: 1, unitPriceCents: 10.5 }], 0, 0), null);
  });

  it('valida corpo e descarta valores inválidos', () => {
    const ok = validateProposalBody({
      quoteId: 5,
      title: 'Proposta A',
      items: [item],
      discountCents: 0,
      shippingCents: 2500,
    });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.totals.totalCents, 302500);
    assert.equal(validateProposalBody({ quoteId: 5, title: '', items: [item] }).ok, false);
    assert.equal(validateProposalBody({ quoteId: 5, title: 'x', items: [] }).ok, false);
    assert.equal(
      validateProposalBody({ quoteId: 5, title: 'x', items: [{ ...item, unitPriceCents: 12.3 }] })
        .ok,
      false,
    );
    assert.equal(
      validateProposalBody({ quoteId: 5, title: 'x', items: [item], validUntil: '2000-01-01' }).ok,
      false,
    );
    assert.equal(
      validateProposalBody({ quoteId: 5, title: 'x', items: [item], deliveryDays: -1 }).ok,
      false,
    );
  });
});
