import { setToken } from "@/stores/authStore";
import { queryClient } from "@/lib/queryClient";

interface DeepLinks {
  authCallback: (sessionToken: string | null) => Promise<void>;
  handle: (url: string) => Promise<void | null>;
}

export const deepLinks: DeepLinks = {
  async authCallback(sessionToken: string | null) {
    if (!sessionToken) return;
    await setToken(sessionToken);
    queryClient.invalidateQueries({ queryKey: ["session"] });
  },

  async handle(url: string) {
    try {
      const { host, pathname, searchParams } = new URL(url);
      console.log("Deep link received:", url);

      switch (true) {
        case pathname.includes("auth_callback") || host === "auth_callback":
          return this.authCallback(searchParams.get("session_token"));
        default:
          console.error("Unknown deep link:", url);
          return null;
      }
    } catch (err) {
      console.error("Failed to parse deep link URL:", err);
      return null;
    }
  },
};
