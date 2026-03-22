/**
 * Smart Share — send campaign image + tracked link together to WhatsApp.
 * Uses Web Share API when available, falls back to download + wa.me.
 */

export async function shareCampaignToWhatsApp(
  imageUrl: string,
  trackedLink: string,
  campaignId: string,
): Promise<"shared" | "fallback" | "cancelled"> {
  // Try Web Share API with file (works on most mobile browsers)
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const extension = blob.type.includes("png") ? "png" : "jpg";
    const file = new File([blob], `tamtam-${campaignId}.${extension}`, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        text: trackedLink,
      });
      return "shared";
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return "cancelled";
    }
    // Fall through to fallback
  }

  // Fallback: download image + open WhatsApp with link
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tamtam-${campaignId}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Brief delay for download to start, then open WhatsApp
    await new Promise((r) => setTimeout(r, 1500));
    window.open(
      `https://wa.me/?text=${encodeURIComponent(trackedLink)}`,
      "_blank",
    );
    return "fallback";
  } catch {
    // Last resort: just copy link
    await navigator.clipboard.writeText(trackedLink);
    return "fallback";
  }
}
