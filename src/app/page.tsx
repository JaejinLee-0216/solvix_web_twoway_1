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
      {/* Desktop only for now. We will switch based on width later. */}
      <main className="block">
        <Hero />
        <Companies />
        <Clients />
        <Pricing />
        <CTA />
        <Footer />
      </main>
      {/* Placeholder mobile container for future work */}
      <div className="hidden">
        <MobileLandingPlaceholder />
      </div>
    </>
  );
}
