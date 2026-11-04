import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FlashDeals from "@/components/FlashDeals";
import CategoriesSection from "@/components/CategoriesSection";
import PopularFoods from "@/components/PopularFoods";
import WhyChooseUs from "@/components/WhyChooseUs";
import TestimonialsSection from "@/components/TestimonialsSection";
import NewsletterSection from "@/components/NewsletterSection";
import StatsCounter from "@/components/StatsCounter";
import HowItWorks from "@/components/HowItWorks";
import SpecialBanner from "@/components/SpecialBanner";
import BrandBanner from "@/components/BrandBanner";
import AppDownloadSection from "@/components/AppDownloadSection";
import PopularBrands from "@/components/PopularBrands";
import ScrollProgress from "@/components/ScrollProgress";
import FloatingActionMenu from "@/components/FloatingActionMenu";
import Footer from "@/components/Footer";
import RecentlyViewed from "@/components/RecentlyViewed";

const Index = () => {
  return (
    <div className="min-h-screen">
      <ScrollProgress />
      <Header />
      <main>
        <HeroSection />
        <CategoriesSection />
        <FlashDeals />
        <PopularFoods />
        <RecentlyViewed />
        <BrandBanner />
        <HowItWorks />
        <StatsCounter />
        <SpecialBanner />
        <PopularBrands />
        <WhyChooseUs />
        <TestimonialsSection />
        <AppDownloadSection />
        <NewsletterSection />
      </main>
      <Footer />
      <FloatingActionMenu />
    </div>
  );
};

export default Index;

