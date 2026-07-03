export const KSA_IMAGES = {
  kingdomTower: "/promo/ksa/kingdom-tower.jpg",
  faisaliah: "/promo/ksa/faisaliah.jpg",
  kafd: "/promo/ksa/kafd.jpg",
  easternSkyline: "/promo/ksa/eastern-industry.jpg",
  energyGrid: "/promo/ksa/energy-grid.jpg",
} as const;

export function preloadKsaImages() {
  if (typeof window === "undefined") return;
  Object.values(KSA_IMAGES).forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  });
}
