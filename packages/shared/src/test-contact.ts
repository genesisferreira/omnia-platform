import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CONTACT_SUBJECTS,
  OMNIA_CONTACT_EMAIL,
  buildOmniaWhatsappUrl,
  contactSubjectLabel,
  validateContactMessage,
} from './contact';

const valid = {
  nome: 'Maria Silva',
  email: 'Maria@Exemplo.com.br ',
  assunto: 'automacao-ia',
  mensagem: 'Gostaria de conhecer as soluções de automação.',
};

describe('contato oficial', () => {
  it('WhatsApp abre o número oficial com a mensagem inicial', () => {
    const url = new URL(buildOmniaWhatsappUrl());
    assert.equal(url.origin + url.pathname, 'https://wa.me/553128880650');
    assert.equal(
      url.searchParams.get('text'),
      'Olá! Vim pelo site da Omnia Frigo Holding e gostaria de mais informações.',
    );
  });

  it('e-mail oficial', () => {
    assert.equal(OMNIA_CONTACT_EMAIL, 'contato@omniafrigoholding.com.br');
  });

  it('assuntos na ordem definida', () => {
    assert.deepEqual(
      CONTACT_SUBJECTS.map((subject) => subject.label),
      [
        'Refrigeração e engenharia',
        'Cursos e formação técnica',
        'Automação e IA',
        'Parcerias e negócios',
        'Outros',
      ],
    );
    assert.equal(contactSubjectLabel('cursos-formacao'), 'Cursos e formação técnica');
    assert.equal(contactSubjectLabel('inexistente'), 'Outros');
  });
});

describe('validação do formulário', () => {
  it('aceita e normaliza dados válidos', () => {
    const result = validateContactMessage(valid);
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.data.email, 'maria@exemplo.com.br');
      assert.equal(result.data.assunto, 'automacao-ia');
    }
  });

  it('exige nome, e-mail, assunto e mensagem', () => {
    for (const [field, value] of [
      ['nome', ' '],
      ['email', 'sem-arroba'],
      ['assunto', 'invalido'],
      ['mensagem', 'curta'],
    ] as const) {
      const result = validateContactMessage({ ...valid, [field]: value });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.field, field);
    }
  });

  it('rejeita corpo inválido e mensagem longa demais', () => {
    assert.equal(validateContactMessage(null).ok, false);
    assert.equal(validateContactMessage([]).ok, false);
    assert.equal(validateContactMessage({ ...valid, mensagem: 'x'.repeat(4001) }).ok, false);
  });

  it('remove quebras de linha de nome e e-mail (sem injeção de cabeçalho)', () => {
    const result = validateContactMessage({
      ...valid,
      nome: 'Maria\r\nBcc: alvo@exemplo.com',
      email: 'maria@exemplo.com.br\r\nBcc: x@y.z',
    });
    if (result.ok) {
      assert.equal(/[\r\n]/.test(result.data.nome), false);
    }
    assert.equal(validateContactMessage({ ...valid, email: 'a@b.c\nBcc: x@y.z' }).ok, false);
  });

  it('preserva parágrafos da mensagem', () => {
    const result = validateContactMessage({
      ...valid,
      mensagem: 'Linha 1\r\n\r\nLinha 2 com detalhes.',
    });
    assert.ok(result.ok);
    if (result.ok) assert.equal(result.data.mensagem, 'Linha 1\n\nLinha 2 com detalhes.');
  });
});
