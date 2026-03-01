
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  SunnahTimes,
  HighLatitudeRule,
} from 'adhan';
import { LocalPrayerTimesResult, FetchPrayerTimesResult } from '../../types';

export const DISPLAY_GRID_NAMES = ['Imsak', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const OBLIGATORY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/**
 * Utility functions for JWS Application
 */

export const formatTime = (date: Date): string => {
  if (!date || isNaN(date.getTime())) {
    return '--:--'; // Fallback for invalid date
  }
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Fungsi internal sebagai cadangan jika API Aladhan tidak merespons cepat
 */
export const getHijriDateFallback = (date: Date): string => {
  try {
    const arabicMonths = [
      "Muharram", "Safar", "Rabi'ul Awwal", "Rabi'ul Akhir",
      "Jumadil Awwal", "Jumadil Akhir", "Rajab", "Sya'ban",
      "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah"
    ];
    
    // Get numeric parts using a reliable locale
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-civil-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).formatToParts(date);
    
    const day = parts.find(p => p.type === 'day')?.value.padStart(2, '0');
    const monthIdx = parseInt(parts.find(p => p.type === 'month')?.value || "1") - 1;
    const year = parts.find(p => p.type === 'year')?.value;
    
    return `${day} ${arabicMonths[monthIdx]} ${year} H`;
  } catch (e) {
    return "Kalender Hijriah";
  }
};

/**
 * Menghitung jadwal shalat secara lokal menggunakan library adhan
 */
export const calculateLocalPrayerTimes = (lat: number, lon: number, methodId: number = 20): LocalPrayerTimesResult => {
  const date = new Date();
  const coordinates = new Coordinates(lat, lon);
  
  // Map methodId to Adhan CalculationMethod
  let params = CalculationMethod.MuslimWorldLeague();
  
  // Method Mapping based on user request:
  // 20: Kemenag RI (Fajr 20, Isha 18)
  // 21: Muhammadiyah (Fajr 18, Isha 18)
  // 3: Muslim World League (Fajr 18, Isha 17)
  // 1: Univ. Islamic Sciences, Karachi (Fajr 18, Isha 18)
  
  if (methodId === 20) {
    params = CalculationMethod.Singapore(); // Closest to Kemenag/MUIS
    params.fajrAngle = 20;
    params.ishaAngle = 18;
  } else if (methodId === 21) {
    // Muhammadiyah
    params = CalculationMethod.Karachi();
    params.fajrAngle = 18;
    params.ishaAngle = 18;
  } else if (methodId === 1) {
    params = CalculationMethod.Karachi();
  } else if (methodId === 3) {
    params = CalculationMethod.MuslimWorldLeague();
  } else if (methodId === 2) {
    params = CalculationMethod.NorthAmerica();
  } else if (methodId === 4) {
    params = CalculationMethod.UmmAlQura();
  } else if (methodId === 5) {
    params = CalculationMethod.Egyptian();
  }
  
  params.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  
  const prayerTimes = new PrayerTimes(coordinates, date, params);
  
  const ikhtiyat = 2 * 60000; // 2 minutes in milliseconds

  // Helper to validate date objects from adhan library
  const validateDate = (d: Date | null | undefined): Date => {
    if (!d || isNaN(d.getTime())) {
      return new Date(NaN); // Return an invalid Date object
    }
    return d;
  };

  const validatedPrayerTimes = {
    fajr: validateDate(prayerTimes.fajr),
    sunrise: validateDate(prayerTimes.sunrise),
    dhuhr: validateDate(prayerTimes.dhuhr),
    asr: validateDate(prayerTimes.asr),
    maghrib: validateDate(prayerTimes.maghrib),
    isha: validateDate(prayerTimes.isha),
  };
  const format = (d: Date, addIkhtiyat: boolean = true) => {
    if (isNaN(d.getTime())) {
      return '--:--'; // Fallback for invalid date
    }
    const adjustedDate = addIkhtiyat ? new Date(d.getTime() + ikhtiyat) : d;
    if (isNaN(adjustedDate.getTime())) {
      return '--:--'; // Fallback for invalid adjusted date
    }
    return adjustedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Imsak is 10 mins before Fajr
  let imsakTime = '--:--';
  if (!isNaN(validatedPrayerTimes.fajr.getTime())) {
    const fajrCorrected = new Date(validatedPrayerTimes.fajr.getTime() + ikhtiyat);
    const imsakDate = new Date(fajrCorrected.getTime() - 10 * 60000);
    imsakTime = imsakDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  return {
    Imsak: imsakTime,
    Fajr: format(validatedPrayerTimes.fajr),
    Sunrise: format(validatedPrayerTimes.sunrise, false),
    Dhuhr: format(validatedPrayerTimes.dhuhr),
    Asr: format(validatedPrayerTimes.asr),
    Maghrib: format(validatedPrayerTimes.maghrib),
    Isha: format(validatedPrayerTimes.isha),
    _raw: prayerTimes, // For debugging
    _validated: validatedPrayerTimes // For debugging
  };
};

export const fetchPrayerTimes = async (lat: number, lon: number, method: number = 20): Promise<FetchPrayerTimesResult> => {
  // Validate coordinates, fallback to Jakarta if invalid
  const safeLat = (isNaN(lat) || lat === 0) ? -6.1751 : lat;
  const safeLon = (isNaN(lon) || lon === 0) ? 106.8272 : lon;
  
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Try local calculation first
  const localCalculationResult: LocalPrayerTimesResult = calculateLocalPrayerTimes(safeLat, safeLon, method);
  const ikhtiyatMs = 2 * 60000; // 2 minutes

  try {
    const res = await fetch(`https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${safeLat}&longitude=${safeLon}&method=${method}`);
    const data = await res.json();
    if (!data || !data.data) throw new Error("Invalid API Response");
    
    const todayData = data.data[date.getDate() - 1];
    const apiTimings = todayData.timings;
    
    const adjustedTimings: Record<string, string> = {};
    
    DISPLAY_GRID_NAMES.forEach(prayerName => {
      const apiTime = apiTimings[prayerName];
      if (typeof apiTime === 'string' && apiTime.includes(':')) {
        const [h, m] = apiTime.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        
        const adjusted = new Date(d.getTime() + ikhtiyatMs);
        adjustedTimings[prayerName] = adjusted.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else {
        // Fallback to local if specific prayer is missing in API
        adjustedTimings[prayerName] = localCalculationResult[prayerName as keyof LocalPrayerTimesResult] as string || '00:00';
      }
    });

    return {
      timings: adjustedTimings,
      hijri: todayData.date.hijri,
      _debugRawLocal: localCalculationResult._raw,
      _debugValidatedLocal: localCalculationResult._validated,
    };
  } catch (error) {
    console.warn("Using local prayer calculation fallback.", error);
    return {
      timings: {
        Imsak: localCalculationResult.Imsak,
        Fajr: localCalculationResult.Fajr,
        Sunrise: localCalculationResult.Sunrise,
        Dhuhr: localCalculationResult.Dhuhr,
        Asr: localCalculationResult.Asr,
        Maghrib: localCalculationResult.Maghrib,
        Isha: localCalculationResult.Isha,
      },
      hijri: null,
      _debugRawLocal: localCalculationResult._raw,
      _debugValidatedLocal: localCalculationResult._validated,
    };
  }
};


export const timeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  try {
    const cleanTime = timeStr.split(' ')[0];
    if (!cleanTime.includes(':')) return 0;
    const [h, m] = cleanTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 3600 + m * 60;
  } catch (e) {
    return 0;
  }
};

export const secondsToHms = (d: number): string => {
  d = Number(d);
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor(d % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Daftar Hari Besar Islam (PHBI)
 * Sesuai koreksi user: 1 Ramadhan 1447 H jatuh pada 19 Februari 2026.
 */
export const getNextPHBI = (now: Date) => {
  const events = [
    // Tahun 2025 (1446 H)
    { name: "Ramadhan 1446 H", date: new Date('2025-03-01T00:00:00') },
    { name: "Idul Fitri 1446 H", date: new Date('2025-03-31T00:00:00') },
    { name: "Idul Adha 1446 H", date: new Date('2025-06-06T00:00:00') },
    { name: "Tahun Baru 1447 H", date: new Date('2025-06-26T00:00:00') },
    { name: "Maulid Nabi", date: new Date('2025-09-04T00:00:00') },
    // Tahun 2026 (1447 H) - Berdasarkan instruksi user (Kamis, 19 Feb 2026)
    { name: "Ramadhan 1447 H", date: new Date('2026-02-19T00:00:00') },
    { name: "Idul Fitri 1447 H", date: new Date('2026-03-20T00:00:00') },
  ];

  // Cari event terdekat yang belum terlewati
  const upcoming = events
    .filter(e => e.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcoming.length > 0) {
    const next = upcoming[0];
    const diffTime = next.date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { name: next.name, days: diffDays };
  }

  return { name: "Ramadhan 1448 H", days: 365 };
};

export const fetchCityName = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.city || data.locality || data.principalSubdivision || "Lokasi Tidak Diketahui";
  } catch (error) {
    console.warn("Error fetching city name:", error);
    return "Lokasi Offline";
  }
};
