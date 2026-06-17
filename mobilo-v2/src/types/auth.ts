export type AuthMode = "signIn" | "signUp";

export type AuthUser = {
  id: string;
  fullName: string;
  phoneNumber: string;
  phoneDisplay: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
};

export type RequestOtpResponse = {
  message: string;
  expiresInSeconds: number;
  deliveryMode: "sms" | "local-fallback";
  devOtp?: string;
};

export type VerifyOtpResponse = {
  message: string;
  token: string;
  user: AuthUser;
};
