import React from "react";
import { Star, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../../store/slices/cartSlice";
import { toast } from "react-toastify";

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(addToCart({ product, quantity: 1 }));
    toast.success("Added to cart");
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="glass-card group overflow-hidden hover:glow-on-hover animate-smooth"
    >
      <div className="relative overflow-hidden">
        <img
          src={product.images?.[0]?.url || "/avatar-holder.avif"}
          alt={product.name}
          className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.stock === 0 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded-md font-medium">
            Out of Stock
          </span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-md font-medium">
            Only {product.stock} left
          </span>
        )}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="absolute bottom-2 right-2 p-2 gradient-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
        >
          <ShoppingCart className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
        <h3 className="text-sm font-semibold text-foreground truncate mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground/80 mb-1 truncate">
          Sold by {product.seller?.name || "Shelf153"}
        </p>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs text-muted-foreground">
            {Number(product.ratings).toFixed(1)}
          </span>
          {product.review_count !== undefined && (
            <span className="text-xs text-muted-foreground">
              ({product.review_count})
            </span>
          )}
        </div>
        <p className="text-lg font-bold text-primary">
          ${Number(product.price).toFixed(2)}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;
