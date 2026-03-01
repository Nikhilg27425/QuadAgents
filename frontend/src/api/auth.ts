// AWS Cognito Authentication helpers
// In production, integrate with AWS Amplify or Cognito hosted UI

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    preferredLanguage: string;
  };
}

// Mock Cognito login – replace with real Cognito SDK call
export async function loginWithCognito(payload: LoginPayload): Promise<AuthResult> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 1200));

  if (payload.username && payload.password) {
    return {
      token: "mock-jwt-token-" + Date.now(),
      user: {
        id: "farmer_001",
        name: "Ramesh Kumar",
        phone: payload.username,
        preferredLanguage: "hi",
      },
    };
  }
  throw new Error("Invalid credentials");
}

export function storeAuth(result: AuthResult) {
  sessionStorage.setItem("ks_token", result.token);
  sessionStorage.setItem("ks_user", JSON.stringify(result.user));
}

export function clearAuth() {
  sessionStorage.removeItem("ks_token");
  sessionStorage.removeItem("ks_user");
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem("ks_token");
}

export function getStoredUser(): AuthResult["user"] | null {
  const raw = sessionStorage.getItem("ks_user");
  return raw ? JSON.parse(raw) : null;
}
