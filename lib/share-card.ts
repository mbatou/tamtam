const TIER_COLORS: Record<string, string> = {
  Bronze: "#CD7F32",
  Argent: "#C0C0C0",
  Or: "#FFD700",
  Patriote: "#00853F",
  Diamant: "#B9F2FF",
};

const TIER_EMOJIS: Record<string, string> = {
  Bronze: "🥚",
  Argent: "🥚",
  Or: "🥚",
  Patriote: "🇸🇳",
  Diamant: "💎",
};

export { TIER_COLORS, TIER_EMOJIS };

// Polyfill for roundRect on older browsers
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
  }
}

export async function generateEggShareCard({
  echoName,
  tier,
  amount,
  eggsRemaining,
  tierColor,
  tierEmoji,
}: {
  echoName: string;
  tier: string;
  amount: number;
  eggsRemaining: number;
  tierColor: string;
  tierEmoji: string;
}): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d")!;

  // Background — dark
  ctx.fillStyle = "#0F0F1F";
  ctx.fillRect(0, 0, 1080, 1920);

  // Flag stripe at top
  const stripeH = 12;
  ctx.fillStyle = "#00853F";
  ctx.fillRect(0, 0, 360, stripeH);
  ctx.fillStyle = "#FDEF42";
  ctx.fillRect(360, 0, 360, stripeH);
  ctx.fillStyle = "#E31B23";
  ctx.fillRect(720, 0, 360, stripeH);

  // Tamtam logo text
  ctx.fillStyle = "#D35400";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("TAMTAM", 540, 120);

  // Subtitle
  ctx.fillStyle = "#888888";
  ctx.font = "24px Arial";
  ctx.fillText("La Chasse aux Œufs 🥚🇸🇳", 540, 170);

  // Large egg shape (colored ellipse)
  ctx.fillStyle = tierColor;
  ctx.beginPath();
  ctx.ellipse(540, 600, 180, 220, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tier emoji text on the egg
  ctx.font = "120px Arial";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(tierEmoji, 540, 640);

  // Crack lines on egg
  ctx.strokeStyle = "#0F0F1F";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(440, 580);
  ctx.lineTo(500, 620);
  ctx.lineTo(460, 660);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(620, 560);
  ctx.lineTo(580, 610);
  ctx.lineTo(640, 650);
  ctx.stroke();

  // Reward amount
  ctx.fillStyle = tierColor;
  ctx.font = "bold 96px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`+${amount.toLocaleString("fr-FR")} FCFA`, 540, 920);

  // Tier name
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 48px Arial";
  ctx.fillText(`Œuf ${tier}!`, 540, 1000);

  // Echo name
  ctx.fillStyle = "#AAAAAA";
  ctx.font = "36px Arial";
  ctx.fillText(`${echoName} vient de gagner!`, 540, 1100);

  // Divider
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, 1180);
  ctx.lineTo(880, 1180);
  ctx.stroke();

  // CTA
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 42px Arial";
  ctx.fillText("Toi aussi, gagne de l'argent", 540, 1280);
  ctx.fillText("avec ton WhatsApp!", 540, 1340);

  // tamma.me link in orange rounded rect
  const linkY = 1420;
  const linkW = 500;
  const linkH = 80;
  const linkX = (1080 - linkW) / 2;
  ctx.fillStyle = "#D35400";
  drawRoundRect(ctx, linkX, linkY, linkW, linkH, 20);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 40px Arial";
  ctx.fillText("tamma.me/echos", 540, linkY + 52);

  // Eggs remaining counter
  ctx.fillStyle = "#FDEF42";
  ctx.font = "bold 32px Arial";
  ctx.fillText(`Il reste ${eggsRemaining} œufs!`, 540, 1580);
  ctx.fillStyle = "#888888";
  ctx.font = "24px Arial";
  ctx.fillText("Inscris-toi vite avant qu'il n'y en ait plus", 540, 1630);

  // Flag stripe at bottom
  ctx.fillStyle = "#00853F";
  ctx.fillRect(0, 1908, 360, stripeH);
  ctx.fillStyle = "#FDEF42";
  ctx.fillRect(360, 1908, 360, stripeH);
  ctx.fillStyle = "#E31B23";
  ctx.fillRect(720, 1908, 360, stripeH);

  // Convert to file
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });

  return new File([blob], "tamtam-oeuf.png", { type: "image/png" });
}
