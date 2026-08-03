import {
  Authority,
  Benefits,
  FinalCta,
  FloatWhatsApp,
  Footer,
  Header,
  Hero,
  LaunchEvent,
  WhyNow,
} from '@/components/Landing'

export default function Page() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <LaunchEvent />
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
