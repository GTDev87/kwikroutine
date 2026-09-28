const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
// The in-app logo (LogoMark in src/components/ui.tsx): three rising lime bars, slanted
// 14°, on near-black. Proportions follow the design's 120px tile, scaled to 1024.
const BG = "#0C0C0D";
const LIME = "#C0F447";
function mark(scale = 1, color = LIME, opacities = [0.45, 0.7, 1]) {
  const k = (1024 / 120) * scale;
  const w = 14 * k,
    gap = 6 * k,
    r = 3 * k,
    heights = [26, 42, 60].map((h) => h * k);
  const total = 3 * w + 2 * gap;
  const x0 = 512 - total / 2,
    bottom = 512 + heights[2] / 2;
  const bars = heights
    .map(
      (h, i) =>
        `<rect x="${x0 + i * (w + gap)}" y="${bottom - h}" width="${w}" height="${h}" rx="${r}" fill="${color}" fill-opacity="${opacities[i]}"/>`,
    )
    .join("");
  return `<g transform="translate(512 512) skewX(-14) translate(-512 -512)">${bars}</g>`;
}
const svg = (inner, background = BG) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ""}${inner}</svg>`;
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });
  const shoot = async (content, file, transparent = false) => {
    await page.setContent(
      `<body style="margin:0;background:transparent">${content}</body>`,
    );
    await page.screenshot({
      path: path.join(root, "assets", file),
      omitBackground: transparent,
    });
  };
  const full = svg(mark());
  fs.writeFileSync(path.join(root, "assets/brand-mark.svg"), full);
  // iOS and the default icon: full-bleed square; the OS applies its own corner mask.
  await shoot(full, "icon.png");
  // Android adaptive layers. Launchers show the middle 72 of 108dp and may crop to a
  // circle, so the foreground mark is smaller to stay inside the safe zone.
  await shoot(svg(mark(0.75), null), "android-icon-foreground.png", true);
  await shoot(svg("", BG), "android-icon-background.png");
  // Themed (Material You) icons tint this silhouette; keep the rising steps as alpha.
  await shoot(svg(mark(0.75, "#FFFFFF"), null), "android-icon-monochrome.png", true);
  await shoot(svg(mark(1.1), BG), "splash-icon.png");
  await page.setViewportSize({ width: 64, height: 64 });
  await shoot(
    full.replace('width="1024" height="1024"', 'width="64" height="64"'),
    "favicon.png",
  );
  await browser.close();
})();
