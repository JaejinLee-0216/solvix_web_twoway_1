import Hero from "./components/Hero";
import Companies from "./components/Companies";
import Clients from "./components/Clients";
import Pricing from "./components/Pricing";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import MobileLandingPlaceholder from "./components/mobile";

export default function Home() {
  return (
    <>
      {/* Desktop layout */}
      <main className="hidden md:block">
        <Hero />
        <Companies />
        <Clients />
        <Pricing />
        <CTA />
        <Footer />
      </main>

      {/* Mobile layout */}
      <section className="block md:hidden">
        <MobileLandingPlaceholder />
      </section>
    </>
  );
}
