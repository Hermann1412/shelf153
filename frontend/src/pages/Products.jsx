import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Star, Filter, X, Loader } from "lucide-react";
import { categoryLabel } from "../data/products";
import ProductCard from "../components/Products/ProductCard";
import Pagination from "../components/Products/Pagination";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { fetchAllProducts, fetchShops } from "../store/slices/productSlice";

const Products = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const { products, totalProducts, loading, shops, categories } = useSelector(
    (state) => state.product
  );

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
    // The URL is the source of truth when it changes (category strip, navbar search, "Sold by" link).
    setSearch(q || "");
    setCategory(cat || "");
    setSeller(sel || "");
    setPage(1);
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
    <div className="min-h-screen">
      <div className="page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">
              {category ? categoryLabel(category, t) : t('products.title')}
            </h1>
            <p className="page-subtitle">
              {t('products.productsFound', { count: totalProducts })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label={t('products.sortNewest')}
              className="field h-10 flex-1 sm:flex-none sm:w-auto pr-8"
            >
              <option value="">{t('products.sortNewest')}</option>
              <option value="price-asc">{t('products.sortPriceAsc')}</option>
              <option value="price-desc">{t('products.sortPriceDesc')}</option>
              <option value="top-rated">{t('products.sortTopRated')}</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              className={`btn-outline shrink-0 lg:hidden ${showFilters ? "border-primary text-primary" : ""}`}
            >
              <Filter className="w-4 h-4" />
              {t('products.filters')}
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar Filters */}
          <aside
            className={`${
              showFilters ? "block" : "hidden"
            } lg:block w-full lg:w-60 shrink-0`}
          >
            <div className="surface p-5 space-y-5 lg:sticky lg:top-[8.5rem]">
              <div className="flex items-center justify-between h-6">
                <h2 className="text-sm font-semibold text-foreground">{t('products.filters')}</h2>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t('products.clearAll')}
                  </button>
                )}
              </div>

              {/* Search */}
              <div>
                <label className="field-label text-muted-foreground">
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
                    className="field h-10 pl-9"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="field-label text-muted-foreground">
                  {t('products.category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="field h-10"
                >
                  <option value="">{t('products.allCategories')}</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {categoryLabel(cat.name, t)} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shop */}
              {shops.length > 0 && (
                <div>
                  <label className="field-label text-muted-foreground">
                    {t('products.shop')}
                  </label>
                  <select
                    value={seller}
                    onChange={(e) => {
                      setSeller(e.target.value);
                      setPage(1);
                    }}
                    className="field h-10"
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
                <label className="field-label text-muted-foreground">
                  {t('products.priceRange')}
                </label>
                <select
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPage(1);
                  }}
                  className="field h-10"
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
                <label className="field-label text-muted-foreground">
                  {t('products.availability')}
                </label>
                <select
                  value={availability}
                  onChange={(e) => {
                    setAvailability(e.target.value);
                    setPage(1);
                  }}
                  className="field h-10"
                >
                  <option value="">{t('products.all')}</option>
                  <option value="in-stock">{t('products.inStock')}</option>
                  <option value="limited">{t('products.limitedStock')}</option>
                  <option value="out-of-stock">{t('products.outOfStock')}</option>
                </select>
              </div>

              {/* Ratings */}
              <div>
                <label className="field-label text-muted-foreground">
                  {t('products.minRating')}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[4, 3, 2, 1].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRatings(ratings === String(r) ? "" : String(r));
                        setPage(1);
                      }}
                      aria-pressed={ratings === String(r)}
                      className={`h-9 flex items-center justify-center gap-1 rounded-lg text-sm font-medium border transition-colors ${
                        ratings === String(r)
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-input text-foreground hover:border-primary/50"
                      }`}
                    >
                      {r}
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="flex-1 min-w-0">
            {selectedShop && (
              <div className="surface p-4 mb-5 flex items-center justify-between gap-4">
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
                  className="icon-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="surface text-center px-6 py-20">
                <span className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </span>
                <p className="mt-4 text-base font-medium text-foreground">
                  {t('products.noProductsFound')}
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="btn-outline mt-5"
                  >
                    {t('products.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {sortedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={(next) => {
                        setPage(next);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

    </div>
  );
};

export default Products;
