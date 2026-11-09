import { useTranslation } from "react-i18next";

const CATEGORY_VALUES = [
  ["Electronics", "electronics"],
  ["Fashion", "fashion"],
  ["Home & Garden", "homeGarden"],
  ["Sports", "sports"],
  ["Books", "books"],
  ["Beauty", "beauty"],
  ["Automotive", "automotive"],
  ["Kids & Baby", "kidsBaby"],
];

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

  return (
    <>
      <div className="md:col-span-2">
        <Label htmlFor="product-name">{t("modals.titlePlaceholder")}</Label>
        <input id="product-name" type="text" value={formData.name} onChange={set("name")} className={inputClass} required maxLength={200} />
      </div>

      <div>
        <Label htmlFor="product-category">{t("products.colCategory", "Catégorie")}</Label>
        <select id="product-category" value={formData.category} onChange={set("category")} className={inputClass} required>
          {CATEGORY_VALUES.map(([value, key]) => (
            <option key={value} value={value}>
              {t(`categories.${key}`)}
            </option>
          ))}
        </select>
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
