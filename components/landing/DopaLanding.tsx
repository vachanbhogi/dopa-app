import { Header } from "./Header";
import { Hero } from "./Hero";
import {
  Brain,
  Business,
  Competitors,
  GoogleAds,
  Keywords,
  Products,
  Species,
} from "./Sections";
import { FinalCta, Footer, Testimonials } from "./Closing";

export async function DopaLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-black"
      >
        Skip to content →
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Species />
        <Business />
        <Competitors />
        <Products />
        <Keywords />
        <Brain />
        <GoogleAds />
        <Testimonials />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
