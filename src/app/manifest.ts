import type { MetadataRoute } from "next";
import { colors } from "@/components/ui/theme/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elevate",
    short_name: "Elevate",
    description: "Front desk and member app for climbing gyms",
    start_url: "/",
    display: "standalone",
    background_color: colors.light.page,
    theme_color: colors.light.page,
  };
}
