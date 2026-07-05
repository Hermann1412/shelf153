import { useRef } from "react";
import { ChevronLeft, ChevronRight, Star, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { addToCart } from "../../store/slices/cartSlice";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

const ProductSlider = ({ title, products }) => {
  const scrollRef = useRef(null);
  const dispatch = useDispatch();

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    dispatch(addToCart({ product, quantity: 1 }));
    toast.success("Added to cart");
  };

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="p-2 glass-card hover:glow-on-hover animate-smooth"
          >
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-2 glass-card hover:glow-on-hover animate-smooth"
          >
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
      >
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="glass-card group min-w-[250px] max-w-[250px] overflow-hidden hover:glow-on-hover animate-smooth flex-shrink-0"
          >
            <div className="relative overflow-hidden">
              <img
                src={product.images?.[0]?.url || "/avatar-holder.avif"}
                alt={product.name}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <button
                onClick={(e) => handleAddToCart(e, product)}
                className="absolute bottom-2 right-2 p-2 gradient-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ShoppingCart className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-foreground truncate mb-1">
                {product.name}
              </h3>
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">
                  {Number(product.ratings).toFixed(1)}
                </span>
              </div>
              <p className="text-lg font-bold text-primary">
                ${Number(product.price).toFixed(2)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ProductSlider;
