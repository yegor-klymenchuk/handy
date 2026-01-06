import { getAPIUrl } from "@/lib/utils/getApiUrl";
import { openUrl } from "@tauri-apps/plugin-opener";
import { deleteToken } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";

export const useAuth = () => {
  const queryClient = useQueryClient();

  return {
    async signIn() {
      const signInUrl = `${getAPIUrl()}/sign-in?source=desktop`;
      await openUrl(signInUrl);
    },
    async signOut() {
      await deleteToken();
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  };
};
