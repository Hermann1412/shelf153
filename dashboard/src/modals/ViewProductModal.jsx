import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { X } from "lucide-react";
import { toggleViewProductModal } from "../store/slices/extraSlice";

const ViewProductModal = ({ selectedProduct }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh] relative">
          <button
            onClick={() => dispatch(toggleViewProductModal())}
            className="absolute top-4 right-4 text-gray-500 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold mb-4">{selectedProduct.title}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Images */}
            <div className="grid grid-cols-2 gap-3">
              {selectedProduct.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img?.url}
                  alt={t("modals.productImageAlt", { name: selectedProduct.title, index: idx + 1 })}
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
            {/* Info */}
            <div>
              <p>
                <strong>{t("modals.id")}</strong> {selectedProduct.id}
              </p>
              <p>
                <strong>{t("modals.description")}</strong>{" "}
                {selectedProduct.description}
              </p>
              <p>
                <strong>{t("modals.category")}</strong>{" "}
                {selectedProduct.category}
              </p>
              <p>
                <strong>{t("modals.price")}</strong> ${" "}
                {selectedProduct.price.toLocaleString()}
              </p>
              <p>
                <strong>{t("modals.ratings")}</strong> ⭐{" "}
                {selectedProduct.ratings}
              </p>
              <p>
                <strong>{t("modals.stock")}</strong>{" "}
                {selectedProduct.stock > 0
                  ? t("modals.inStock", { count: selectedProduct.stock })
                  : t("modals.outOfStock")}
              </p>
              <p>
                <strong>{t("modals.createdAt")}</strong>{" "}
                {new Date(selectedProduct.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewProductModal;
