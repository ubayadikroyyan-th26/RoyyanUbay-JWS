import { PrayerTimes } from 'adhan';

export interface LocalPrayerTimesResult {
  Imsak: string;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  _raw: PrayerTimes; // Raw object from adhan library
  _validated: { // Validated Date objects
    fajr: Date;
    sunrise: Date;
    dhuhr: Date;
    asr: Date;
    maghrib: Date;
    isha: Date;
  };
}

export interface FetchPrayerTimesResult {
  timings: Record<string, string>;
  hijri: any;
  _debugRawLocal?: PrayerTimes;
  _debugValidatedLocal?: { // Validated Date objects
    fajr: Date;
    sunrise: Date;
    dhuhr: Date;
    asr: Date;
    maghrib: Date;
    isha: Date;
  };
}
