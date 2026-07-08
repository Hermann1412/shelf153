import React, { useEffect, useState } from "react";
import avatar from "../assets/avatar.jpg";
import { useDispatch, useSelector } from "react-redux";
import { LoaderCircle, Trash2, Ban, RotateCcw } from "lucide-react";
import {
  getAllUsers,
  deleteUser,
  updateSellerStatus,
} from "../store/slices/adminSlice";

const Users = () => {
  const dispatch = useDispatch();
  const { users, totalUsers, loading } = useSelector((state) => state.admin);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("All");
  const totalPages = Math.ceil(totalUsers / 10);

  useEffect(() => {
    dispatch(getAllUsers(page));
  }, [dispatch, page]);

  const filtered =
    filter === "All" ? users : users.filter((u) => u.role === filter);

  const handleDelete = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      dispatch(deleteUser(userId));
    }
  };

  const handleToggleSuspend = (user) => {
    const nextStatus = user.seller_status === "Suspended" ? "Approved" : "Suspended";
    dispatch(updateSellerStatus({ userId: user.id, status: nextStatus }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500">{totalUsers} total users</p>
        <div className="flex gap-2">
          {["All", "User", "Seller"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
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
                          {user.role === "Seller" && user.store_name && (
                            <span className="text-xs text-gray-400">
                              {user.store_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "Seller"
                            ? user.seller_status === "Suspended"
                              ? "bg-red-100 text-red-700"
                              : "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user.role === "Seller" && user.seller_status === "Suspended"
                          ? "Suspended Seller"
                          : user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
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
                                ? "Reinstate seller"
                                : "Suspend seller"
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
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Users;
