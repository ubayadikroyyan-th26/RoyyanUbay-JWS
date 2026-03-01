
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Settings, 
  MapPin, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Calendar, 
  Clock,
  Image as ImageIcon,
  Upload,
  Download,
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  History,
  Timer,
  Bell,
  BellRing,
  Play,
  Users,
  User,
  SlidersHorizontal,
  Globe,
  Star,
  Menu,
  Zap,
  Volume2,
  VolumeX,
  Music,
  Pause,
  SkipBack,
  SkipForward,
  ListMusic,
  Repeat,
  Repeat1,
  Shuffle,
  RefreshCcw, // Added for download loading indicator
  Trash2,
  Minus,
  Plus,
  Smartphone,
  QrCode,
  ExternalLink,
  WifiOff
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { 
  formatTime, 
  fetchPrayerTimes, 
  fetchCityName,
  timeToSeconds, 
  secondsToHms,
  getNextPHBI,
  getHijriDateFallback
} from '../utils/prayerUtils';
import { getData, setData, deleteData } from '../db';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('Rp', 'Rp ');
};

const ADHAN_VOICES = [
  { id: 'makkah', name: 'Adzan Makkah', url: 'https://archive.org/download/AdhanMakkah/AdhanMakkah.mp3' },
  { id: 'madinah', name: 'Adzan Madinah', url: 'https://archive.org/download/AdhanMadinah/AdhanMadinah.mp3' },
  { id: 'mishary', name: 'Mishary Rashid Alafasy', url: 'https://archive.org/download/Adhan_Alafasy/Adhan_Alafasy.mp3' },
  { id: 'abdul_basit', name: 'Abdul Basit Abdus Samad', url: 'https://archive.org/download/Adhan_Abdul_Basit/Adhan_Abdul_Basit.mp3' },
  { id: 'al_hussary', name: 'Mahmoud Khalil Al-Hussary', url: 'https://archive.org/download/Adhan_Al_Hussary/Adhan_Al_Hussary.mp3' },
];

