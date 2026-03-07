import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import Solution from "@/components/Solution";
import HowItWorks from "@/components/HowItWorks";
import Tokenomics from "@/components/Tokenomics";
import Roadmap from "@/components/Roadmap";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <Tokenomics />
      <Roadmap />
      <CTA />
      <Footer />
    </main>
  );
}
