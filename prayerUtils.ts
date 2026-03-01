
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  SunnahTimes,
  HighLatitudeRule,
} from 'adhan';

/**
 * Utility functions for JWS Application
 */

export const formatTime = (date: Date): string => {
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
export const calculateLocalPrayerTimes = (lat: number, lon: number, methodId: number = 20) => {
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

  const format = (d: Date, addIkhtiyat: boolean = true) => {
    const adjustedDate = addIkhtiyat ? new Date(d.getTime() + ikhtiyat) : d;
    return adjustedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Imsak is 10 mins before Fajr (Fajr already has Ikhtiyat applied in its calculation if we use the adjusted one)
  // But usually Imsak is Fajr_raw - 10 mins. 
  // To be safe, we calculate Imsak relative to the corrected Fajr.
  const fajrCorrected = new Date(prayerTimes.fajr.getTime() + ikhtiyat);
  const imsakDate = new Date(fajrCorrected.getTime() - 10 * 60000);

  return {
    Imsak: imsakDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
    Fajr: format(prayerTimes.fajr),
    Sunrise: format(prayerTimes.sunrise, false), // Sunrise doesn't usually need Ikhtiyat as it's the end of Fajr
    Dhuhr: format(prayerTimes.dhuhr),
    Asr: format(prayerTimes.asr),
    Maghrib: format(prayerTimes.maghrib),
    Isha: format(prayerTimes.isha)
  };
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const fetchCityName = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetchWithTimeout(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`, {}, 3000);
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || "Lokasi Terdeteksi";
  } catch (e) {
    return "Lokasi Terdeteksi";
  }
};

export const fetchPrayerTimes = async (lat: number, lon: number, method: number = 20): Promise<any> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Try local calculation first for speed/offline
  const localTimes = calculateLocalPrayerTimes(lat, lon, method);
  
  try {
    // Attempt to fetch from API for more precise/official data if online
    const res = await fetchWithTimeout(`https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lon}&method=${method}`, {}, 5000);
    const data = await res.json();
    if (!data || !data.data) throw new Error("Invalid API Response");
    
    const todayData = data.data[date.getDate() - 1];
    return {
      timings: todayData.timings,
      hijri: todayData.date.hijri
    };
  } catch (error) {
    console.warn("Using local prayer calculation due to network error or API failure.");
    return {
      timings: localTimes,
      hijri: null // Will use fallback hijri
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
