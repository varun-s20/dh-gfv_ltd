import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Sell your Tesla to Green Future Vehicles";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: "Sell your Tesla to people who *know Teslas.*", word: "Tesla" });
}
