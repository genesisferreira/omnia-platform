import { saveListingAction } from '@/app/parceiro/actions';
import { ListingForm } from '@/components/partner/ListingForm';
import { NoPartnerNotice, PageHeader } from '@/components/partner/ui';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Novo serviço' };

export default async function NovoServicoPage() {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Novo serviço" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  if (!ctx.selected.canEdit) {
    return (
      <>
        <PageHeader title="Novo serviço" />
        <p className="text-sm text-omnia-graphite">Seu papel nesta empresa é somente leitura.</p>
      </>
    );
  }
  const action = saveListingAction.bind(null, 'service', null);
  return (
    <>
      <PageHeader
        title="Novo serviço"
        description="Salve como rascunho ou envie para moderação da equipe Omnia."
      />
      <ListingForm kind="service" action={action} intents={['save', 'submit']} />
    </>
  );
}
