import { Button, Container } from '@omnia/ui';

export function CtaSection() {
  return (
    <section className="py-16 md:py-20">
      <Container>
        <div className="rounded-2xl bg-omnia-deep-blue px-8 py-12 text-center text-white md:px-16">
          <h2 className="font-heading text-3xl font-bold">Pronto para evoluir com a Omnia?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            A plataforma está em construção contínua. Acesse o painel administrativo para gerenciar
            empresas, mídia e configurações.
          </p>
          <Button asChild size="lg" className="mt-8 bg-omnia-copper hover:bg-omnia-copper/90">
            <a href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'}>
              Acessar painel admin
            </a>
          </Button>
        </div>
      </Container>
    </section>
  );
}
