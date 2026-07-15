import { CompanyCards } from '@/components/home/CompanyCards';
import { EcosystemSection } from '@/components/home/EcosystemSection';
import { Hero } from '@/components/home/Hero';
import { fetchCompanies, fetchGlobalSettings } from '@/lib/cms';

export default async function HomePage() {
  const [settings, companies] = await Promise.all([fetchGlobalSettings(), fetchCompanies()]);

  return (
    <>
      <Hero settings={settings} />
      <EcosystemSection />
      <CompanyCards companies={companies} />
    </>
  );
}
