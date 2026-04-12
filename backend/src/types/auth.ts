export type GoogleProfile = {
  googleSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export type AuthenticatedUser = {
  id: string;
};
