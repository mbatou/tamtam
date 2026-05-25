"use client";

import { Lock } from "lucide-react";

export default function PermissionDenied({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center">
        <Lock className="w-5 h-5 text-white/20" />
      </div>
      <p className="text-[14px] font-medium text-white/40">{message}</p>
    </div>
  );
}
