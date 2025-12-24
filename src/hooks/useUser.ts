import { getAPIUrl } from "@/lib/utils/getApiUrl";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getHeaders } from "./useAuth";
import { deleteToken, getToken } from "@/stores/authStore";

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useUser = () => {
  const userQuery = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const token = await getToken();

      // No token stored, user is not logged in
      if (!token) {
        return null;
      }

      try {
        const res = await axios.get<User>(`${getAPIUrl()}/api/session`, {
          headers: await getHeaders(),
        });

        return res.data;
      } catch (error) {
        // Handle 401 - token expired or invalid
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          console.log("Token expired, clearing stored token");
          await deleteToken();
          return null;
        }

        console.error("Failed to get session:", error);
        return null;
      }
    },
    // Don't retry on auth failures
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }

      return failureCount < 3;
    },
    // Refetch periodically to detect token expiration
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return userQuery;
};
