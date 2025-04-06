import { createContext } from "react";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null | undefined;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
