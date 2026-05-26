const BLOCKED_DOMAINS = [
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "trashmail.com",
  "dispostable.com",
  "10minutemail.com",
  "fakeinbox.com",
  "sharklasers.com",
  "spam4.me",
  "guerrillamailblock.com",
  "grr.la",
  "maildrop.cc",
  "temp-mail.org",
  "getnada.com",
];

export type EmailValidationResult = {
  valid: boolean;
  error?: string;
};

export function validateEmailDomain(email: string): EmailValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: "Adresse email invalide." };
  }

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, error: "Adresse email invalide." };
  }

  if (BLOCKED_DOMAINS.includes(domain)) {
    return {
      valid: false,
      error: "Les adresses email temporaires ne sont pas acceptées.",
    };
  }

  return { valid: true };
}
