// Products store the English category name; these are the translation keys for each one.
const CATEGORY_KEYS = {
  Electronics: "electronics",
  Fashion: "fashion",
  "Home & Garden": "homeGarden",
  Sports: "sports",
  Books: "books",
  Beauty: "beauty",
  Automotive: "automotive",
  "Kids & Baby": "kidsBaby",
};

export const categoryLabel = (name, t) => (CATEGORY_KEYS[name] ? t(`categories.${CATEGORY_KEYS[name]}`) : name);
