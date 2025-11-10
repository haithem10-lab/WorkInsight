export type RootTabParamList = {
  Home: undefined;
  Upload: undefined;
  Results: undefined;
  Matches: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  VerifyEmail: { email?: string; resent?: boolean } | undefined;
};
