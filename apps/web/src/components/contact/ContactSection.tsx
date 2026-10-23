import {
  OMNIA_CONTACT_EMAIL,
  OMNIA_CONTACT_WHATSAPP_DISPLAY,
  buildOmniaWhatsappUrl,
} from '@omnia/shared';
import { Container } from '@omnia/ui';

import { ContactForm } from './ContactForm';

type ContactSectionProps = {
  /** Sem hero do CMS, a seção assume o título principal da página. */
  headingLevel?: 'h1' | 'h2';
};

function WhatsappIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function ContactSection({ headingLevel = 'h2' }: ContactSectionProps) {
  const Heading = headingLevel;
  const whatsappUrl = buildOmniaWhatsappUrl();

  return (
    <section
      id="fale-conosco"
      className="relative border-b border-omnia-deep-blue/10 bg-omnia-white py-20 md:py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-omnia-emerald/20 to-transparent"
      />

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-omnia-copper md:text-sm">
            Fale conosco
          </p>
          <Heading className="mt-4 font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue md:text-4xl">
            Como podemos ajudar?
          </Heading>
          <div
            aria-hidden="true"
            className="mx-auto mt-5 h-0.5 w-12 bg-gradient-to-r from-omnia-copper to-omnia-copper/30"
          />
          <p className="mt-6 text-base leading-relaxed text-omnia-graphite-light md:text-lg md:leading-relaxed">
            Refrigeração e engenharia, cursos e formação técnica, automação e IA ou parcerias: fale
            com a equipe da Omnia Frigo Holding pelo canal de sua preferência.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-omnia-deep-blue/10 bg-omnia-white/95 p-6 shadow-lg md:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-omnia-copper">
                WhatsApp
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block font-heading text-2xl font-semibold text-omnia-deep-blue hover:text-omnia-deep-blue/80"
                aria-label={`WhatsApp ${OMNIA_CONTACT_WHATSAPP_DISPLAY}`}
              >
                {OMNIA_CONTACT_WHATSAPP_DISPLAY}
              </a>
              <p className="mt-2 text-sm text-omnia-graphite-light">
                Atendimento direto com a nossa equipe.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-omnia-deep-blue px-5 py-3 text-sm font-semibold text-white hover:bg-omnia-deep-blue/90 sm:w-auto"
              >
                <WhatsappIcon />
                Conversar pelo WhatsApp
              </a>
            </div>

            <div className="rounded-2xl border border-omnia-deep-blue/10 bg-omnia-white/95 p-6 shadow-lg md:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-omnia-copper">
                E-mail
              </p>
              <a
                href={`mailto:${OMNIA_CONTACT_EMAIL}`}
                className="mt-3 inline-flex items-center gap-2 break-all font-heading text-lg font-semibold text-omnia-deep-blue hover:text-omnia-deep-blue/80 md:text-xl"
              >
                <MailIcon />
                {OMNIA_CONTACT_EMAIL}
              </a>
              <p className="mt-2 text-sm text-omnia-graphite-light">
                Para propostas, documentos e assuntos institucionais.
              </p>
            </div>
          </div>

          <ContactForm />
        </div>
      </Container>
    </section>
  );
}
