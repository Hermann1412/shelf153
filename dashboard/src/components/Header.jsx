import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import avatar from "../assets/avatar.jpg";
import { Menu } from "lucide-react";
import { toggleNavbar } from "../store/slices/extraSlice";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { openedComponent } = useSelector((state) => state.extra);
  const { user } = useSelector((state) => state.auth);

  return (
    <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => dispatch(toggleNavbar())}
          aria-label={t("aria.menu")}
          className="lg:hidden text-gray-600 hover:text-gray-900"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">
          {t(`sidebar.${openedComponent?.charAt(0).toLowerCase()}${openedComponent?.slice(1)}`, openedComponent)}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <span className="text-sm text-gray-600 hidden sm:block">
          {user?.name}
        </span>
        <img
          src={user?.avatar?.url || avatar}
          alt={t("header.adminAlt")}
          className="w-9 h-9 rounded-full object-cover border-2 border-green-100"
        />
      </div>
    </header>
  );
};

export default Header;
