import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const HeroSlider = () => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const { categories } = useSelector((state) => state.product);

  const allSlides = [
    {
      id: 1,
      title: t("home.hero.slide1Title"),
      subtitle: t("home.hero.slide1Subtitle"),
      description: t("home.hero.slide1Description"),
      image: "/electronics.jpg",
      cta: t("home.hero.slide1Cta"),
      category: "Electronics",
      url: "/products?category=Electronics",
    },
    {
      id: 2,
      title: t("home.hero.slide2Title"),
      subtitle: t("home.hero.slide2Subtitle"),
      description: t("home.hero.slide2Description"),
      image: "/fashion.jpg",
      cta: t("home.hero.slide2Cta"),
      category: "Fashion",
      url: "/products?category=Fashion",
    },
    {
      id: 3,
      title: t("home.hero.slide3Title"),
      subtitle: t("home.hero.slide3Subtitle"),
      description: t("home.hero.slide3Description"),
      image: "/furniture.jpg",
      cta: t("home.hero.slide3Cta"),
      category: "Home & Garden",
      url: `/products?category=${encodeURIComponent("Home & Garden")}`,
    },
  ];

  // Never advertise an empty category: keep slides whose category has products on sale.
  const available = allSlides.filter((s) => categories.some((c) => c.name === s.category));
  const slides = available.length > 0 ? available : allSlides;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const go = (step) => setCurrentSlide((prev) => (prev + step + slides.length) % slides.length);
  // The list can shrink once categories load; keep the index in range.
  const activeIndex = currentSlide % slides.length;
  const slide = slides[activeIndex];

  return (
    <section className="relative h-[22rem] sm:h-[24rem] lg:h-[26rem] overflow-hidden rounded-2xl bg-secondary">
      {slides.map((s, index) => (
        <img
          key={s.id}
          src={s.image}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {/* Left-to-right scrim keeps white text readable on any photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/5" />

      <div className="relative h-full flex items-center px-6 sm:px-10 lg:px-14">
        <div key={slide.id} className="max-w-xl animate-fade-in-up">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white/80">
            {slide.subtitle}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-[1.1]">
            {slide.title}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/85 max-w-md">
            {slide.description}
          </p>
          <Link to={slide.url} className="btn-primary btn-lg mt-6">
            {slide.cta}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="absolute bottom-4 sm:bottom-5 left-6 sm:left-10 lg:left-14 flex items-center gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            aria-label={`${t("home.hero.goToSlide")} ${index + 1}`}
            aria-current={index === activeIndex}
            className="py-2"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 sm:bottom-5 right-4 sm:right-6 hidden sm:flex gap-2">
        <button
          onClick={() => go(-1)}
          aria-label="Previous"
          className="w-10 h-10 rounded-full bg-white/90 text-gray-900 flex items-center justify-center hover:bg-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => go(1)}
          aria-label="Next"
          className="w-10 h-10 rounded-full bg-white/90 text-gray-900 flex items-center justify-center hover:bg-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};

export default HeroSlider;
