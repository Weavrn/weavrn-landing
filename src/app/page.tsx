import AppHeader from "@/components/AppHeader";
import Hero from "@/components/Hero";
import WhyWeavrn from "@/components/WhyWeavrn";
import HowItWorks from "@/components/HowItWorks";
import Mining from "@/components/Mining";
import Tokenomics from "@/components/Tokenomics";
import Roadmap from "@/components/Roadmap";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <AppHeader showWallet={false} />
      <Hero />
      <WhyWeavrn />
      <HowItWorks />
      <Mining />
      <Tokenomics />
      <Roadmap />
      <CTA />
      <Footer />
    </main>
  );
}
