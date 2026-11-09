import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ListOrdered,
  Package,
  Users,
  User,
  LogOut,
  MoveLeft,
  MessageSquare,
  Store,
  ChevronLeft,
  ChevronRight,
  Settings,
  WalletCards,
  Landmark,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { setOpenedComponent, toggleNavbar, setViewingStore } from "../store/slices/extraSlice";
import { axiosInstance } from "../lib/axios";
import { PLATFORM_STORE } from "../lib/storeScope";
import Logo from "./Logo";
import { logout } from "../store/slices/authSlice";

const SideBar = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { openedComponent, isNavbarOpened, viewingStore } = useSelector(
    (state) => state.extra
  );
  const { user } = useSelector((state) => state.auth);
  const { conversations } = useSelector((state) => state.chat);
  const totalUnread = conversations.reduce(
    (acc, c) =>
      acc + (c.status === "open" ? Number(c.unread_count || 0) : 0),
    0
  );

  const navItemsByRole = {
    Admin: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Products", icon: Package },
      { label: "Orders", icon: ListOrdered },
      { label: "Users", icon: Users },
      { label: "Payouts", icon: WalletCards },
      { label: "Finance", icon: Landmark },
      { label: "Chat", icon: MessageSquare },
      { label: "Settings", icon: Settings },
      { label: "Profile", icon: User },
    ],
    Seller: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Products", icon: Package },
      { label: "Orders", icon: ListOrdered },
      { label: "Payouts", icon: WalletCards },
      { label: "StoreProfile", icon: Store, display: t("sidebar.storeProfile") },
      { label: "Profile", icon: User },
    ],
    User: [
      { label: "StoreProfile", icon: Store, display: t("sidebar.storeProfile") },
    ],
  };

  // The main admin can open any store from the switcher and then sees that store's seller menu.
  // Shelf153 itself pays no seller, so its store view has no Payouts entry.
  const isAdmin = user?.role === "Admin";
  const [stores, setStores] = useState([]);
  useEffect(() => {
    if (!isAdmin) return;
    axiosInstance
      .get("/seller/stores")
      .then(({ data }) => setStores(data.stores || []))
      .catch(() => {});
  }, [isAdmin]);

  const storeItems = navItemsByRole.Seller
    .filter((item) => !(viewingStore?.id === PLATFORM_STORE && item.label === "Payouts"))
    .filter((item) => item.label !== "Profile");
  const navItems = isAdmin && viewingStore ? storeItems : navItemsByRole[user?.role] || [];

  const handleStoreChange = (event) => {
    const store = stores.find((entry) => entry.id === event.target.value) || null;
    dispatch(setViewingStore(store));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <>
      {/* Mobile overlay */}
      {isNavbarOpened && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => dispatch(toggleNavbar())}
        />
      )}

      <aside
        // Sticky full-height column on desktop: long pages scroll past it and Logout stays in view.
        className={`fixed lg:sticky z-40 top-0 left-0 h-screen shrink-0 w-64 bg-white shadow-lg transform transition-all duration-300 ease-in-out ${
          isNavbarOpened ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b">
            <div className={`min-w-0 ${isCollapsed ? "lg:hidden" : ""}`}>
              <Logo size="sm" />
              <p className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-400">
                {isAdmin ? t("sidebar.adminSpace", "Administration") : t("sidebar.sellerBrand", "Espace vendeur")}
              </p>
            </div>
            {isCollapsed && (
              <span className="hidden lg:block">
                <Logo size="sm" showText={false} />
              </span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
              className="hidden lg:block text-gray-500 hover:text-gray-700"
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => dispatch(toggleNavbar())}
              aria-label={t("aria.close")}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <MoveLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Store switcher (main admin only) */}
          {isAdmin && !isCollapsed && (
            <div className="px-4 pt-4">
              <label htmlFor="store-switcher" className="block mb-1.5 text-xs font-medium text-gray-500">
                {t("sidebar.viewing", "Vous gérez")}
              </label>
              <select
                id="store-switcher"
                value={viewingStore?.id || ""}
                onChange={handleStoreChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">{t("sidebar.platformAdmin", "Administration Shelf153")}</option>
                <optgroup label={t("sidebar.stores", "Boutiques")}>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.store_name}
                      {store.status === "Suspended" ? ` (${t("users.suspendedSeller")})` : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  dispatch(setOpenedComponent(item.label));
                  // On phones the sidebar is a drawer: close it once a section is picked.
                  if (isNavbarOpened) dispatch(toggleNavbar());
                }}
                aria-current={openedComponent === item.label ? "page" : undefined}
                title={isCollapsed ? item.display || t(`sidebar.${item.label.charAt(0).toLowerCase()}${item.label.slice(1)}`, item.label) : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  openedComponent === item.label
                    ? "bg-green-50 text-green-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {React.createElement(item.icon, { className: "w-5 h-5 shrink-0" })}
                <span className={`flex-1 text-left ${isCollapsed ? "lg:hidden" : ""}`}>
                  {item.display ||
                    t(
                      `sidebar.${item.label.charAt(0).toLowerCase()}${item.label.slice(1)}`,
                      item.label
                    )}
                </span>
                {item.label === "Chat" && totalUnread > 0 && (
                  <span
                    className={`bg-green-500 text-white rounded-full font-bold flex items-center justify-center shrink-0 ${
                      isCollapsed
                        ? "hidden lg:flex lg:w-2 lg:h-2"
                        : "w-5 h-5 text-[10px]"
                    }`}
                  >
                    {!isCollapsed && (totalUnread > 9 ? "9+" : totalUnread)}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              title={isCollapsed ? t("sidebar.logout") : undefined}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className={isCollapsed ? "lg:hidden" : ""}>{t("sidebar.logout")}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideBar;
