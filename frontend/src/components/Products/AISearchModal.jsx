import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, Sparkles, Star } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleAIModal } from "../../store/slices/popupSlice";
import { fetchAIProducts } from "../../store/slices/productSlice";
import { Link } from "react-router-dom";

const AISearchModal = () => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const dispatch = useDispatch();
  const { isAIPopupOpen } = useSelector((state) => state.popup);
  const { aiSearching, aiProducts } = useSelector((state) => state.product);

  const handleSearch = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      dispatch(fetchAIProducts(prompt));
    }
  };

  if (!isAIPopupOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={() => dispatch(toggleAIModal())}
      >
        <div
          className="w-full max-w-2xl bg-background border border-border rounded-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {t('aiSearch.title')}
              </h2>
            </div>
            <button
              onClick={() => dispatch(toggleAIModal())}
              aria-label={t("aria.close")}
              className="p-2 hover:bg-secondary rounded-lg"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('aiSearch.placeholder')}
                className="flex-1 px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={aiSearching}
                className="px-6 py-3 gradient-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50"
              >
                {aiSearching ? t('aiSearch.searching') : t('aiSearch.search')}
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {aiProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {aiProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    onClick={() => dispatch(toggleAIModal())}
                    className="flex gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <img
                      src={
                        product.images?.[0]?.url || "/avatar-holder.avif"
                      }
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">
                          {Number(product.ratings).toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        ${Number(product.price).toFixed(2)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              !aiSearching && (
                <p className="text-center text-muted-foreground py-8">
                  {t('aiSearch.prompt')}
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AISearchModal;
