import { Platform } from "react-native";

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://localhost:4000/api";

function resolveApiBaseUrl() {
  if (Platform.OS !== "android") {
    return configuredApiBaseUrl.replace(/\/$/, "");
  }

  return configuredApiBaseUrl
    .replace("://localhost", "://10.0.2.2")
    .replace("://127.0.0.1", "://10.0.2.2")
    .replace(/\/$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, token, ...rest } = options;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const isLocalBaseUrl =
      API_BASE_URL.includes("localhost") ||
      API_BASE_URL.includes("127.0.0.1") ||
      API_BASE_URL.includes("10.0.2.2");

    const deviceHint =
      Platform.OS === "android"
        ? "If you are testing on an Android emulator, keep the backend running on port 4000."
        : "If you are testing on a physical device, replace localhost in EXPO_PUBLIC_API_BASE_URL with your computer's LAN IP.";

    throw new Error(
      isLocalBaseUrl
        ? `Cannot reach the backend at ${API_BASE_URL}. Start the backend with NODE_ENV=local and npm start. ${deviceHint}`
        : error instanceof Error
        ? error.message
        : "Unable to reach the backend."
    );
  }

  const rawText = await response.text();
  let data: T | { message?: string };

  try {
    data = rawText ? (JSON.parse(rawText) as T) : ({} as T);
  } catch {
    data = { message: rawText || "Request failed." };
  }

  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data && "message" in data && data.message
        ? String(data.message)
        : "Request failed."
    );
  }

  return data as T;
}
