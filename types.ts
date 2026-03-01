
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PrayerTimes {
  imsak: string;
  subuh: string;
  terbit: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export interface LocationInfo {
  city: string;
  country: string;
}

export type LocalPrayerTimesResult = Record<string, any>;

export interface FetchPrayerTimesResult {
  timings: Record<string, string>;
  hijri: any;
  _debugRawLocal?: any;
  _debugValidatedLocal?: any;
}

export enum CalculationMethod {
  KEMENAG = 'Kemenag RI',
  MWL = 'Muslim World League',
  ISNA = 'ISNA',
  EGYPT = 'Egyptian General Authority',
  MAKKAH = 'Umm al-Qura University, Makkah',
  KARACHI = 'University of Islamic Sciences, Karachi',
  SINGAPORE = 'MUIS Singapore',
}
