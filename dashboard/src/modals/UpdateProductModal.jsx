import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { toggleUpdateProductModal } from "../store/slices/extraSlice";
import { LoaderCircle, X } from "lucide-react";
import { updateProduct } from "../store/slices/productsSlice";

const UpdateProductModal = ({ selectedProduct }) => {
  const { t } = useTranslation();
  const { loading } = useSelector((state) => state.product);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
  });

  const categoryOptions = [
    { value: "Electronics", label: t("categories.electronics") },
    { value: "Fashion", label: t("categories.fashion") },
    { value: "Home & Garden", label: t("categories.homeGarden") },
    { value: "Sports", label: t("categories.sports") },
    { value: "Books", label: t("categories.books") },
    { value: "Beauty", label: t("categories.beauty") },
    { value: "Automotive", label: t("categories.automotive") },
    { value: "Kids & Baby", label: t("categories.kidsBaby") },
  ];

  useEffect(() => {
    if (selectedProduct) {
      console.log(selectedProduct);
      setFormData({
        name: selectedProduct.name || "",
        description: selectedProduct.description || "",
        price: selectedProduct.price || "",
        category: selectedProduct.category || "",
        stock: selectedProduct.stock || "",
      });
    }
  }, [selectedProduct]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      category: formData.category,
      stock: formData.stock,
    };

    dispatch(updateProduct({ productData: data, productId: selectedProduct.id }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative">
        <button
          onClick={() => dispatch(toggleUpdateProductModal())}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">
          {t("modals.updateProduct")}
        </h2>

        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            placeholder={t("modals.titlePlaceholder")}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <select
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            required
          >
            {categoryOptions.map((cat, idx) => (
              <option key={idx} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder={t("modals.pricePlaceholder")}
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder={t("modals.stockPlaceholder")}
            value={formData.stock}
            onChange={(e) =>
              setFormData({ ...formData, stock: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />

          <textarea
            placeholder={t("modals.descriptionPlaceholder")}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent col-span-1 md:col-span-2"
            rows={4}
          />

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 px-6 rounded-lg col-span-1 md:col-span-2"
          >
            {loading ? (
              <>
                <LoaderCircle className="w-6 h-6 animate-spin" />
                {t("modals.updating")}
              </>
            ) : (
              t("modals.updateProductBtn")
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdateProductModal;
