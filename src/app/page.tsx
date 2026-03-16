import AppHeader from "@/components/AppHeader";
import Hero from "@/components/Hero";
import WhyWeavrn from "@/components/WhyWeavrn";
import Mining from "@/components/Mining";
import Tokenomics from "@/components/Tokenomics";
import Roadmap from "@/components/Roadmap";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <AppHeader showWallet={false} />
      <Hero />
      <WhyWeavrn />
      <Mining />
      <Tokenomics />
      <Roadmap />
      <Footer />
    </main>
  );
}
