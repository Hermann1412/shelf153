import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const HeroSlider = () => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: t("home.hero.slide1Title"),
      subtitle: t("home.hero.slide1Subtitle"),
      description: t("home.hero.slide1Description"),
      image: "/electronics.jpg",
      cta: t("home.hero.slide1Cta"),
      url: "/products?category=Electronics",
    },
    {
      id: 2,
      title: t("home.hero.slide2Title"),
      subtitle: t("home.hero.slide2Subtitle"),
      description: t("home.hero.slide2Description"),
      image: "/fashion.jpg",
      cta: t("home.hero.slide2Cta"),
      url: "/products?category=Fashion",
    },
    {
      id: 3,
      title: t("home.hero.slide3Title"),
      subtitle: t("home.hero.slide3Subtitle"),
      description: t("home.hero.slide3Description"),
      image: "/furniture.jpg",
      cta: t("home.hero.slide3Cta"),
      url: `/products?category=Home & Garden`,
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const slide = slides[currentSlide];

  return (
    <div className="relative h-[40vh] md:h-[45vh] overflow-hidden rounded-lg">
      {/* Single Active Slide */}
      <div className="relative h-full">
        <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{ backgroundImage: `url(${slide.image})` }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative h-full flex items-center justify-center text-center px-6">
          <div className="max-w-3xl animate-fade-in-up">
            <h3 className="text-base font-medium text-primary mb-1">
              {slide.subtitle}
            </h3>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
              {slide.title}
            </h1>
            <p className="text-base md:text-lg text-white/80 mb-5 max-w-2xl mx-auto">
              {slide.description}
            </p>
            <Link
              to={slide.url}
              className="inline-block px-8 py-4 gradient-primary text-primary-foreground rounded-lg hover:glow-on-hover animate-smooth font-semibold text-lg"
            >
              {slide.cta}
            </Link>
          </div>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prevSlide}
        className="hidden sm:block absolute left-6 top-1/2 transform -translate-y-1/2 p-3 glass-card hover:glow-on-hover animate-smooth"
      >
        <ChevronLeft className="w-6 h-6 text-primary" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden sm:block absolute right-6 top-1/2 transform -translate-y-1/2 p-3 glass-card hover:glow-on-hover animate-smooth"
      >
        <ChevronRight className="w-6 h-6 text-primary" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            aria-label={`${t("home.hero.goToSlide")} ${index + 1}`}
            className="p-2.5"
          >
            <span
              className={`block w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-primary glow-primary"
                  : "bg-white/40 hover:bg-white/60"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
