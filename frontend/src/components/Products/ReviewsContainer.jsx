import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Star, Trash2 } from "lucide-react";
import {
  postProductReview,
  deleteProductReview,
  fetchSingleProduct,
} from "../../store/slices/productSlice";

const ReviewsContainer = ({ product, productReviews }) => {
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

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        Customer Reviews
      </h2>

      {authUser && (
        <form
          onSubmit={handleSubmitReview}
          className="glass-panel mb-8 space-y-4"
        >
          <h3 className="font-semibold text-foreground">Write a Review</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rating:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            required
          />
          <button
            type="submit"
            disabled={isPostingReview}
            className="px-6 py-2 gradient-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50"
          >
            {isPostingReview ? "Posting..." : "Submit Review"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {productReviews && productReviews.length > 0 ? (
          productReviews.map((review) => (
            <div key={review.review_id} className="glass-panel">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      review.reviewer?.avatar?.url || "/avatar-holder.avif"
                    }
                    alt="reviewer"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-foreground">
                      {review.reviewer?.name || "Anonymous"}
                    </h4>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {authUser && authUser.id === review.reviewer?.id && (
                  <button
                    onClick={handleDeleteReview}
                    disabled={isReviewDeleting}
                    className="p-2 hover:bg-destructive/20 rounded-lg text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="mt-3 text-muted-foreground">{review.comment}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No reviews yet. Be the first to review!
          </p>
        )}
      </div>
    </div>
  );
};

export default ReviewsContainer;
