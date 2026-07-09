import React from "react";
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
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { setOpenedComponent, toggleNavbar } from "../store/slices/extraSlice";
import { logout } from "../store/slices/authSlice";

const SideBar = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { openedComponent, isNavbarOpened } = useSelector(
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
      { label: "Chat", icon: MessageSquare },
      { label: "Profile", icon: User },
    ],
    Seller: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Products", icon: Package },
      { label: "Orders", icon: ListOrdered },
      { label: "StoreProfile", icon: Store, display: t("sidebar.storeProfile") },
      { label: "Profile", icon: User },
    ],
    User: [
      { label: "StoreProfile", icon: Store, display: t("sidebar.storeProfile") },
    ],
  };

  const navItems = navItemsByRole[user?.role] || [];

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
        className={`fixed lg:static z-40 top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isNavbarOpened ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b">
            <h1 className="text-xl font-bold text-green-600">{t("sidebar.brand")}</h1>
            <button
              onClick={() => dispatch(toggleNavbar())}
              aria-label={t("aria.close")}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <MoveLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(({ label, icon: Icon, display }) => (
              <button
                key={label}
                onClick={() => dispatch(setOpenedComponent(label))}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  openedComponent === label
                    ? "bg-green-50 text-green-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">
                  {display ||
                    t(
                      `sidebar.${label.charAt(0).toLowerCase()}${label.slice(1)}`,
                      label
                    )}
                </span>
                {label === "Chat" && totalUnread > 0 && (
                  <span className="w-5 h-5 bg-green-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {t("sidebar.logout")}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideBar;
