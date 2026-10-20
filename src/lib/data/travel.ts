export type Place = {
  name: string;
  kind: "now" | "lived" | "visited";
  lat: number;
  lon: number;
  years?: string;
  stat: string;
  quip: string;
  days: number; // approx total length of stay, in days — sort key only (not shown)
};

// Coordinates are real. Notes are plain drafts — TODO(Gihyun): rewrite in your voice.
export const places: Place[] = [
  {
    name: "Hong Kong",
    kind: "now",
    lat: 22.3193,
    lon: 114.1694,
    years: "2025 — now",
    stat: "Current base · HKU",
    quip: "Current base — studying Mechanical Engineering at HKU, a few minutes from the workshop.",
    days: 600,
  },
  {
    name: "Seoul",
    kind: "lived",
    lat: 37.5665,
    lon: 126.978,
    years: "home base since 2006",
    stat: "Home",
    quip: "Home base since 2006 — where family (and the dog, 뭉이) are.",
    days: 7300,
  },
  {
    name: "Istanbul",
    kind: "lived",
    lat: 41.0082,
    lon: 28.9784,
    years: "gr. 5 · 4.5 yrs",
    stat: "4.5 years",
    quip: "Lived here from fifth grade — four and a half years across two continents.",
    days: 1643,
  },
  {
    name: "London",
    kind: "lived",
    lat: 51.5074,
    lon: -0.1278,
    years: "age 3 · 1 yr",
    stat: "1 year",
    quip: "Age three, about a year — the first move abroad.",
    days: 365,
  },
  {
    name: "Singapore",
    kind: "visited",
    lat: 1.3521,
    lon: 103.8198,
    stat: "2 weeks",
    quip: "Visited for about two weeks.",
    days: 14,
  },
  {
    name: "Osaka",
    kind: "visited",
    lat: 34.6937,
    lon: 135.5023,
    stat: "4 days",
    quip: "A few days — food, arcades, and neon.",
    days: 4,
  },
  {
    name: "Prague",
    kind: "visited",
    lat: 50.0755,
    lon: 14.4378,
    stat: "3 days",
    quip: "Three days around the old town.",
    days: 3,
  },
  {
    name: "Vienna",
    kind: "visited",
    lat: 48.2082,
    lon: 16.3738,
    stat: "2 days",
    quip: "Two days passing through.",
    days: 2,
  },
  {
    name: "Shenzhen",
    kind: "visited",
    lat: 22.5431,
    lon: 114.0579,
    stat: "4 days",
    quip: "Sightseeing, third-wheeling friends on their dates, and raiding Huaqiangbei for parts.",
    days: 4,
  },
  {
    name: "Chongqing",
    kind: "visited",
    lat: 29.563,
    lon: 106.5516,
    stat: "5 days",
    quip: "Five days for a wedding — nonstop eating, and really, really hot.",
    days: 5,
  },
];

export const travelStats = [
  { k: "Cities lived", v: "4" },
  { k: "Continents", v: "3" },
  { k: "Longest stint", v: "Seoul" },
  { k: "Shortest", v: "Vienna · 2d" },
];
