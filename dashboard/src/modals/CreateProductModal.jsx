import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { createNewProduct } from "../store/slices/productsSlice";
import { toggleCreateProductModal } from "../store/slices/extraSlice";
import { LoaderCircle, X } from "lucide-react";
import ProductFormFields from "./ProductFormFields";
import { usePriceDivisor } from "../lib/usePriceDivisor";

const CreateProductModal = () => {
  const { t } = useTranslation();
  const { loading } = useSelector((state) => state.product);
  const dispatch = useDispatch();
  const divisor = usePriceDivisor();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Electronics",
    stock: "",
    images: [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("price", formData.price);
    data.append("category", formData.category);
    data.append("stock", formData.stock);
    for (const image of formData.images) data.append("images", image);
    dispatch(createNewProduct(data));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="create-product-title" className="bg-white rounded-xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto p-6 relative">
        <button
          onClick={() => dispatch(toggleCreateProductModal())}
          aria-label={t("aria.close")}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 id="create-product-title" className="text-xl font-bold text-gray-900 mb-5 pr-10">
          {t("modals.createProduct")}
        </h2>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <ProductFormFields formData={formData} setFormData={setFormData} divisor={divisor} withImages />
          <div className="md:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => dispatch(toggleCreateProductModal())}
              className="py-2.5 px-5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              {t("common.cancel", "Annuler")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                  {t("modals.creating")}
                </>
              ) : (
                t("modals.addNewProduct")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductModal;
