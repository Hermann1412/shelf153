import { useEffect, useState } from "react";
import { X, LogOut, Upload, Eye, EyeOff, Store } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toggleProfilePanel } from "../../store/slices/popupSlice";
import {
  logout,
  updateProfile,
  updatePassword,
} from "../../store/slices/authSlice";

const ProfilePanel = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isProfilePanelOpen } = useSelector((state) => state.popup);
  const { authUser, isUpdatingProfile, isUpdatingPassword } = useSelector(
    (state) => state.auth
  );
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    if (authUser) {
      setName(authUser.name || "");
      setEmail(authUser.email || "");
    }
  }, [authUser]);

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (avatar) formData.append("avatar", avatar);
    dispatch(updateProfile(formData));
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    const next = {};
    if (!currentPassword) next.currentPassword = t("validation.required");
    if (!newPassword) next.newPassword = t("validation.required");
    else if (newPassword.length < 8 || newPassword.length > 16) {
      next.newPassword = t("validation.passwordLength");
    }
    if (!confirmNewPassword) next.confirmNewPassword = t("validation.required");
    else if (newPassword !== confirmNewPassword) {
      next.confirmNewPassword = t("validation.passwordMismatch");
    }
    setPasswordErrors(next);
    if (Object.keys(next).length > 0) return;

    dispatch(
      updatePassword({ currentPassword, newPassword, confirmNewPassword })
    );
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  if (!isProfilePanelOpen || !authUser) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => dispatch(toggleProfilePanel())}
      />
      <div className="fixed top-0 right-0 h-full w-96 max-w-full bg-background border-l border-border z-50 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t("profile.title")}</h2>
          <button
            onClick={() => dispatch(toggleProfilePanel())}
            aria-label={t("aria.close")}
            className="p-2 hover:bg-secondary rounded-lg"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <img
              src={authUser.avatar?.url || "/avatar-holder.avif"}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover border-2 border-primary"
            />
            <div>
              <h3 className="font-semibold text-foreground">{authUser.name}</h3>
              <p className="text-sm text-muted-foreground">{authUser.email}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("profile")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                tab === "profile"
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {t("profile.editProfile")}
            </button>
            <button
              onClick={() => setTab("password")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                tab === "password"
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {t("profile.password")}
            </button>
          </div>

          {tab === "profile" ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.name")}
                className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("profile.email")}
                className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <label className="flex items-center gap-2 px-4 py-3 bg-secondary border border-border rounded-lg cursor-pointer hover:bg-secondary/80">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {avatar ? avatar.name : t("profile.changeAvatar")}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatar(e.target.files[0])}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-3 gradient-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50"
              >
                {isUpdatingProfile ? t("profile.updating") : t("profile.updateProfile")}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t("profile.currentPassword")}
                    className={`w-full px-4 py-3 bg-secondary border rounded-lg text-foreground focus:outline-none focus:ring-2 ${
                      passwordErrors.currentPassword ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive mt-1">{passwordErrors.currentPassword}</p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("profile.newPassword")}
                  className={`w-full px-4 py-3 bg-secondary border rounded-lg text-foreground focus:outline-none focus:ring-2 ${
                    passwordErrors.newPassword ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                  }`}
                />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive mt-1">{passwordErrors.newPassword}</p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={t("profile.confirmNewPassword")}
                  className={`w-full px-4 py-3 bg-secondary border rounded-lg text-foreground focus:outline-none focus:ring-2 ${
                    passwordErrors.confirmNewPassword ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                  }`}
                />
                {passwordErrors.confirmNewPassword && (
                  <p className="text-xs text-destructive mt-1">{passwordErrors.confirmNewPassword}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-3 gradient-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50"
              >
                {isUpdatingPassword ? t("profile.updating") : t("profile.updatePassword")}
              </button>
            </form>
          )}

          <a
            href={import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5174"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-6 py-3 bg-secondary text-foreground rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-secondary/80"
          >
            <Store className="w-5 h-5" />
            {authUser.role === "Seller" ? t("profile.manageMyStore") : t("profile.becomeSeller")}
          </a>

          <button
            onClick={() => {
              dispatch(logout());
              dispatch(toggleProfilePanel());
            }}
            className="w-full mt-3 py-3 bg-destructive/10 text-destructive rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-destructive/20"
          >
            <LogOut className="w-5 h-5" />
            {t("profile.logout")}
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfilePanel;
