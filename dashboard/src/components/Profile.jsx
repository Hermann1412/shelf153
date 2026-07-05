import React from "react";
import avatar from "../assets/avatar.jpg";
import { useSelector } from "react-redux";
import { Mail, Calendar, Shield } from "lucide-react";

const Profile = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <img
          src={user.avatar?.url || avatar}
          alt={user.name}
          className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-blue-100"
        />
        <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
        <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          {user.role}
        </span>

        <div className="mt-6 space-y-4 text-left">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-700">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Role</p>
              <p className="text-sm font-medium text-gray-700">{user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Joined</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
