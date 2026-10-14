import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Green Future Vehicles: sell your Tesla, electric car or van";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: "Sell your electric car to people who *understand it.*" });
}
