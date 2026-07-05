import React, { useEffect, useState } from "react";
import avatar from "../assets/avatar.jpg";
import { useDispatch, useSelector } from "react-redux";
import { LoaderCircle, Trash2 } from "lucide-react";
import { getAllUsers, deleteUser } from "../store/slices/adminSlice";

const Users = () => {
  const dispatch = useDispatch();
  const { users, totalUsers, loading } = useSelector((state) => state.admin);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(totalUsers / 10);

  useEffect(() => {
    dispatch(getAllUsers(page));
  }, [dispatch, page]);

  const handleDelete = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      dispatch(deleteUser(userId));
    }
  };

  return (
    <div>
      <p className="text-gray-500 mb-6">{totalUsers} total users</p>

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
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar?.url || avatar}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <span className="font-medium text-gray-800">
                          {user.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
