import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoCertificadosPage() {
  const user = await requirePortalSession('/aluno/certificados');
  const res = await fetchAcademic<{
    items?: Array<{
      code: string;
      courseTitle?: string | null;
      issuedAt?: string;
      issuer?: string;
    }>;
  }>('certificates', { user });
  const items = res.ok ? (res.data.items ?? []) : [];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Certificados</h1>
      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.code} className="rounded-md border border-border p-4">
            <p className="font-medium">{c.courseTitle || 'Curso'}</p>
            <p className="text-sm text-muted-foreground">Código {c.code}</p>
            <p className="text-xs text-muted-foreground">{c.issuer}</p>
            <a className="text-sm underline" href={`/certificados/${c.code}`}>
              Validar publicamente
            </a>
          </li>
        ))}
      </ul>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">
          Os certificados aparecem quando o curso é concluído e as regras acadêmicas são atendidas.
        </p>
      ) : null}
    </div>
  );
}
