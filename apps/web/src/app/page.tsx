import { SessionProvider } from "@/components/auth/SessionProvider";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Subjects } from "@/components/landing/Subjects";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TrySection } from "@/components/landing/TrySection";
import { Features } from "@/components/landing/Features";
import { Levels } from "@/components/landing/Levels";
import { Parents } from "@/components/landing/Parents";
import { Faq } from "@/components/landing/Faq";
import { CtaBand } from "@/components/landing/CtaBand";
import { Footer } from "@/components/landing/Footer";
import { FAQS, SITE } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#org`,
      name: SITE.name,
      url: SITE.url,
      logo: `${SITE.url}/brand/icon-512.png`,
      slogan: SITE.tagline,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "vi-VN",
      publisher: { "@id": `${SITE.url}/#org` },
    },
    {
      "@type": "EducationalOrganization",
      "@id": `${SITE.url}/#edu`,
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      knowsAbout: ["Toán", "Tiếng Việt", "Tiếng Anh", "Lập trình Python"],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SessionProvider>
      <Header />
      <main>
        <Hero />
        <Subjects />
        <HowItWorks />
        <TrySection />
        <Features />
        <Levels />
        <Parents />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
      </SessionProvider>
    </>
  );
}
