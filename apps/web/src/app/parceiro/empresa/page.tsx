import Link from 'next/link';

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@omnia/ui';

import { NoPartnerNotice, PageHeader } from '@/components/partner/ui';
import { MEMBERSHIP_ROLE_LABELS, PARTNER_STATUS_LABELS } from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Empresa' };

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-omnia-graphite-light">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-omnia-deep-blue">{value || '—'}</dd>
    </div>
  );
}

export default async function ParceiroEmpresaPage() {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Empresa" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const { partner, role } = ctx.selected;
  const location = [partner.city, partner.state].filter(Boolean).join(' / ');

  return (
    <>
      <PageHeader
        title="Empresa"
        description="Dados do perfil público vinculado à sua conta. Nesta fase a edição é feita pela equipe Omnia."
      />
      <Card className="max-w-3xl border-omnia-deep-blue/10">
        <CardHeader>
          <CardTitle>{partner.displayName}</CardTitle>
          {partner.companyName && partner.companyName !== partner.displayName ? (
            <CardDescription>{partner.companyName}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item
              label="Tipo"
              value={partner.partnerType === 'professional' ? 'Profissional' : 'Empresa'}
            />
            <Item
              label="Situação do cadastro"
              value={PARTNER_STATUS_LABELS[partner.status ?? ''] ?? partner.status}
            />
            <Item
              label="Publicação"
              value={partner.active && partner.publishedAt ? 'Publicado' : 'Não publicado'}
            />
            <Item label="Verificado" value={partner.verified ? 'Sim' : 'Não'} />
            <Item label="Localização" value={location} />
            <Item label="Seu papel" value={MEMBERSHIP_ROLE_LABELS[role] ?? role} />
            <Item label="E-mail" value={partner.email} />
            <Item label="Telefone" value={partner.phone} />
            <Item label="WhatsApp" value={partner.whatsapp} />
            <Item label="Site" value={partner.website} />
          </dl>
          {partner.description ? (
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-omnia-graphite-light">
                Sobre
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm text-omnia-graphite">
                {partner.description}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Alert className="mt-6 max-w-3xl" title="Precisa alterar algum dado?">
        O perfil da empresa é gerenciado pela equipe Omnia. Entre em contato informando o que deve
        ser atualizado.
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/contato">Falar com a equipe</Link>
          </Button>
          {partner.slug && partner.status === 'approved' && partner.active ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/parceiros/${partner.slug}`}>Ver perfil público</Link>
            </Button>
          ) : null}
        </div>
      </Alert>
    </>
  );
}
