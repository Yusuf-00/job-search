import { IJobFilter } from './filter.interface';

export interface CityFilterParams {
  city?: string;
}

export const cityFilter: IJobFilter<CityFilterParams> = {
  build({ city }) {
    if (!city) return null;
    const escaped = city.replace(/"/g, '\\"');
    return `city = "${escaped}"`;
  },
};
