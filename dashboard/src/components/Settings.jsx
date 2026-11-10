import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { LoaderCircle, Settings as SettingsIcon } from "lucide-react";
import { fetchSiteSettings, updateSiteSettings } from "../store/slices/settingsSlice";

const Settings = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { settings, loading } = useSelector((state) => state.settings);

  const [form, setForm] = useState({
    contact_email: "",
    contact_phone: "",
    address: "",
    shipping_info: "",
    returns_policy: "",
  });

  useEffect(() => {
    dispatch(fetchSiteSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setForm({
        contact_email: settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        address: settings.address || "",
        shipping_info: settings.shipping_info || "",
        returns_policy: settings.returns_policy || "",
      });
    }
  }, [settings]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateSiteSettings(form));
  };

  if (loading && !settings) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{t("settings.title")}</h2>
            <p className="text-sm text-gray-500">{t("settings.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.contactEmail")}
            </label>
            <input
              type="email"
              name="contact_email"
              value={form.contact_email}
              onChange={handleChange}
              placeholder={t("settings.contactEmailPlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.contactPhone")}
            </label>
            <input
              type="text"
              name="contact_phone"
              value={form.contact_phone}
              onChange={handleChange}
              placeholder={t("settings.contactPhonePlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.address")}
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={2}
              placeholder={t("settings.addressPlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Customer-service pages: each appears in the storefront footer only once it has text. */}
          <div className="pt-5 mt-2 border-t">
            <h3 className="text-sm font-semibold text-gray-900">{t("settings.servicePages", "Service client")}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {t("settings.servicePagesHint", "Chaque page apparaît dans le pied de page de la boutique dès qu'elle contient du texte. Laissez vide pour la masquer.")}
            </p>
          </div>

          <div>
            <label htmlFor="settings-shipping" className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.shippingInfo", "Infos livraison")}
            </label>
            <textarea
              id="settings-shipping"
              name="shipping_info"
              value={form.shipping_info}
              onChange={handleChange}
              rows={6}
              maxLength={10000}
              placeholder={t("settings.shippingInfoPlaceholder", "Zones livrées, délais, frais de livraison…")}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
            />
          </div>

          <div>
            <label htmlFor="settings-returns" className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.returnsPolicy", "Politique de retour")}
            </label>
            <textarea
              id="settings-returns"
              name="returns_policy"
              value={form.returns_policy}
              onChange={handleChange}
              rows={6}
              maxLength={10000}
              placeholder={t("settings.returnsPolicyPlaceholder", "Délai pour retourner un article, conditions, remboursement…")}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {t("settings.saveChanges")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
