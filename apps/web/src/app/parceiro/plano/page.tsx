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
import { PARTNER_PLAN_LABELS } from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Plano' };

export default async function ParceiroPlanoPage() {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Plano" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const { partner } = ctx.selected;

  return (
    <>
      <PageHeader title="Plano" description="Programa comercial associado à sua empresa." />
      <Card className="max-w-xl border-omnia-deep-blue/10">
        <CardHeader>
          <CardDescription>Plano atual</CardDescription>
          <CardTitle className="text-3xl text-omnia-deep-blue">
            {PARTNER_PLAN_LABELS[partner.plan] ?? partner.plan}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-omnia-graphite">
          <p>{partner.displayName}</p>
        </CardContent>
      </Card>
      <Alert className="mt-6 max-w-xl" title="Sem cobrança nesta fase">
        Não há contratação nem pagamento de planos pelo painel. Alterações de plano são feitas pela
        equipe Omnia.
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/contato">Falar sobre planos</Link>
          </Button>
        </div>
      </Alert>
    </>
  );
}
