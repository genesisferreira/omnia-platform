import {
  Authority,
  Benefits,
  FinalCta,
  FloatWhatsApp,
  Footer,
  Header,
  Hero,
  WhyNow,
} from '@/components/Landing'

export default function Page() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <Benefits />
        <Authority />
        <WhyNow />
        <FinalCta />
      </main>
      <Footer />
      <FloatWhatsApp />
    </>
  )
}
