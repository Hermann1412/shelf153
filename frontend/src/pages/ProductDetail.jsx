import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  ShoppingCart,
  Plus,
  Minus,
  Loader,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Store,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import ReviewsContainer from "../components/Products/ReviewsContainer";
import { fetchSingleProduct } from "../store/slices/productSlice";
import { addToCart } from "../store/slices/cartSlice";
import { toast } from "react-toastify";
import { categoryLabel, FREE_SHIPPING_THRESHOLD } from "../data/products";

const ProductDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const dispatch = useDispatch();
  const { productDetails, productReviews } = useSelector((state) => state.product);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    setQuantity(1);
    setSelectedImage(0);
    dispatch(fetchSingleProduct(id));
  }, [dispatch, id]);

  const handleAddToCart = () => {
    if (productDetails.stock < 1) {
      toast.error(t("productDetail.outOfStockError"));
      return;
    }
    dispatch(addToCart({ product: productDetails, quantity }));
    toast.success(t("productDetail.addedToCart"));
  };

  // Only block the page on first load; refetches (e.g. after a review) keep the content on screen.
  if (!productDetails || productDetails.id !== id) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  const images = productDetails.images || [];
  const rating = Number(productDetails.ratings) || 0;
  const stock = Number(productDetails.stock) || 0;
  const price = Number(productDetails.price);
  const sellerName = productDetails.seller?.name || "Shelf153";

  return (
    <div className="page">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
        <Link to="/" className="hover:text-foreground transition-colors shrink-0">{t("nav.home")}</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <Link
          to={`/products?category=${encodeURIComponent(productDetails.category)}`}
          className="hover:text-foreground transition-colors shrink-0"
        >
          {categoryLabel(productDetails.category, t)}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-foreground truncate">{productDetails.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        {/* Gallery */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-3">
          {images.length > 1 && (
            <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible scrollbar-hide shrink-0">
              {images.map((img, i) => (
                <button
                  key={img.url || i}
                  onClick={() => setSelectedImage(i)}
                  aria-label={`${t("productDetail.image", { defaultValue: "Image" })} ${i + 1}`}
                  aria-current={selectedImage === i}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                    selectedImage === i ? "border-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 surface aspect-square overflow-hidden flex items-center justify-center bg-card">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]?.url}
                alt={productDetails.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-sm text-muted-foreground">{t("productDetail.noImage")}</span>
            )}
          </div>
        </div>

        {/* Info & buy box */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[8.5rem] space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {categoryLabel(productDetails.category, t)}
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight text-foreground">
                {productDetails.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-border fill-border"}`}
                      />
                    ))}
                  </div>
                  <span className="text-muted-foreground">
                    {t("productDetail.reviews", { count: productReviews.length })}
                  </span>
                </div>
                {productDetails.seller?.id ? (
                  <Link
                    to={`/products?seller=${productDetails.seller.id}`}
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Store className="w-4 h-4" />
                    {t("productDetail.soldBy", { name: sellerName })}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Store className="w-4 h-4" />
                    {t("productDetail.soldBy", { name: sellerName })}
                  </span>
                )}
              </div>
            </div>

            <div className="surface p-5 space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-3xl font-extrabold text-foreground tabular-nums">${price.toFixed(2)}</p>
                {stock > 5 ? (
                  <span className="text-sm font-medium text-primary">
                    {t("productDetail.inStockAvailable", { count: stock })}
                  </span>
                ) : stock > 0 ? (
                  <span className="text-sm font-medium text-warning">
                    {t("productDetail.lowStockLeft", { count: stock })}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-destructive">{t("productDetail.outOfStock")}</span>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex items-center h-12 border border-input rounded-lg shrink-0">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="-1"
                    className="w-11 h-full flex items-center justify-center text-foreground hover:bg-secondary rounded-l-lg disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-semibold tabular-nums text-foreground">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(stock || 1, quantity + 1))}
                    disabled={quantity >= stock}
                    aria-label="+1"
                    className="w-11 h-full flex items-center justify-center text-foreground hover:bg-secondary rounded-r-lg disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={handleAddToCart} disabled={stock < 1} className="btn-primary btn-lg flex-1">
                  <ShoppingCart className="w-5 h-5" />
                  {t("productDetail.addToCart")}
                </button>
              </div>

              <ul className="pt-4 border-t border-border space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 shrink-0 text-primary" />
                  {price >= FREE_SHIPPING_THRESHOLD ? t("productCard.freeShipping") : t("home.features.shippingDesc")}
                </li>
                <li className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 shrink-0 text-primary" />
                  {t("home.features.paymentTitle")}
                </li>
                <li className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 shrink-0 text-primary" />
                  {t("home.features.returnsDesc")}
                </li>
              </ul>
            </div>

            {productDetails.description && (
              <div>
                <h2 className="text-sm font-semibold text-foreground">{t("productDetail.description", { defaultValue: "Description" })}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {productDetails.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReviewsContainer product={productDetails} productReviews={productReviews} />
    </div>
  );
};

export default ProductDetail;
