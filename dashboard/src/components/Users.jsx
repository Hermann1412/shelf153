import React, { useEffect, useState } from "react";
import avatar from "../assets/avatar.jpg";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { LoaderCircle, Trash2, Ban, RotateCcw, Search, Check, X, Store } from "lucide-react";
import { setViewingStore } from "../store/slices/extraSlice";
import ConfirmDialog from "./ConfirmDialog";
import {
  getAllUsers,
  deleteUser,
  updateSellerStatus,
} from "../store/slices/adminSlice";

const Users = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { users, totalUsers, loading, pendingApplications } = useSelector((state) => state.admin);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("All");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const totalPages = Math.ceil(totalUsers / 10);

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    dispatch(getAllUsers({ page, role: filter === "All" ? "" : filter, search: debouncedSearch }));
  }, [dispatch, page, filter, debouncedSearch]);

  const filtered = users;

  const handleDelete = (userId) => {
    setPendingDeleteId(userId);
  };

  const confirmDelete = () => {
    dispatch(deleteUser(pendingDeleteId));
    setPendingDeleteId(null);
  };

  const filterLabels = {
    All: t("users.all"),
    User: t("users.user"),
    Seller: t("users.seller"),
    Pending: t("users.applications", "Demandes"),
  };

  const refresh = () =>
    dispatch(getAllUsers({ page, role: filter === "All" ? "" : filter, search: debouncedSearch }));

  const handleToggleSuspend = (user) => {
    const nextStatus = user.seller_status === "Suspended" ? "Approved" : "Suspended";
    dispatch(updateSellerStatus({ userId: user.id, status: nextStatus }));
  };

  // Approving turns the applicant into a seller; refusing lets them correct and resend.
  const handleReview = async (user, status) => {
    const question = status === "Approved"
      ? t("users.confirmApprove", { store: user.store_name, defaultValue: "Approuver la boutique « {{store}} » ? Elle pourra vendre sur Shelf153." })
      : t("users.confirmReject", { store: user.store_name, defaultValue: "Refuser la boutique « {{store}} » ?" });
    if (!window.confirm(question)) return;
    const result = await dispatch(updateSellerStatus({ userId: user.id, status }));
    if (updateSellerStatus.fulfilled.match(result)) refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <p className="text-gray-500 shrink-0">
          {t("users.totalUsers", { count: totalUsers })}
        </p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.searchUserPlaceholder")}
              className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-2">
            {["All", "User", "Seller", "Pending"].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                aria-pressed={filter === f}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50 border"
                }`}
              >
                {filterLabels[f]}
                {f === "Pending" && pendingApplications > 0 && (
                  <span className={`ml-1.5 inline-flex min-w-[1.25rem] h-5 px-1 items-center justify-center rounded-full text-xs font-bold ${
                    filter === f ? "bg-white text-green-700" : "bg-amber-500 text-white"
                  }`}>
                    {pendingApplications}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("users.colUser")}</th>
                  <th className="px-4 py-3 font-medium">{t("users.colEmail")}</th>
                  <th className="px-4 py-3 font-medium">{t("users.colRole")}</th>
                  <th className="px-4 py-3 font-medium">{t("users.colJoined")}</th>
                  <th className="px-4 py-3 font-medium">{t("users.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      {t("users.noUsersFound", "Aucun utilisateur trouvé.")}
                    </td>
                  </tr>
                )}
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar?.url || avatar}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <span className="font-medium text-gray-800 block">
                            {user.name}
                          </span>
                          {user.store_name && (
                            <span className="text-xs text-gray-400 block">
                              {user.store_name}
                            </span>
                          )}
                          {user.seller_status === "Pending" && (
                            <span className="text-xs text-gray-400 block">
                              {[user.payout_provider, user.payout_phone].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.seller_status === "Pending"
                            ? "bg-amber-100 text-amber-800"
                            : user.role === "Seller"
                            ? user.seller_status === "Suspended"
                              ? "bg-red-100 text-red-700"
                              : "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user.seller_status === "Pending"
                          ? t("users.pendingApplication", "Demande vendeur")
                          : user.role === "Seller" && user.seller_status === "Suspended"
                          ? t("users.suspendedSeller")
                          : user.role === "Seller"
                          ? t("users.seller")
                          : t("users.user")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString(i18n?.language)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.seller_status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleReview(user, "Approved")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {t("users.approve", "Approuver")}
                            </button>
                            <button
                              onClick={() => handleReview(user, "Rejected")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border text-gray-700 hover:bg-gray-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              {t("users.reject", "Refuser")}
                            </button>
                          </>
                        )}
                        {user.role === "Seller" && (
                          <button
                            onClick={() => dispatch(setViewingStore({ id: user.id, store_name: user.store_name, slug: user.store_slug }))}
                            title={t("users.openStore", "Ouvrir la boutique")}
                            aria-label={t("users.openStore", "Ouvrir la boutique")}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50"
                          >
                            <Store className="w-4 h-4" />
                          </button>
                        )}
                        {user.role === "Seller" && (
                          <button
                            onClick={() => handleToggleSuspend(user)}
                            className={`p-1.5 rounded-lg ${
                              user.seller_status === "Suspended"
                                ? "text-gray-500 hover:text-green-600 hover:bg-green-50"
                                : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                            }`}
                            title={
                              user.seller_status === "Suspended"
                                ? t("users.reinstateSeller")
                                : t("users.suspendSeller")
                            }
                            aria-label={
                              user.seller_status === "Suspended"
                                ? t("users.reinstateSeller")
                                : t("users.suspendSeller")
                            }
                          >
                            {user.seller_status === "Suspended" ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user.id)}
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

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={t("common.delete")}
        message={t("users.confirmDelete")}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};

export default Users;
