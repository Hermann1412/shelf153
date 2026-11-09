import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import ProductCard from "../Products/ProductCard";

const ProductSlider = ({ title, products, viewAllLabel, viewAllTo = "/products" }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: (direction === "left" ? -1 : 1) * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="section">
      <div className="flex items-end justify-between gap-4 mb-4">
        <h2 className="section-title">{title}</h2>
        <div className="flex items-center gap-2">
          {viewAllLabel && (
            <Link to={viewAllTo} className="btn-ghost btn-sm text-primary hover:text-primary">
              {viewAllLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <button onClick={() => scroll("left")} aria-label="Previous" className="icon-btn hidden sm:inline-flex border border-border w-9 h-9">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll("right")} aria-label="Next" className="icon-btn hidden sm:inline-flex border border-border w-9 h-9">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
        {products.map((product) => (
          <div key={product.id} className="w-[11rem] sm:w-[13.5rem] shrink-0 snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductSlider;
