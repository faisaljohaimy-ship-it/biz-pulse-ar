/**
 * The four Saudi industrial-security regions as map markers — representative
 * coordinates (each region's principal city). Shared by the 3D globe scene
 * and its static fallback with no heavy (Three.js) dependency, so importing
 * it never pulls the 3D bundle into the initial load.
 */
export interface RegionMarker {
  readonly id: "central" | "western" | "eastern" | "southern";
  readonly ar: string;
  readonly lat: number;
  readonly lng: number;
}

export const REGION_MARKERS: readonly RegionMarker[] = [
  { id: "central", ar: "الوسطى", lat: 24.7136, lng: 46.6753 }, // الرياض
  { id: "western", ar: "الغربية", lat: 21.4858, lng: 39.1925 }, // جدة
  { id: "eastern", ar: "الشرقية", lat: 26.4207, lng: 50.0888 }, // الدمام
  { id: "southern", ar: "الجنوبية", lat: 18.2465, lng: 42.5117 }, // أبها
];
