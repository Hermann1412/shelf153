export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  created_at: true,
};

export const toPublicUser = (user) => {
  if (!user) return null;
  const {
    password: _password,
    reset_password_token: _resetToken,
    reset_password_expire: _resetExpire,
    ...publicUser
  } = user;
  return publicUser;
};
