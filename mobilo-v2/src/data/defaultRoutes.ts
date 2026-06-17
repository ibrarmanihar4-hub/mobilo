import { normalizeRoutes, RawShuttleRoute } from "../types/routeNetwork";

// Live Kolhapur shuttle network. Coordinates copied from the v1 reference.
// Note: the v1 data had two stops at identical coords (Gokhale College and
// Renuka/Yallama Temple). The duplicate has been nudged a few meters so the
// route polyline doesn't degenerate.
const DEFAULT_RAW_SHUTTLE_ROUTES: RawShuttleRoute[] = [
  {
    id: "route-1",
    name: "Route 1",
    direction: "Odhyavarcha Ganpati to Pachgaon",
    stops: [
      {
        name: "Siddhivinayak Temple Odhyavarcha Ganpati",
        latitude: 16.6972082,
        longitude: 74.2324979,
        mapUrl: "https://maps.app.goo.gl/5hULKHeF5CGdFK8s7?g_st=aw",
      },
      {
        name: "P/D Savitribai Phule Hospital",
        latitude: 16.6912468,
        longitude: 74.2314317,
        mapUrl: "https://maps.app.goo.gl/4j7fPUN6Ppz44Ybx8?g_st=aw",
      },
      {
        name: "Gokhale College",
        latitude: 16.6851818,
        longitude: 74.2308734,
        mapUrl: "https://maps.app.goo.gl/8J9aRC3obMCtNDrt8?g_st=aw",
      },
      {
        name: "Renuka / Yallama Temple",
        latitude: 16.6826,
        longitude: 74.2298,
        mapUrl: "https://maps.app.goo.gl/8utH4Di241YDBaL4A?g_st=aw",
      },
      {
        name: "Dhyanchand Hockey Stadium",
        latitude: 16.6780265,
        longitude: 74.2285349,
        mapUrl: "https://maps.app.goo.gl/BhTf5KMk4rthHdok7?g_st=aw",
      },
      {
        name: "Ramanand Nagar Balaji Park",
        latitude: 16.6732433,
        longitude: 74.2259067,
        mapUrl: "https://maps.app.goo.gl/1mipJoA1nzinP5cZ8?g_st=aw",
      },
      {
        name: "Jarag Nagar / Ambedkar Chowk Pachgav",
        latitude: 16.6623466,
        longitude: 74.2287233,
        mapUrl: "https://maps.app.goo.gl/1RZuRg3puvyMg3Nn9?g_st=aw",
      },
      {
        name: "Bhairavnath Temple Pachgav",
        latitude: 16.660385,
        longitude: 74.228649,
      },
    ],
  },
  {
    id: "route-3",
    name: "Route 3",
    direction: "CSIBER to Sambhaji Nagar",
    stops: [
      {
        name: "CSIBER",
        latitude: 16.6876187,
        longitude: 74.2523671,
        mapUrl: "https://maps.app.goo.gl/6YoHa8KnTeZ2ezNv6",
      },
      {
        name: "Shivaji Vidyapeeth (W)",
        latitude: 16.681649,
        longitude: 74.246944,
        mapUrl: "https://maps.app.goo.gl/LCHwjzeajS4UaMU46",
      },
      {
        name: "Rajendra Nagar Cross",
        latitude: 16.6768706,
        longitude: 74.2448508,
        mapUrl: "https://maps.app.goo.gl/VQJf44RCShiKZdRW6?g_st=aw",
      },
      {
        name: "Shenda Park",
        latitude: 16.6746654,
        longitude: 74.2368025,
        mapUrl: "https://maps.app.goo.gl/b2b9UGBQXTFotWTW6?g_st=aw",
      },
      {
        name: "Dhyanchand Hockey Stadium",
        latitude: 16.677206,
        longitude: 74.228534,
        mapUrl: "https://maps.app.goo.gl/kErEq6H6R7DdNZkg7",
      },
      {
        name: "Ganjimal Filter House",
        latitude: 16.675912,
        longitude: 74.220538,
        mapUrl: "https://maps.app.goo.gl/gaVXqEhfr6B8Lttp7",
      },
      {
        name: "Sambhaji Nagar ST Stand",
        latitude: 16.679629,
        longitude: 74.218497,
        mapUrl: "https://maps.app.goo.gl/6h3zogXm86dMFU4d6",
      },
    ],
  },
  {
    id: "route-4",
    name: "Route 4",
    direction: "Sambhaji Nagar to Surve Colony",
    stops: [
      {
        name: "Sambhaji Nagar ST Stand",
        latitude: 16.679629,
        longitude: 74.218497,
        mapUrl: "https://maps.app.goo.gl/6h3zogXm86dMFU4d6",
      },
      {
        name: "ITI Tapovan",
        latitude: 16.675551,
        longitude: 74.219953,
        mapUrl: "https://maps.app.goo.gl/mJiimdbE3xNMkigd9",
      },
      {
        name: "Kalamba Jail",
        latitude: 16.669028,
        longitude: 74.215627,
        mapUrl: "https://maps.app.goo.gl/3RbckTHfpRxs2nDc6",
      },
      {
        name: "Sai Mandir Trimurti Colony",
        latitude: 16.665667,
        longitude: 74.211679,
        mapUrl: "https://maps.app.goo.gl/Ec3hZnCM7YmNRqa8A",
      },
      {
        name: "Ambabai Temple Kalamba",
        latitude: 16.6610531,
        longitude: 74.2111591,
        mapUrl: "https://maps.app.goo.gl/HcPAHYbX4NFxVEFR8",
      },
      {
        name: "Bapuram Nagar Kalamba",
        latitude: 16.660937,
        longitude: 74.208314,
        mapUrl: "https://maps.app.goo.gl/UtV8UsRNCPiNu4DE7",
      },
      {
        name: "Poddar Highschool Surve Colony",
        latitude: 16.6646952,
        longitude: 74.1998983,
        mapUrl: "https://maps.app.goo.gl/agQRsd1FLDhbemBN6",
      },
    ],
  },
];

export const DEFAULT_SHUTTLE_ROUTES = normalizeRoutes(
  DEFAULT_RAW_SHUTTLE_ROUTES
);
