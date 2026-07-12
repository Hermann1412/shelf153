import { Link } from "react-router-dom";
import { categories } from "../../data/products";

const CategoryStrip = () => {
  return (
    <div className="mp-strip">
      <div className="container mx-auto px-4 flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/products?category=${encodeURIComponent(category.name)}`}
            className="shrink-0 px-3 py-2 text-base font-medium text-foreground/90 hover:text-primary hover:bg-secondary rounded-lg transition-colors whitespace-nowrap"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CategoryStrip;
