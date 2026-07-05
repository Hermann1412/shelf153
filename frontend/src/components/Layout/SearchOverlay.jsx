import { useState } from "react";
import { X, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toggleSearchBar } from "../../store/slices/popupSlice";

const SearchOverlay = () => {
  const [query, setQuery] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isSearchBarOpen } = useSelector((state) => state.popup);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      dispatch(toggleSearchBar());
      setQuery("");
    }
  };

  if (!isSearchBarOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-32"
        onClick={() => dispatch(toggleSearchBar())}
      >
        <div
          className="w-full max-w-2xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-14 pr-14 py-5 bg-background border border-border rounded-xl text-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={() => dispatch(toggleSearchBar())}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-lg"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default SearchOverlay;
