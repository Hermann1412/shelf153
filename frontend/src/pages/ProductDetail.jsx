import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Plus,
  Minus,
  Loader,
  ChevronLeft,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import ReviewsContainer from "../components/Products/ReviewsContainer";
import { fetchSingleProduct } from "../store/slices/productSlice";
import { addToCart } from "../store/slices/cartSlice";
import { toast } from "react-toastify";

const ProductDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const dispatch = useDispatch();
  const { productDetails, loading, productReviews } = useSelector(
    (state) => state.product
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    dispatch(fetchSingleProduct(id));
  }, [dispatch, id]);

  const handleAddToCart = () => {
    if (productDetails.stock < 1) {
      toast.error(t('productDetail.outOfStockError'));
      return;
    }
    dispatch(addToCart({ product: productDetails, quantity }));
    toast.success(t('productDetail.addedToCart'));
  };

  if (loading || !productDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const images = productDetails.images || [];
  const rating = Number(productDetails.ratings) || 0;

  return (
    <div className="min-h-screen pt-32 pb-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary animate-smooth mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('productDetail.backToProducts')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Images */}
          <div className="lg:col-span-6 space-y-4">
            <div className="mp-card aspect-square overflow-hidden flex items-center justify-center">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]?.url}
                  alt={productDetails.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-muted-foreground">{t('productDetail.noImage')}</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 animate-smooth ${
                      selectedImage === i
                        ? "border-primary"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <p className="text-sm text-primary font-medium uppercase tracking-wider">
                {productDetails.category}
              </p>
              <h1 className="text-2xl font-bold text-foreground mt-2">
                {productDetails.name}
              </h1>
              {productDetails.seller?.id ? (
                <Link
                  to={`/products?seller=${productDetails.seller.id}`}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline mt-1 inline-block"
                >
                  {t('productDetail.soldBy', { name: productDetails.seller.name })}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('productDetail.soldBy', { name: productDetails.seller?.name || "Shelf153" })}
                </p>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {t('productDetail.reviews', { count: productReviews.length })}
              </span>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed text-sm">
              {productDetails.description}
            </p>

            {/* Stock */}
            <div>
              {productDetails.stock > 5 ? (
                <span className="text-green-400 font-medium text-sm">
                  {t('productDetail.inStockAvailable', { count: productDetails.stock })}
                </span>
              ) : productDetails.stock > 0 ? (
                <span className="text-yellow-400 font-medium text-sm">
                  {t('productDetail.lowStockLeft', { count: productDetails.stock })}
                </span>
              ) : (
                <span className="text-red-400 font-medium text-sm">{t('productDetail.outOfStock')}</span>
              )}
            </div>
          </div>

          {/* Buy box */}
          <div className="lg:col-span-3">
            <div className="mp-card p-5 space-y-4 sticky top-32">
              <p className="text-3xl font-bold text-primary">
                ${Number(productDetails.price).toFixed(2)}
              </p>

              <div className="flex items-center border border-border rounded-lg w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-secondary animate-smooth"
                >
                  <Minus className="w-4 h-4 text-foreground" />
                </button>
                <span className="px-6 text-foreground font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(
                      Math.min(productDetails.stock || 1, quantity + 1)
                    )
                  }
                  className="p-3 hover:bg-secondary animate-smooth"
                >
                  <Plus className="w-4 h-4 text-foreground" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={productDetails.stock < 1}
                className="w-full py-3 px-8 gradient-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2 hover:glow-on-hover animate-smooth disabled:opacity-50"
              >
                <ShoppingCart className="w-5 h-5" />
                {t('productDetail.addToCart')}
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          {/* Known bug (pre-existing, out of scope here): ReviewsContainer destructures
              { product, productReviews } but is passed productId/reviews, so it always
              renders the empty state. Not touched as part of this layout pass. */}
          <ReviewsContainer
            productId={id}
            reviews={productReviews}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
