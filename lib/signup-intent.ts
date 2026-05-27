export const SIGNUP_INTENT_COOKIE = "tamtam_signup_intent";

export function setSignupIntent(intent: "brand" | "echo") {
  document.cookie = [
    `${SIGNUP_INTENT_COOKIE}=${intent}`,
    "path=/",
    "max-age=600",
    "SameSite=Lax",
  ].join("; ");
}

export function clearSignupIntent() {
  document.cookie = `${SIGNUP_INTENT_COOKIE}=; path=/; max-age=0`;
}
