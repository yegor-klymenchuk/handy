import { useQuery } from "@tanstack/react-query";
import { deleteToken, getToken } from "@/stores/authStore";
import { invoke } from "@tauri-apps/api/core";

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  expiresAt: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface SessionResponse {
  session: Session;
  user: User;
}

export const useSession = () => {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const token = await getToken();

      if (!token) {
        return null;
      }

      try {
        return await invoke<SessionResponse>("get_session", { token });
      } catch (error) {
        if (typeof error === "string" && error.includes("401")) {
          console.log("Token expired, clearing stored token");
          await deleteToken();
          return null;
        }

        console.error("Failed to get session:", error);
        return null;
      }
    },
    retry: (failureCount, error: any) => {
      if (typeof error === "string" && error.includes("401")) {
        return false;
      }

      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return sessionQuery;
};
