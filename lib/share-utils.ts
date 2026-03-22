/**
 * Smart Share — use the Web Share API (native share sheet) when available,
 * so the écho can share the campaign image + tracked link directly to
 * WhatsApp, Snapchat, or any app — without downloading files first.
 *
 * Fallback: open wa.me with the tracked link (no image).
 */

export async function shareCampaignToWhatsApp(
  imageUrl: string,
  trackedLink: string,
  campaignId: string,
): Promise<"shared" | "fallback" | "cancelled"> {
  try {
    // Try Web Share API with file (works on iOS Safari 15+, Android Chrome 76+)
    if (navigator.share) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const extension = blob.type.includes("png") ? "png" : "jpg";
      const file = new File([blob], `tamtam-${campaignId}.${extension}`, {
        type: blob.type,
      });

      // Check if sharing files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          text: trackedLink,
          files: [file],
        });
        return "shared";
      }

      // Fallback: share text only via native share sheet
      await navigator.share({
        text: trackedLink,
      });
      return "shared";
    }

    // No Web Share API (desktop browsers) — open WhatsApp directly
    window.open(
      `https://wa.me/?text=${encodeURIComponent(trackedLink)}`,
      "_blank",
    );
    return "fallback";
  } catch (err: unknown) {
    // User cancelled the share sheet
    if (err instanceof Error && err.name === "AbortError") {
      return "cancelled";
    }

    // Other error — fallback to WhatsApp link
    window.open(
      `https://wa.me/?text=${encodeURIComponent(trackedLink)}`,
      "_blank",
    );
    return "fallback";
  }
}
