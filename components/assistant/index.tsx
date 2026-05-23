"use client";

import AwaProvider from "./AwaProvider";
import AwaButton from "./AwaButton";
import AwaPanel from "./AwaPanel";

export default function AwaAssistant() {
  return (
    <AwaProvider>
      <AwaButton />
      <AwaPanel />
    </AwaProvider>
  );
}
