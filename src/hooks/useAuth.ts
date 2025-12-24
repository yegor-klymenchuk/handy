import axios from "axios";
import { getAPIUrl } from "@/lib/utils/getApiUrl";
import { openUrl } from "@tauri-apps/plugin-opener";
import { deleteToken, getToken } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const getHeaders = async () => {
  const headers = new Map<string, string>();

  const token = await getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return Object.fromEntries(headers);
};

export const useAuth = () => {
  const queryClient = useQueryClient();

  const signOut = useMutation({
    mutationFn: async () => {
      try {
        const res = await axios.post(`${getAPIUrl()}/api/signout`, {
          headers: await getHeaders(),
        });
        return res.data;
      } catch (error) {
        console.error("Failed to sign out:", error);
        return null;
      }
    },
  });

  return {
    async signIn() {
      const signInUrl = `${getAPIUrl()}/sign-in?source=desktop`;
      await openUrl(signInUrl);
    },
    async signOut() {
      signOut.mutate(undefined, {
        onSuccess: () => {
          deleteToken();
          queryClient.invalidateQueries({ queryKey: ["session"] });
        },
      });
    },
  };
};
