export type User = {
  id?: string;
  name: string;
  email: string;
  role: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  name: string;
  phone?: string;
};

