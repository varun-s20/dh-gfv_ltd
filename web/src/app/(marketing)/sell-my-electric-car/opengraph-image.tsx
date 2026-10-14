import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Sell your electric car to Green Future Vehicles";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: "Sell your electric car to people who *get electric.*", word: "EV" });
}
