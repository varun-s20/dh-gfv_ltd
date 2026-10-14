import type { StaticImageData } from "next/image";
import ariyaSide from "../../public/media/cars/ariya-side.webp";
import edeliver34 from "../../public/media/cars/edeliver3-34.webp";
import evitoRimFront from "../../public/media/cars/evito-rim-front.webp";
import evitoRimRear from "../../public/media/cars/evito-rim-rear.webp";
import evitoSide from "../../public/media/cars/evito-side.webp";
import etransitCustom34 from "../../public/media/cars/etransit-custom-34.webp";
import idbuzzRimFront from "../../public/media/cars/idbuzz-rim-front.webp";
import idbuzzRimRear from "../../public/media/cars/idbuzz-rim-rear.webp";
import idbuzzSide from "../../public/media/cars/idbuzz-side.webp";
import ioniq534 from "../../public/media/cars/ioniq5-34.webp";
import ioniq6RimFront from "../../public/media/cars/ioniq6-rim-front.webp";
import ioniq6RimRear from "../../public/media/cars/ioniq6-rim-rear.webp";
import ioniq6Side from "../../public/media/cars/ioniq6-side.webp";
import model334 from "../../public/media/cars/model3-34.webp";
import model3RimFront from "../../public/media/cars/model3-rim-front.webp";
import model3RimRear from "../../public/media/cars/model3-rim-rear.webp";
import model3Side from "../../public/media/cars/model3-side.webp";
import model3Xray from "../../public/media/cars/model3-xray.webp";
import modelSRimFront from "../../public/media/cars/models-rim-front.webp";
import modelSRimRear from "../../public/media/cars/models-rim-rear.webp";
import modelSSide from "../../public/media/cars/models-side.webp";
import modelSWellFront from "../../public/media/cars/models-well-front.webp";
import modelSWellRear from "../../public/media/cars/models-well-rear.webp";
import modelSXray from "../../public/media/cars/models-xray.webp";
import model3p34 from "../../public/media/cars/model3p-34.webp";
import model3pRear from "../../public/media/cars/model3p-rear.webp";
import taycan34 from "../../public/media/cars/taycan-34.webp";

/**
 * A wheel face. `sx` squashes it sideways when the photo is slightly off side-on; it spins round, then is squashed.
 * `under` is a still layer beneath it (the brake caliper), so the spokes turn in front of a caliper that doesn't.
 */
export type Rim = { src: StaticImageData; cx: number; cy: number; d: number; sx?: number; under?: StaticImageData };

/**
 * A vehicle photographed side-on. Wheel centres and diameters are percentages
 * of the image, measured from the source photo, so the separate rims spin in place.
 */
export type SideProfile = {
  name: string;
  side: StaticImageData;
  alt: string;
  rims: { front: Rim; rear: Rim };
};

/** The site's own car also has an X-ray drawing and a battery that lifts out. */
export type SideCar = SideProfile & {
  xray: StaticImageData;
  /** Battery slab between the axles, under the floor (percent of the image). */
  pack: { left: number; top: number; width: number; height: number };
  /** Headlight, for the arrival flash. */
  lamp: { x: number; y: number };
  /** Where the tyres meet the floor (percent of the image height). */
  ground: number;
};

/** The site's own car: a white Tesla Model S, side-on. Hero, the drive through the steps and the spec sheet. */
export const heroCar: SideCar = {
  name: "Tesla Model S",
  side: modelSSide,
  xray: modelSXray,
  alt: "White Tesla Model S, side view",
  rims: {
    front: { src: modelSRimFront, under: modelSWellFront, cx: 18.919, cy: 71.934, d: 12.355 },
    rear: { src: modelSRimRear, under: modelSWellRear, cx: 78.301, cy: 71.934, d: 12.355 },
  },
  pack: { left: 25.6, top: 77.5, width: 46, height: 7.5 },
  lamp: { x: 8.1, y: 49.5 },
  ground: 93.8,
};

/** The white Tesla Model 3, side-on: the Sell my Tesla page's car. */
export const model3: SideCar = {
  name: "Tesla Model 3",
  side: model3Side,
  xray: model3Xray,
  alt: "White Tesla Model 3, side view",
  rims: {
    front: { src: model3RimFront, cx: 15.227, cy: 75.219, d: 12.841 },
    rear: { src: model3RimRear, cx: 83.303, cy: 74.781, d: 12.481 },
  },
  pack: { left: 23, top: 80.5, width: 53.5, height: 8 },
  lamp: { x: 4.6, y: 47.5 },
  ground: 94,
};

/** The electric car page's car: a grey Hyundai Ioniq 6, side-on. */
export const ioniq6: SideProfile = {
  name: "Hyundai Ioniq 6",
  side: ioniq6Side,
  alt: "Grey Hyundai Ioniq 6, side view",
  rims: {
    front: { src: ioniq6RimFront, cx: 17.783, cy: 76.424, d: 12.88 },
    rear: { src: ioniq6RimRear, cx: 79.442, cy: 76.339, d: 12.88 },
  },
};

