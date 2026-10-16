import { ListingForm } from '@/components/partner/ListingForm';
import { NoPartnerNotice, PageHeader } from '@/components/partner/ui';
import { saveListingAction } from '@/app/parceiro/actions';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Novo produto' };

export default async function NovoProdutoPage() {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Novo produto" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  if (!ctx.selected.canEdit) {
    return (
      <>
        <PageHeader title="Novo produto" />
        <p className="text-sm text-omnia-graphite">Seu papel nesta empresa é somente leitura.</p>
      </>
    );
  }
  const action = saveListingAction.bind(null, 'product', null);
  return (
    <>
      <PageHeader
        title="Novo produto"
        description="Salve como rascunho ou envie para moderação. A publicação pública é feita pela equipe Omnia."
      />
      <ListingForm kind="product" action={action} intents={['save', 'submit']} />
    </>
  );
}