const DISPLAY_GRID_NAMES = ['Imsak', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const OBLIGATORY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const DISPLAY_NAMES: Record<string, string> = {
  Imsak: 'Imsyak',
  Fajr: 'Shubuh',
  Sunrise: 'Syuruq',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya'
};

const PRAYER_THEMES: Record<string, { bg: string, accent: string }> = {
  Imsak: { bg: 'from-sky-700 to-blue-800', accent: 'border-sky-400' },
  Fajr: { bg: 'from-rose-700 to-red-800', accent: 'border-rose-400' },
  Sunrise: { bg: 'from-orange-600 to-amber-700', accent: 'border-orange-400' },
  Dhuhr: { bg: 'from-cyan-700 to-blue-800', accent: 'border-cyan-400' },
  Asr: { bg: 'from-teal-600 to-emerald-800', accent: 'border-teal-400' },
  Maghrib: { bg: 'from-fuchsia-700 to-purple-900', accent: 'border-fuchsia-400' },
  Isha: { bg: 'from-indigo-700 to-violet-900', accent: 'border-indigo-400' }
};

const PRAYER_VERSES = [
  {
    arabic: "وَأَقِيمُوا۟ ٱلصَّلَوٰةَ وَءَاتُوا۟ ٱلزَّكَوٰةَ وَٱرْكَعُوا۟ مَعَ ٱلرَّٰكِعِينَ",
    translation: "Dan dirikanlah shalat, tunaikanlah zakat dan ruku'lah beserta orang-orang yang ruku'.",
    reference: "QS. Al-Baqarah: 43"
  },
  {
    arabic: "وَأَقِيمُوا۟ ٱلصَّلَوٰةَ وَءَاتُوا۟ ٱلزَّكَوٰةَ ۚ وَمَا تُقَدِّمُوا۟ لِأَنفُسِكُم مِّنْ خَيْرٍ تَجِدُوهُ عِندَ ٱللَّهِ",
    translation: "Dan dirikanlah shalat dan tunaikanlah zakat. Dan kebaikan apa saja yang kamu usahakan bagi dirimu, tentu kamu akan mendapat pahalanya pada sisi Allah.",
    reference: "QS. Al-Baqarah: 110"
  },
  {
    arabic: "ٱتْلُ مَآ أُوحِىَ إِلَيْكَ مِنَ ٱلْكِتَـٰبِ وَأَقِيمِ ٱلصَّلَوٰةَ ۖ إِنَّ ٱلصَّلَوٰةَ تَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ",
    translation: "Bacalah apa yang telah diwahyukan kepadamu, yaitu Al Kitab (Al Quran) dan dirikanlah shalat. Sesungguhnya shalat itu mencegah dari (perbuatan-perbuatan) keji dan mungkar.",
    reference: "QS. Al-Ankabut: 45"
  },
  {
    arabic: "يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ ۚ إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ",
    translation: "Hai orang-orang yang beriman, jadikanlah sabar dan shalat sebagai penolongmu, sesungguhnya Allah beserta orang-orang yang sabar.",
    reference: "QS. Al-Baqarah: 153"
  }
];

const DEFAULT_BGS = [
  'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop'
];

type MurottalTrack = {
  id: number;
  title: string;
  reciter: string;
  url: string;
  isCustom?: boolean;
};

const DEFAULT_MUROTTAL_PLAYLIST: MurottalTrack[] = [
  { id: 1, title: "Al-Fatihah", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/001.mp3" },
  { id: 2, title: "Al-Kahf", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/018.mp3" },
  { id: 3, title: "Yasin", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/036.mp3" },
  { id: 4, title: "Ar-Rahman", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/055.mp3" },
  { id: 5, title: "Al-Waqi'ah", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/056.mp3" },
  { id: 6, title: "Al-Mulk", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/067.mp3" },
  { id: 7, title: "An-Naba", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/078.mp3" },
  { id: 8, title: "Ad-Duha", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/093.mp3" },
  { id: 9, title: "Al-Ikhlas", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/112.mp3" },
  { id: 10, title: "Al-Falaq", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/113.mp3" },
  { id: 11, title: "An-Nas", reciter: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/114.mp3" },
];

type AppState = 'normal' | 'iqomah' | 'blank' | 'sleep';
type SettingsTab = 'masjid' | 'waktu' | 'iqomah' | 'petugas' | 'keuangan' | 'media' | 'murottal' | 'sistem' | 'remote';

const App: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const closeSW = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const [isRemote] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('remote') === 'true';
  });
  const [now, setNow] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [rawPrayerTimes, setRawPrayerTimes] = useState<Record<string, string> | null>(null);
  const [hijriDate, setHijriDate] = useState<string>(() => getHijriDateFallback(new Date()));
  const [detectedCity, setDetectedCity] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; diff: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('masjid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const d = document as any;
      setIsFullscreen(!!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement));
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHeaderControls, setShowHeaderControls] = useState(false);
  
  const [appState, setAppState] = useState<AppState>('normal');
  const [activePrayer, setActivePrayer] = useState<string | null>(null);
  const [iqomahTimeLeft, setIqomahTimeLeft] = useState(0);
  const [blankTimeLeft, setBlankTimeLeft] = useState(0);
  const [lastTriggeredPrayer, setLastTriggeredPrayer] = useState<string | null>(null);
  const [lastTriggeredAlarm, setLastTriggeredAlarm] = useState<string | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Persistence State
  const [mosqueName, setMosqueName] = useState(() => localStorage.getItem('mosqueName') || 'Royyan & Ubay');
  const [mosqueAddress, setMosqueAddress] = useState(() => localStorage.getItem('mosqueAddress') || 'Masjid JWS Real-Time');
  const [marqueeText, setMarqueeText] = useState(() => localStorage.getItem('marqueeText') || 'Luruskan dan rapatkan shaf, shalat berjamaah lebih utama 27 derajat.');
  const [method, setMethod] = useState(() => Number(localStorage.getItem('prayerMethod')) || 20); // Default to Kemenag RI (20)
  const [bgUrls, setBgUrls] = useState(() => localStorage.getItem('bgUrls') || DEFAULT_BGS.join('\n'));
  const [bgInterval, setBgInterval] = useState(() => Number(localStorage.getItem('bgInterval')) || 30);
  const [useAutoLocation, setUseAutoLocation] = useState(false);
  const [latitude, setLatitude] = useState(() => Number(localStorage.getItem('latitude')) || -6.2615);
  const [longitude, setLongitude] = useState(() => Number(localStorage.getItem('longitude')) || 107.1706);
  const [timezone, setTimezone] = useState(() => localStorage.getItem('timezone') || 'Asia/Jakarta');
  const [hijriAdjustment, setHijriAdjustment] = useState(() => Number(localStorage.getItem('hijriAdjustment')) || 0);

  // Prayer Correction (+/- Minutes)
  const [corrections, setCorrections] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('prayerCorrections');
    if (!saved) return { Imsak: 0, Fajr: 0, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
    try {
      const parsed = JSON.parse(saved);
      const final = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      return typeof final === 'object' && final !== null ? final : { Imsak: 0, Fajr: 0, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
    } catch (e) {
      return { Imsak: 0, Fajr: 0, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
    }
  });

  // Officials State
  const [imams, setImams] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('imams');
    if (!saved) return { Fajr: '-', Dhuhr: '-', Asr: '-', Maghrib: '-', Isha: '-' };
    try {
      const parsed = JSON.parse(saved);
      const final = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      return typeof final === 'object' && final !== null ? final : { Fajr: '-', Dhuhr: '-', Asr: '-', Maghrib: '-', Isha: '-' };
    } catch (e) {
      return { Fajr: '-', Dhuhr: '-', Asr: '-', Maghrib: '-', Isha: '-' };
    }
  });
  const [tarawihImam, setTarawihImam] = useState(() => localStorage.getItem('tarawihImam') || '-');

  const [iqomahDurations, setIqomahDurations] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('iqomahDurations');
    if (!saved) return { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 7, Isha: 10 };
    try {
      const parsed = JSON.parse(saved);
      const final = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      return typeof final === 'object' && final !== null ? final : { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 7, Isha: 10 };
    } catch (e) {
      return { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 7, Isha: 10 };
    }
  });
  const [iqomahText, setIqomahText] = useState(() => localStorage.getItem('iqomahText') || 'Rapatkan shof, dan mohon alat komunikasi dinon aktifkan / disilent');
  const [prayerBlankDuration, setPrayerBlankDuration] = useState(() => Number(localStorage.getItem('prayerBlankDuration')) || 15);

  const [finSaldoAwal, setFinSaldoAwal] = useState(() => Number(localStorage.getItem('finSaldoAwal')) || 0);
  const [finPemasukan, setFinPemasukan] = useState(() => Number(localStorage.getItem('finPemasukan')) || 0);
  const [finPengeluaran, setFinPengeluaran] = useState(() => Number(localStorage.getItem('finPengeluaran')) || 0);
  const [finShowInterval, setFinShowInterval] = useState(() => Number(localStorage.getItem('finShowInterval')) || 10);
  const [finShowDuration, setFinShowDuration] = useState(() => Number(localStorage.getItem('finShowDuration')) || 5);
  const [showFinPanel, setShowFinPanel] = useState(false);

  // Smart Power State
  const [sleepEnabled, setSleepEnabled] = useState(() => localStorage.getItem('sleepEnabled') === 'true');
  const [sleepStart, setSleepStart] = useState(() => localStorage.getItem('sleepStart') || '23:00');
  const [sleepEnd, setSleepEnd] = useState(() => localStorage.getItem('sleepEnd') || '03:00');
  const [verseInterval, setVerseInterval] = useState(() => Number(localStorage.getItem('verseInterval')) || 10);
  const [adhanEnabled, setAdhanEnabled] = useState(() => localStorage.getItem('adhanEnabled') !== 'false');
  const [preAdhanAlarmEnabled, setPreAdhanAlarmEnabled] = useState(() => localStorage.getItem('preAdhanAlarmEnabled') === 'true');
  const [preAdhanAlarmDuration, setPreAdhanAlarmDuration] = useState(() => Number(localStorage.getItem('preAdhanAlarmDuration')) || 3);
  const [selectedAdhanVoice, setSelectedAdhanVoice] = useState(() => localStorage.getItem('selectedAdhanVoice') || ADHAN_VOICES[0].id);
  const [downloadedAdhanBlobs, setDownloadedAdhanBlobs] = useState<Record<string, string>>({});
  const [simulationEnabled, setSimulationEnabled] = useState(() => localStorage.getItem('simulationEnabled') === 'true');
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [customAdhanBlob, setCustomAdhanBlob] = useState<Blob | null>(null);
  const [mosqueLogoBlob, setMosqueLogoBlob] = useState<Blob | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('notificationsEnabled') !== 'false');
  const [isMurottalPlaying, setIsMurottalPlaying] = useState(false);
  const [showMurottalPlayer, setShowMurottalPlayer] = useState(false);
  const [murottalVolume, setMurottalVolume] = useState(0.5);
  const [showPlaylistInPlayer, setShowPlaylistInPlayer] = useState(false);
  const [downloadedTracks, setDownloadedTracks] = useState<Record<number, Blob>>({});
  const [downloadedBgs, setDownloadedBgs] = useState<Record<string, string>>({}); // Map URL to ObjectURL
  const [downloadingBg, setDownloadingBg] = useState<boolean>(false);
  const [downloadingTrackId, setDownloadingTrackId] = useState<number | null>(null);
  const [playlist, setPlaylist] = useState<MurottalTrack[]>(DEFAULT_MUROTTAL_PLAYLIST);
  const [murottalSrc, setMurottalSrc] = useState<string | null>(playlist[0]?.url || null);
  const [playbackMode, setPlaybackMode] = useState<'off' | 'all' | 'one'>(() => (localStorage.getItem('murottalRepeat') as any) || 'all');
  const [isShuffle, setIsShuffle] = useState(() => localStorage.getItem('murottalShuffle') === 'true');
  const [adhanSrc, setAdhanSrc] = useState<string | null>(null);

  const adhanAudioRef = useRef<HTMLAudioElement | null>(null);
  const murottalAudioRef = useRef<HTMLAudioElement | null>(null);
  const adhanFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const murottalFileInputRef = useRef<HTMLInputElement>(null);
  const lastFinCycleRef = useRef<number>(-1);

  const finSaldoAkhir = useMemo(() => finSaldoAwal + finPemasukan - finPengeluaran, [finSaldoAwal, finPemasukan, finPengeluaran]);
  const bgList = useMemo(() => bgUrls.split('\n').map(url => url.trim()).filter(url => url.length > 5), [bgUrls]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const phbi = useMemo(() => getNextPHBI(now), [now]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [swStatus, setSwStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwStatus('ready'))
        .catch(() => setSwStatus('error'));
    } else {
      setSwStatus('error');
    }
  }, []);

  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef({ playAdhan: () => {}, toggleMurottal: () => {}, nextTrack: () => {}, prevTrack: () => {} });

  const broadcastUpdate = useCallback((payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'update', payload }));
    }
  }, []);

  const sendCommand = useCallback((command: string, payload: any = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'command', command, payload }));
    }
  }, []);

  // Persistence Logic - Split and Debounced
  const handleDownloadAllBgs = useCallback(async () => {
    if (downloadingBg) return;
    setDownloadingBg(true);
    
    try {
      const newDownloadedBgs: Record<string, string> = { ...downloadedBgs };
      let successCount = 0;

      for (const url of bgList) {
        // Skip if already downloaded
        if (newDownloadedBgs[url]) continue;

        try {
          const response = await fetch(url, { mode: 'cors' });
          if (!response.ok) throw new Error('Network response was not ok');
          
          const blob = await response.blob();
          
          // Store in IndexedDB with a prefix
          await setData(`bg_${url}`, blob);
          
          // Create Object URL
          newDownloadedBgs[url] = URL.createObjectURL(blob);
          successCount++;
        } catch (err) {
          console.error(`Failed to download background: ${url}`, err);
        }
      }

      setDownloadedBgs(newDownloadedBgs);
      if (successCount > 0) {
        alert(`Berhasil mengunduh ${successCount} gambar background untuk offline.`);
      } else {
        alert('Semua background sudah terunduh atau gagal diunduh.');
      }
    } catch (error) {
      console.error('Error downloading backgrounds:', error);
      alert('Terjadi kesalahan saat mengunduh background.');
    } finally {
      setDownloadingBg(false);
    }
  }, [bgList, downloadedBgs, downloadingBg]);

  const handleDeleteAllBgs = useCallback(async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua cache background offline?')) {
      try {
        const newDownloadedBgs = { ...downloadedBgs };
        for (const url of Object.keys(newDownloadedBgs)) {
          await deleteData(`bg_${url}`);
          URL.revokeObjectURL(newDownloadedBgs[url]);
          delete newDownloadedBgs[url];
        }
        setDownloadedBgs({});
        alert('Cache background berhasil dihapus.');
      } catch (error) {
        console.error('Error deleting backgrounds:', error);
      }
    }
  }, [downloadedBgs]);

  useEffect(() => {
    const loadBgsFromDB = async () => {
      const loadedBgs: Record<string, string> = {};
      for (const url of bgList) {
        const blob = await getData(`bg_${url}`);
        if (blob instanceof Blob) {
          loadedBgs[url] = URL.createObjectURL(blob);
        }
      }
      setDownloadedBgs(loadedBgs);
    };
    loadBgsFromDB();
  }, [bgList]);

  const saveToStorage = useCallback((key: string, value: any) => {
    setIsSaving(true);
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (key === 'bgUrls') {
        try {
          localStorage.setItem(key, stringValue);
        } catch (e) {
          if (e.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded for bgUrls. Data is safe in IndexedDB.');
          } else {
            console.error(`Failed to set ${key} in localStorage`, e);
          }
        }
      } else {
        localStorage.setItem(key, stringValue);
      }
      
      // Map key to payload field name if necessary
      const fieldMap: Record<string, string> = {
        mosqueName: 'mosqueName',
        mosqueAddress: 'mosqueAddress',
        marqueeText: 'marqueeText',
        prayerMethod: 'method',
        latitude: 'latitude',
        longitude: 'longitude',
        bgUrls: 'bgUrls',
        bgInterval: 'bgInterval',
        useAutoLocation: 'useAutoLocation',
        timezone: 'timezone',
        hijriAdjustment: 'hijriAdjustment',
        prayerCorrections: 'corrections',
        imams: 'imams',
        tarawihImam: 'tarawihImam',
        iqomahDurations: 'iqomahDurations',
        iqomahText: 'iqomahText',
        prayerBlankDuration: 'prayerBlankDuration',
        finSaldoAwal: 'finSaldoAwal',
        finPemasukan: 'finPemasukan',
        finPengeluaran: 'finPengeluaran',
        finShowInterval: 'finShowInterval',
        finShowDuration: 'finShowDuration',
        sleepEnabled: 'sleepEnabled',
        sleepStart: 'sleepStart',
        sleepEnd: 'sleepEnd',
        verseInterval: 'verseInterval',
        adhanEnabled: 'adhanEnabled',
        preAdhanAlarmEnabled: 'preAdhanAlarmEnabled',
        preAdhanAlarmDuration: 'preAdhanAlarmDuration',
        simulationEnabled: 'simulationEnabled',
        murottalVolume: 'murottalVolume',
        isMurottalPlaying: 'isMurottalPlaying',
        currentTrackIndex: 'currentTrackIndex',
        playbackMode: 'playbackMode',
        isShuffle: 'isShuffle',
        appState: 'appState'
      };

      const field = fieldMap[key];
      if (field) {
        broadcastUpdate({ [field]: value });
      }
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  }, [broadcastUpdate]);

  useEffect(() => {
    saveToStorage('selectedAdhanVoice', selectedAdhanVoice);
  }, [selectedAdhanVoice, saveToStorage]);

  useEffect(() => {
    const t = setTimeout(() => saveToStorage('murottalVolume', murottalVolume), 500);
    return () => clearTimeout(t);
  }, [murottalVolume, saveToStorage]);

  useEffect(() => {
    saveToStorage('isMurottalPlaying', isMurottalPlaying);
  }, [isMurottalPlaying, saveToStorage]);

  useEffect(() => {
    saveToStorage('currentTrackIndex', currentTrackIndex);
  }, [currentTrackIndex, saveToStorage]);

  useEffect(() => {
    saveToStorage('playbackMode', playbackMode);
  }, [playbackMode, saveToStorage]);

  useEffect(() => {
    saveToStorage('isShuffle', isShuffle);
  }, [isShuffle, saveToStorage]);

  useEffect(() => {
    saveToStorage('appState', appState);
  }, [appState, saveToStorage]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const [roomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('roomId');
    if (urlRoomId) return urlRoomId;

    const saved = localStorage.getItem('mosqueRoomId');
    if (saved) return saved;
    const newId = 'mosque_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('mosqueRoomId', newId);
    return newId;
  });

  const handleExportSettings = useCallback(() => {
    const settings = {
      mosqueName,
      mosqueAddress,
      marqueeText,
      method,
      bgUrls,
      bgInterval,
      useAutoLocation,
      latitude,
      longitude,
      timezone,
      hijriAdjustment,
      corrections,
      imams,
      tarawihImam,
      iqomahDurations,
      iqomahText,
      prayerBlankDuration,
      finSaldoAwal,
      finPemasukan,
      finPengeluaran
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jws-settings-${mosqueName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    mosqueName, mosqueAddress, marqueeText, method, bgUrls, bgInterval, 
    useAutoLocation, timezone, hijriAdjustment, corrections, imams, 
    tarawihImam, iqomahDurations, iqomahText, 
    prayerBlankDuration, finSaldoAwal, finPemasukan, finPengeluaran
  ]);

  const handleImportSettings = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target?.result as string);
        if (settings.mosqueName) setMosqueName(settings.mosqueName);
        if (settings.mosqueAddress) setMosqueAddress(settings.mosqueAddress);
        if (settings.marqueeText) setMarqueeText(settings.marqueeText);
        if (settings.method) setMethod(settings.method);
        if (settings.bgUrls) setBgUrls(settings.bgUrls);
        if (settings.bgInterval) setBgInterval(settings.bgInterval);
        if (settings.useAutoLocation !== undefined) setUseAutoLocation(settings.useAutoLocation);
        if (settings.latitude !== undefined) setLatitude(settings.latitude);
        if (settings.longitude !== undefined) setLongitude(settings.longitude);
        if (settings.timezone) setTimezone(settings.timezone);
        if (settings.hijriAdjustment !== undefined) setHijriAdjustment(settings.hijriAdjustment);
        if (settings.corrections) setCorrections(settings.corrections);
        if (settings.imams) setImams(settings.imams);
        if (settings.tarawihImam) setTarawihImam(settings.tarawihImam);
        if (settings.iqomahDurations) setIqomahDurations(settings.iqomahDurations);
        if (settings.iqomahText) setIqomahText(settings.iqomahText);
        if (settings.prayerBlankDuration) setPrayerBlankDuration(settings.prayerBlankDuration);
        if (settings.finSaldoAwal !== undefined) setFinSaldoAwal(settings.finSaldoAwal);
        if (settings.finPemasukan !== undefined) setFinPemasukan(settings.finPemasukan);
        if (settings.finPengeluaran !== undefined) setFinPengeluaran(settings.finPengeluaran);
        
        alert('Pengaturan berhasil diimpor!');
        broadcastUpdate(settings);
      } catch (err) {
        alert('Gagal mengimpor file. Pastikan format file benar.');
      }
    };
    reader.readAsText(file);
  }, [broadcastUpdate]);

  const handleDownloadAdhan = useCallback(async (voiceId: string) => {
    setDownloadingTrackId(voiceId);
    try {
      const voice = ADHAN_VOICES.find(v => v.id === voiceId);
      if (!voice) throw new Error('Suara adzan tidak ditemukan');

      const response = await fetch(voice.url).catch(err => {
        throw new Error('Gagal mengakses server audio. Ini mungkin karena masalah koneksi internet atau kebijakan keamanan browser (CORS).');
      });

      if (!response.ok) {
        throw new Error(`Gagal mengunduh: ${response.status} ${response.statusText || 'Terjadi kesalahan pada server'}`);
      }

      const blob = await response.blob();
      
      // Simpan ke IndexedDB
      await setData(`adhan_${voiceId}`, blob);
      
      // Buat Object URL untuk state
      const objectUrl = URL.createObjectURL(blob);
      setDownloadedAdhanBlobs(prev => ({ ...prev, [voiceId]: objectUrl }));
      
      alert(`${voice.name} berhasil diunduh dan siap untuk offline!`);
    } catch (error) {
      console.error('Error downloading adhan:', error);
      alert(error instanceof Error ? error.message : 'Gagal mengunduh adzan.');
    } finally {
      setDownloadingTrackId(null);
    }
  }, [ADHAN_VOICES, setDownloadedAdhanBlobs, setDownloadingTrackId]);

  const handleDeleteAdhan = useCallback(async (voiceId: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus adzan ${ADHAN_VOICES.find(v => v.id === voiceId)?.name}?`)) {
      await deleteData(`adhan_${voiceId}`);
      setDownloadedAdhanBlobs(prev => {
        const newState = { ...prev };
        if (newState[voiceId]) {
          URL.revokeObjectURL(newState[voiceId]);
          delete newState[voiceId];
        }
        return newState;
      });
      alert('Adzan berhasil dihapus!');
    }
  }, [ADHAN_VOICES, setDownloadedAdhanBlobs]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    
    try {
      if (wakeLockRef.current) return;
      
      // Check permission status if supported
      if ((navigator as any).permissions) {
        try {
          const status = await (navigator as any).permissions.query({ name: 'screen-wake-lock' } as any);
          if (status.state === 'denied') {
            console.warn('Wake Lock permission denied by policy');
            return;
          }
        } catch (e) {
          // Some browsers don't support querying this specific permission
        }
      }

      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
      console.log('Wake Lock acquired successfully');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.warn('Wake Lock disallowed by permissions policy.');
      } else {
        console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    const handleFirstClick = () => {
      const doc = document.documentElement as any;
      const d = document as any;
      const isCurrentlyFullscreen = !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement);
      
      if (!isCurrentlyFullscreen) {
        if (doc.requestFullscreen) {
          doc.requestFullscreen().catch(() => {});
        } else if (doc.webkitRequestFullscreen) {
          doc.webkitRequestFullscreen();
        }
      }
      requestWakeLock();
      window.removeEventListener('click', handleFirstClick);
    };
    window.addEventListener('click', handleFirstClick);
    return () => window.removeEventListener('click', handleFirstClick);
  }, [requestWakeLock]);

  useEffect(() => {
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [requestWakeLock]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newUrls: string[] = [];
    
    for (const file of Array.from(files) as File[]) {
      if (file.size > 2 * 1024 * 1024) {
        alert(`File ${file.name} terlalu besar (>2MB).`);
        continue;
      }
      
      const reader = new FileReader();
      const result = await new Promise<string>((resolve) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      newUrls.push(result);
    }

    if (newUrls.length > 0) {
      setBgUrls(prev => {
        const list = prev.split('\n').map(u => u.trim()).filter(u => u.length > 0);
        const filtered = newUrls.filter(url => !list.includes(url));
        const updated = [...list, ...filtered].join('\n');
        setData('bgUrls', updated); // Save to IndexedDB
        return updated;
      });
    }
  }, []);

  const applyCorrections = useCallback((timings: Record<string, string>) => {
    if (!timings || Object.keys(timings).length === 0) return {};
    const result: Record<string, string> = { ...timings };
    Object.keys(corrections).forEach(p => {
      if (!result[p] || corrections[p] === 0) return;
      
      const timePart = result[p].split(' ')[0];
      const [h, m] = timePart.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return;
      
      let totalMinutes = h * 60 + m + corrections[p];
      // Handle day wrap around correctly
      totalMinutes = (totalMinutes % 1440 + 1440) % 1440;
      
      const newH = Math.floor(totalMinutes / 60);
      const newM = totalMinutes % 60;
      
      result[p] = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    });
    return result;
  }, [corrections]);

  const prayerTimes = useMemo(() => applyCorrections(rawPrayerTimes || {}), [rawPrayerTimes, applyCorrections]);

  useEffect(() => {
    const adjustedDate = new Date(now.getTime() + (hijriAdjustment * 86400000));
    const hDate = getHijriDateFallback(adjustedDate);
    if (hDate) setHijriDate(hDate);
  }, [now.toDateString(), hijriAdjustment]);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    const fetchWithLocation = async (lat: number, lon: number) => {
      const result = await fetchPrayerTimes(lat, lon, method);
      if (result) {
        setRawPrayerTimes(result.timings);
      }
      
      const cityName = await fetchCityName(lat, lon);
      setDetectedCity(cityName);
      
      setLoading(false);
    };

    if (useAutoLocation) {
      // Geolocation will be triggered by the useEffect for useAutoLocation
      // No need to call it here directly, just load with current lat/lon
      fetchWithLocation(latitude, longitude);
    } else {
      // If auto location is off, just load with current lat/lon
      fetchWithLocation(latitude, longitude);
    }
  }, [method, latitude, longitude, useAutoLocation]);

  const refreshLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          setLatitude(lat);
          setLongitude(lon);
          // loadData will be triggered by latitude/longitude change
        },
        (err) => {
          console.warn("Geolocation error:", err.message);
          alert("Gagal mendapatkan lokasi otomatis. Pastikan izin lokasi diberikan dan coba lagi.");
          // Do NOT setUseAutoLocation(false) here. Let the toggle state persist.
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Browser Anda tidak mendukung deteksi lokasi.");
      setUseAutoLocation(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);



  useEffect(() => {
    const t = setTimeout(() => saveToStorage('mosqueName', mosqueName), 500);
    return () => clearTimeout(t);
  }, [mosqueName, saveToStorage]);

  useEffect(() => {
    const t = setTimeout(() => saveToStorage('mosqueAddress', mosqueAddress), 500);
    return () => clearTimeout(t);
  }, [mosqueAddress, saveToStorage]);

  useEffect(() => {
    const t = setTimeout(() => saveToStorage('marqueeText', marqueeText), 500);
    return () => clearTimeout(t);
  }, [marqueeText, saveToStorage]);

  useEffect(() => {
    saveToStorage('prayerMethod', method.toString());
  }, [method, saveToStorage]);

  useEffect(() => {
    const loadFromDB = async () => {
      const savedBgs = await getData('bgUrls');
      if (savedBgs) setBgUrls(savedBgs);
    };
    loadFromDB();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      saveToStorage('bgUrls', bgUrls);
      setData('bgUrls', bgUrls);
    }, 1000);
    return () => clearTimeout(t);
  }, [bgUrls, saveToStorage]);

  useEffect(() => {
    saveToStorage('bgInterval', bgInterval.toString());
  }, [bgInterval, saveToStorage]);

  useEffect(() => {
    saveToStorage('useAutoLocation', useAutoLocation.toString());
  }, [useAutoLocation, saveToStorage]);

  useEffect(() => {
    saveToStorage('latitude', latitude.toString());
  }, [latitude, saveToStorage]);

  useEffect(() => {
    saveToStorage('longitude', longitude.toString());
  }, [longitude, saveToStorage]);

  useEffect(() => {
    saveToStorage('timezone', timezone);
  }, [timezone, saveToStorage]);

  useEffect(() => {
    saveToStorage('hijriAdjustment', hijriAdjustment.toString());
  }, [hijriAdjustment, saveToStorage]);

  useEffect(() => {
    saveToStorage('prayerCorrections', corrections);
  }, [corrections, saveToStorage]);

  useEffect(() => {
    saveToStorage('imams', imams);
  }, [imams, saveToStorage]);

  useEffect(() => {
    saveToStorage('tarawihImam', tarawihImam);
  }, [tarawihImam, saveToStorage]);

  useEffect(() => {
    saveToStorage('notificationsEnabled', notificationsEnabled.toString());
  }, [notificationsEnabled, saveToStorage]);

  useEffect(() => {
    saveToStorage('iqomahDurations', iqomahDurations);
  }, [iqomahDurations, saveToStorage]);

  useEffect(() => {
    const t = setTimeout(() => saveToStorage('iqomahText', iqomahText), 500);
    return () => clearTimeout(t);
  }, [iqomahText, saveToStorage]);

  useEffect(() => {
    saveToStorage('prayerBlankDuration', prayerBlankDuration.toString());
  }, [prayerBlankDuration, saveToStorage]);

  useEffect(() => {
    saveToStorage('finSaldoAwal', finSaldoAwal.toString());
  }, [finSaldoAwal, saveToStorage]);

  useEffect(() => {
    saveToStorage('finPemasukan', finPemasukan.toString());
  }, [finPemasukan, saveToStorage]);

  useEffect(() => {
    saveToStorage('finPengeluaran', finPengeluaran.toString());
  }, [finPengeluaran, saveToStorage]);

  useEffect(() => {
    saveToStorage('finShowInterval', finShowInterval.toString());
  }, [finShowInterval, saveToStorage]);

  useEffect(() => {
    saveToStorage('finShowDuration', finShowDuration.toString());
  }, [finShowDuration, saveToStorage]);

  useEffect(() => {
    saveToStorage('sleepEnabled', sleepEnabled.toString());
  }, [sleepEnabled, saveToStorage]);

  useEffect(() => {
    saveToStorage('sleepStart', sleepStart);
  }, [sleepStart, saveToStorage]);

  useEffect(() => {
    saveToStorage('sleepEnd', sleepEnd);
  }, [sleepEnd, saveToStorage]);

  useEffect(() => {
    saveToStorage('verseInterval', verseInterval.toString());
  }, [verseInterval, saveToStorage]);

  useEffect(() => {
    saveToStorage('adhanEnabled', adhanEnabled.toString());
  }, [adhanEnabled, saveToStorage]);

  useEffect(() => {
    saveToStorage('preAdhanAlarmEnabled', preAdhanAlarmEnabled.toString());
  }, [preAdhanAlarmEnabled, saveToStorage]);

  useEffect(() => {
    saveToStorage('preAdhanAlarmDuration', preAdhanAlarmDuration.toString());
  }, [preAdhanAlarmDuration, saveToStorage]);

  useEffect(() => {
    saveToStorage('simulationEnabled', simulationEnabled.toString());
  }, [simulationEnabled, saveToStorage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVerseIndex(prev => (prev + 1) % PRAYER_VERSES.length);
    }, verseInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [verseInterval]);

  useEffect(() => {
    if (bgList.length > 1 && bgInterval > 0) {
      const timer = setInterval(() => {
        setCurrentBgIndex(prev => (prev + 1) % bgList.length);
      }, bgInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [bgList, bgInterval]);

  const playBeep = useCallback((duration = 0.25) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const loadDataFromDB = async () => {
      const adhan = await getData('customAdhan');
      if (adhan instanceof Blob) setCustomAdhanBlob(adhan);
      
      const logo = await getData('mosqueLogo');
      if (logo instanceof Blob) setMosqueLogoBlob(logo);

      // Load downloaded adhan voices
      const adhanBlobs: Record<string, string> = {};
      for (const voice of ADHAN_VOICES) {
        const blob = await getData(`adhan_${voice.id}`);
        if (blob instanceof Blob) {
          adhanBlobs[voice.id] = URL.createObjectURL(blob);
        }
      }
      setDownloadedAdhanBlobs(adhanBlobs);

      // Load custom playlist and blobs
      const saved = localStorage.getItem('customMurottalPlaylist');
      const customPlaylist: MurottalTrack[] = saved ? JSON.parse(saved) : [];
      const fullPlaylist = [...DEFAULT_MUROTTAL_PLAYLIST, ...customPlaylist];
      setPlaylist(fullPlaylist);

      const localTracks: Record<number, Blob> = {};
      for (const track of fullPlaylist) {
        const blob = await getData(`murottal_${track.id}`);
        if (blob instanceof Blob) {
          localTracks[track.id] = blob;
        }
      }
      setDownloadedTracks(localTracks);
    };
    loadDataFromDB();
  }, []);

  useEffect(() => {
    if (!playlist[currentTrackIndex]) return;

    const track = playlist[currentTrackIndex];
    const localBlob = downloadedTracks[track.id];
    let objectUrl = '';

    if (localBlob) {
      objectUrl = URL.createObjectURL(localBlob);
      setMurottalSrc(objectUrl);
    } else {
      setMurottalSrc(track.url);
    }
    
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentTrackIndex, downloadedTracks, playlist]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for logo
        alert("Logo terlalu besar. Maksimal 2MB.");
        return;
      }
      setMosqueLogoBlob(file);
      await setData('mosqueLogo', file);
    }
  };

  useEffect(() => {
    localStorage.setItem('murottalRepeat', playbackMode);
  }, [playbackMode]);

  useEffect(() => {
    localStorage.setItem('murottalShuffle', isShuffle.toString());
  }, [isShuffle]);

  const toggleMurottal = useCallback(() => {
    if (isRemote) {
      sendCommand('toggleMurottal');
      return;
    }
    
    setIsMurottalPlaying(prev => {
      const newState = !prev;
      if (murottalAudioRef.current) {
        if (newState) {
          // Stop adhan if playing
          if (adhanAudioRef.current) {
            adhanAudioRef.current.pause();
            adhanAudioRef.current.currentTime = 0;
          }
          murottalAudioRef.current.play().catch(() => {});
        } else {
          murottalAudioRef.current.pause();
        }
      }
      return newState;
    });
  }, [isRemote, sendCommand]);

  const nextTrack = useCallback(() => {
    if (isRemote) {
      sendCommand('nextTrack');
      return;
    }
    if (playlist.length === 0) return;
    if (isShuffle && playlist.length > 1) {
      let randomIndex = currentTrackIndex;
      // Avoid playing the same track again if possible
      while (randomIndex === currentTrackIndex) {
        randomIndex = Math.floor(Math.random() * playlist.length);
      }
      setCurrentTrackIndex(randomIndex);
    } else {
      setCurrentTrackIndex(prev => (prev + 1) % playlist.length);
    }
    setIsMurottalPlaying(true);
  }, [isShuffle, playlist.length, currentTrackIndex, isRemote, sendCommand]);

  const prevTrack = useCallback(() => {
    if (isRemote) {
      sendCommand('prevTrack');
      return;
    }
    if (playlist.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      setCurrentTrackIndex(randomIndex);
    } else {
      setCurrentTrackIndex(prev => (prev - 1 + playlist.length) % playlist.length);
    }
    setIsMurottalPlaying(true);
  }, [isShuffle, playlist.length, isRemote, sendCommand]);

  useEffect(() => {
    if (isRemote) return; // Don't play audio on remote device
    if (murottalAudioRef.current) {
      murottalAudioRef.current.volume = murottalVolume;
      if (isMurottalPlaying) {
        // Use a small timeout to ensure the src has been updated in the DOM
        const playTimeout = setTimeout(() => {
          if (murottalAudioRef.current && isMurottalPlaying) {
            murottalAudioRef.current.play().catch((err) => {
              console.warn("Playback failed, might need user interaction:", err);
              // Don't immediately set to false, maybe it's just loading
            });
          }
        }, 100);
        return () => clearTimeout(playTimeout);
      } else {
        murottalAudioRef.current.pause();
      }
    }
  }, [murottalSrc, murottalVolume, isMurottalPlaying, isRemote]);

  const handleTrackEnd = () => {
    if (playbackMode === 'one') {
      if (murottalAudioRef.current) {
        murottalAudioRef.current.currentTime = 0;
        murottalAudioRef.current.play().catch(() => {});
      }
    } else if (playbackMode === 'all') {
      nextTrack();
    } else {
      // mode 'off' - play through the playlist once
      if (isShuffle) {
        // In shuffle mode 'off', we just play another random track
        // A true "shuffle once" would need a queue, but this is a good approximation
        nextTrack();
      } else {
        // Sequential mode 'off' - stop after the last track
        if (currentTrackIndex < playlist.length - 1) {
          nextTrack();
        } else {
          setIsMurottalPlaying(false);
        }
      }
    }
  };

  const downloadTrack = async (track: MurottalTrack) => {
    if (downloadingTrackId !== null) return;
    setDownloadingTrackId(track.id);
    try {
      const response = await fetch(track.url).catch(err => {
        throw new Error('Gagal mengakses server audio. Pastikan koneksi internet aktif.');
      });
      
      if (!response.ok) {
        throw new Error(`Gagal mengunduh: ${response.status} ${response.statusText || 'Terjadi kesalahan pada server'}`);
      }
      
      const blob = await response.blob();
      if (blob.size === 0) throw new Error("File yang diunduh kosong.");
      await setData(`murottal_${track.id}`, blob);
      setDownloadedTracks(prev => ({ ...prev, [track.id]: blob }));
    } catch (error) {
      console.error("Download error:", error);
      alert(`Gagal mengunduh murottal: ${error instanceof Error ? error.message : 'Unknown error'}. Pastikan koneksi internet aktif.`);
      // Optionally remove from downloaded tracks if download fails
      setDownloadedTracks(prev => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
    } finally {
      setDownloadingTrackId(null);
    }
  };

  const deleteTrackLocal = async (track: MurottalTrack) => {
    const confirmText = track.isCustom 
      ? `Anda yakin ingin menghapus "${track.title}" secara permanen?`
      : "Hapus file murottal dari penyimpanan offline?";
      
    if (confirm(confirmText)) {
      await deleteData(`murottal_${track.id}`);
      
      if (track.isCustom) {
        setPlaylist(prev => {
          const updatedPlaylist = prev.filter(t => t.id !== track.id);
          const customTracks = updatedPlaylist.filter(t => t.isCustom);
          localStorage.setItem('customMurottalPlaylist', JSON.stringify(customTracks));
          return updatedPlaylist;
        });
      } else {
        setDownloadedTracks(prev => {
          const next = { ...prev };
          delete next[track.id];
          return next;
        });
      }
    }
  };

  const handleAdhanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("File terlalu besar. Maksimal 10MB.");
        return;
      }
      setCustomAdhanBlob(file);
      await setData('customAdhan', file);
      alert("Suara Adzan berhasil disimpan untuk mode offline.");
    }
  };

  const handleMurottalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) { // 20MB limit for custom murottal
      alert("File terlalu besar. Maksimal 20MB.");
      return;
    }

    const newTrack: MurottalTrack = {
      id: Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      reciter: 'File Lokal',
      url: '', // Will be replaced by blob url
      isCustom: true,
    };

    await setData(`murottal_${newTrack.id}`, file);
    
    setDownloadedTracks(prev => ({ ...prev, [newTrack.id]: file }));
    
    setPlaylist(prev => {
      const updatedPlaylist = [...prev, newTrack];
      const customTracks = updatedPlaylist.filter(t => t.isCustom);
      localStorage.setItem('customMurottalPlaylist', JSON.stringify(customTracks));
      return updatedPlaylist;
    });

    setDownloadedTracks(prev => ({...prev, [newTrack.id]: file}));

    alert(`"${newTrack.title}" berhasil ditambahkan.`);
  };

  const stopAdhan = useCallback(() => {
    if (adhanAudioRef.current) {
      adhanAudioRef.current.pause();
      adhanAudioRef.current.currentTime = 0;
    }
  }, []);

  const sendNotification = useCallback((prayerName: string) => {
    if (!notificationsEnabled) return;
    
    if (!("Notification" in window)) {
      console.warn("Browser tidak mendukung notifikasi.");
      return;
    }

    if (Notification.permission === "granted") {
      const options = {
        body: `Waktu shalat ${prayerName} telah tiba.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: 'prayer-time',
        renotify: true
      };

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(`Waktu ${prayerName}`, options);
        });
      } else {
        new Notification(`Waktu ${prayerName}`, options);
      }
    }
  }, [notificationsEnabled]);

  const playAdhan = useCallback((prayerName?: string) => {
    if (isRemote) {
      sendCommand('playAdhanTest', { prayerName });
      return;
    }
    if (prayerName) {
      sendNotification(prayerName);
    }
    
    if (!adhanEnabled || !adhanAudioRef.current || !adhanSrc) {
      console.warn("Adhan skipped: not enabled or source not ready.");
      return;
    }
    
    // Pastikan src sudah terpasang
    adhanAudioRef.current.play().catch(e => {
      console.error("Adhan autoplay blocked or failed:", e);
    });
  }, [adhanEnabled, sendNotification, adhanSrc, isRemote, sendCommand]);

  useEffect(() => {
    handlersRef.current = { playAdhan, toggleMurottal, nextTrack, prevTrack };
  }, [playAdhan, toggleMurottal, nextTrack, prevTrack]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('[WS] Connecting to:', wsUrl);
      
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[WS] Connected to room:', roomId);
        socket?.send(JSON.stringify({ type: 'join', roomId }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Received:', data.type);
          
          if (data.type === 'sync' || data.type === 'update') {
            const payload = data.state || data.payload;
            const parsePayloadValue = (val: any) => {
              if (typeof val === 'string') {
                try {
                  const p = JSON.parse(val);
                  return typeof p === 'object' && p !== null ? p : val;
                } catch (e) {
                  return val;
                }
              }
              return val;
            };

            if (payload.mosqueName !== undefined) setMosqueName(payload.mosqueName);
            if (payload.mosqueAddress !== undefined) setMosqueAddress(payload.mosqueAddress);
            if (payload.marqueeText !== undefined) setMarqueeText(payload.marqueeText);
            if (payload.method !== undefined) setMethod(payload.method);
            if (payload.bgUrls !== undefined) setBgUrls(payload.bgUrls);
            if (payload.bgInterval !== undefined) setBgInterval(payload.bgInterval);
            if (payload.useAutoLocation !== undefined) setUseAutoLocation(payload.useAutoLocation);
            if (payload.latitude !== undefined) setLatitude(payload.latitude);
            if (payload.longitude !== undefined) setLongitude(payload.longitude);
            if (payload.timezone !== undefined) setTimezone(payload.timezone);
            if (payload.hijriAdjustment !== undefined) setHijriAdjustment(payload.hijriAdjustment);
            if (payload.corrections !== undefined) setCorrections(parsePayloadValue(payload.corrections));
            if (payload.imams !== undefined) setImams(parsePayloadValue(payload.imams));
            if (payload.tarawihImam !== undefined) setTarawihImam(payload.tarawihImam);
            if (payload.iqomahDurations !== undefined) setIqomahDurations(parsePayloadValue(payload.iqomahDurations));
            if (payload.iqomahText !== undefined) setIqomahText(payload.iqomahText);
            if (payload.prayerBlankDuration !== undefined) setPrayerBlankDuration(payload.prayerBlankDuration);
            if (payload.finSaldoAwal !== undefined) setFinSaldoAwal(payload.finSaldoAwal);
            if (payload.finPemasukan !== undefined) setFinPemasukan(payload.finPemasukan);
            if (payload.finPengeluaran !== undefined) setFinPengeluaran(payload.finPengeluaran);
            if (payload.finShowInterval !== undefined) setFinShowInterval(payload.finShowInterval);
            if (payload.finShowDuration !== undefined) setFinShowDuration(payload.finShowDuration);
            if (payload.sleepEnabled !== undefined) setSleepEnabled(payload.sleepEnabled);
            if (payload.sleepStart !== undefined) setSleepStart(payload.sleepStart);
            if (payload.sleepEnd !== undefined) setSleepEnd(payload.sleepEnd);
            if (payload.verseInterval !== undefined) setVerseInterval(payload.verseInterval);
            if (payload.adhanEnabled !== undefined) setAdhanEnabled(payload.adhanEnabled);
            if (payload.preAdhanAlarmEnabled !== undefined) setPreAdhanAlarmEnabled(payload.preAdhanAlarmEnabled);
            if (payload.preAdhanAlarmDuration !== undefined) setPreAdhanAlarmDuration(payload.preAdhanAlarmDuration);
            if (payload.simulationEnabled !== undefined) setSimulationEnabled(payload.simulationEnabled);
            if (payload.murottalVolume !== undefined) setMurottalVolume(payload.murottalVolume);
            if (payload.isMurottalPlaying !== undefined) setIsMurottalPlaying(payload.isMurottalPlaying);
            if (payload.currentTrackIndex !== undefined) setCurrentTrackIndex(payload.currentTrackIndex);
            if (payload.playbackMode !== undefined) setPlaybackMode(payload.playbackMode);
            if (payload.isShuffle !== undefined) setIsShuffle(payload.isShuffle);
            if (payload.appState !== undefined) setAppState(payload.appState);
          } else if (data.type === 'command') {
            console.log('[WS] Command received:', data.command);
            if (data.command === 'playAdhanTest') {
              handlersRef.current.playAdhan('Simulasi');
            } else if (data.command === 'toggleMurottal') {
              handlersRef.current.toggleMurottal();
            } else if (data.command === 'nextTrack') {
              handlersRef.current.nextTrack();
            } else if (data.command === 'prevTrack') {
              handlersRef.current.prevTrack();
            }
          }
        } catch (e) {
          console.error('[WS] Error parsing message:', e);
        }
      };

      socket.onclose = (e) => {
        console.log('[WS] Socket closed, reconnecting in 3s...', e.reason);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('[WS] Socket error:', err);
        socket?.close();
      };
    };

    connect();

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [roomId]);

  // Effect untuk mengatur sumber audio adzan agar selalu siap
  useEffect(() => {
    let audioUrl = '';
    let isObjectUrl = false;

    if (customAdhanBlob) {
      audioUrl = URL.createObjectURL(customAdhanBlob);
      isObjectUrl = true;
    } else if (downloadedAdhanBlobs[selectedAdhanVoice]) {
      audioUrl = downloadedAdhanBlobs[selectedAdhanVoice];
    } else {
      const voice = ADHAN_VOICES.find(v => v.id === selectedAdhanVoice) || ADHAN_VOICES[0];
      if (voice) audioUrl = voice.url;
    }

    if (audioUrl) {
      setAdhanSrc(audioUrl);
    }

    return () => {
      if (isObjectUrl && audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [selectedAdhanVoice, downloadedAdhanBlobs, customAdhanBlob]);

  useEffect(() => {
    if (!prayerTimes || Object.keys(prayerTimes).length === 0) return;
    
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${h}:${m}`;
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // Reset lastTriggeredPrayer at midnight
    if (h === '00' && m === '00') {
      if (lastTriggeredPrayer !== null) setLastTriggeredPrayer(null);
      if (lastTriggeredAlarm !== null) setLastTriggeredAlarm(null);
    }

    // 1. Sleep Mode Check (Highest Priority)
    if (sleepEnabled) {
      const [sH, sM] = sleepStart.split(':').map(Number);
      const [eH, eM] = sleepEnd.split(':').map(Number);
      const startSec = sH * 3600 + sM * 60;
      const endSec = eH * 3600 + eM * 60;
      
      let isSleep = false;
      if (startSec < endSec) {
        isSleep = currentSeconds >= startSec && currentSeconds < endSec;
      } else {
        // Over midnight
        isSleep = currentSeconds >= startSec || currentSeconds < endSec;
      }

      if (isSleep) {
        if (appState !== 'sleep') {
          setAppState('sleep');
          stopAdhan();
        }
        return;
      } else if (appState === 'sleep') {
        setAppState('normal');
      }
    }

    if (appState !== 'normal') return;

    // Pre-Adhan Alarm Check
    if (preAdhanAlarmEnabled) {
      for (const prayer of OBLIGATORY_PRAYERS) {
        const prayerTime = prayerTimes[prayer]?.split(' ')[0];
        if (prayerTime) {
          const [pH, pM] = prayerTime.split(':').map(Number);
          const prayerSec = pH * 3600 + pM * 60;
          const alarmSec = prayerSec - (preAdhanAlarmDuration * 60);
          
          if (currentSeconds >= alarmSec && currentSeconds < alarmSec + 60) {
            const alarmKey = `${prayer}_alarm_${now.toDateString()}`;
            if (lastTriggeredAlarm !== alarmKey) {
              playBeep(1.0);
              setLastTriggeredAlarm(alarmKey);
            }
          }
        }
      }
    }

    for (const prayer of OBLIGATORY_PRAYERS) {
      const prayerTime = prayerTimes[prayer]?.split(' ')[0];
      if (currentTimeStr === prayerTime && lastTriggeredPrayer !== `${prayer}_${now.toDateString()}`) {
        setAppState('iqomah');
        setActivePrayer(prayer);
        setIqomahTimeLeft(iqomahDurations[prayer] * 60);
        setLastTriggeredPrayer(`${prayer}_${now.toDateString()}`);
        playAdhan(prayer);
        break;
      }
    }
  }, [now, prayerTimes, appState, iqomahDurations, timezone, sleepEnabled, sleepStart, sleepEnd, lastTriggeredPrayer, playAdhan]);

  const [blankEndTime, setBlankEndTime] = useState<number | null>(null);

  useEffect(() => {
    if (appState !== 'iqomah') return;
    
    // Jika waktu iqomah sudah habis saat masuk state ini
    if (iqomahTimeLeft <= 0) {
      const duration = Number(prayerBlankDuration) || 10;
      const endTime = Date.now() + (duration * 60 * 1000);
      setBlankEndTime(endTime);
      setAppState('blank');
      return;
    }

    const timer = setInterval(() => {
      setIqomahTimeLeft(prev => {
        const next = prev - 1;
        
        if (next <= 0) {
          clearInterval(timer);
          const duration = Number(prayerBlankDuration) || 10;
          const endTime = Date.now() + (duration * 60 * 1000);
          setBlankEndTime(endTime);
          setAppState('blank');
          return 0;
        }

        if (next <= 3) {
          playBeep(1.5); // Beep panjang untuk detik 3, 2, 1
        } else if (next === 4 || next === 5) {
          playBeep(0.25); // Beep pendek untuk detik 5 dan 4
        }
        
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [appState, prayerBlankDuration, playBeep]);

  useEffect(() => {
    if (appState !== 'blank') {
      if (blankEndTime !== null) setBlankEndTime(null);
      return;
    }

    const checkBlank = () => {
      if (!blankEndTime) return;
      const nowMs = Date.now();
      if (nowMs >= blankEndTime) {
        setAppState('normal');
        setBlankEndTime(null);
      } else {
        setBlankTimeLeft(Math.ceil((blankEndTime - nowMs) / 1000));
      }
    };

    checkBlank();
    const timer = setInterval(checkBlank, 1000);
    return () => clearInterval(timer);
  }, [appState, blankEndTime]);

  useEffect(() => {
    if (!prayerTimes || Object.keys(prayerTimes).length === 0) return;
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let found = false;
    for (const name of OBLIGATORY_PRAYERS) {
      if (!prayerTimes[name]) continue;
      const pTime = prayerTimes[name].split(' ')[0];
      const pSec = timeToSeconds(pTime);
      if (pSec > currentSeconds) {
        setNextPrayer({ name, time: pTime, diff: pSec - currentSeconds });
        found = true; break;
      }
    }
    if (!found && prayerTimes['Fajr']) {
      const fTime = prayerTimes['Fajr'].split(' ')[0];
      const sSec = timeToSeconds(fTime) + 86400;
      setNextPrayer({ name: 'Fajr', time: fTime, diff: sSec - currentSeconds });
    }
  }, [now, prayerTimes]);

  useEffect(() => {
    if (finShowInterval <= 0 || finShowDuration <= 0) return;
    
    const totalCycleMinutes = finShowInterval + finShowDuration;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const cyclePos = currentMinutes % totalCycleMinutes;
    
    // Only trigger on minute change to allow manual override
    if (currentMinutes !== lastFinCycleRef.current) {
      lastFinCycleRef.current = currentMinutes;
      
      if (cyclePos === 0) {
        if (!showFinPanel && appState === 'normal') {
          setShowFinPanel(true);
        }
      } else if (cyclePos === finShowDuration) {
        if (showFinPanel) {
          setShowFinPanel(false);
        }
      }
    }
  }, [now, finShowInterval, finShowDuration, appState, showFinPanel]);

  const toggleFullScreen = () => {
    const doc = document.documentElement as any;
    const d = document as any;
    
    const isCurrentlyFullscreen = !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement);

    if (!isCurrentlyFullscreen) {
      if (doc.requestFullscreen) {
        doc.requestFullscreen().catch((err: any) => console.error(err));
      } else if (doc.webkitRequestFullscreen) {
        doc.webkitRequestFullscreen();
      } else if (doc.mozRequestFullScreen) {
        doc.mozRequestFullScreen();
      } else if (doc.msRequestFullscreen) {
        doc.msRequestFullscreen();
      }
    } else {
      if (d.exitFullscreen) {
        d.exitFullscreen();
      } else if (d.webkitExitFullscreen) {
        d.webkitExitFullscreen();
      } else if (d.mozCancelFullScreen) {
        d.mozCancelFullScreen();
      } else if (d.msExitFullscreen) {
        d.msExitFullscreen();
      }
    }
  };

  const dynamicMarquee = useMemo(() => {
    return marqueeText;
  }, [marqueeText]);

  if (loading && !prayerTimes) return (
    <div className="flex flex-col items-center justify-center min-h-full bg-black text-white">
      <RefreshCw className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
      <p className="text-[#facc15] font-black text-xl md:text-2xl uppercase tracking-[0.3em] text-center px-4">Menghubungkan Server...</p>
    </div>
  );

  const remoteUrl = useMemo(() => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('remote', 'true');
    url.searchParams.set('roomId', roomId);
    return url.toString();
  }, [roomId]);

  const iqomahUI = appState === 'iqomah' ? (() => {
    const min = Math.floor(iqomahTimeLeft / 60);
    const sec = iqomahTimeLeft % 60;
    const isUrgent = iqomahTimeLeft <= 120;
    const imamName = activePrayer ? imams[activePrayer] : '-';

    return (
      <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-1000 ${isUrgent ? 'bg-red-950/40' : ''}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,78,59,0.15)_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
        
        {/* Adhan Stop Button */}
        {adhanEnabled && (
          <button 
            onClick={stopAdhan}
            className="absolute top-10 right-10 z-50 p-4 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 text-white/50 hover:text-white transition-all flex items-center gap-2 group"
          >
            <VolumeX size={24} />
            <span className="text-xs font-black uppercase opacity-0 group-hover:opacity-100 transition-all">Matikan Adzan</span>
          </button>
        )}

        <div className="z-10 text-center space-y-4 md:space-y-8 px-6 flex flex-col items-center justify-center w-full max-w-7xl">
          <div className="flex flex-col items-center gap-2 md:gap-4">
             <h2 className="text-3xl md:text-6xl font-black text-emerald-400 uppercase tracking-[0.3em] italic">Menanti Iqomah</h2>
             <div className="h-1.5 md:h-2 w-20 md:w-40 bg-[#facc15] rounded-full" />
          </div>
          <div className={`text-7xl md:text-[18rem] font-black tabular-nums leading-none tracking-tighter ${isUrgent ? 'text-rose-500 animate-pulse' : 'text-[#facc15]'}`}>
            {min}:{sec.toString().padStart(2, '0')}
          </div>

          {activePrayer && (
            <div className="flex flex-col items-center gap-1 -mt-4 md:-mt-10 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <span className="text-emerald-400 text-[10px] md:text-xl font-black uppercase tracking-widest">Imam {DISPLAY_NAMES[activePrayer]}</span>
               <span className="text-white text-xl md:text-5xl font-black uppercase italic drop-shadow-lg">{imamName}</span>
            </div>
          )}
        </div>
      </div>
    );
  })() : null;

  return (
    <div className="relative w-full h-full bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      {isRemote ? (
        <div className="h-full overflow-y-auto bg-emerald-950 text-white font-sans p-4 space-y-6 pb-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#facc15] rounded-full flex items-center justify-center text-emerald-950">
                <Smartphone size={24} />
              </div>
              <div>
                <h1 className="text-lg font-black uppercase italic leading-none">Remote JWS</h1>
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">{mosqueName}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.href = window.location.origin}
              className="p-2 bg-white/10 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          {/* Running Text Control */}
          <div className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-4">
            <h2 className="text-xs font-black uppercase text-[#facc15] flex items-center gap-2 italic">
              <Menu size={16} /> Running Text
            </h2>
            <textarea 
              value={marqueeText}
              onChange={(e) => setMarqueeText(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:border-[#facc15] outline-none h-24"
              placeholder="Ketik pesan di sini..."
            />
          </div>

          {/* Murottal Control */}
          <div className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-6">
            <h2 className="text-xs font-black uppercase text-[#facc15] flex items-center gap-2 italic">
              <Music size={16} /> Murottal Player
            </h2>
            
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-xs font-black text-white uppercase truncate max-w-[200px]">
                  {playlist[currentTrackIndex]?.title || 'Tidak ada lagu'}
                </p>
                <p className="text-[10px] text-white/40 uppercase font-bold">
                  {playlist[currentTrackIndex]?.reciter || '-'}
                </p>
              </div>

              <div className="flex items-center gap-8">
                <button 
                  onClick={prevTrack}
                  className="p-3 bg-white/5 rounded-full text-white active:scale-90 transition-all"
                >
                  <SkipBack size={24} />
                </button>
                <button 
                  onClick={toggleMurottal}
                  className="w-16 h-16 bg-[#facc15] rounded-full flex items-center justify-center text-emerald-950 shadow-xl active:scale-95 transition-all"
                >
                  {isMurottalPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>
                <button 
                  onClick={nextTrack}
                  className="p-3 bg-white/5 rounded-full text-white active:scale-90 transition-all"
                >
                  <SkipForward size={24} />
                </button>
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center gap-3">
                  <Volume2 size={16} className="text-white/40" />
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={murottalVolume}
                    onChange={(e) => setMurottalVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-[#facc15]"
                  />
                  <span className="text-[10px] font-black text-white/40 w-8">{Math.round(murottalVolume * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => playAdhan('Simulasi')}
              className="bg-emerald-800/50 p-6 rounded-3xl border border-emerald-400/20 flex flex-col items-center gap-3 active:scale-95 transition-all"
            >
              <Zap className="text-[#facc15]" size={24} />
              <span className="text-[10px] font-black uppercase text-white">Tes Adzan</span>
            </button>
            <button 
              onClick={() => setPreAdhanAlarmEnabled(!preAdhanAlarmEnabled)}
              className={`${preAdhanAlarmEnabled ? 'bg-[#facc15] text-emerald-950' : 'bg-black/30 text-white'} p-6 rounded-3xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-all`}
            >
              <BellRing size={24} />
              <span className="text-[10px] font-black uppercase">Alarm Pra-Adzan</span>
            </button>
            <button 
              onClick={() => setAppState(appState === 'sleep' ? 'normal' : 'sleep')}
              className={`${appState === 'sleep' ? 'bg-[#facc15] text-emerald-950' : 'bg-black/30 text-white'} p-6 rounded-3xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-all`}
            >
              <Clock size={24} />
              <span className="text-[10px] font-black uppercase">{appState === 'sleep' ? 'Bangunkan' : 'Mode Tidur'}</span>
            </button>
          </div>

          <div className="text-center py-4">
            <p className="text-[8px] text-white/20 uppercase font-black tracking-[0.3em]">JWS Remote Control v1.0</p>
          </div>

          {/* Bottom Nav for Remote */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-emerald-950/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center">
            <button className="flex flex-col items-center gap-1 text-[#facc15]">
              <Smartphone size={20} />
              <span className="text-[8px] font-black uppercase">Utama</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="flex flex-col items-center gap-1 text-white/40"
            >
              <Settings size={20} />
              <span className="text-[8px] font-black uppercase">Setting</span>
            </button>
          </div>
        </div>
      ) : appState === 'sleep' ? (
        <div 
          onClick={() => setAppState('normal')}
          className="w-full h-full bg-black flex items-center justify-center cursor-pointer transition-all duration-1000"
        >
          <div className="text-white/20 text-[10px] absolute bottom-4 right-4 uppercase tracking-[0.5em] font-black">Smart Power: Sleep Mode (Klik untuk Bangun)</div>
        </div>
      ) : appState === 'blank' ? (
        <div 
          onClick={() => setAppState('normal')}
          className="w-full h-full bg-black flex items-center justify-center cursor-pointer transition-all duration-1000"
        >
          <div className="text-white/40 text-xs md:text-sm absolute bottom-10 right-10 uppercase tracking-[0.5em] font-black animate-pulse">Mode Shalat Sedang Berlangsung</div>
          <div className="text-white/10 text-[8px] absolute bottom-4 right-10 uppercase tracking-widest font-bold">(Klik untuk keluar paksa)</div>
        </div>
      ) : (
        <React.Fragment>
          {/* Financial Panel Overlay */}
      <div className={`fixed top-[15%] left-0 z-[100] w-full max-w-[280px] md:max-w-sm transition-all duration-1000 ${showFinPanel ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="bg-emerald-950/40 backdrop-blur-[10px] border-r-4 md:border-r-8 border-y-4 md:border-y-8 border-[#facc15] rounded-r-[1.5rem] md:rounded-r-[2.5rem] p-4 md:p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 md:mb-5 border-b border-white/20 pb-4">
               <div className="bg-[#facc15] p-2 rounded-xl"><Wallet className="text-emerald-950 w-5 h-5 md:w-6 md:h-6" /></div>
               <h4 className="text-lg md:text-xl font-black text-white uppercase">Keuangan</h4>
               <button onClick={() => setShowFinPanel(false)} className="ml-auto text-white/50"><X size={18}/></button>
            </div>
            <div className="space-y-3 md:space-y-4">
               <div className="flex justify-between items-center"><span className="text-white/70 font-bold uppercase text-[8px] md:text-[9px] tracking-widest">Awal</span><span className="text-xs md:text-sm font-black">{formatCurrency(finSaldoAwal)}</span></div>
               <div className="flex justify-between items-center"><span className="text-emerald-400 font-bold uppercase text-[8px] md:text-[9px] tracking-widest">Masuk</span><span className="text-sm md:text-base font-black text-emerald-400">+{formatCurrency(finPemasukan)}</span></div>
               <div className="flex justify-between items-center"><span className="text-rose-400 font-bold uppercase text-[8px] md:text-[9px] tracking-widest">Keluar</span><span className="text-sm md:text-base font-black text-rose-400">-{formatCurrency(finPengeluaran)}</span></div>
               <div className="mt-4 md:mt-6 pt-4 md:pt-5 border-t-2 border-dashed border-white/10 flex flex-col items-center">
                  <span className="text-[8px] md:text-[9px] font-black text-[#facc15] uppercase tracking-widest mb-1">Total Saldo</span>
                  <span className="text-2xl md:text-3xl font-black">{formatCurrency(finSaldoAkhir)}</span>
               </div>
            </div>
         </div>
      </div>

      <header className="relative z-20 flex flex-row h-[10%] md:h-[12%] bg-emerald-900 border-y-2 md:border-y-4 border-[#facc15] shadow-2xl overflow-hidden shrink-0">
        <div className="w-[32%] md:w-[25%] flex flex-col justify-center px-3 md:px-8 border-r border-white/10 bg-black/20 shrink-0 items-start">
          <div className="text-[10px] md:text-xl font-black uppercase text-white tracking-tight leading-none truncate">
            {now.toLocaleDateString('id-ID', { weekday: 'long', timeZone: timezone })}
          </div>
          <div className="text-[8px] md:text-sm font-bold text-emerald-200 uppercase tracking-wide mt-1 truncate">
            {now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: timezone })}
          </div>
          <div className="text-[8px] md:text-base font-bold text-[#facc15] truncate mt-1">
            {hijriDate || "Memuat Hijriah..."}
          </div>
        </div>
                <div className="flex-1 flex items-center px-4 md:px-12 shrink-0 overflow-hidden">
          <div className="bg-[#facc15] p-[1px] rounded-full mr-2 md:mr-5 shrink-0 overflow-hidden">
             <div className="w-8 h-8 md:w-16 md:h-16 bg-emerald-950 rounded-full flex items-center justify-center overflow-hidden">
               {mosqueLogoBlob ? (
                 <img src={URL.createObjectURL(mosqueLogoBlob)} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 <img 
                   src={`/logo-default.png?v=${new Date().getTime()}`} 
                   alt="Logo" 
                   className="w-full h-full object-cover"
                   onError={(e) => {
                     (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Masjid&background=064e3b&color=facc15&size=512&bold=true";
                   }}
                 />
               )}
             </div>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs md:text-3xl font-serif italic font-black text-white tracking-tight leading-none truncate">{mosqueName}</h1>
            <p className="text-[7px] md:text-xs font-bold text-emerald-100 uppercase tracking-wide mt-0.5 truncate">{mosqueAddress}</p>
          </div>
        </div>
        <div 
          className="w-[22%] md:w-[20%] flex flex-col items-center justify-center px-2 md:px-0 border-l border-white/10 bg-black/40 relative shrink-0"
          onMouseEnter={() => setShowHeaderControls(true)}
          onMouseLeave={() => setShowHeaderControls(false)}
          onClick={() => setShowHeaderControls(prev => !prev)}
        >
          <div className="text-[10px] md:text-xl font-black uppercase text-white tracking-tight leading-none truncate mb-1">Royan_Ubay</div>
          <div className="flex items-baseline gap-1 text-sm md:text-4xl font-black tabular-nums text-[#facc15] leading-none">
            {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: timezone })}
          </div>
          <div className={`flex gap-2 absolute top-2 right-2 transition-all ${showHeaderControls ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }} className="p-2 bg-emerald-800/90 rounded-md hover:bg-[#facc15] hover:text-black">
              {isFullscreen ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowFinPanel(!showFinPanel); }} className="p-2 bg-emerald-800/90 rounded-md hover:bg-[#facc15] hover:text-black">
              <Wallet size={16}/>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowMurottalPlayer(!showMurottalPlayer); }} className={`p-2 rounded-md transition-all ${showMurottalPlayer ? 'bg-[#facc15] text-black' : 'bg-emerald-800/90 hover:bg-[#facc15] hover:text-black'}`}>
              <Music size={16}/>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className="p-2 bg-emerald-800/90 rounded-md hover:bg-[#facc15] hover:text-black" title="Pengaturan">
              <Settings size={16}/>
            </button>
            {simulationEnabled && (
              <button 
                onClick={(e) => { e.stopPropagation();
                  setAppState('iqomah');
                  setActivePrayer('Maghrib');
                  setIqomahTimeLeft(iqomahDurations['Maghrib'] * 60); 
                  playAdhan('Maghrib'); // Trigger adhan for testing
                }} 
                className="p-2 bg-amber-600/90 rounded-md hover:bg-white hover:text-black"
                title="Simulasi Iqomah & Adzan"
              >
                <Zap size={16}/>
              </button>
            )}
            {deferredPrompt && (
              <button onClick={handleInstall} className="p-1 md:p-1.5 bg-[#facc15] text-black rounded-md hover:bg-white flex items-center gap-1">
                <Upload size={12} className="md:w-4 md:h-4"/>
                <span className="text-[8px] font-bold uppercase">Install</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="absolute top-[10%] md:top-[12%] left-0 right-0 bottom-0 z-0 overflow-hidden bg-emerald-950">
        {bgList.map((url, idx) => (
          <div 
            key={idx} 
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2500ms] ${idx === currentBgIndex ? 'opacity-100' : 'opacity-0'}`} 
            style={{ backgroundImage: `url('${downloadedBgs[url] || url}')` }} 
          >
            <img 
              src={downloadedBgs[url] || url} 
              className="hidden" 
              onError={(e) => {
                // If image fails, fallback to default
                const target = e.target as HTMLImageElement;
                if (target.src !== DEFAULT_BGS[0]) {
                  setBgUrls(DEFAULT_BGS.join('\n'));
                }
              }}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 z-[1]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {iqomahUI}
        
        {/* Quran Verse Section */}
        {!iqomahUI && (
          <div className="flex-1 flex items-center justify-center px-6 md:px-20 py-4">
             <div key={currentVerseIndex} className="max-w-5xl text-center space-y-4 md:space-y-8 animate-in fade-in zoom-in duration-1000">
                <p className="text-xl md:text-4xl lg:text-5xl font-arabic text-white leading-relaxed md:leading-[1.6] drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
                  {PRAYER_VERSES[currentVerseIndex].arabic}
                </p>
                <div className="my-4 md:my-6 flex items-center justify-center gap-4">
                  <div className="h-1 md:h-1.5 flex-1 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent"></div>
                  <Star size={24} className="text-yellow-400 shrink-0" />
                  <div className="h-1 md:h-1.5 flex-1 bg-gradient-to-l from-transparent via-yellow-400/80 to-transparent"></div>
                </div>
                <div className="space-y-2 md:space-y-4">
                  <p className="text-[10px] md:text-xl lg:text-2xl font-bold text-yellow-400 italic tracking-tight drop-shadow-md leading-relaxed max-w-4xl mx-auto">
                    "{PRAYER_VERSES[currentVerseIndex].translation}"
                  </p>
                  <div className="flex items-center justify-center gap-2 md:gap-4">
                    <div className="h-px w-8 md:w-16 bg-emerald-500/50"></div>
                    <p className="text-[7px] md:text-sm font-black text-white uppercase tracking-[0.2em] md:tracking-[0.4em]">
                      {PRAYER_VERSES[currentVerseIndex].reference}
                    </p>
                    <div className="h-px w-8 md:w-16 bg-emerald-500/50"></div>
                  </div>
                </div>
             </div>
          </div>
        )}

        {!iqomahUI && (
          <React.Fragment>
          <div className="flex flex-col justify-end md:justify-end pb-3 md:pb-6 pt-8 md:pt-0">
            <div className="flex flex-row justify-between items-end px-3 md:px-6 mb-1 md:mb-2 gap-2">
            <div className="flex flex-col gap-1 md:gap-2">
              <div className="bg-emerald-900/70 backdrop-blur-3xl px-2 md:px-5 py-2.5 md:py-4 rounded-lg border-t border-emerald-400/50 border-b-2 md:border-b-[4px] border-emerald-950 flex items-center gap-2">
                <User className="text-[#facc15] w-3 h-3 md:w-5 md:h-5" />
                <div className="flex flex-col leading-none">
                  <span className="text-[6px] md:text-[9px] uppercase text-emerald-300 font-bold tracking-widest no-wrap">Nama Imam</span>
                  <span className="text-white uppercase tracking-tighter text-[8px] md:text-lg font-black truncate max-w-[100px] md:max-w-[200px]">{nextPrayer ? imams[nextPrayer.name] : '-'}</span>
                </div>
              </div>
              <div className="bg-emerald-900/70 backdrop-blur-3xl px-2 md:px-5 py-3 md:py-5 rounded-lg border-t border-emerald-400/50 border-b-2 md:border-b-[4px] border-emerald-950 flex items-center gap-2">
                <Clock className="text-[#facc15] w-3 h-3 md:w-6 md:h-6 animate-pulse" />
                <div className="flex flex-col gap-0.5 md:gap-1.5">
                  <span className="text-[8px] md:text-[14px] uppercase text-emerald-300 font-bold tracking-widest no-wrap">Shalat Selanjutnya</span>
                  <span className="text-[#facc15] uppercase tracking-tighter flex items-center gap-1 text-[12px] md:text-3xl no-wrap">{DISPLAY_NAMES[nextPrayer?.name || 'Fajr']}<span className="tabular-nums text-white">-{secondsToHms(nextPrayer?.diff || 0)}</span></span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-b from-[#fde047] to-[#facc15] px-2 md:px-4 py-2.5 md:py-4 rounded-lg border-t border-white/50 border-b-2 md:border-b-[4px] border-[#a16207] text-black flex items-center gap-1.5">
              <span className="text-[7px] md:text-xl font-black uppercase tracking-tighter truncate max-w-[80px] md:max-w-none">{phbi.name}</span>
              <span className="bg-black/15 px-1.5 py-0.5 rounded-md text-[8px] md:text-lg font-black shrink-0">{phbi.days} <span className="text-[5px] md:text-xs font-bold">HARI</span></span>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 md:gap-2.5 px-3 md:px-6 h-[80px] md:h-[14vh] shrink-0 items-end">
            {DISPLAY_GRID_NAMES.map((name, idx) => {
              const timeStr = prayerTimes?.[name]?.split(' ')[0] || "--:--";
              const isActive = nextPrayer?.name === name;
              const theme = PRAYER_THEMES[name];
              
              return (
                <div key={name} className={`flex flex-col rounded-md md:rounded-xl overflow-hidden shadow-2xl border-t border-white/10 border-b-2 md:border-b-[5px] border-black/30 transition-all duration-700 bg-gradient-to-b ${theme.bg} ${isActive ? 'ring-2 md:ring-4 ring-[#facc15] scale-105 -translate-y-1 md:-translate-y-2 z-20' : 'z-10'}`}>
                  <div className="h-[30%] flex items-center justify-center bg-white/10 border-b border-white/5 py-0.5">
                     <span className="text-[6px] md:text-sm font-black uppercase text-white truncate px-0.5">{DISPLAY_NAMES[name]}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center py-1 md:py-0">
                     <span className="text-[10px] md:text-2xl lg:text-3xl font-black tabular-nums text-white leading-none">{timeStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </React.Fragment>
      )}
      </div>

      {!iqomahUI && (
        <footer className="relative z-10 bg-emerald-950 h-8 md:h-[7vh] flex items-center border-y-2 md:border-y-4 border-[#facc15] overflow-hidden shrink-0">
          <div className="flex items-center whitespace-nowrap animate-marquee-jws-ultra w-max">
            <div className="flex items-center">
              <span className="text-[10px] md:text-2xl font-black text-white px-10 md:px-20 uppercase italic tracking-widest">{dynamicMarquee}</span>
              <span className="text-[#facc15] text-sm md:text-4xl font-bold mx-4 md:mx-6">✦</span>
            </div>
            <div className="flex items-center">
              <span className="text-[10px] md:text-2xl font-black text-white px-10 md:px-20 uppercase italic tracking-widest">{dynamicMarquee}</span>
              <span className="text-[#facc15] text-sm md:text-4xl font-bold mx-4 md:mx-6">✦</span>
            </div>
          </div>
        </footer>
      )}
      </React.Fragment>
    )}

      {/* Complex Tabbed Settings Modal - Full Screen Mobile */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-0 md:p-6 overflow-hidden">
           <div className="bg-emerald-950 border-0 md:border-8 border-[#facc15] w-full h-full md:max-w-7xl md:max-h-[92vh] md:rounded-[3rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(250,204,21,0.2)]">
              {/* Header */}
              <div className="p-4 md:p-8 border-b-2 border-white/10 flex justify-between items-center bg-emerald-900/20">
                <div className="flex items-center gap-2 md:gap-4">
                  <Settings className="w-6 h-6 md:w-10 md:h-10 text-[#facc15] animate-[spin_4s_linear_infinite]" />
                  <h3 className="text-lg md:text-4xl font-black text-white uppercase italic">Konfigurasi</h3>
                  {isSaving && (
                    <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                      <RefreshCw size={12} className="animate-spin text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Menyimpan...</span>
                    </div>
                  )}
                </div>
                <button onClick={() => { loadData(); setShowSettings(false); }} className="bg-red-600 hover:bg-red-500 text-white w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg border-b-2 md:border-b-4 border-red-900"><X size={24}/></button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Tabs Sidebar / Top Scrollbar on Mobile */}
                <div className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-2 md:p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto custom-scrollbar shrink-0">
                  <TabButton id="masjid" active={settingsTab === 'masjid'} icon={<MapPin size={18}/>} label="Masjid" onClick={setSettingsTab} />
                  <TabButton id="waktu" active={settingsTab === 'waktu'} icon={<SlidersHorizontal size={18}/>} label="Waktu" onClick={setSettingsTab} />
                  <TabButton id="iqomah" active={settingsTab === 'iqomah'} icon={<Timer size={18}/>} label="Iqomah" onClick={setSettingsTab} />
                  <TabButton id="petugas" active={settingsTab === 'petugas'} icon={<Users size={18}/>} label="Petugas" onClick={setSettingsTab} />
                  <TabButton id="keuangan" active={settingsTab === 'keuangan'} icon={<Wallet size={18}/>} label="Keuangan" onClick={setSettingsTab} />
                  <TabButton id="media" active={settingsTab === 'media'} icon={<ImageIcon size={18}/>} label="Media" onClick={setSettingsTab} />
                  <TabButton id="murottal" active={settingsTab === 'murottal'} icon={<Music size={18}/>} label="Murottal" onClick={setSettingsTab} />
                  <TabButton id="remote" active={settingsTab === 'remote'} icon={<Smartphone size={18}/>} label="Remote" onClick={setSettingsTab} />
                  <TabButton id="sistem" active={settingsTab === 'sistem'} icon={<Globe size={18}/>} label="Sistem" onClick={setSettingsTab} />
                  <div className="mt-auto p-4 border-t border-white/10 hidden md:block">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${swStatus === 'ready' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        {swStatus === 'ready' ? 'Offline Ready' : 'Online Only'}
                      </span>
                    </div>
                    <p className="text-[8px] text-white/30 leading-tight">Aplikasi tersimpan di cache browser untuk penggunaan tanpa internet.</p>
                  </div>
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 p-4 md:p-10 overflow-y-auto custom-scrollbar bg-emerald-900/5">
                  {settingsTab === 'masjid' && (
                    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <RefinedInput label="Nama Masjid/Musholla" value={mosqueName} onChange={setMosqueName} placeholder="Contoh: Masjid Agung Al-Hidayah" />
                        <RefinedInput label="Alamat / Deskripsi" value={mosqueAddress} onChange={setMosqueAddress} placeholder="Contoh: Cikarang Timur, Bekasi" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <div className="p-4 md:p-6 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                          <label className="text-[10px] uppercase font-black text-emerald-400 mb-2 md:mb-4 block">Logo Masjid</label>
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 md:w-24 md:h-24 bg-black/40 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                              {mosqueLogoBlob ? (
                                <img src={URL.createObjectURL(mosqueLogoBlob)} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <img src={`/logo-default.png?v=${new Date().getTime()}`} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Masjid&background=064e3b&color=facc15&size=512&bold=true"; }} />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <button 
                                onClick={() => logoFileInputRef.current?.click()}
                                className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] md:text-xs uppercase flex items-center justify-center gap-2"
                              >
                                <Upload size={14} /> Pilih Logo
                              </button>
                              <input 
                                type="file" 
                                ref={logoFileInputRef} 
                                onChange={handleLogoUpload} 
                                accept="image/*" 
                                className="hidden" 
                              />
                              {mosqueLogoBlob && (
                                <button 
                                  onClick={async () => {
                                    setMosqueLogoBlob(null);
                                    await deleteData('mosqueLogo');
                                  }}
                                  className="w-full py-2 bg-rose-900/50 hover:bg-rose-900 text-rose-200 rounded-lg font-bold text-[10px] md:text-xs uppercase"
                                >
                                  Hapus Logo
                                </button>
                              )}
                              <p className="text-[8px] text-white/30 italic">Format: JPG/PNG, Maks: 2MB</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 md:p-6 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3 md:gap-4">
                            <MapPin className={`${useAutoLocation ? 'text-emerald-400 animate-pulse' : 'text-[#facc15]'}`} size={24}/>
                            <div>
                              <h4 className="text-white font-black text-sm md:text-lg leading-tight">Deteksi Lokasi</h4>
                              <p className="text-white/50 text-[10px] md:text-xs">
                                {useAutoLocation && detectedCity ? (
                                  <span className="text-emerald-400 font-bold">Terdeteksi: {detectedCity}</span>
                                ) : (
                                  "Gunakan GPS otomatis."
                                )}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const next = !useAutoLocation;
                              setUseAutoLocation(next);
                              if (next) {
                                refreshLocation();
                              }
                            }} 
                            className={`w-12 h-6 md:w-16 md:h-8 rounded-full transition-all relative ${useAutoLocation ? 'bg-emerald-500' : 'bg-white/20'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 md:w-6 md:h-6 bg-white rounded-full transition-all ${useAutoLocation ? 'left-7 md:left-9' : 'left-1'}`} />
                          </button>
                        </div>
                        {!useAutoLocation && (
                          <div className="p-4 md:p-6 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <RefinedInput label="Latitude" type="number" value={latitude} onChange={(v) => setLatitude(Number(v))} />
                            <RefinedInput label="Longitude" type="number" value={longitude} onChange={(v) => setLongitude(Number(v))} />
                          </div>
                        )}
                        <div className="p-4 md:p-6 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                          <label className="text-[10px] uppercase font-black text-emerald-400 mb-2 md:mb-4 block">Zona Waktu</label>
                          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full bg-black/60 border-2 border-white/10 rounded-xl md:rounded-2xl px-4 py-2 md:px-6 md:py-4 text-white font-bold text-sm outline-none focus:border-[#facc15]">
                            <option value="Asia/Jakarta">WIB (UTC+7)</option>
                            <option value="Asia/Makassar">WITA (UTC+8)</option>
                            <option value="Asia/Jayapura">WIT (UTC+9)</option>
                          </select>
                        </div>
                        <div className="p-4 md:p-6 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                          <label className="text-[10px] uppercase font-black text-emerald-400 mb-2 md:mb-4 block">Koreksi Hijriah (Hari)</label>
                          <div className="flex items-center gap-4">
                             <button onClick={() => setHijriAdjustment(prev => prev - 1)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 text-xl font-black">-</button>
                             <span className="text-xl font-black text-white w-10 text-center">{hijriAdjustment}</span>
                             <button onClick={() => setHijriAdjustment(prev => prev + 1)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 text-xl font-black">+</button>
                          </div>
                          <p className="text-[10px] text-white/40 mt-2">Gunakan jika tanggal Hijriah berbeda dengan pengamatan lokal.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'waktu' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="p-6 md:p-10 bg-black/30 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-2xl">
                        <h4 className="text-xl md:text-3xl font-black text-white uppercase italic mb-8 md:mb-12 flex items-center gap-3 md:gap-4">
                          <Globe className="text-[#facc15] w-6 h-6 md:w-10 md:h-10" /> 
                          Metode Perhitungan
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-emerald-400 block">Standar Otoritas</label>
                            <select 
                              value={method} 
                              onChange={(e) => setMethod(Number(e.target.value))}
                              className="w-full bg-black/60 border-2 border-white/10 rounded-xl md:rounded-2xl px-4 py-2 md:px-6 md:py-4 text-white font-bold text-sm outline-none focus:border-[#facc15]"
                            >
                              <option value={20}>Kemenag RI (Fajr 20°, Isha 18°)</option>
                              <option value={21}>Muhammadiyah (Fajr 18°, Isha 18°)</option>
                              <option value={3}>Muslim World League (Fajr 18°, Isha 17°)</option>
                              <option value={1}>Univ. Islamic Sciences, Karachi (Fajr 18°, Isha 18°)</option>
                              <option value={4}>Umm Al-Qura University, Makkah</option>
                              <option value={5}>Egyptian General Authority</option>
                              <option value={2}>ISNA (North America)</option>
                            </select>
                          </div>
                          <div className="p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/20 flex items-start gap-3">
                            <Zap size={20} className="text-amber-400 shrink-0 mt-1" />
                            <p className="text-[10px] md:text-xs text-white/60 leading-relaxed">
                              Sistem secara otomatis menambahkan <strong>Ikhtiyat (Pengaman) 2 Menit</strong> sesuai standar keamanan waktu ibadah untuk menghindari kesalahan akibat pembulatan.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 md:p-10 bg-black/30 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-2xl">
                        <h4 className="text-xl md:text-3xl font-black text-white uppercase italic mb-8 md:mb-12 flex items-center gap-3 md:gap-4">
                          <SlidersHorizontal className="text-[#facc15] w-6 h-6 md:w-10 md:h-10" /> 
                          Koreksi Manual (Menit)
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                          {DISPLAY_GRID_NAMES.map(p => (
                            <div key={p} className="bg-black/40 backdrop-blur-md p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 transition-all hover:border-emerald-500/30 group">
                              <div className="flex items-center gap-3 w-full justify-between">
                                <label className="text-xs md:text-sm font-black text-emerald-400 uppercase tracking-[0.2em]">
                                  {DISPLAY_NAMES[p]}
                                </label>
                                <div className="h-px flex-1 bg-white/5 mx-2"></div>
                                <span className="text-[10px] font-bold text-white/30 uppercase">Menit</span>
                              </div>
                              
                              <div className="flex items-center justify-between w-full bg-black/20 rounded-xl md:rounded-2xl p-1.5 border border-white/5">
                                <button 
                                  onClick={() => setCorrections(prev => ({ ...prev, [p]: (prev[p] || 0) - 1 }))} 
                                  className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-white/70 transition-all active:scale-90"
                                  title="Kurangi"
                                >
                                  <Minus size={18} strokeWidth={3} />
                                </button>
                                
                                <div className="flex-1 text-center">
                                  <div className="text-2xl md:text-3xl font-mono font-black text-white tabular-nums">
                                    {corrections[p] > 0 ? `+${corrections[p]}` : corrections[p] || 0}
                                  </div>
                                </div>
                                
                                <button 
                                  onClick={() => setCorrections(prev => ({ ...prev, [p]: (prev[p] || 0) + 1 }))} 
                                  className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 text-white/70 transition-all active:scale-90"
                                  title="Tambah"
                                >
                                  <Plus size={18} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="p-6 md:p-10 bg-black/30 rounded-[2rem] md:rounded-[3rem] border border-white/5">
                        <p className="text-xs md:text-sm text-white/40 italic leading-relaxed">
                          * Gunakan fitur koreksi jika jadwal shalat di aplikasi berbeda dengan jadwal resmi di wilayah Anda. 
                          Nilai positif (+) akan menambah waktu, nilai negatif (-) akan mengurangi waktu.
                        </p>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'iqomah' && (
                    <div className="space-y-4 md:space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                          <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                            <h4 className="text-base md:text-xl font-black text-white uppercase italic mb-4 md:mb-6">Jeda Iqomah (Menit)</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
                              {OBLIGATORY_PRAYERS.map(p => (
                                <div key={p} className="flex flex-col gap-1.5 md:gap-2">
                                  <label className="text-[8px] md:text-[10px] font-black text-emerald-300 uppercase text-center">{DISPLAY_NAMES[p]}</label>
                                  <input type="number" min="1" value={iqomahDurations[p]} onChange={(e) => setIqomahDurations(prev => ({ ...prev, [p]: Number(e.target.value) }))} className="w-full bg-black/60 border border-white/10 rounded-lg py-2 text-center text-white font-black text-sm md:text-base" />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                             <h4 className="text-base md:text-xl font-black text-white uppercase italic mb-4 md:mb-6">Layar Shalat</h4>
                             <RefinedInput label="Durasi Blank (Menit)" type="number" value={prayerBlankDuration} onChange={(val) => setPrayerBlankDuration(Number(val))} />
                          </div>
                       </div>
                       <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                          <RefinedInput label="Pesan Layar Iqomah" value={iqomahText} onChange={setIqomahText} />
                       </div>
                    </div>
                  )}

                  {settingsTab === 'petugas' && (
                    <div className="space-y-6 md:space-y-8">
                      <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                        <h4 className="text-base md:text-xl font-black text-white uppercase italic mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><Users className="text-[#facc15]" size={20}/> Imam Shalat Rawatib</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                           {OBLIGATORY_PRAYERS.map(p => (
                             <RefinedInput key={p} label={DISPLAY_NAMES[p]} value={imams[p]} onChange={(v) => { setImams(prev => ({ ...prev, [p]: v })); }} />
                           ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                          <h4 className="text-base md:text-xl font-black text-white uppercase italic mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><Star className="text-yellow-400" size={20}/> Imam Tarawih</h4>
                          <RefinedInput label="Nama Imam" value={tarawihImam} onChange={setTarawihImam} />
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'keuangan' && (
                    <div className="space-y-6">
                      <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                        <FinancialInput label="Saldo Awal" value={finSaldoAwal} onChange={setFinSaldoAwal} icon={<History size={14}/>} />
                        <FinancialInput label="Pemasukan" value={finPemasukan} onChange={setFinPemasukan} icon={<TrendingUp size={14}/>} color="emerald" />
                        <FinancialInput label="Pengeluaran" value={finPengeluaran} onChange={setFinPengeluaran} icon={<TrendingDown size={14}/>} color="rose" />
                      </div>
                      <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                        <h4 className="text-base md:text-xl font-black text-white uppercase italic mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><Timer className="text-[#facc15]" size={20}/> Pengaturan Tampilan Otomatis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                          <RefinedInput label="Interval Muncul (Menit)" type="number" value={finShowInterval} onChange={(v) => setFinShowInterval(Number(v))} />
                          <RefinedInput label="Durasi Tampil (Menit)" type="number" value={finShowDuration} onChange={(v) => setFinShowDuration(Number(v))} />
                        </div>
                        <p className="text-[10px] text-white/40 mt-4 italic">Laporan keuangan akan muncul otomatis setiap interval yang ditentukan. Anda juga tetap bisa menampilkannya secara manual kapan saja dengan menekan ikon dompet di pojok kanan atas layar utama.</p>
                      </div>
                    </div>
                  )}

                   {settingsTab === 'media' && (
                    <div className="space-y-6 md:space-y-8">
                       <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                          <RefinedInput label="Running Text (Info Masjid)" value={marqueeText} onChange={setMarqueeText} />
                       </div>
                       <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                          <div className="flex justify-between items-center mb-4 md:mb-6">
                            <h4 className="text-base md:text-xl font-black text-white uppercase italic flex items-center gap-2 md:gap-3"><ImageIcon className="text-[#facc15]" size={20}/> Background</h4>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end mr-4">
                                <span className="text-[10px] font-black text-white uppercase">Interval Ganti</span>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    min="5" 
                                    value={bgInterval} 
                                    onChange={(e) => setBgInterval(Number(e.target.value))}
                                    className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-center font-bold text-[#facc15]"
                                  />
                                  <span className="text-[10px] text-white/40 uppercase">Detik</span>
                                </div>
                              </div>
                              <button 
                                onClick={handleDownloadAllBgs}
                                disabled={downloadingBg}
                                className="bg-blue-600 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black shadow-lg flex items-center gap-2 hover:bg-blue-500 disabled:opacity-50"
                                title="Download semua background untuk offline"
                              >
                                {downloadingBg ? <RefreshCcw className="animate-spin" size={12} /> : <Download size={12} />}
                                {downloadingBg ? '...' : 'OFFLINE'}
                              </button>
                              <button 
                                onClick={handleDeleteAllBgs}
                                className="bg-red-600/20 text-red-400 px-2 py-1.5 md:py-2 rounded-lg md:rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                title="Hapus cache background"
                              >
                                <Trash2 size={12} />
                              </button>
                              <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 px-3 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black shadow-lg">TAMBAH</button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*" className="hidden" />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                            {bgList.map((url, idx) => (
                              <div key={idx} className={`relative group aspect-video rounded-lg md:rounded-2xl overflow-hidden border-2 transition-all ${currentBgIndex === idx ? 'border-[#facc15] scale-105' : 'border-white/10'}`}>
                                <img src={url} className="w-full h-full object-cover" />
                                <button onClick={() => setBgUrls(bgList.filter((_, i) => i !== idx).join('\n'))} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded md:opacity-0 md:group-hover:opacity-100 transition-all"><X size={12} /></button>
                              </div>
                            ))}
                           </div>
                        </div>
                    </div>
                  )}

                  {settingsTab === 'murottal' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                        <h4 className="text-base md:text-xl font-black text-white uppercase italic mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><Music className="text-[#facc15]" size={20}/> Pengaturan Murottal</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                            <div>
                              <p className="text-white font-bold text-sm md:text-base">Volume Pemutar</p>
                              <p className="text-white/40 text-[10px] md:text-xs">Atur tingkat suara murottal.</p>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.01" 
                              value={murottalVolume} 
                              onChange={(e) => setMurottalVolume(Number(e.target.value))}
                              className="w-32 md:w-48 accent-[#facc15]"
                            />
                          </div>
                          
                          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                              <p className="text-white font-bold text-sm md:text-base">Daftar Putar</p>
                              <button onClick={() => murottalFileInputRef.current?.click()} className="bg-emerald-600 px-4 py-1.5 rounded-lg text-[10px] font-black shadow-lg flex items-center gap-2">
                                <Upload size={12} /> TAMBAH DARI PERANGKAT
                              </button>
                              <input type="file" ref={murottalFileInputRef} onChange={handleMurottalUpload} accept="audio/*" className="hidden" />
                            </div>
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                              {playlist.map((track, idx) => (
                                <div 
                                  key={track.id} 
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${currentTrackIndex === idx ? 'bg-[#facc15]/20 border-[#facc15] text-[#facc15]' : 'bg-black/20 border-white/5 text-white/70 hover:bg-white/5'}`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => { setCurrentTrackIndex(idx); setIsMurottalPlaying(true); }}>
                                    <span className="text-[10px] font-black opacity-50">{idx + 1}.</span>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs md:text-sm font-bold truncate">{track.title}</span>
                                      <span className="text-[8px] md:text-[10px] opacity-60">{track.reciter}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 ml-4 shrink-0">
                                    {currentTrackIndex === idx && isMurottalPlaying && (
                                      <div className="flex gap-0.5 items-end h-3">
                                        <div className="w-0.5 bg-[#facc15] animate-[music-bar_0.8s_ease-in-out_infinite]" />
                                        <div className="w-0.5 bg-[#facc15] animate-[music-bar_1.2s_ease-in-out_infinite]" />
                                        <div className="w-0.5 bg-[#facc15] animate-[music-bar_1.0s_ease-in-out_infinite]" />
                                      </div>
                                    )}
                                    
                                    {track.isCustom || downloadedTracks[track.id] ? (
                                      <button onClick={() => deleteTrackLocal(track)} className="p-2 bg-rose-900/50 hover:bg-rose-800 rounded-full text-rose-300" title="Hapus"><X size={12}/></button>
                                    ) : (
                                      <button 
                                        onClick={() => downloadTrack(track)} 
                                        disabled={downloadingTrackId !== null}
                                        className="p-2 bg-emerald-800/70 hover:bg-emerald-700 rounded-full text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Download untuk Offline"
                                      >
                                        {downloadingTrackId === track.id ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {settingsTab === 'remote' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="p-4 md:p-8 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
                        <h4 className="text-base md:text-xl font-black text-white uppercase italic mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><Smartphone className="text-[#facc15]" size={20}/> Remote Control Smartphone</h4>
                        
                        <div className="flex flex-col md:flex-row items-center gap-8">
                          <div className="bg-white p-4 rounded-3xl shadow-2xl">
                            <QRCodeSVG value={remoteUrl} size={180} />
                          </div>
                          
                          <div className="flex-1 space-y-4 text-center md:text-left">
                            <div>
                              <p className="text-white font-black text-lg md:text-2xl uppercase italic">Kontrol dari HP Anda</p>
                              <p className="text-white/40 text-xs md:text-sm font-bold uppercase tracking-wide">Scan QR Code di samping untuk membuka remote control di smartphone pengurus masjid.</p>
                            </div>
                            
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 break-all">
                              <p className="text-[10px] text-emerald-400 font-black uppercase mb-1">Link Remote:</p>
                              <p className="text-xs font-mono text-white/60">{remoteUrl}</p>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                              <button 
                                onClick={() => window.open(remoteUrl, '_blank')}
                                className="bg-[#facc15] text-black px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                              >
                                <ExternalLink size={16} /> Buka di Tab Baru
                              </button>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(remoteUrl);
                                  alert('Link berhasil disalin!');
                                }}
                                className="bg-white/10 text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-white/20 transition-all"
                              >
                                Salin Link
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 md:p-6 bg-emerald-900/20 rounded-2xl border border-emerald-500/10">
                        <p className="text-[10px] md:text-xs text-emerald-300/60 font-medium italic">
                          * Pastikan smartphone dan perangkat JWS terhubung ke internet. Remote ini bekerja secara real-time menggunakan teknologi WebSocket. Perubahan pada remote akan langsung diterapkan pada layar utama.
                        </p>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'sistem' && (
                    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
                      <div className="bg-black/30 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/10 max-w-2xl">
                        <h4 className="text-base md:text-xl font-black text-white uppercase italic mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                          <RefreshCw size={20} className="text-emerald-400" />
                          Sinkronisasi Perangkat
                        </h4>
                        <div className="space-y-4 md:space-y-6">
                          <div className="p-4 md:p-6 bg-amber-900/20 rounded-xl md:rounded-2xl border border-amber-500/20">
                            <span className="text-[8px] md:text-xs font-bold text-amber-400 uppercase tracking-widest block mb-2">Tampilan Layar Penuh</span>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-xs md:text-sm font-bold text-white uppercase">Mode Fullscreen</span>
                                <span className="text-[10px] text-white/40">Gunakan tombol ini jika mode fullscreen tidak aktif otomatis.</span>
                              </div>
                              <button 
                                onClick={toggleFullScreen}
                                className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all flex items-center gap-2 ${isFullscreen ? 'bg-rose-600 text-white' : 'bg-[#facc15] text-black'}`}
                              >
                                {isFullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
                                {isFullscreen ? 'Keluar Fullscreen' : 'Masuk Fullscreen'}
                              </button>
                            </div>
                          </div>

                          <div className="p-4 md:p-6 bg-emerald-900/20 rounded-xl md:rounded-2xl border border-emerald-500/20">
                            <span className="text-[8px] md:text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">ID Sinkronisasi Perangkat Ini</span>
                            <div className="flex gap-2">
                              <code className="text-sm md:text-2xl text-white font-mono bg-black/40 px-3 py-2 md:px-4 md:py-3 rounded-lg flex-1 border border-white/5 break-all">{roomId}</code>
                              <button 
                                onClick={() => {
                                  const id = prompt('Masukkan ID Sinkronisasi dari TV:');
                                  if (id) {
                                    localStorage.setItem('mosqueRoomId', id);
                                    window.location.reload();
                                  }
                                }}
                                className="px-3 md:px-6 bg-emerald-600 rounded-lg font-bold uppercase hover:bg-emerald-500 text-white text-[8px] md:text-xs"
                              >
                                Ganti ID
                              </button>
                            </div>
                            <p className="text-[8px] md:text-xs text-white/50 mt-3 leading-relaxed">
                              Gunakan ID ini di smartphone Anda untuk mengontrol tampilan TV ini secara jarak jauh. 
                              Atau masukkan ID dari TV ke smartphone ini untuk menjadikannya remote.
                            </p>
                          </div>

                          <div className="p-4 md:p-6 bg-blue-900/20 rounded-xl md:rounded-2xl border border-blue-500/20">
                            <span className="text-[8px] md:text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">Status Koneksi</span>
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${swStatus === 'ready' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                              <span className="text-[10px] md:text-sm font-bold text-white uppercase">
                                {swStatus === 'ready' ? 'Sistem Siap (Offline & Sync OK)' : 'Menghubungkan...'}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 md:p-6 bg-purple-900/20 rounded-xl md:rounded-2xl border border-purple-500/20">
                            <h5 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Clock size={14} /> Smart Power (Hemat Energi)
                            </h5>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase">Sleep Mode (Auto-Off)</span>
                                  <span className="text-[10px] text-white/40">Layar akan gelap total pada jam tertentu.</span>
                                </div>
                                <button 
                                  onClick={() => setSleepEnabled(!sleepEnabled)}
                                  className={`w-12 h-6 rounded-full transition-all relative ${sleepEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${sleepEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                              </div>
                              
                              {sleepEnabled && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                  <RefinedInput label="Mulai Sleep" type="time" value={sleepStart} onChange={setSleepStart} />
                                  <RefinedInput label="Bangun (On)" type="time" value={sleepEnd} onChange={setSleepEnd} />
                                </div>
                              )}

                              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase">Auto Adzan</span>
                                  <span className="text-[10px] text-white/40">Putar suara adzan otomatis saat waktu tiba.</span>
                                </div>
                                <button 
                                  onClick={() => setAdhanEnabled(!adhanEnabled)}
                                  className={`w-12 h-6 rounded-full transition-all relative ${adhanEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${adhanEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                                    <Volume2 size={12} className="text-[#facc15]" /> Alarm Pra-Adzan
                                  </span>
                                  <span className="text-[10px] text-white/40">Bunyi peringatan beberapa menit sebelum adzan.</span>
                                </div>
                                <button 
                                  onClick={() => setPreAdhanAlarmEnabled(!preAdhanAlarmEnabled)}
                                  className={`w-12 h-6 rounded-full transition-all relative ${preAdhanAlarmEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${preAdhanAlarmEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                              </div>

                              {preAdhanAlarmEnabled && (
                                <div className="p-3 bg-black/20 rounded-lg space-y-2 animate-in slide-in-from-top-2 duration-300">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-white/60 uppercase">Waktu Peringatan (Menit)</span>
                                    <span className="text-xs font-black text-[#facc15]">{preAdhanAlarmDuration} Menit</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    value={preAdhanAlarmDuration} 
                                    onChange={(e) => setPreAdhanAlarmDuration(Number(e.target.value))}
                                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#facc15]"
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                                    <Bell size={12} className="text-emerald-400" /> Notifikasi Sistem
                                  </span>
                                  <span className="text-[10px] text-white/40">Munculkan pesan di bilah notifikasi perangkat.</span>
                                </div>
                                <button 
                                  onClick={async () => {
                                    if (notificationsEnabled) {
                                      setNotificationsEnabled(false);
                                      return;
                                    }

                                    if (!("Notification" in window)) {
                                      alert("Browser Anda tidak mendukung notifikasi sistem.");
                                      return;
                                    }

                                    // Jika izin sudah ada, langsung aktifkan
                                    if (Notification.permission === "granted") {
                                      setNotificationsEnabled(true);
                                      try {
                                        new Notification("Notifikasi Aktif", {
                                          body: "Sistem notifikasi telah diaktifkan.",
                                          icon: '/icons/icon-192x192.png'
                                        });
                                      } catch (e) {
                                        console.error("Gagal mengirim notifikasi tes:", e);
                                      }
                                      return;
                                    }

                                    // Jika izin diblokir
                                    if (Notification.permission === "denied") {
                                      alert("Izin notifikasi diblokir oleh browser. Silakan klik ikon gembok di address bar dan izinkan notifikasi untuk situs ini.");
                                      return;
                                    }

                                    // Minta izin
                                    try {
                                      const permission = await Notification.requestPermission();
                                      if (permission === "granted") {
                                        setNotificationsEnabled(true);
                                        try {
                                          new Notification("Notifikasi Aktif", {
                                            body: "Anda akan menerima pemberitahuan waktu shalat.",
                                            icon: '/icons/icon-192x192.png'
                                          });
                                        } catch (e) {
                                          console.error("Gagal mengirim notifikasi tes:", e);
                                        }
                                      } else {
                                        alert("Gagal mengaktifkan: Izin notifikasi tidak diberikan oleh pengguna.");
                                      }
                                    } catch (error) {
                                      console.error("Error requesting notification permission:", error);
                                      alert("Terjadi kesalahan saat meminta izin notifikasi.");
                                    }
                                  }}
                                  className={`w-12 h-6 rounded-full transition-all relative ${notificationsEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase italic flex items-center gap-2">
                                    <Zap size={12} className="text-amber-400" /> Simulasi (Ikon Petir)
                                  </span>
                                  <span className="text-[10px] text-white/40">Tampilkan tombol simulasi di header jam.</span>
                                </div>
                                <button 
                                  onClick={() => setSimulationEnabled(!simulationEnabled)}
                                  className={`w-12 h-6 rounded-full transition-all relative ${simulationEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${simulationEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                              </div>

                              {adhanEnabled && (
                                <div className="p-3 bg-black/20 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                                  <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-white uppercase">File Adzan (Offline)</span>
                                      <span className="text-[10px] text-white/40">{customAdhanBlob ? '✅ Tersimpan di perangkat' : '⚠️ Menggunakan link online'}</span>
                                    </div>
                                    <button 
                                      onClick={() => adhanFileInputRef.current?.click()}
                                      className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors"
                                    >
                                      {customAdhanBlob ? 'GANTI FILE' : 'UPLOAD MP3'}
                                    </button>
                                    <input 
                                      type="file" 
                                      ref={adhanFileInputRef} 
                                      onChange={handleAdhanUpload} 
                                      accept="audio/mpeg,audio/mp3" 
                                      className="hidden" 
                                    />
                                  </div>
                                  {customAdhanBlob && (
                                    <button 
                                      onClick={async () => {
                                        await setData('customAdhan', null);
                                        setCustomAdhanBlob(null);
                                      }}
                                      className="text-[9px] font-bold text-rose-400 uppercase hover:text-rose-300"
                                    >
                                      Hapus File & Gunakan Online
                                    </button>
                                  )}
                                </div>
                              )}

                              <div className="p-3 bg-black/20 rounded-lg space-y-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase">Interval Ganti Ayat</span>
                                  <span className="text-[10px] text-white/40">Seberapa sering ayat Al-Qur'an berganti (menit).</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <input 
                                    type="range" 
                                    min="1" 
                                    max="60" 
                                    value={verseInterval} 
                                    onChange={(e) => setVerseInterval(Number(e.target.value))}
                                    className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                  />
                                  <span className="text-sm font-black text-emerald-400 w-12 text-center">{verseInterval}m</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 md:p-6 bg-amber-900/20 rounded-xl md:rounded-2xl border border-amber-500/20">
                            <h5 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Download size={14} /> Backup & Restore
                            </h5>
                            <div className="flex flex-wrap gap-3">
                              <button 
                                onClick={handleExportSettings}
                                className="flex-1 min-w-[140px] py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs uppercase shadow-lg flex items-center justify-center gap-2"
                              >
                                <Download size={14} /> Download Backup
                              </button>
                              <label className="flex-1 min-w-[140px] py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs uppercase shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-white/10">
                                <Upload size={14} /> Upload Backup
                                <input type="file" accept=".json" onChange={handleImportSettings} className="hidden" />
                              </label>
                            </div>
                            <p className="text-[8px] md:text-xs text-white/40 mt-3">
                              Simpan cadangan pengaturan masjid Anda ke dalam file .json untuk dipulihkan di kemudian hari atau di perangkat lain.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-8 bg-emerald-900/10 border-t border-white/10 flex justify-center shrink-0">
                 <button onClick={() => { loadData(); setShowSettings(false); }} className="w-full py-3 md:py-6 bg-[#facc15] hover:bg-white text-black rounded-xl md:rounded-[2.5rem] font-black text-lg md:text-3xl uppercase italic tracking-tighter shadow-2xl border-b-2 md:border-b-8 border-amber-600 active:translate-y-2 transition-all">SIMPAN PERUBAHAN</button>
              </div>
           </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-[200] bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
          <WifiOff size={16} />
          <span className="text-xs font-bold uppercase">Offline Mode</span>
        </div>
      )}

      {/* SW Update Toast */}
      {needRefresh && (
        <div className="fixed bottom-4 right-4 z-[200] bg-emerald-900 border border-[#facc15] text-white p-4 rounded-xl shadow-2xl flex flex-col gap-3 max-w-xs animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="text-[#facc15] shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-bold text-sm uppercase text-[#facc15]">Update Tersedia</h4>
              <p className="text-xs text-white/80 mt-1">Versi baru aplikasi tersedia. Muat ulang untuk memperbarui.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => setNeedRefresh(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase hover:bg-white/10"
            >
              Nanti
            </button>
            <button 
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 bg-[#facc15] text-black rounded-lg text-xs font-black uppercase hover:bg-white"
            >
              Update Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Murottal Player Overlay */}
      <div className={`fixed top-[20%] right-0 z-[100] w-[85%] max-w-[220px] md:max-w-[380px] transition-all duration-1000 ${showMurottalPlayer ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="bg-emerald-950/40 backdrop-blur-[10px] border-l-4 md:border-l-8 border-y-2 md:border-y-4 border-[#facc15] rounded-l-[1.5rem] md:rounded-l-[2.5rem] p-3 md:p-6 shadow-2xl relative flex flex-col">
          <button onClick={() => setShowMurottalPlayer(false)} className="absolute top-2 right-2 text-white/30 hover:text-white z-10"><X size={16}/></button>
          
          <div className="flex flex-col items-center space-y-3 md:space-y-5">
            {/* Equalizer Visual */}
            <div className="flex items-end justify-center gap-0.5 md:gap-1.5 h-10 md:h-20 w-full px-2">
              {[0.6, 0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.5, 0.6, 0.4].map((scale, i) => (
                <div 
                  key={i} 
                  className={`w-1 md:w-2.5 bg-[#facc15] rounded-t-sm transition-all duration-500 ${isMurottalPlaying ? 'animate-equalizer' : 'h-1'}`}
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.4 + scale}s`
                  }}
                />
              ))}
            </div>

            {/* Track Info */}
            <div className="text-center w-full px-2">
              <h5 className="text-white font-black text-[10px] md:text-lg uppercase truncate leading-tight">
                {playlist[currentTrackIndex]?.title || 'Pilih Audio'}
              </h5>
              <p className="text-[#facc15] text-[8px] md:text-xs font-bold uppercase tracking-widest truncate opacity-80">
                {playlist[currentTrackIndex]?.reciter || '...'}
              </p>
            </div>
            
            <div className="flex items-center gap-3 md:gap-6">
              <button 
                onClick={() => setIsShuffle(!isShuffle)} 
                className={`transition-colors ${isShuffle ? 'text-[#facc15]' : 'text-white/30 hover:text-white/50'}`}
                title="Acak (Shuffle)"
              >
                <Shuffle size={14} className="md:w-6 md:h-6" />
              </button>

              <button onClick={prevTrack} className="text-white/50 hover:text-[#facc15] transition-colors"><SkipBack size={18} className="md:w-8 md:h-8" /></button>
              
              <button 
                onClick={toggleMurottal} 
                className="w-10 h-10 md:w-16 md:h-16 bg-[#facc15] rounded-full flex items-center justify-center text-emerald-950 hover:scale-110 active:scale-95 transition-all shadow-lg"
              >
                {isMurottalPlaying ? <Pause size={20} className="md:w-10 md:h-10" fill="currentColor" /> : <Play size={20} className="md:w-10 md:h-10 ml-1" fill="currentColor" />}
              </button>
              
              <button onClick={nextTrack} className="text-white/50 hover:text-[#facc15] transition-colors"><SkipForward size={18} className="md:w-8 md:h-8" /></button>

              <button 
                onClick={() => {
                  if (playbackMode === 'off') setPlaybackMode('all');
                  else if (playbackMode === 'all') setPlaybackMode('one');
                  else setPlaybackMode('off');
                }} 
                className={`transition-colors ${playbackMode !== 'off' ? 'text-[#facc15]' : 'text-white/30 hover:text-white/50'}`}
                title={playbackMode === 'one' ? 'Ulang Satu' : playbackMode === 'all' ? 'Ulang Semua' : 'Tanpa Pengulangan'}
              >
                {playbackMode === 'one' ? <Repeat1 size={14} className="md:w-6 md:h-6" /> : <Repeat size={14} className="md:w-6 md:h-6" />}
              </button>
            </div>
            
            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <button 
                  onClick={() => setShowPlaylistInPlayer(!showPlaylistInPlayer)}
                  className={`flex items-center gap-1.5 text-[8px] md:text-xs font-black uppercase tracking-widest transition-colors ${showPlaylistInPlayer ? 'text-[#facc15]' : 'text-white/40 hover:text-white'}`}
                >
                  <ListMusic size={14} /> {showPlaylistInPlayer ? 'Tutup Daftar' : 'Buka Daftar'}
                </button>
                <div className="flex items-center gap-2">
                   <Volume2 size={12} className="text-white/30" />
                   <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={murottalVolume} 
                    onChange={(e) => setMurottalVolume(Number(e.target.value))}
                    className="w-16 md:w-24 accent-[#facc15] h-0.5 md:h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Collapsible Playlist */}
              {showPlaylistInPlayer && (
                <div className="mt-2 max-h-[150px] md:max-h-[250px] overflow-y-auto custom-scrollbar bg-black/40 rounded-xl border border-white/5 p-1 animate-in slide-in-from-top-2 duration-300">
                  {playlist.map((track, idx) => (
                    <button 
                      key={track.id}
                      onClick={() => { setCurrentTrackIndex(idx); setIsMurottalPlaying(true); }}
                      className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-all ${currentTrackIndex === idx ? 'bg-[#facc15] text-black' : 'hover:bg-white/5 text-white/60'}`}
                    >
                      <span className="text-[8px] md:text-[10px] font-black opacity-50 w-4">{idx + 1}</span>
                      <span className="text-[9px] md:text-xs font-bold truncate flex-1">{track.title}</span>
                      {currentTrackIndex === idx && isMurottalPlaying && <div className="w-1 h-1 rounded-full bg-black animate-pulse" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <audio 
        ref={adhanAudioRef} 
        src={adhanSrc || null}
        preload="auto"
        crossOrigin="anonymous"
      />
      <audio 
        ref={murottalAudioRef} 
        src={murottalSrc || null} 
        onEnded={handleTrackEnd}
      />
      <style>{`
        @keyframes marquee-jws-ultra { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes music-bar { 0%, 100% { height: 4px; } 50% { height: 12px; } }
        @keyframes equalizer { 0%, 100% { height: 20%; } 50% { height: 100%; } }
        .animate-marquee-jws-ultra { 
          animation: marquee-jws-ultra 40s linear infinite; 
          will-change: transform;
        }
        .animate-equalizer { animation: equalizer 1s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #facc15; border-radius: 10px; }
      `}</style>
    </div>
  );
};

interface TabButtonProps {
  id: SettingsTab;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: (id: SettingsTab) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ id, active, icon, label, onClick }) => (
  <button onClick={() => onClick(id)} className={`flex items-center gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-4 rounded-lg md:rounded-2xl transition-all font-black text-[10px] md:text-sm uppercase tracking-tight shrink-0 ${active ? 'bg-[#facc15] text-black shadow-lg translate-x-0 md:translate-x-2' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
    {icon} <span className="no-wrap">{label}</span>
  </button>
);

interface RefinedInputProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

const RefinedInput: React.FC<RefinedInputProps> = ({ label, value, onChange, placeholder = "", type = "text" }) => (
  <div className="flex flex-col gap-1 md:gap-2 w-full">
    <label className="text-[8px] md:text-[10px] uppercase font-black text-emerald-400 ml-1 md:ml-2 tracking-widest leading-none no-wrap">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-black/60 border-2 border-white/10 rounded-xl md:rounded-2xl px-3 py-2 md:px-6 md:py-4 text-xs md:text-sm font-bold text-white focus:border-[#facc15] outline-none" />
  </div>
);

interface FinancialInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
  color?: string;
}

const FinancialInput: React.FC<FinancialInputProps> = ({ label, value, onChange, icon, color = "emerald" }) => (
  <div className="flex flex-col gap-1.5 md:gap-2 w-full">
    <label className={`text-[8px] md:text-[10px] uppercase font-black tracking-widest ml-2 text-${color}-400 flex items-center gap-2 no-wrap`}>{icon} {label}</label>
    <div className="relative">
      <span className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 font-black text-emerald-600 italic text-xs md:text-base">Rp</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-black/60 border-2 border-white/10 rounded-xl md:rounded-2xl pl-10 md:pl-16 pr-3 md:pr-6 py-3 md:py-5 text-base md:text-xl font-black text-white focus:border-[#facc15] outline-none" />
    </div>
  </div>
);

export default App;