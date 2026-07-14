import { Container } from '@omnia/ui';

export function Footer() {
  return (
    <footer className="border-t bg-omnia-graphite text-omnia-white">
      <Container className="py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-heading text-lg font-semibold">Omnia Platform</p>
            <p className="mt-1 text-sm text-white/70">Ecossistema digital da Omnia Frigo Holding</p>
          </div>
          <p className="text-sm text-white/50">© {new Date().getFullYear()} Omnia Frigo Holding</p>
        </div>
      </Container>
    </footer>
  );
}
