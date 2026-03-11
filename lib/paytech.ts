// lib/paytech.ts

const PAYTECH_BASE_URL = "https://paytech.sn/api";

export const paytechConfig = {
  apiKey: process.env.PAYTECH_API_KEY!,
  apiSecret: process.env.PAYTECH_API_SECRET!,
  env: (process.env.PAYTECH_ENV || "test") as "test" | "prod",
  baseUrl: PAYTECH_BASE_URL,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://www.tamma.me",
};

export const paytechHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  API_KEY: paytechConfig.apiKey,
  API_SECRET: paytechConfig.apiSecret,
};
