/**
 * Smart Share — download campaign image + open WhatsApp directly.
 * Downloads the image to the device, then opens wa.me with the tracked link.
 * The écho can then attach the image from their recent photos on WhatsApp Status.
 */

export async function shareCampaignToWhatsApp(
  imageUrl: string,
  trackedLink: string,
  campaignId: string,
): Promise<"shared" | "fallback" | "cancelled"> {
  try {
    // Download image to device
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const extension = blob.type.includes("png") ? "png" : "jpg";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tamtam-${campaignId}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Brief delay for download to start, then open WhatsApp directly
    await new Promise((r) => setTimeout(r, 1200));
    window.open(
      `https://wa.me/?text=${encodeURIComponent(trackedLink)}`,
      "_blank",
    );
    return "shared";
  } catch {
    // Fallback: just copy link and open WhatsApp
    try {
      await navigator.clipboard.writeText(trackedLink);
    } catch {}
    window.open(
      `https://wa.me/?text=${encodeURIComponent(trackedLink)}`,
      "_blank",
    );
    return "fallback";
  }
}
