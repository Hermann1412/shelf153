import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { toggleUpdateProductModal } from "../store/slices/extraSlice";
import { LoaderCircle, X } from "lucide-react";
import { updateProduct } from "../store/slices/productsSlice";
import ProductFormFields from "./ProductFormFields";
import { usePriceDivisor } from "../lib/usePriceDivisor";

const UpdateProductModal = ({ selectedProduct }) => {
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
  });

  // The stored price is in USD but the API expects the CDF amount, so convert back before editing.
  // Without that, saving an untouched form divided the price again (e.g. $28.00 became $0.10).
  useEffect(() => {
    if (!selectedProduct || !divisor) return;
    setFormData({
      name: selectedProduct.name ?? "",
      description: selectedProduct.description ?? "",
      price: String(Math.round(Number(selectedProduct.price) * divisor)),
      category: selectedProduct.category || "Electronics",
      stock: String(selectedProduct.stock ?? ""),
    });
  }, [selectedProduct, divisor]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading || !divisor) return;
    dispatch(
      updateProduct({
        productData: {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          category: formData.category,
          stock: formData.stock,
        },
        productId: selectedProduct.id,
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="update-product-title" className="bg-white rounded-xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto p-6 relative">
        <button
          onClick={() => dispatch(toggleUpdateProductModal())}
          aria-label={t("aria.close")}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 id="update-product-title" className="text-xl font-bold text-gray-900 mb-5 pr-10">
          {t("modals.updateProduct")}
        </h2>

        {!divisor ? (
          <div className="flex justify-center py-16">
            <LoaderCircle className="w-7 h-7 animate-spin text-green-500" />
          </div>
        ) : (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <ProductFormFields formData={formData} setFormData={setFormData} divisor={divisor} />
            <div className="md:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => dispatch(toggleUpdateProductModal())}
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
                    {t("modals.updating")}
                  </>
                ) : (
                  t("modals.updateProductBtn")
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UpdateProductModal;
