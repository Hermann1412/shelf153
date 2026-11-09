import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { LoaderCircle, Store, Clock, Copy, Check } from "lucide-react";
import { storeLoginUrl } from "../lib/storeScope";
import {
  fetchStoreProfile,
  applyToBecomeSeller,
  updateStoreProfile,
} from "../store/slices/sellerSlice";

// The store's own login page address, with a copy button.
const StoreLinkCard = ({ link }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link stays selectable in the field.
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-900">{t("storeProfile.loginLink", "Lien de connexion de la boutique")}</p>
      <p className="mt-1 text-xs text-gray-500">
        {t("storeProfile.loginLinkHint", "Cette page de connexion affiche le nom et le logo de la boutique.")}
      </p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          aria-label={t("storeProfile.loginLink", "Lien de connexion de la boutique")}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-gray-50"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copied ? t("storeProfile.copied", "Copié") : t("storeProfile.copy", "Copier")}
        </button>
      </div>
    </div>
  );
};

const StoreProfile = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { storeProfile, storeProfileNotFound, loading } = useSelector(
    (state) => state.seller
  );
  const { user } = useSelector((state) => state.auth);
  const viewingStore = useSelector((state) => state.extra.viewingStore);
  const isSeller = user?.role === "Seller";
  const adminViewing = user?.role === "Admin" && Boolean(viewingStore);

  const [form, setForm] = useState({
    store_name: "",
    store_description: "",
    payout_phone: "",
    payout_provider: "",
  });
  const [logoFile, setLogoFile] = useState(null);

  // Applicants load their application too, to see whether it is pending or refused.
  useEffect(() => {
    dispatch(fetchStoreProfile());
  }, [dispatch]);

  useEffect(() => {
    if (storeProfile) {
      setForm({
        store_name: storeProfile.store_name || "",
        store_description: storeProfile.store_description || "",
        payout_phone: storeProfile.payout_phone || "",
        payout_provider: storeProfile.payout_provider || "",
      });
    }
  }, [storeProfile]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("store_name", form.store_name);
    data.append("store_description", form.store_description);
    data.append("payout_phone", form.payout_phone);
    data.append("payout_provider", form.payout_provider);
    if (logoFile) data.append("store_logo", logoFile);

    if (isSeller) {
      dispatch(updateStoreProfile(data));
    } else {
      dispatch(applyToBecomeSeller(data));
    }
  };

  if (loading && !storeProfile && !storeProfileNotFound) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  // The main admin inside a store's view sees its details and login link, read-only.
  if (adminViewing && storeProfile) {
    const loginLink = storeProfile.slug ? storeLoginUrl(storeProfile.slug) : `${window.location.origin}/login`;
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex items-center gap-4">
            {storeProfile.store_logo?.url ? (
              <img src={storeProfile.store_logo.url} alt="" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <span className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center">
                <Store className="w-7 h-7 text-green-700" />
              </span>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{storeProfile.store_name}</h2>
              <p className="text-sm text-gray-500">{storeProfile.status}</p>
            </div>
          </div>
          {storeProfile.store_description && (
            <p className="mt-5 text-sm leading-relaxed text-gray-600">{storeProfile.store_description}</p>
          )}
          {!storeProfile.platform && (
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">{t("storeProfile.payoutPhone")}</dt>
                <dd className="font-medium text-gray-900">{storeProfile.payout_phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("storeProfile.payoutProvider")}</dt>
                <dd className="font-medium text-gray-900">{storeProfile.payout_provider || "—"}</dd>
              </div>
            </dl>
          )}
        </div>
        <StoreLinkCard link={loginLink} />
      </div>
    );
  }

  const applicationStatus = !isSeller ? storeProfile?.status : null;

  if (applicationStatus === "Pending") {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-gray-800">
            {t("storeProfile.pendingTitle", "Demande en cours d'examen")}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {t("storeProfile.pendingText", {
              store: storeProfile.store_name,
              defaultValue: "Votre demande pour la boutique « {{store}} » a bien été envoyée. Un administrateur de Shelf153 va l'examiner. Vous pourrez ajouter vos produits dès qu'elle sera approuvée.",
            })}
          </p>
        </div>
      </div>
    );
  }

  const showApplyForm = !isSeller || storeProfileNotFound;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {isSeller && storeProfile?.slug && <StoreLinkCard link={storeLoginUrl(storeProfile.slug)} />}
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {showApplyForm ? t("storeProfile.becomeSeller") : t("storeProfile.storeProfile")}
            </h2>
            <p className="text-sm text-gray-500">
              {showApplyForm
                ? t("storeProfile.createStoreSubtitle")
                : t("storeProfile.manageStoreSubtitle")}
            </p>
          </div>
        </div>

        {applicationStatus === "Rejected" && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {t("storeProfile.rejectedText", "Votre demande précédente n'a pas été acceptée. Vous pouvez corriger les informations et la renvoyer.")}
          </div>
        )}
        {showApplyForm && applicationStatus !== "Rejected" && (
          <p className="mb-5 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {t("storeProfile.reviewNotice", "Votre demande sera examinée par l'équipe Shelf153 avant l'ouverture de votre boutique.")}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {storeProfile?.store_logo?.url && (
            <img
              src={storeProfile.store_logo.url}
              alt={t("storeProfile.logoAlt")}
              className="w-20 h-20 rounded-lg object-cover"
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("storeProfile.storeName")}
            </label>
            <input
              type="text"
              name="store_name"
              value={form.store_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("storeProfile.storeDescription")}
            </label>
            <textarea
              name="store_description"
              value={form.store_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("storeProfile.payoutPhone")}
            </label>
            <input
              type="text"
              name="payout_phone"
              value={form.payout_phone}
              onChange={handleChange}
              placeholder={t("storeProfile.payoutPhonePlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("storeProfile.payoutProvider")}
            </label>
            <select
              name="payout_provider"
              value={form.payout_provider}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">{t("storeProfile.selectPayoutProvider")}</option>
              <option value="AIRTEL_COD">Airtel Money</option>
              <option value="VODACOM_MPESA_COD">Vodacom M-Pesa</option>
              <option value="ORANGE_COD">Orange Money</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("storeProfile.storeLogo")}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files[0])}
              className="w-full text-sm text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {showApplyForm ? t("storeProfile.createStore") : t("storeProfile.saveChanges")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StoreProfile;
