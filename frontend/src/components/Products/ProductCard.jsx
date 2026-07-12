import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../../store/slices/cartSlice";
import { toast } from "react-toastify";

const FREE_SHIPPING_THRESHOLD = 100;

const ProductCard = ({ product }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [wishlisted, setWishlisted] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(addToCart({ product, quantity: 1 }));
    toast.success(t('productCard.addedToCart'));
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    setWishlisted((prev) => !prev);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="mp-card mp-card-hover group overflow-hidden animate-smooth"
    >
      <div className="relative overflow-hidden">
        <img
          src={product.images?.[0]?.url || "/avatar-holder.avif"}
          alt={product.name}
          className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.stock === 0 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded-md font-medium">
            {t('productCard.outOfStock')}
          </span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-md font-medium">
            {t('productCard.onlyLeft', { count: product.stock })}
          </span>
        )}
        <button
          onClick={handleToggleWishlist}
          aria-label={t('productCard.wishlist')}
          className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
        >
          <Heart
            className={`w-5 h-5 ${wishlisted ? "fill-destructive text-destructive" : "text-foreground"}`}
          />
        </button>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-1">{product.category}</p>
        <h3 className="text-base font-semibold text-foreground truncate mb-1">
          {product.name}
        </h3>
        <p className="text-sm text-muted-foreground/80 mb-1 truncate">
          {t('productCard.soldBy', { name: product.seller?.name || "Shelf153" })}
        </p>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-muted-foreground">
            {Number(product.ratings).toFixed(1)}
            {product.review_count !== undefined && ` (${product.review_count})`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-xl font-bold text-primary">
            ${Number(product.price).toFixed(2)}
          </p>
          {Number(product.price) >= FREE_SHIPPING_THRESHOLD && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
              {t('productCard.freeShipping')}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 gradient-primary text-primary-foreground rounded-lg font-semibold text-sm hover:glow-on-hover animate-smooth disabled:opacity-50"
        >
          <ShoppingCart className="w-4 h-4" />
          {t('productDetail.addToCart')}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
