export const KSA_IMAGES = {
  kingdomTower: "/promo/ksa/kingdom-tower.webp",
  faisaliah: "/promo/ksa/faisaliah.webp",
  kafd: "/promo/ksa/kafd.webp",
  easternSkyline: "/promo/ksa/eastern-industry.webp",
  energyGrid: "/promo/ksa/energy-grid.webp",
} as const;

export function preloadKsaImages() {
  if (typeof window === "undefined") return;
  Object.values(KSA_IMAGES).forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  });
}
