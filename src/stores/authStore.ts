import { Store } from "@tauri-apps/plugin-store";

export const authStore = Store.load("session");

export const getToken = async () => (await authStore).get<string>("token");

export const setToken = async (token: string) => (await authStore).set("token", token);

export const deleteToken = async () => (await authStore).delete("token");
