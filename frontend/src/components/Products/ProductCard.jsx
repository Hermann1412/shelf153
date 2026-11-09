import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../../store/slices/cartSlice";
import { toast } from "react-toastify";
import { categoryLabel, FREE_SHIPPING_THRESHOLD } from "../../data/products";

const ProductCard = ({ product }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [wishlisted, setWishlisted] = useState(false);
  const outOfStock = product.stock === 0;
  const reviewCount = Number(product.review_count || 0);

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(addToCart({ product, quantity: 1 }));
    toast.success(t("productCard.addedToCart"));
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    setWishlisted((prev) => !prev);
  };

  const handleSellerClick = (e) => {
    if (!product.seller?.id) return;
    e.preventDefault();
    navigate(`/products?seller=${product.seller.id}`);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="mp-card mp-card-hover group flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={product.images?.[0]?.url || "/avatar-holder.avif"}
          alt={product.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${outOfStock ? "opacity-60" : ""}`}
        />
        {outOfStock && (
          <span className="absolute top-2.5 left-2.5 max-w-[calc(100%-3.75rem)] truncate px-2 py-1 bg-foreground/85 text-background text-xs rounded-md font-semibold">
            {t("productCard.outOfStock")}
          </span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="absolute top-2.5 left-2.5 max-w-[calc(100%-3.75rem)] truncate px-2 py-1 bg-warning text-warning-foreground text-xs rounded-md font-semibold">
            {t("productCard.onlyLeft", { count: product.stock })}
          </span>
        )}
        <button
          onClick={handleToggleWishlist}
          aria-label={t("productCard.wishlist")}
          aria-pressed={wishlisted}
          className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center bg-card/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-card transition-colors"
        >
          <Heart
            className={`w-[1.125rem] h-[1.125rem] ${wishlisted ? "fill-destructive text-destructive" : "text-foreground"}`}
          />
        </button>
      </div>

      <div className="flex flex-col flex-1 p-3 sm:p-4">
        <p className="text-xs font-medium text-muted-foreground truncate">
          {categoryLabel(product.category, t)}
        </p>
        {/* Two lines reserved so prices and buttons line up across a row. */}
        <h3 className="mt-1 text-sm sm:text-[0.9375rem] font-semibold leading-snug text-foreground line-clamp-2 min-h-[2.5rem] sm:min-h-[2.625rem] group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p
          onClick={handleSellerClick}
          className={`mt-1 text-xs text-muted-foreground truncate ${product.seller?.id ? "hover:text-primary hover:underline" : ""}`}
        >
          {t("productCard.soldBy", { name: product.seller?.name || "Shelf153" })}
        </p>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">
            ${Number(product.price).toFixed(2)}
          </p>
          {reviewCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{Number(product.ratings).toFixed(1)}</span>
              <span>({reviewCount})</span>
            </span>
          )}
        </div>
        <p className="h-4 text-xs font-medium text-primary truncate">
          {Number(product.price) >= FREE_SHIPPING_THRESHOLD ? t("productCard.freeShipping") : ""}
        </p>

        <div className="mt-auto pt-3">
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="btn-outline w-full group-hover:border-primary group-hover:text-primary"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="truncate sm:hidden">{t("productCard.add")}</span>
            <span className="truncate hidden sm:inline">{t("productDetail.addToCart")}</span>
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
