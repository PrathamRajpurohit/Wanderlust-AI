export interface IHotel {
  name: string;
  pricePerNight: number;
  rating: number;
}

export interface IFlight {
  from: string;
  to: string;
  airline: string;
  estimatedCost: number;
}

export interface IRestaurant {
  name: string;
  cuisine: string;
  avgCost: number;
}

export interface IAttraction {
  name: string;
  entryFee: number;
  duration: string;
}

export interface IWeather {
  condition: string; // e.g. "Sunny", "Rainy", "Cloudy", "Snowy"
  temperature: string; // e.g. "22°C / 15°C"
  description: string; // e.g. "Warm afternoon, cool breeze"
}

export interface IMapLocation {
  name: string;
  type: "hotel" | "restaurant" | "attraction";
  lat: number;
  lng: number;
  address?: string;
}

export interface IMapRecommendation {
  routeUrl: string; // Google Maps Directions URL
  locations: IMapLocation[]; // Coordinates for markers
  centerLat: number;
  centerLng: number;
  zoom: number;
}

export interface IDay {
  day: number;
  date: string;
  theme: string;
  hotel: IHotel;
  flights: IFlight[];
  restaurants: IRestaurant[];
  attractions: IAttraction[];
  dailyEstimate: number;
  weather?: IWeather;
  mapRecommendation?: IMapRecommendation;
}

export interface TripState {
  origin?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  preferences?: string;
  hotelData?: string;
  flightData?: string;
  restaurantData?: string;
  attractionData?: string;
  weatherData?: string;
  draft?: IDay[];
  humanFeedback?: string;
  logs: string[];
  workersComplete: string[];
}
