import { getAdminBaseUrl } from '@/lib/auth/admin-url';

type PageProps = { params: Promise<{ code: string }> };

export default async function CertificadoPublicoPage({ params }: PageProps) {
  const { code } = await params;
  const res = await fetch(
    `${getAdminBaseUrl()}/api/omnia/academic/certificates/verify/${encodeURIComponent(code)}`,
    { cache: 'no-store' },
  );
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    certificate?: {
      code: string;
      courseTitle?: string | null;
      issuedAt?: string;
      issuer?: string;
      status?: string;
    };
  } | null;
  const cert = data?.ok ? data.certificate : null;
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold">Validação de certificado</h1>
      {cert ? (
        <div className="mt-6 rounded-md border border-border p-4">
          <p className="font-medium">{cert.courseTitle}</p>
          <p className="text-sm">Código {cert.code}</p>
          <p className="text-sm text-muted-foreground">{cert.issuer}</p>
          <p className="text-xs text-muted-foreground">Status: {cert.status}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Certificado não encontrado ou revogado.
        </p>
      )}
    </main>
  );
}
