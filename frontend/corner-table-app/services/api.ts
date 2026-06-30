const API_URL = __DEV__
  ? "http://localhost:8000"
  : "https://your-api.com";

// const API_URL = "http://127.0.0.1:8000";

// tables
export type Table = {
  table_id: number;
  occupied: boolean;
}
async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Request failed");
  }

  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from server");
  }

}

// users
export type UserState = {
  user_id: number;
  coins: number;
  is_studying: boolean;
};

// session
export type ActiveSession = {
  session_id: number;
  user_id: number;
  table_id: number;
};

export type StartSessionResponse = {
  session_id: number;
};

export type EndSessionResponse = {
  success: boolean;
};

// gifts
export type Gift = {
  gift_id: number;
  from_user_id: number;
  to_user_id: number;
  gift_type: string;
  created_at: string;
};

export type SendGiftRequest = {
  from_user_id: number;
  to_user_id: number;
  gift_type: string;
};

export type SendGiftResponse = {
  success: boolean;
}; 

export type UserCreateResponse = {
  id: number;
  name: string;
  coins: number;
};

export const api = {
  createUser: (name: string) =>
    request<UserCreateResponse>(`/users?name=${encodeURIComponent(name)}`, { method: "POST" }),

  getTables: () => request<Table[]>("/tables"),

  getUser: (userId: number): Promise<UserState> =>
    request(`/users/${userId}`),

  getActiveSessions: (): Promise<ActiveSession[]> =>
    request("/sessions/active"),

  startSession: (userId: number, tableId: number) =>
    request<StartSessionResponse>(
      `/start-session?user_id=${userId}&table_id=${tableId}`, 
      {method: "POST",}
  ),
  endSession: (sessionId: number) =>
    request<StartSessionResponse>(
      `/end-session?session_id=${sessionId}`, 
      {method: "POST",}
  ),
  sendGift: (payload: SendGiftRequest) =>
    request<SendGiftResponse>("/gift", {
      method: "POST", 
      body: JSON.stringify(payload),
    }),
  getReceivedGifts: (userId: number) =>
    request<Gift[]>(`/gifts/received/${userId}`),
};