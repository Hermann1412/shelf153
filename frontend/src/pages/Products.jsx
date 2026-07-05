import { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Star, Filter, X, Loader } from "lucide-react";
import { categories } from "../data/products";
import ProductCard from "../components/Products/ProductCard";
import Pagination from "../components/Products/Pagination";
import AISearchModal from "../components/Products/AISearchModal";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { fetchAllProducts } from "../store/slices/productSlice";
import { toggleAIModal } from "../store/slices/popupSlice";

const Products = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { products, totalProducts, loading } = useSelector(
    (state) => state.product
  );
  const { isAIModalOpen } = useSelector((state) => state.popup);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("");
  const [ratings, setRatings] = useState("");
  const [price, setPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(totalProducts / 10);

  // Read search query from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search");
    if (q) setSearch(q);
  }, [location.search]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (availability) params.set("availability", availability);
    if (ratings) params.set("ratings", ratings);
    if (price) params.set("price", price);
    params.set("page", page);
    return params.toString();
  }, [search, category, availability, ratings, price, page]);

  useEffect(() => {
    dispatch(fetchAllProducts(buildQuery()));
  }, [dispatch, buildQuery]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setAvailability("");
    setRatings("");
    setPrice("");
    setPage(1);
  };

  const hasFilters = search || category || availability || ratings || price;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground mt-1">
              {totalProducts} products found
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch(toggleAIModal())}
              className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-lg font-medium hover:glow-on-hover animate-smooth"
            >
              <Sparkles className="w-4 h-4" />
              AI Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-accent animate-smooth lg:hidden"
            >
              <Filter className="w-4 h-4" />
              Filters
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
            <div className="glass-panel space-y-6 sticky top-24">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Filters</h3>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Search */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Search
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
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Price Range
                </label>
                <select
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Any Price</option>
                  <option value="0-25">Under $25</option>
                  <option value="25-50">$25 - $50</option>
                  <option value="50-100">$50 - $100</option>
                  <option value="100-500">$100 - $500</option>
                  <option value="500-10000">$500+</option>
                </select>
              </div>

              {/* Availability */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Availability
                </label>
                <select
                  value={availability}
                  onChange={(e) => {
                    setAvailability(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All</option>
                  <option value="in-stock">In Stock</option>
                  <option value="limited">Limited Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>

              {/* Ratings */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Minimum Rating
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
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-32">
                <p className="text-xl text-muted-foreground">
                  No products found
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
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
