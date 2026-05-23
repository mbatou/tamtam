"use client";

import AwaProvider, { useAwa } from "./AwaProvider";
import AwaButton from "./AwaButton";
import AwaPanel from "./AwaPanel";
import AwaTourOverlay from "./AwaTourOverlay";

function AwaContent() {
  const { tourActive, tourSteps, endTour } = useAwa();

  return (
    <>
      <AwaButton />
      <AwaPanel />
      {tourActive && tourSteps.length > 0 && (
        <AwaTourOverlay steps={tourSteps} onFinish={endTour} />
      )}
    </>
  );
}

export default function AwaAssistant() {
  return (
    <AwaProvider>
      <AwaContent />
    </AwaProvider>
  );
}
