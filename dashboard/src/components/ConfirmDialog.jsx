import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, danger = true }) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-full ${danger ? "bg-red-100" : "bg-green-100"}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-600" : "text-green-600"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
