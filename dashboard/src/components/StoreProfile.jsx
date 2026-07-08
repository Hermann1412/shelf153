import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LoaderCircle, Store } from "lucide-react";
import {
  fetchStoreProfile,
  applyToBecomeSeller,
  updateStoreProfile,
} from "../store/slices/sellerSlice";

const StoreProfile = () => {
  const dispatch = useDispatch();
  const { storeProfile, storeProfileNotFound, loading } = useSelector(
    (state) => state.seller
  );
  const { user } = useSelector((state) => state.auth);
  const isSeller = user?.role === "Seller";

  const [form, setForm] = useState({
    store_name: "",
    store_description: "",
    payout_phone: "",
  });
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    if (isSeller) dispatch(fetchStoreProfile());
  }, [dispatch, isSeller]);

  useEffect(() => {
    if (storeProfile) {
      setForm({
        store_name: storeProfile.store_name || "",
        store_description: storeProfile.store_description || "",
        payout_phone: storeProfile.payout_phone || "",
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
    if (logoFile) data.append("store_logo", logoFile);

    if (isSeller) {
      dispatch(updateStoreProfile(data));
    } else {
      dispatch(applyToBecomeSeller(data));
    }
  };

  if (loading && isSeller && !storeProfile) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const showApplyForm = !isSeller || storeProfileNotFound;

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {showApplyForm ? "Become a Seller" : "Store Profile"}
            </h2>
            <p className="text-sm text-gray-500">
              {showApplyForm
                ? "Create your store to start listing products."
                : "Manage your store details."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {storeProfile?.store_logo?.url && (
            <img
              src={storeProfile.store_logo.url}
              alt="Store logo"
              className="w-20 h-20 rounded-lg object-cover"
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name
            </label>
            <input
              type="text"
              name="store_name"
              value={form.store_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Description
            </label>
            <textarea
              name="store_description"
              value={form.store_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payout Phone (Airtel Money)
            </label>
            <input
              type="text"
              name="payout_phone"
              value={form.payout_phone}
              onChange={handleChange}
              placeholder="e.g. 0700000000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Logo
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
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {showApplyForm ? "Create Store" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StoreProfile;
