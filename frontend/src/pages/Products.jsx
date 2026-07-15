import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Sparkles, Star, Filter, X, Loader } from "lucide-react";
import { categories } from "../data/products";
import ProductCard from "../components/Products/ProductCard";
import Pagination from "../components/Products/Pagination";
import AISearchModal from "../components/Products/AISearchModal";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { fetchAllProducts, fetchShops } from "../store/slices/productSlice";
import { toggleAIModal } from "../store/slices/popupSlice";

const Products = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const { products, totalProducts, loading, shops } = useSelector(
    (state) => state.product
  );
  const { isAIModalOpen } = useSelector((state) => state.popup);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [seller, setSeller] = useState("");
  const [availability, setAvailability] = useState("");
  const [ratings, setRatings] = useState("");
  const [price, setPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("");

  const totalPages = Math.ceil(totalProducts / 10);

  const sortedProducts = useMemo(() => {
    if (!sortBy) return products;
    const sorted = [...products];
    if (sortBy === "price-asc") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "price-desc") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === "top-rated") sorted.sort((a, b) => Number(b.ratings) - Number(a.ratings));
    return sorted;
  }, [products, sortBy]);

  // Read search/category/seller from URL (e.g. from category tiles or a "Sold by X" link)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search");
    const cat = params.get("category");
    const sel = params.get("seller");
    if (q) setSearch(q);
    if (cat) setCategory(cat);
    if (sel) setSeller(sel);
  }, [location.search]);

  useEffect(() => {
    dispatch(fetchShops());
  }, [dispatch]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (seller) params.set("seller", seller);
    if (availability) params.set("availability", availability);
    if (ratings) params.set("ratings", ratings);
    if (price) params.set("price", price);
    params.set("page", page);
    return params.toString();
  }, [search, category, seller, availability, ratings, price, page]);

  useEffect(() => {
    dispatch(fetchAllProducts(buildQuery()));
  }, [dispatch, buildQuery]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setSeller("");
    setAvailability("");
    setRatings("");
    setPrice("");
    setPage(1);
  };

  const hasFilters = search || category || seller || availability || ratings || price;
  const selectedShop = seller ? shops.find((s) => s.id === seller) : null;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('products.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('products.productsFound', { count: totalProducts })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('products.sortNewest')}</option>
              <option value="price-asc">{t('products.sortPriceAsc')}</option>
              <option value="price-desc">{t('products.sortPriceDesc')}</option>
              <option value="top-rated">{t('products.sortTopRated')}</option>
            </select>
            <button
              onClick={() => dispatch(toggleAIModal())}
              className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-lg font-medium hover:glow-on-hover animate-smooth"
            >
              <Sparkles className="w-4 h-4" />
              {t('products.aiSearch')}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-accent animate-smooth lg:hidden"
            >
              <Filter className="w-4 h-4" />
              {t('products.filters')}
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside
            className={`${
              showFilters ? "block" : "hidden"
            } lg:block w-full lg:w-64 shrink-0`}
          >
            <div className="mp-card p-4 space-y-6 sticky top-32">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{t('products.filters')}</h3>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('products.clearAll')}
                  </button>
                )}
              </div>

              {/* Search */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t('products.search')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder={t('products.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t('products.category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('products.allCategories')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {t(`categories.${cat.key}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shop */}
              {shops.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    {t('products.shop')}
                  </label>
                  <select
                    value={seller}
                    onChange={(e) => {
                      setSeller(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('products.allShops')}</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.store_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Range */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t('products.priceRange')}
                </label>
                <select
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('products.anyPrice')}</option>
                  <option value="0-25">{t('products.under25')}</option>
                  <option value="25-50">{t('products.range25to50')}</option>
                  <option value="50-100">{t('products.range50to100')}</option>
                  <option value="100-500">{t('products.range100to500')}</option>
                  <option value="500-10000">{t('products.above500')}</option>
                </select>
              </div>

              {/* Availability */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t('products.availability')}
                </label>
                <select
                  value={availability}
                  onChange={(e) => {
                    setAvailability(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('products.all')}</option>
                  <option value="in-stock">{t('products.inStock')}</option>
                  <option value="limited">{t('products.limitedStock')}</option>
                  <option value="out-of-stock">{t('products.outOfStock')}</option>
                </select>
              </div>

              {/* Ratings */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t('products.minRating')}
                </label>
                <div className="flex gap-2">
                  {[4, 3, 2, 1].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRatings(ratings === String(r) ? "" : String(r));
                        setPage(1);
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border animate-smooth ${
                        ratings === String(r)
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {r}
                      <Star className="w-3 h-3 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="flex-1">
            {selectedShop && (
              <div className="mp-card p-4 mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedShop.store_logo?.url || "/avatar-holder.avif"}
                    alt={selectedShop.store_name}
                    className="w-14 h-14 rounded-full object-cover border border-border"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('products.shop')}</p>
                    <h2 className="text-lg font-bold text-foreground">{selectedShop.store_name}</h2>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSeller("");
                    setPage(1);
                  }}
                  aria-label={t('aria.close')}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-32">
                <p className="text-xl text-muted-foreground">
                  {t('products.noProductsFound')}
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-primary hover:underline"
                  >
                    {t('products.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {sortedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {isAIModalOpen && <AISearchModal />}
    </div>
  );
};

export default Products;
