import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";
import { categoryLabel } from "../lib/categories";

const NEW_CATEGORY = "__new__";

const inputClass =
  "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";

const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block mb-1.5 text-sm font-medium text-gray-700">
    {children}
  </label>
);

// Shared by the create and update modals. `price` is the CDF amount the backend expects.
const ProductFormFields = ({ formData, setFormData, divisor, withImages = false }) => {
  const { t } = useTranslation();
  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });
  const usdPreview = divisor && Number(formData.price) > 0
    ? (Math.round((Number(formData.price) / divisor) * 100) / 100).toFixed(2)
    : null;

  // Categories in use on the storefront; a new one is created simply by typing its name.
  const [categories, setCategories] = useState([]);
  const [typingNew, setTypingNew] = useState(false);
  useEffect(() => {
    axiosInstance
      .get("/product/categories")
      .then(({ data }) => setCategories((data.categories || []).map((c) => c.name)))
      .catch(() => {});
  }, []);
  // Keep the product's current category selectable even if it is not listed (e.g. its last product).
  const options = formData.category && !categories.includes(formData.category)
    ? [...categories, formData.category]
    : categories;
  const handleCategorySelect = (e) => {
    if (e.target.value === NEW_CATEGORY) {
      setTypingNew(true);
      setFormData({ ...formData, category: "" });
    } else {
      setFormData({ ...formData, category: e.target.value });
    }
  };

  return (
    <>
      <div className="md:col-span-2">
        <Label htmlFor="product-name">{t("modals.titlePlaceholder")}</Label>
        <input id="product-name" type="text" value={formData.name} onChange={set("name")} className={inputClass} required maxLength={200} />
      </div>

      <div>
        <Label htmlFor="product-category">{t("products.colCategory", "Catégorie")}</Label>
        {typingNew ? (
          <div className="flex gap-2">
            <input
              id="product-category"
              type="text"
              value={formData.category}
              onChange={set("category")}
              placeholder={t("modals.newCategoryPlaceholder", "Nom de la nouvelle catégorie")}
              maxLength={100}
              autoFocus
              required
              className={inputClass}
            />
            {categories.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTypingNew(false);
                  setFormData({ ...formData, category: "" });
                }}
                className="shrink-0 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t("modals.chooseExisting", "Liste")}
              </button>
            )}
          </div>
        ) : (
          <select id="product-category" value={formData.category} onChange={handleCategorySelect} className={inputClass} required>
            <option value="" disabled>
              {t("modals.chooseCategory", "Choisir une catégorie")}
            </option>
            {options.map((name) => (
              <option key={name} value={name}>
                {categoryLabel(name, t)}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ {t("modals.newCategory", "Nouvelle catégorie…")}</option>
          </select>
        )}
      </div>

      <div>
        <Label htmlFor="product-stock">{t("modals.stockPlaceholder")}</Label>
        <input id="product-stock" type="number" min="0" step="1" inputMode="numeric" value={formData.stock} onChange={set("stock")} className={inputClass} required />
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="product-price">{t("modals.priceCdf", "Prix (CDF)")}</Label>
        <input id="product-price" type="number" min="1" step="1" inputMode="numeric" value={formData.price} onChange={set("price")} className={inputClass} required />
        <p className="mt-1.5 text-xs text-gray-500">
          {usdPreview
            ? t("modals.priceUsdPreview", { amount: usdPreview, defaultValue: "≈ ${{amount}} affiché aux clients" })
            : t("modals.priceHint", "Saisissez le prix en francs congolais ; il est converti en dollars pour la boutique.")}
        </p>
      </div>

      {withImages && (
        <div className="md:col-span-2">
          <Label htmlFor="product-images">{t("modals.images", "Photos")}</Label>
          <input
            id="product-images"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFormData({ ...formData, images: Array.from(e.target.files) })}
            className={`${inputClass} file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-green-50 file:text-green-700`}
            required
          />
          {formData.images.length > 0 && (
            <p className="mt-1.5 text-xs text-gray-500">{formData.images.map((file) => file.name).join(", ")}</p>
          )}
        </div>
      )}

      <div className="md:col-span-2">
        <Label htmlFor="product-description">{t("modals.descriptionPlaceholder")}</Label>
        <textarea id="product-description" rows={4} value={formData.description} onChange={set("description")} className={`${inputClass} resize-y`} required />
      </div>
    </>
  );
};

export default ProductFormFields;
