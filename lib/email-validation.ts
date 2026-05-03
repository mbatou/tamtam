const VALID_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.fr",
  "hotmail.com",
  "hotmail.fr",
  "outlook.com",
  "outlook.fr",
  "icloud.com",
  "orange.sn",
  "live.com",
  "live.fr",
  "msn.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
];

const EDU_PATTERNS = [
  /\.edu$/,
  /\.edu\.[a-z]{2}$/,
  /\.ac\.[a-z]{2}$/,
  /\.univ\.[a-z]{2}$/,
  /univ.*\.sn$/,
];

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0
    )
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
}

export type EmailValidationResult = {
  valid: boolean;
  suggestion?: string;
  error?: string;
};

export function validateEmailDomain(email: string): EmailValidationResult {
  if (!email || !email.includes("@")) {
    return { valid: false, error: "Adresse email invalide." };
  }

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, error: "Adresse email invalide." };
  }

  if (VALID_DOMAINS.includes(domain)) {
    return { valid: true };
  }

  if (EDU_PATTERNS.some((pattern) => pattern.test(domain))) {
    return { valid: true };
  }

  let closestDomain = "";
  let closestDistance = Infinity;

  for (const validDomain of VALID_DOMAINS) {
    const distance = levenshteinDistance(domain, validDomain);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestDomain = validDomain;
    }
  }

  if (closestDistance <= 2 && closestDistance > 0) {
    return {
      valid: false,
      suggestion: closestDomain,
      error: `Vouliez-vous dire @${closestDomain} ?`,
    };
  }

  if (closestDistance > 2) {
    return {
      valid: false,
      error:
        "Ce domaine email n’est pas reconnu. Utilisez Gmail, Yahoo, Hotmail, Outlook ou iCloud.",
    };
  }

  return { valid: true };
}
