import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dopa",
    short_name: "Dopa",
    description: "Evidence-backed market and campaign intelligence.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#08090a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
