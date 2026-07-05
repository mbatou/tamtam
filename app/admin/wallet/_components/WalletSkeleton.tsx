"use client";

import { SK } from "./types";

export default function WalletSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-4" style={{ maxWidth: "100%" }}>
      <div className="h-7 w-36 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rounded-2xl h-52 animate-pulse" style={SK} />
        <div className="lg:col-span-3 space-y-3">
          <div className="rounded-2xl h-24 animate-pulse" style={SK} />
          <div className="rounded-2xl h-24 animate-pulse" style={SK} />
        </div>
        <div className="lg:col-span-4 rounded-2xl h-52 animate-pulse" style={SK} />
      </div>
      <div className="rounded-2xl h-80 animate-pulse" style={SK} />
    </div>
  );
}
