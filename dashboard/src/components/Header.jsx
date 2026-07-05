import React from "react";
import { useDispatch, useSelector } from "react-redux";
import avatar from "../assets/avatar.jpg";
import { Menu } from "lucide-react";
import { toggleNavbar } from "../store/slices/extraSlice";

const Header = () => {
  const dispatch = useDispatch();
  const { openedComponent } = useSelector((state) => state.extra);
  const { user } = useSelector((state) => state.auth);

  return (
    <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => dispatch(toggleNavbar())}
          className="lg:hidden text-gray-600 hover:text-gray-900"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">
          {openedComponent}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 hidden sm:block">
          {user?.name}
        </span>
        <img
          src={user?.avatar?.url || avatar}
          alt="Admin"
          className="w-9 h-9 rounded-full object-cover border-2 border-blue-100"
        />
      </div>
    </header>
  );
};

export default Header;
