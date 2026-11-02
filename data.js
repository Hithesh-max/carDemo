// Model identities are real. Every numerical price and configuration below is an illustrative classroom fixture.
export const cars = [
  {
    id: "creta",
    brand: "Hyundai",
    name: "Creta",
    type: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    variant: "Petrol automatic • demo configuration",
    price: 1550000,
    color: "#bec8bf",
    image: "creta.png",
    tag: "The crowd favourite",
    source: "https://www.hyundai.com/in/en/find-a-car/creta/highlights",
  },
  {
    id: "nexon",
    brand: "Tata",
    name: "Nexon",
    type: "SUV",
    fuel: "Petrol",
    transmission: "Manual",
    variant: "Petrol manual • demo configuration",
    price: 1120000,
    color: "#527d8c",
    image: "nexon.svg",
    tag: "City-ready SUV",
    source: "https://cars.tatamotors.com/nexon/ice.html",
  },
  {
    id: "swift",
    brand: "Maruti Suzuki",
    name: "Swift",
    type: "Hatchback",
    fuel: "Petrol",
    transmission: "Manual",
    variant: "Petrol manual • demo configuration",
    price: 760000,
    color: "#bf534c",
    image: "swift.svg",
    tag: "Everyday made better",
    source: "https://www.marutisuzuki.com/arena/swift",
  },
  {
    id: "brezza",
    brand: "Maruti Suzuki",
    name: "Brezza",
    type: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    variant: "Petrol automatic • demo configuration",
    price: 1180000,
    color: "#c9bca1",
    image: "brezza.svg",
    tag: "Room for your next chapter",
    source: "https://www.marutisuzuki.com/arena/brezza",
  },
  {
    id: "xuv3xo",
    brand: "Mahindra",
    name: "XUV 3XO",
    type: "SUV",
    fuel: "Diesel",
    transmission: "Manual",
    variant: "Diesel manual • demo configuration",
    price: 1250000,
    color: "#9daf9c",
    image: "xuv3xo.svg",
    tag: "A little more adventure",
    source: "https://auto.mahindra.com/suv/XUV3XO",
  },
  {
    id: "i20",
    brand: "Hyundai",
    name: "i20",
    type: "Hatchback",
    fuel: "Petrol",
    transmission: "Automatic",
    variant: "Petrol automatic • demo configuration",
    price: 950000,
    color: "#a9bec8",
    image: "i20.svg",
    tag: "Small footprint. Big personality.",
    source: "https://www.hyundai.com/in/en/find-a-car/i20/highlights",
  },
];
export const cities = [
  "Mumbai",
  "Bengaluru",
  "Delhi",
  "Pune",
  "Hyderabad",
  "Chennai",
];
// Assumptions, not statutory tax rates. Users can edit the calculator inputs.
export const rates = {
  Mumbai: 0.11,
  Bengaluru: 0.14,
  Delhi: 0.1,
  Pune: 0.11,
  Hyderabad: 0.12,
  Chennai: 0.12,
};
export function estimate(car, city) {
  const tax = Math.round(car.price * rates[city]);
  const insurance = Math.round(car.price * 0.035);
  return {
    ex: car.price,
    tax,
    insurance,
    fees: 3000,
    total: car.price + tax + insurance + 3000,
  };
}
export const showrooms = [
  {
    id: 1,
    name: "TATA.CARS Showroom — Puneet Cars",
    city: "Mumbai",
    brand: "Tata",
    area: "Prabhadevi",
    address:
      "Lloyds Centre Point, Appasaheb Marathe Marg, Prabhadevi, Mumbai 400025",
    lat: 19.014,
    lon: 72.83,
    phone: "+917039079692",
    source:
      "https://dealer-locator.cars.tatamotors.com/location/maharashtra/mumbai",
  },
  {
    id: 2,
    name: "TATA.CARS Showroom — Regent",
    city: "Mumbai",
    brand: "Tata",
    area: "Bandra West",
    address:
      "Plot No 565, Kailash Enclave, 32nd National College Road, Bandra West, Mumbai 400050",
    lat: 19.065,
    lon: 72.834,
    phone: "+918879413850",
    source:
      "https://dealer-locator.cars.tatamotors.com/location/maharashtra/mumbai",
  },
  {
    id: 3,
    name: "TATA.CARS Showroom — Trident Motors",
    city: "Mumbai",
    brand: "Tata",
    area: "Andheri West",
    address:
      "CTS 5 & 6, 812/813, Nasar Residency, CD Barfiwala Road, Juhu Lane, Andheri West, Mumbai 400058",
    lat: 19.119,
    lon: 72.838,
    phone: "+917039032214",
    source:
      "https://dealer-locator.cars.tatamotors.com/location/maharashtra/mumbai",
  },
];
