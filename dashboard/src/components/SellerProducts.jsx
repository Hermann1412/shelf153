import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import CreateProductModal from "../modals/CreateProductModal";
import { useDispatch, useSelector } from "react-redux";
import UpdateProductModal from "../modals/UpdateProductModal";
import ViewProductModal from "../modals/ViewProductModal";
import ConfirmDialog from "./ConfirmDialog";
import { fetchSellerProducts } from "../store/slices/sellerSlice";
import { deleteProduct } from "../store/slices/productsSlice";
import {
  toggleCreateProductModal,
  toggleViewProductModal,
  toggleUpdateProductModal,
} from "../store/slices/extraSlice";

const SellerProducts = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { products, totalProducts, loading } = useSelector(
    (state) => state.seller
  );
  const {
    isCreateProductModalOpened,
    isViewProductModalOpened,
    isUpdateProductModalOpened,
  } = useSelector((state) => state.extra);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [page, setPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const totalPages = Math.ceil(totalProducts / 10);
  const isFirstRender = useRef(true);

  useEffect(() => {
    dispatch(fetchSellerProducts(page));
  }, [dispatch, page]);

  // Modals mutate the shared `product` slice; re-sync the seller-scoped list once one closes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isCreateProductModalOpened && !isUpdateProductModalOpened) {
      dispatch(fetchSellerProducts(page));
    }
  }, [isCreateProductModalOpened, isUpdateProductModalOpened, dispatch, page]);

  const handleView = (product) => {
    setSelectedProduct(product);
    dispatch(toggleViewProductModal());
  };

  const handleUpdate = (product) => {
    setSelectedProduct(product);
    dispatch(toggleUpdateProductModal());
  };

  const handleDelete = (productId) => {
    setPendingDeleteId(productId);
  };

  const confirmDelete = async () => {
    await dispatch(deleteProduct(pendingDeleteId));
    dispatch(fetchSellerProducts(page));
    setPendingDeleteId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500">
          {t("products.totalProducts", { count: totalProducts })}
        </p>
        <button
          onClick={() => dispatch(toggleCreateProductModal())}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("products.addProduct")}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : totalProducts === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {t("products.noProductsYet")}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">{t("products.colImage")}</th>
                  <th className="px-6 py-3 font-medium">{t("products.colName")}</th>
                  <th className="px-6 py-3 font-medium">{t("products.colCategory")}</th>
                  <th className="px-6 py-3 font-medium">{t("products.colPrice")}</th>
                  <th className="px-6 py-3 font-medium">{t("products.colStock")}</th>
                  <th className="px-6 py-3 font-medium">{t("products.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <img
                        src={product.images?.[0]?.url || "/placeholder.png"}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800 max-w-[200px] truncate">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      ${Number(product.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 5
                            ? "bg-green-100 text-green-700"
                            : product.stock > 0
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(product)}
                          aria-label={t("aria.view")}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdate(product)}
                          aria-label={t("aria.edit")}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          aria-label={t("aria.delete")}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-gray-500">
                {t("products.page", { page, totalPages })}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  {t("products.previous")}
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  {t("products.next")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isCreateProductModalOpened && <CreateProductModal />}
      {isViewProductModalOpened && selectedProduct && (
        <ViewProductModal selectedProduct={selectedProduct} />
      )}
      {isUpdateProductModalOpened && selectedProduct && (
        <UpdateProductModal selectedProduct={selectedProduct} />
      )}

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={t("common.delete")}
        message={t("products.confirmDelete")}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};

export default SellerProducts;
