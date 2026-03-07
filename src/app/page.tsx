import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhyWeavrn from "@/components/WhyWeavrn";
import Mining from "@/components/Mining";
import Tokenomics from "@/components/Tokenomics";
import Roadmap from "@/components/Roadmap";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhyWeavrn />
      <Mining />
      <Tokenomics />
      <Roadmap />
      <Footer />
    </main>
  );
}