/** The electric van page's van: a white Volkswagen ID. Buzz Cargo, photographed a little behind side-on. */
export const idBuzzCargo: SideProfile = {
  name: "Volkswagen ID. Buzz Cargo",
  side: idbuzzSide,
  alt: "White Volkswagen ID. Buzz Cargo electric van, side view",
  rims: {
    front: { src: idbuzzRimFront, cx: 9.241, cy: 67.379, d: 10.244, sx: 0.769 },
    rear: { src: idbuzzRimRear, cx: 71.777, cy: 79.724, d: 13.539, sx: 1.005 },
  },
};

/** The electric van page's van: a silver Mercedes-Benz eVito, side-on, livery retouched off. */
export const eVito: SideProfile = {
  name: "Mercedes-Benz eVito",
  side: evitoSide,
  alt: "Silver Mercedes-Benz eVito electric van, side view",
  rims: {
    front: { src: evitoRimFront, cx: 14.921, cy: 82.346, d: 9.683 },
    rear: { src: evitoRimRear, cx: 81.382, cy: 79.496, d: 9.683 },
  },
};

export type CarShot = { src: StaticImageData; alt: string; name: string };

/** Three-quarter and rear views. */
export const shots = {
  model3: { src: model334, name: "Tesla Model 3", alt: "White Tesla Model 3, front three-quarter view" },
  model3p: { src: model3p34, name: "Tesla Model 3 Performance", alt: "White Tesla Model 3 Performance, front three-quarter view" },
  model3pRear: { src: model3pRear, name: "Tesla Model 3 Performance", alt: "White Tesla Model 3 Performance from behind, tail lights on" },
  taycan: { src: taycan34, name: "Porsche Taycan", alt: "White Porsche Taycan, front three-quarter view" },
  ioniq5: { src: ioniq534, name: "Hyundai Ioniq 5", alt: "Silver Hyundai Ioniq 5, front three-quarter view" },
  idbuzz: { src: idbuzzSide, name: "Volkswagen ID. Buzz Cargo", alt: "White Volkswagen ID. Buzz Cargo electric van, side view" },
  ariya: { src: ariyaSide, name: "Nissan Ariya", alt: "Champagne Nissan Ariya, side view" },
  etransitCustom: { src: etransitCustom34, name: "Ford E-Transit Custom", alt: "White Ford E-Transit Custom electric van, front three-quarter view" },
  edeliver3: { src: edeliver34, name: "Maxus eDeliver 3", alt: "White Maxus eDeliver 3 electric van, front three-quarter view" },
} satisfies Record<string, CarShot>;

export type ShotKey = keyof typeof shots;

/** Photography licences. CC BY and CC BY-SA images need visible credit, which the footer gives. */
export const photoCredits = [
  { subject: "Tesla Model 3 (side, front)", author: "Kazyakuruma", licence: "CC0", source: "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_(2023),_long_range,_Japan,_left-side.jpg" },
  { subject: "Tesla Model 3 Performance", author: "Chanokchon", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:2024_Tesla_Model_3_Highland_Performance_AWD.jpg" },
  { subject: "Porsche Taycan", author: "Mustang Joe", licence: "CC0", source: "https://commons.wikimedia.org/wiki/File:2024_Porsche_Taycan_Turbo_S_(53538640412).jpg" },
  { subject: "Hyundai Ioniq 5", author: "Andrew Bone", licence: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Hyundai_Ioniq_5_(2021,_Weymouth,_UK_-_side_%26_front).jpg" },
  { subject: "Hyundai Ioniq 6", author: "Daniel Lu", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Hyundai_Ioniq_6_left_side_view_2023_dllu.jpg" },
  { subject: "Nissan Ariya", author: "Vauxford", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:2023_Nissan_Ariya_Advance_Side.jpg" },
  { subject: "Volkswagen ID. Buzz Cargo", author: "Ssu", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:VW_ID.BUZZ_-_white.jpg" },
  { subject: "Ford E-Transit Custom", author: "Alexander Migl", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Ford_E-Transit_Custom_(2023)_DSC_9255.jpg" },
  { subject: "Maxus eDeliver 3", author: "Rutger van der Maar", licence: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:2022_Maxus_eDeliver_3_front.jpg" },
  { subject: "Charging at dusk (FAQ)", author: "Ivan Radic", licence: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Close-up_of_an_electric_car_charging_station_with_a_car_plugged_in.jpg" },
  { subject: "Car keys (contact)", author: "Shixart1985", licence: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Man_holding_car_keys_in_front_of_a_car.jpg" },
  { subject: "Vehicle test workshop (how it works)", author: "U.S. Department of Energy", licence: "Public domain", source: "https://commons.wikimedia.org/wiki/File:VTIF_Research_%2812815825844%29.jpg" },
  { subject: "Polestar 2 dashboard (why sell to us)", author: "Oleg Yunakov", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Cabin_interior_of_a_Polestar_2.jpg" },
  { subject: "Tesla Model 3 interior", author: "Kazyakuruma", licence: "CC0", source: "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_(2023),_long_range,_Japan,_interior.jpg" },
];
