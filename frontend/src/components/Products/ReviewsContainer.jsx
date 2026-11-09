import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Star, Trash2 } from "lucide-react";
import {
  postProductReview,
  deleteProductReview,
  fetchSingleProduct,
} from "../../store/slices/productSlice";

const ReviewsContainer = ({ product, productReviews }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const dispatch = useDispatch();
  const { authUser } = useSelector((state) => state.auth);
  const { isPostingReview, isReviewDeleting } = useSelector(
    (state) => state.product
  );

  const handleSubmitReview = (e) => {
    e.preventDefault();
    dispatch(
      postProductReview({ productId: product.id, rating, comment })
    ).then(() => {
      dispatch(fetchSingleProduct(product.id));
      setComment("");
      setRating(5);
    });
  };

  const handleDeleteReview = () => {
    dispatch(deleteProductReview(product.id)).then(() => {
      dispatch(fetchSingleProduct(product.id));
    });
  };

  const average = productReviews?.length
    ? productReviews.reduce((sum, review) => sum + Number(review.rating), 0) / productReviews.length
    : 0;

  return (
    <section className="mt-12 pt-10 border-t border-border grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
      <div className="lg:col-span-4">
        <h2 className="section-title">{t("reviews.title")}</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-4xl font-extrabold text-foreground tabular-nums">{average.toFixed(1)}</span>
          <div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(average) ? "fill-amber-400 text-amber-400" : "fill-border text-border"}`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("productDetail.reviews", { count: productReviews?.length || 0 })}
            </p>
          </div>
        </div>

        {authUser && (
          <form onSubmit={handleSubmitReview} className="surface p-5 mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">{t("reviews.writeReview")}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("reviews.rating")}</span>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`${star}/5`}
                    aria-pressed={star === rating}
                    className="p-1 rounded"
                  >
                    <Star
                      className={`w-5 h-5 ${star <= rating ? "fill-amber-400 text-amber-400" : "fill-border text-border"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("reviews.placeholder")}
              rows={4}
              className="field h-auto py-3 resize-none"
              required
            />
            <button type="submit" disabled={isPostingReview} className="btn-primary w-full">
              {isPostingReview ? t("reviews.posting") : t("reviews.submit")}
            </button>
          </form>
        )}
      </div>

      <div className="lg:col-span-8">
        {productReviews && productReviews.length > 0 ? (
          <ul className="divide-y divide-border surface">
            {productReviews.map((review) => (
              <li key={review.review_id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={review.reviewer?.avatar?.url || "/avatar-holder.avif"}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover bg-secondary shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {review.reviewer?.name || t("reviews.anonymous")}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "fill-border text-border"}`}
                            />
                          ))}
                        </div>
                        {review.created_at && (
                          <time className="text-xs text-muted-foreground" dateTime={review.created_at}>
                            {new Date(review.created_at).toLocaleDateString()}
                          </time>
                        )}
                      </div>
                    </div>
                  </div>
                  {authUser && authUser.id === review.reviewer?.id && (
                    <button
                      onClick={handleDeleteReview}
                      disabled={isReviewDeleting}
                      aria-label={t("reviews.delete", { defaultValue: "Supprimer" })}
                      className="icon-btn w-9 h-9 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">{review.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="surface px-6 py-12 text-center">
            <span className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Star className="w-5 h-5 text-muted-foreground" />
            </span>
            <p className="mt-4 text-sm text-muted-foreground">{t("reviews.empty")}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ReviewsContainer;
