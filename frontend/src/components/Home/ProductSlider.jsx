import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "../Products/ProductCard";

const ProductSlider = ({ title, products }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="p-2 mp-card"
          >
            <ChevronLeft className="w-4 h-4 text-primary" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-2 mp-card"
          >
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
      >
        {products.map((product) => (
          <div key={product.id} className="min-w-[220px] max-w-[220px] shrink-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductSlider;
