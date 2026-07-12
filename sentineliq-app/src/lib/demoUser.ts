// Demo credentials only — NO real auth. Builder B wires real authentication on Day 2.
// Keep the shape stable so the real auth layer can drop in behind the same interface.

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  /** plaintext ONLY because this is a throwaway demo account — never do this for real */
  password: string;
}

export const DEMO_USER: DemoUser = {
  id: "user-001",
  name: "Ada Demo",
  email: "demo@unionbank.ng",
  password: "demo1234",
};

/**
 * Stub credential check. Builder B replaces this with a real API call on Day 2.
 * Returns the user (minus password) on success, or null on failure.
 */
export function validateDemoCredentials(
  email: string,
  password: string,
): Omit<DemoUser, "password"> | null {
  if (email.trim().toLowerCase() === DEMO_USER.email && password === DEMO_USER.password) {
    const { password: _pw, ...safe } = DEMO_USER;
    return safe;
  }
  return null;
}
