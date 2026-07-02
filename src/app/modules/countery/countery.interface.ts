// export interface ICountry {
//   countryName: string;
//   cityName: string[];
//   neighborhoods: string[];
//   image?: string;
// }

export interface ICity {
  cityName: string;
  neighborhoods: string[];
  status?: 'active' | 'inactive';
}

export interface ICountry {
  countryName: string;
  cities: ICity[];
  image?: string;
  order?: number;
  status?: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}