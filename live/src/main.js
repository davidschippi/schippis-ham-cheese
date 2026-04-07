
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import { Motion } from '@capacitor/motion';
import tzLookup from 'tz-lookup';

const app = document.getElementById('app');

const GnssBridge = registerPlugin('GnssBridge');

function detectInitialLang() {
  const saved = localStorage.getItem('lang');
  if (saved === 'de' || saved === 'en') return saved;
  const sys = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  return sys.startsWith('de') ? 'de' : 'en';
}

const state = {
  myPos: null,                 // aktuell angezeigter Locator / obere Felder
  myGeo: null,                 // reverse-geocoded location for myPos
  dxPos: null,                 // Gegenstation
  gpsActualTimeZone: null,     // echte aktuelle Geräte-/GPS-Standortzeit
  myCallsign: localStorage.getItem('myCallsign') || '',
  myName: localStorage.getItem('myName') || '',
  lang: detectInitialLang(),
  addrQuery: localStorage.getItem('addrQuery') || '',
  dxCallInput: localStorage.getItem('dxCallInput') || '',
  dxCoordsInput: localStorage.getItem('dxCoordsInput') || '',
  dxAddrQuery: localStorage.getItem('dxAddrQuery') || '',
  dxAddrSuggestions: [],
  dxAddrSuggestTimer: null,
  dxAddrSuggestOpen: false,
  dxAddrHit: null,
  activeTab: localStorage.getItem('activeTab') || 'tools',
  weather: null,
  solar: null,
  weatherLoading: false,
  solarLoading: false,
  lastEnvFetch: 0,
  clockTimer: null,
  gpsLoading: false,
  addrSuggestions: [],
  addrSuggestTimer: null,
  addrSuggestOpen: false,
  heading: null,
  headingAvailable: false,
  headingWatchStarted: false,
  magneticField: null,
  accelVec: null,
  gnss: {
    available: false,
    provider: '-',
    satellitesVisible: '-',
    satellitesUsed: '-',
    accuracy: '-',
    altitude: '-',
    speed: '-',
    bearing: '-',
    lastFix: '-',
    systems: [],
    satellites: [],
    note: ''
  },
};

function persistCoreState() {
  localStorage.setItem('addrQuery', state.addrQuery || '');
  localStorage.setItem('dxCallInput', state.dxCallInput || '');
  localStorage.setItem('dxCoordsInput', state.dxCoordsInput || '');
  localStorage.setItem('dxAddrQuery', state.dxAddrQuery || '');
  if (state.myPos) localStorage.setItem('myPos', JSON.stringify(state.myPos));
  else localStorage.removeItem('myPos');
  if (state.myGeo) localStorage.setItem('myGeo', JSON.stringify(state.myGeo));
  else localStorage.removeItem('myGeo');
  if (state.gpsActualTimeZone) localStorage.setItem('gpsActualTimeZone', state.gpsActualTimeZone);
  else localStorage.removeItem('gpsActualTimeZone');
  if (state.solar) localStorage.setItem('solarCache', JSON.stringify(state.solar));
  else localStorage.removeItem('solarCache');
  if (state.weather) localStorage.setItem('weatherCache', JSON.stringify(state.weather));
  else localStorage.removeItem('weatherCache');
  if (state.dxAddrHit) localStorage.setItem('dxAddrHit', JSON.stringify(state.dxAddrHit));
  else localStorage.removeItem('dxAddrHit');
  localStorage.setItem('lastEnvFetch', String(state.lastEnvFetch || 0));
}

function restoreCoreState() {
  try {
    const myPos = JSON.parse(localStorage.getItem('myPos') || 'null');
    if (Array.isArray(myPos) && myPos.length === 2) state.myPos = myPos;
  } catch {}
  try {
    const myGeo = JSON.parse(localStorage.getItem('myGeo') || 'null');
    if (myGeo && typeof myGeo === 'object') state.myGeo = myGeo;
  } catch {}
  try {
    const dxAddrHit = JSON.parse(localStorage.getItem('dxAddrHit') || 'null');
    if (dxAddrHit && typeof dxAddrHit === 'object') state.dxAddrHit = dxAddrHit;
  } catch {}
  state.dxAddrQuery = localStorage.getItem('dxAddrQuery') || state.dxAddrQuery;
  state.gpsActualTimeZone = localStorage.getItem('gpsActualTimeZone') || state.gpsActualTimeZone;
  try {
    const solar = JSON.parse(localStorage.getItem('solarCache') || 'null');
    if (solar && typeof solar === 'object') state.solar = solar;
  } catch {}
  try {
    const weather = JSON.parse(localStorage.getItem('weatherCache') || 'null');
    if (weather && typeof weather === 'object') state.weather = weather;
  } catch {}
  state.lastEnvFetch = Number(localStorage.getItem('lastEnvFetch') || '0') || 0;
}

restoreCoreState();

const prefixes = [
  { p: '4U_ITU', country: 'ITU HQ', cq: '-', itu: '-' },
  { p: '4U_UN', country: 'United Nations HQ', cq: '-', itu: '-' },
  { p: 'BV9P', country: 'Pratas I.', cq: '-', itu: '-' },
  { p: 'FT/E', country: 'Juan de Nova, Europa', cq: '-', itu: '-' },
  { p: 'FT/G', country: 'Glorioso Is.', cq: '-', itu: '-' },
  { p: 'FT/J', country: 'Juan de Nova, Europa', cq: '-', itu: '-' },
  { p: 'FT/T', country: 'Tromelin I.', cq: '-', itu: '-' },
  { p: 'FT/W', country: 'Crozet I.', cq: '-', itu: '-' },
  { p: 'FT/X', country: 'Kerguelen Is.', cq: '-', itu: '-' },
  { p: 'FT/Z', country: 'Amsterdam & St. Paul Is.', cq: '-', itu: '-' },
  { p: 'KH5K', country: 'Kingman Reef', cq: '-', itu: '-' },
  { p: 'KH7K', country: 'Kure I.', cq: '-', itu: '-' },
  { p: 'PY0F', country: 'Fernando de Noronha', cq: '-', itu: '-' },
  { p: 'PY0S', country: 'St. Peter & St. Paul Rocks', cq: '-', itu: '-' },
  { p: 'PY0T', country: 'Trindade & Martim Vaz Is.', cq: '-', itu: '-' },
  { p: 'R1FJ', country: 'Franz Josef Land', cq: '-', itu: '-' },
  { p: 'R1MV', country: 'Malyj Vysotskij I.', cq: '-', itu: '-' },
  { p: 'VK9C', country: 'Cocos (Keeling) Is.', cq: '-', itu: '-' },
  { p: 'VK9L', country: 'Lord Howe I.', cq: '-', itu: '-' },
  { p: 'VK9M', country: 'Mellish Reef', cq: '-', itu: '-' },
  { p: 'VK9N', country: 'Norfolk I.', cq: '-', itu: '-' },
  { p: 'VK9W', country: 'Willis I.', cq: '-', itu: '-' },
  { p: 'VK9X', country: 'Christmas I.', cq: '-', itu: '-' },
  { p: 'VP2E', country: 'Anguilla', cq: '-', itu: '-' },
  { p: 'VP2M', country: 'Montserrat', cq: '-', itu: '-' },
  { p: 'VP2V', country: 'British Virgin Is.', cq: '-', itu: '-' },
  { p: '3B6', country: 'Agalega & St. Brandon Is.', cq: '-', itu: '-' },
  { p: '3B7', country: 'Agalega & St. Brandon Is.', cq: '-', itu: '-' },
  { p: '3B8', country: 'Mauritius', cq: '-', itu: '-' },
  { p: '3B9', country: 'Rodrigues I.', cq: '-', itu: '-' },
  { p: '3C0', country: 'Annobon I.', cq: '-', itu: '-' },
  { p: '3D2', country: 'Fiji', cq: '-', itu: '-' },
  { p: '3DA', country: 'Kingdom of Eswatini', cq: '-', itu: '-' },
  { p: '9M2', country: 'West Malaysia', cq: '-', itu: '-' },
  { p: '9M4', country: 'West Malaysia', cq: '-', itu: '-' },
  { p: '9M6', country: 'East Malaysia', cq: '-', itu: '-' },
  { p: '9M8', country: 'East Malaysia', cq: '-', itu: '-' },
  { p: 'BS7', country: 'Scarborough Reef', cq: '-', itu: '-' },
  { p: 'CE0', country: 'Easter I. / Juan Fernandez Is. / San Felix & San Ambrosio', cq: '-', itu: '-' },
  { p: 'CE9', country: 'Antarctica', cq: '-', itu: '-' },
  { p: 'CT3', country: 'Madeira Is.', cq: '-', itu: '-' },
  { p: 'CY0', country: 'Sable I.', cq: '-', itu: '-' },
  { p: 'CY9', country: 'St. Paul I.', cq: '-', itu: '-' },
  { p: 'EA6', country: 'Balearic Is.', cq: '-', itu: '-' },
  { p: 'EA8', country: 'Canary Is.', cq: '-', itu: '-' },
  { p: 'EA9', country: 'Ceuta & Melilla', cq: '-', itu: '-' },
  { p: 'EB6', country: 'Balearic Is.', cq: '-', itu: '-' },
  { p: 'EB8', country: 'Canary Is.', cq: '-', itu: '-' },
  { p: 'EB9', country: 'Ceuta & Melilla', cq: '-', itu: '-' },
  { p: 'EC6', country: 'Balearic Is.', cq: '-', itu: '-' },
  { p: 'EC8', country: 'Canary Is.', cq: '-', itu: '-' },
  { p: 'EC9', country: 'Ceuta & Melilla', cq: '-', itu: '-' },
  { p: 'ED6', country: 'Balearic Is.', cq: '-', itu: '-' },
  { p: 'ED8', country: 'Canary Is.', cq: '-', itu: '-' },
  { p: 'ED9', country: 'Ceuta & Melilla', cq: '-', itu: '-' },
  { p: 'EE6', country: 'Balearic Is.', cq: '-', itu: '-' },
  { p: 'EE8', country: 'Canary Is.', cq: '-', itu: '-' },
  { p: 'EE9', country: 'Ceuta & Melilla', cq: '-', itu: '-' },
  { p: 'EF6', country: 'Balearic Is.', cq: '-', itu: '-' },
  { p: 'EF8', country: 'Canary Is.', cq: '-', itu: '-' },
  { p: 'EF9', country: 'Ceuta & Melilla', cq: '-', itu: '-' },
  { p: 'EG6', country: 'Balearic Is.', cq: '-', itu: '-' },
  { p: 'EG8', country: 'Canary Is.', cq: '-', itu: '-' },
  { p: 'EG9', country: 'Ceuta & Melilla', cq: '-', itu: '-' },
  { p: 'EH6', country: 'Balearic Is.', cq: '-', itu: '-' },
  { p: 'EH8', country: 'Canary Is.', cq: '-', itu: '-' },
  { p: 'EH9', country: 'Ceuta & Melilla', cq: '-', itu: '-' },
  { p: 'H40', country: 'Temotu Province', cq: '-', itu: '-' },
  { p: 'HB0', country: 'Liechtenstein', cq: '-', itu: '-' },
  { p: 'HC8', country: 'Galapagos Is.', cq: '-', itu: '-' },
  { p: 'HD8', country: 'Galapagos Is.', cq: '-', itu: '-' },
  { p: 'HK0', country: 'Malpelo I. / San Andres & Providencia', cq: '-', itu: '-' },
  { p: 'IM0', country: 'Sardinia', cq: '-', itu: '-' },
  { p: 'IS0', country: 'Sardinia', cq: '-', itu: '-' },
  { p: 'JD1', country: 'Ogasawara / Minami Torishima', cq: '-', itu: '-' },
  { p: 'KG4', country: 'Guantanamo Bay', cq: '-', itu: '-' },
  { p: 'KH0', country: 'Mariana Is.', cq: '-', itu: '-' },
  { p: 'KH1', country: 'Baker & Howland Is.', cq: '-', itu: '-' },
  { p: 'KH2', country: 'Guam', cq: '-', itu: '-' },
  { p: 'KH3', country: 'Johnston I.', cq: '-', itu: '-' },
  { p: 'KH4', country: 'Midway I.', cq: '-', itu: '-' },
  { p: 'KH5', country: 'Palmyra & Jarvis Is.', cq: '-', itu: '-' },
  { p: 'KH6', country: 'Hawaii', cq: '-', itu: '-' },
  { p: 'KH7', country: 'Hawaii', cq: '-', itu: '-' },
  { p: 'KH8', country: 'American Samoa', cq: '-', itu: '-' },
  { p: 'KH9', country: 'Wake I.', cq: '-', itu: '-' },
  { p: 'KP1', country: 'Navassa I.', cq: '-', itu: '-' },
  { p: 'KP2', country: 'Virgin Is.', cq: '-', itu: '-' },
  { p: 'KP3', country: 'Puerto Rico', cq: '-', itu: '-' },
  { p: 'KP4', country: 'Puerto Rico', cq: '-', itu: '-' },
  { p: 'KP5', country: 'Desecheo I.', cq: '-', itu: '-' },
  { p: 'OH0', country: 'Aland Is.', cq: '-', itu: '-' },
  { p: 'OJ0', country: 'Market Reef', cq: '-', itu: '-' },
  { p: 'PJ2', country: 'Bonaire / Curacao', cq: '-', itu: '-' },
  { p: 'PJ4', country: 'Bonaire / Curacao', cq: '-', itu: '-' },
  { p: 'PJ5', country: 'St. Maarten / Saba / St. Eustatius', cq: '-', itu: '-' },
  { p: 'PJ6', country: 'St. Maarten / Saba / St. Eustatius', cq: '-', itu: '-' },
  { p: 'PJ7', country: 'St. Maarten / Saba / St. Eustatius', cq: '-', itu: '-' },
  { p: 'PJ8', country: 'St. Maarten / Saba / St. Eustatius', cq: '-', itu: '-' },
  { p: 'PJ9', country: 'Bonaire / Curacao', cq: '-', itu: '-' },
  { p: 'PP0', country: 'Fernando de Noronha / St. Peter & St. Paul / Trindade & Martim Vaz', cq: '-', itu: '-' },
  { p: 'VK0', country: 'Heard I. / Macquarie I.', cq: '-', itu: '-' },
  { p: 'VP5', country: 'Turks & Caicos Is.', cq: '-', itu: '-' },
  { p: 'VP6', country: 'Pitcairn I. / Ducie I.', cq: '-', itu: '-' },
  { p: 'VP8', country: 'Falkland Is. / South Georgia / South Orkney / South Sandwich / South Shetland', cq: '-', itu: '-' },
  { p: 'VP9', country: 'Bermuda', cq: '-', itu: '-' },
  { p: 'VQ9', country: 'Chagos Is.', cq: '-', itu: '-' },
  { p: 'VU4', country: 'Andaman & Nicobar Is.', cq: '-', itu: '-' },
  { p: 'VU7', country: 'Lakshadweep Is.', cq: '-', itu: '-' },
  { p: 'XA4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XB4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XC4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XD4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XE4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XF4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XG4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XH4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XI4', country: 'Revillagigedo', cq: '-', itu: '-' },
  { p: 'XX9', country: 'Macao', cq: '-', itu: '-' },
  { p: 'YV0', country: 'Aves I.', cq: '-', itu: '-' },
  { p: 'ZB2', country: 'Gibraltar', cq: '-', itu: '-' },
  { p: 'ZC4', country: 'UK Sovereign Base Areas on Cyprus', cq: '-', itu: '-' },
  { p: 'ZD7', country: 'St. Helena', cq: '-', itu: '-' },
  { p: 'ZD8', country: 'Ascension I.', cq: '-', itu: '-' },
  { p: 'ZD9', country: 'Tristan da Cunha & Gough I.', cq: '-', itu: '-' },
  { p: 'ZK2', country: 'Niue', cq: '-', itu: '-' },
  { p: 'ZK3', country: 'Tokelau Is.', cq: '-', itu: '-' },
  { p: 'ZL7', country: 'Chatham Is.', cq: '-', itu: '-' },
  { p: 'ZL8', country: 'Kermadec Is.', cq: '-', itu: '-' },
  { p: 'ZL9', country: 'Auckland & Campbell Is.', cq: '-', itu: '-' },
  { p: 'ZS8', country: 'Prince Edward & Marion Is.', cq: '-', itu: '-' },
  { p: '1A', country: 'Sovereign Military Order of Malta', cq: '-', itu: '-' },
  { p: '3A', country: 'Monaco', cq: '-', itu: '-' },
  { p: '3C', country: 'Equatorial Guinea', cq: '-', itu: '-' },
  { p: '3V', country: 'Tunisia', cq: '-', itu: '-' },
  { p: '3W', country: 'Viet Nam', cq: '-', itu: '-' },
  { p: '3X', country: 'Guinea', cq: '-', itu: '-' },
  { p: '3Y', country: 'Bouvet / Peter I I.', cq: '-', itu: '-' },
  { p: '4D', country: 'Philippines', cq: '-', itu: '-' },
  { p: '4E', country: 'Philippines', cq: '-', itu: '-' },
  { p: '4F', country: 'Philippines', cq: '-', itu: '-' },
  { p: '4G', country: 'Philippines', cq: '-', itu: '-' },
  { p: '4H', country: 'Philippines', cq: '-', itu: '-' },
  { p: '4I', country: 'Philippines', cq: '-', itu: '-' },
  { p: '4J', country: 'Azerbaijan', cq: '-', itu: '-' },
  { p: '4K', country: 'Azerbaijan', cq: '-', itu: '-' },
  { p: '4L', country: 'Georgia', cq: '-', itu: '-' },
  { p: '4M', country: 'Venezuela', cq: '-', itu: '-' },
  { p: '4O', country: 'Montenegro', cq: '-', itu: '-' },
  { p: '4S', country: 'Sri Lanka', cq: '-', itu: '-' },
  { p: '4W', country: 'Timor-Leste', cq: '-', itu: '-' },
  { p: '4X', country: 'Israel', cq: '-', itu: '-' },
  { p: '4Z', country: 'Israel', cq: '-', itu: '-' },
  { p: '5A', country: 'Libya', cq: '-', itu: '-' },
  { p: '5B', country: 'Cyprus', cq: '-', itu: '-' },
  { p: '5H', country: 'Tanzania', cq: '-', itu: '-' },
  { p: '5I', country: 'Tanzania', cq: '-', itu: '-' },
  { p: '5J', country: 'Colombia', cq: '-', itu: '-' },
  { p: '5K', country: 'Colombia', cq: '-', itu: '-' },
  { p: '5N', country: 'Nigeria', cq: '-', itu: '-' },
  { p: '5R', country: 'Madagascar', cq: '-', itu: '-' },
  { p: '5T', country: 'Mauritania', cq: '-', itu: '-' },
  { p: '5U', country: 'Niger', cq: '-', itu: '-' },
  { p: '5V', country: 'Togo', cq: '-', itu: '-' },
  { p: '5W', country: 'Samoa', cq: '-', itu: '-' },
  { p: '5X', country: 'Uganda', cq: '-', itu: '-' },
  { p: '5Y', country: 'Kenya', cq: '-', itu: '-' },
  { p: '5Z', country: 'Kenya', cq: '-', itu: '-' },
  { p: '6K', country: 'Republic of Korea', cq: '-', itu: '-' },
  { p: '6L', country: 'Republic of Korea', cq: '-', itu: '-' },
  { p: '6M', country: 'Republic of Korea', cq: '-', itu: '-' },
  { p: '6N', country: 'Republic of Korea', cq: '-', itu: '-' },
  { p: '6V', country: 'Senegal', cq: '-', itu: '-' },
  { p: '6W', country: 'Senegal', cq: '-', itu: '-' },
  { p: '6Y', country: 'Jamaica', cq: '-', itu: '-' },
  { p: '7J', country: 'Japan', cq: '-', itu: '-' },
  { p: '7K', country: 'Japan', cq: '-', itu: '-' },
  { p: '7L', country: 'Japan', cq: '-', itu: '-' },
  { p: '7M', country: 'Japan', cq: '-', itu: '-' },
  { p: '7N', country: 'Japan', cq: '-', itu: '-' },
  { p: '7O', country: 'Yemen', cq: '-', itu: '-' },
  { p: '7P', country: 'Lesotho', cq: '-', itu: '-' },
  { p: '7Q', country: 'Malawi', cq: '-', itu: '-' },
  { p: '7T', country: 'Algeria', cq: '-', itu: '-' },
  { p: '7U', country: 'Algeria', cq: '-', itu: '-' },
  { p: '7V', country: 'Algeria', cq: '-', itu: '-' },
  { p: '7W', country: 'Algeria', cq: '-', itu: '-' },
  { p: '7X', country: 'Algeria', cq: '-', itu: '-' },
  { p: '7Y', country: 'Algeria', cq: '-', itu: '-' },
  { p: '8P', country: 'Barbados', cq: '-', itu: '-' },
  { p: '8Q', country: 'Maldives', cq: '-', itu: '-' },
  { p: '8R', country: 'Guyana', cq: '-', itu: '-' },
  { p: '9A', country: 'Croatia', cq: '-', itu: '-' },
  { p: '9G', country: 'Ghana', cq: '-', itu: '-' },
  { p: '9H', country: 'Malta', cq: '-', itu: '-' },
  { p: '9I', country: 'Zambia', cq: '-', itu: '-' },
  { p: '9J', country: 'Zambia', cq: '-', itu: '-' },
  { p: '9K', country: 'Kuwait', cq: '-', itu: '-' },
  { p: '9L', country: 'Sierra Leone', cq: '-', itu: '-' },
  { p: '9N', country: 'Nepal', cq: '-', itu: '-' },
  { p: '9Q', country: 'Democratic Republic of the Congo', cq: '-', itu: '-' },
  { p: '9R', country: 'Democratic Republic of the Congo', cq: '-', itu: '-' },
  { p: '9S', country: 'Democratic Republic of the Congo', cq: '-', itu: '-' },
  { p: '9T', country: 'Democratic Republic of the Congo', cq: '-', itu: '-' },
  { p: '9U', country: 'Burundi', cq: '-', itu: '-' },
  { p: '9V', country: 'Singapore', cq: '-', itu: '-' },
  { p: '9X', country: 'Rwanda', cq: '-', itu: '-' },
  { p: '9Y', country: 'Trinidad & Tobago', cq: '-', itu: '-' },
  { p: '9Z', country: 'Trinidad & Tobago', cq: '-', itu: '-' },
  { p: 'A2', country: 'Botswana', cq: '-', itu: '-' },
  { p: 'A3', country: 'Tonga', cq: '-', itu: '-' },
  { p: 'A4', country: 'Oman', cq: '-', itu: '-' },
  { p: 'A5', country: 'Bhutan', cq: '-', itu: '-' },
  { p: 'A6', country: 'United Arab Emirates', cq: '-', itu: '-' },
  { p: 'A7', country: 'Qatar', cq: '-', itu: '-' },
  { p: 'A9', country: 'Bahrain', cq: '-', itu: '-' },
  { p: 'AA', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AB', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AC', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AD', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AE', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AF', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AG', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AI', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AJ', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AK', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'AL', country: 'Alaska', cq: '-', itu: '-' },
  { p: 'AP', country: 'Pakistan', cq: '-', itu: '-' },
  { p: 'BU', country: 'Taiwan', cq: '-', itu: '-' },
  { p: 'BV', country: 'Taiwan', cq: '-', itu: '-' },
  { p: 'BW', country: 'Taiwan', cq: '-', itu: '-' },
  { p: 'BX', country: 'Taiwan', cq: '-', itu: '-' },
  { p: 'C2', country: 'Nauru', cq: '-', itu: '-' },
  { p: 'C3', country: 'Andorra', cq: '-', itu: '-' },
  { p: 'C4', country: 'Cyprus', cq: '-', itu: '-' },
  { p: 'C5', country: 'The Gambia', cq: '-', itu: '-' },
  { p: 'C6', country: 'Bahamas', cq: '-', itu: '-' },
  { p: 'C8', country: 'Mozambique', cq: '-', itu: '-' },
  { p: 'C9', country: 'Mozambique', cq: '-', itu: '-' },
  { p: 'CA', country: 'Chile', cq: '-', itu: '-' },
  { p: 'CB', country: 'Chile', cq: '-', itu: '-' },
  { p: 'CC', country: 'Chile', cq: '-', itu: '-' },
  { p: 'CD', country: 'Chile', cq: '-', itu: '-' },
  { p: 'CE', country: 'Chile', cq: '-', itu: '-' },
  { p: 'CM', country: 'Cuba', cq: '-', itu: '-' },
  { p: 'CN', country: 'Morocco', cq: '-', itu: '-' },
  { p: 'CO', country: 'Cuba', cq: '-', itu: '-' },
  { p: 'CP', country: 'Bolivia', cq: '-', itu: '-' },
  { p: 'CT', country: 'Portugal', cq: '-', itu: '-' },
  { p: 'CU', country: 'Azores', cq: '-', itu: '-' },
  { p: 'CV', country: 'Uruguay', cq: '-', itu: '-' },
  { p: 'CW', country: 'Uruguay', cq: '-', itu: '-' },
  { p: 'CX', country: 'Uruguay', cq: '-', itu: '-' },
  { p: 'D2', country: 'Angola', cq: '-', itu: '-' },
  { p: 'D3', country: 'Angola', cq: '-', itu: '-' },
  { p: 'D4', country: 'Cape Verde', cq: '-', itu: '-' },
  { p: 'D6', country: 'Comoros', cq: '-', itu: '-' },
  { p: 'DA', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DB', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DC', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DD', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DE', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DF', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DG', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DH', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DI', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DJ', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DK', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DL', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DM', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DN', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DO', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DP', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DQ', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DR', country: 'Germany', cq: '-', itu: '-' },
  { p: 'DU', country: 'Philippines', cq: '-', itu: '-' },
  { p: 'DV', country: 'Philippines', cq: '-', itu: '-' },
  { p: 'DW', country: 'Philippines', cq: '-', itu: '-' },
  { p: 'DX', country: 'Philippines', cq: '-', itu: '-' },
  { p: 'DY', country: 'Philippines', cq: '-', itu: '-' },
  { p: 'DZ', country: 'Philippines', cq: '-', itu: '-' },
  { p: 'E2', country: 'Thailand', cq: '-', itu: '-' },
  { p: 'E3', country: 'Eritrea', cq: '-', itu: '-' },
  { p: 'E4', country: 'Palestine', cq: '-', itu: '-' },
  { p: 'E5', country: 'North / South Cook Is.', cq: '-', itu: '-' },
  { p: 'E6', country: 'Niue', cq: '-', itu: '-' },
  { p: 'E7', country: 'Bosnia-Herzegovina', cq: '-', itu: '-' },
  { p: 'EA', country: 'Spain', cq: '-', itu: '-' },
  { p: 'EB', country: 'Spain', cq: '-', itu: '-' },
  { p: 'EC', country: 'Spain', cq: '-', itu: '-' },
  { p: 'ED', country: 'Spain', cq: '-', itu: '-' },
  { p: 'EE', country: 'Spain', cq: '-', itu: '-' },
  { p: 'EF', country: 'Spain', cq: '-', itu: '-' },
  { p: 'EG', country: 'Spain', cq: '-', itu: '-' },
  { p: 'EH', country: 'Spain', cq: '-', itu: '-' },
  { p: 'EI', country: 'Ireland', cq: '-', itu: '-' },
  { p: 'EJ', country: 'Ireland', cq: '-', itu: '-' },
  { p: 'EK', country: 'Armenia', cq: '-', itu: '-' },
  { p: 'EL', country: 'Liberia', cq: '-', itu: '-' },
  { p: 'EM', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'EN', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'EO', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'EP', country: 'Iran', cq: '-', itu: '-' },
  { p: 'EQ', country: 'Iran', cq: '-', itu: '-' },
  { p: 'ER', country: 'Moldova', cq: '-', itu: '-' },
  { p: 'ES', country: 'Estonia', cq: '-', itu: '-' },
  { p: 'ET', country: 'Ethiopia', cq: '-', itu: '-' },
  { p: 'EU', country: 'Belarus', cq: '-', itu: '-' },
  { p: 'EV', country: 'Belarus', cq: '-', itu: '-' },
  { p: 'EW', country: 'Belarus', cq: '-', itu: '-' },
  { p: 'EX', country: 'Kyrgyzstan', cq: '-', itu: '-' },
  { p: 'EY', country: 'Tajikistan', cq: '-', itu: '-' },
  { p: 'EZ', country: 'Turkmenistan', cq: '-', itu: '-' },
  { p: 'FG', country: 'Guadeloupe', cq: '-', itu: '-' },
  { p: 'FH', country: 'Mayotte', cq: '-', itu: '-' },
  { p: 'FJ', country: 'Saint Barthelemy', cq: '-', itu: '-' },
  { p: 'FK', country: 'New Caledonia / Chesterfield Is.', cq: '-', itu: '-' },
  { p: 'FM', country: 'Martinique', cq: '-', itu: '-' },
  { p: 'FO', country: 'French Polynesia / Austral / Marquesas / Clipperton', cq: '-', itu: '-' },
  { p: 'FP', country: 'St. Pierre & Miquelon', cq: '-', itu: '-' },
  { p: 'FR', country: 'Reunion I.', cq: '-', itu: '-' },
  { p: 'FS', country: 'Saint Martin', cq: '-', itu: '-' },
  { p: 'FW', country: 'Wallis & Futuna Is.', cq: '-', itu: '-' },
  { p: 'FY', country: 'French Guiana', cq: '-', itu: '-' },
  { p: 'GC', country: 'Wales', cq: '-', itu: '-' },
  { p: 'GD', country: 'Isle of Man', cq: '-', itu: '-' },
  { p: 'GH', country: 'Jersey', cq: '-', itu: '-' },
  { p: 'GI', country: 'Northern Ireland', cq: '-', itu: '-' },
  { p: 'GJ', country: 'Jersey', cq: '-', itu: '-' },
  { p: 'GM', country: 'Scotland', cq: '-', itu: '-' },
  { p: 'GN', country: 'Northern Ireland', cq: '-', itu: '-' },
  { p: 'GP', country: 'Guernsey', cq: '-', itu: '-' },
  { p: 'GS', country: 'Scotland', cq: '-', itu: '-' },
  { p: 'GT', country: 'Isle of Man', cq: '-', itu: '-' },
  { p: 'GU', country: 'Guernsey', cq: '-', itu: '-' },
  { p: 'GW', country: 'Wales', cq: '-', itu: '-' },
  { p: 'GX', country: 'England', cq: '-', itu: '-' },
  { p: 'H4', country: 'Solomon Is.', cq: '-', itu: '-' },
  { p: 'H6', country: 'Nicaragua', cq: '-', itu: '-' },
  { p: 'H7', country: 'Nicaragua', cq: '-', itu: '-' },
  { p: 'HA', country: 'Hungary', cq: '-', itu: '-' },
  { p: 'HB', country: 'Switzerland', cq: '-', itu: '-' },
  { p: 'HC', country: 'Ecuador', cq: '-', itu: '-' },
  { p: 'HD', country: 'Ecuador', cq: '-', itu: '-' },
  { p: 'HG', country: 'Hungary', cq: '-', itu: '-' },
  { p: 'HH', country: 'Haiti', cq: '-', itu: '-' },
  { p: 'HI', country: 'Dominican Republic', cq: '-', itu: '-' },
  { p: 'HJ', country: 'Colombia', cq: '-', itu: '-' },
  { p: 'HK', country: 'Colombia', cq: '-', itu: '-' },
  { p: 'HL', country: 'Republic of Korea', cq: '-', itu: '-' },
  { p: 'HO', country: 'Panama', cq: '-', itu: '-' },
  { p: 'HP', country: 'Panama', cq: '-', itu: '-' },
  { p: 'HQ', country: 'Honduras', cq: '-', itu: '-' },
  { p: 'HR', country: 'Honduras', cq: '-', itu: '-' },
  { p: 'HS', country: 'Thailand', cq: '-', itu: '-' },
  { p: 'HT', country: 'Nicaragua', cq: '-', itu: '-' },
  { p: 'HU', country: 'El Salvador', cq: '-', itu: '-' },
  { p: 'HV', country: 'Vatican', cq: '-', itu: '-' },
  { p: 'HZ', country: 'Saudi Arabia', cq: '-', itu: '-' },
  { p: 'J2', country: 'Djibouti', cq: '-', itu: '-' },
  { p: 'J3', country: 'Grenada', cq: '-', itu: '-' },
  { p: 'J5', country: 'Guinea-Bissau', cq: '-', itu: '-' },
  { p: 'J6', country: 'St. Lucia', cq: '-', itu: '-' },
  { p: 'J7', country: 'Dominica', cq: '-', itu: '-' },
  { p: 'J8', country: 'St. Vincent', cq: '-', itu: '-' },
  { p: 'JA', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JB', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JC', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JD', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JE', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JF', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JG', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JH', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JI', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JJ', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JK', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JL', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JM', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JN', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JO', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JP', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JQ', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JR', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JS', country: 'Japan', cq: '-', itu: '-' },
  { p: 'JT', country: 'Mongolia', cq: '-', itu: '-' },
  { p: 'JU', country: 'Mongolia', cq: '-', itu: '-' },
  { p: 'JV', country: 'Mongolia', cq: '-', itu: '-' },
  { p: 'JW', country: 'Svalbard', cq: '-', itu: '-' },
  { p: 'JX', country: 'Jan Mayen', cq: '-', itu: '-' },
  { p: 'JY', country: 'Jordan', cq: '-', itu: '-' },
  { p: 'KL', country: 'Alaska', cq: '-', itu: '-' },
  { p: 'LA', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LB', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LC', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LD', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LE', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LF', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LG', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LH', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LI', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LJ', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LK', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LL', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LM', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LN', country: 'Norway', cq: '-', itu: '-' },
  { p: 'LO', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LP', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LQ', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LR', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LS', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LT', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LU', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LV', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LW', country: 'Argentina', cq: '-', itu: '-' },
  { p: 'LX', country: 'Luxembourg', cq: '-', itu: '-' },
  { p: 'LY', country: 'Lithuania', cq: '-', itu: '-' },
  { p: 'LZ', country: 'Bulgaria', cq: '-', itu: '-' },
  { p: 'NL', country: 'Alaska', cq: '-', itu: '-' },
  { p: 'OA', country: 'Peru', cq: '-', itu: '-' },
  { p: 'OB', country: 'Peru', cq: '-', itu: '-' },
  { p: 'OC', country: 'Peru', cq: '-', itu: '-' },
  { p: 'OD', country: 'Lebanon', cq: '-', itu: '-' },
  { p: 'OE', country: 'Austria', cq: '-', itu: '-' },
  { p: 'OF', country: 'Finland', cq: '-', itu: '-' },
  { p: 'OG', country: 'Finland', cq: '-', itu: '-' },
  { p: 'OH', country: 'Finland', cq: '-', itu: '-' },
  { p: 'OI', country: 'Finland', cq: '-', itu: '-' },
  { p: 'OK', country: 'Czech Republic', cq: '-', itu: '-' },
  { p: 'OL', country: 'Czech Republic', cq: '-', itu: '-' },
  { p: 'OM', country: 'Slovak Republic', cq: '-', itu: '-' },
  { p: 'ON', country: 'Belgium', cq: '-', itu: '-' },
  { p: 'OO', country: 'Belgium', cq: '-', itu: '-' },
  { p: 'OP', country: 'Belgium', cq: '-', itu: '-' },
  { p: 'OQ', country: 'Belgium', cq: '-', itu: '-' },
  { p: 'OR', country: 'Belgium', cq: '-', itu: '-' },
  { p: 'OS', country: 'Belgium', cq: '-', itu: '-' },
  { p: 'OT', country: 'Belgium', cq: '-', itu: '-' },
  { p: 'OU', country: 'Denmark', cq: '-', itu: '-' },
  { p: 'OV', country: 'Denmark', cq: '-', itu: '-' },
  { p: 'OW', country: 'Denmark', cq: '-', itu: '-' },
  { p: 'OX', country: 'Greenland', cq: '-', itu: '-' },
  { p: 'OY', country: 'Faroe Is.', cq: '-', itu: '-' },
  { p: 'OZ', country: 'Denmark', cq: '-', itu: '-' },
  { p: 'P2', country: 'Papua New Guinea', cq: '-', itu: '-' },
  { p: 'P3', country: 'Cyprus', cq: '-', itu: '-' },
  { p: 'P4', country: 'Aruba', cq: '-', itu: '-' },
  { p: 'P5', country: 'DPR of Korea', cq: '-', itu: '-' },
  { p: 'PA', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PB', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PC', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PD', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PE', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PF', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PG', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PH', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PI', country: 'Netherlands', cq: '-', itu: '-' },
  { p: 'PP', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PQ', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PR', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PS', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PT', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PU', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PV', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PW', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PX', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PY', country: 'Brazil', cq: '-', itu: '-' },
  { p: 'PZ', country: 'Suriname', cq: '-', itu: '-' },
  { p: 'RA', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RB', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RC', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RD', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RE', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RF', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RG', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RH', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RI', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RJ', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RK', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RL', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RM', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RN', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RO', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RQ', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RT', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RU', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RV', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RW', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RX', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RY', country: 'Russia', cq: '-', itu: '-' },
  { p: 'RZ', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UA', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UB', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UC', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UD', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UE', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UF', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UG', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UH', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UI', country: 'Russia', cq: '-', itu: '-' },
  { p: 'UJ', country: 'Uzbekistan', cq: '-', itu: '-' },
  { p: 'UK', country: 'Uzbekistan', cq: '-', itu: '-' },
  { p: 'UL', country: 'Uzbekistan', cq: '-', itu: '-' },
  { p: 'UM', country: 'Uzbekistan', cq: '-', itu: '-' },
  { p: 'UN', country: 'Kazakhstan', cq: '-', itu: '-' },
  { p: 'UO', country: 'Kazakhstan', cq: '-', itu: '-' },
  { p: 'UP', country: 'Kazakhstan', cq: '-', itu: '-' },
  { p: 'UQ', country: 'Kazakhstan', cq: '-', itu: '-' },
  { p: 'UR', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'US', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'UT', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'UU', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'UV', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'UW', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'UX', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'UY', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'UZ', country: 'Ukraine', cq: '-', itu: '-' },
  { p: 'V2', country: 'Antigua & Barbuda', cq: '-', itu: '-' },
  { p: 'V3', country: 'Belize', cq: '-', itu: '-' },
  { p: 'V4', country: 'St. Kitts & Nevis', cq: '-', itu: '-' },
  { p: 'V5', country: 'Namibia', cq: '-', itu: '-' },
  { p: 'V6', country: 'Micronesia', cq: '-', itu: '-' },
  { p: 'V7', country: 'Marshall Is.', cq: '-', itu: '-' },
  { p: 'V8', country: 'Brunei Darussalam', cq: '-', itu: '-' },
  { p: 'VA', country: 'Canada', cq: '-', itu: '-' },
  { p: 'VE', country: 'Canada', cq: '-', itu: '-' },
  { p: 'VK', country: 'Australia', cq: '-', itu: '-' },
  { p: 'VO', country: 'Canada', cq: '-', itu: '-' },
  { p: 'VR', country: 'Hong Kong', cq: '-', itu: '-' },
  { p: 'VU', country: 'India', cq: '-', itu: '-' },
  { p: 'VY', country: 'Canada', cq: '-', itu: '-' },
  { p: 'WL', country: 'Alaska', cq: '-', itu: '-' },
  { p: 'XA', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XB', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XC', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XD', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XE', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XF', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XG', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XH', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XI', country: 'Mexico', cq: '-', itu: '-' },
  { p: 'XT', country: 'Burkina Faso', cq: '-', itu: '-' },
  { p: 'XU', country: 'Cambodia', cq: '-', itu: '-' },
  { p: 'XV', country: 'Viet Nam', cq: '-', itu: '-' },
  { p: 'XW', country: 'Laos', cq: '-', itu: '-' },
  { p: 'XY', country: 'Myanmar', cq: '-', itu: '-' },
  { p: 'XZ', country: 'Myanmar', cq: '-', itu: '-' },
  { p: 'YA', country: 'Afghanistan', cq: '-', itu: '-' },
  { p: 'YB', country: 'Indonesia', cq: '-', itu: '-' },
  { p: 'YC', country: 'Indonesia', cq: '-', itu: '-' },
  { p: 'YD', country: 'Indonesia', cq: '-', itu: '-' },
  { p: 'YE', country: 'Indonesia', cq: '-', itu: '-' },
  { p: 'YF', country: 'Indonesia', cq: '-', itu: '-' },
  { p: 'YG', country: 'Indonesia', cq: '-', itu: '-' },
  { p: 'YH', country: 'Indonesia', cq: '-', itu: '-' },
  { p: 'YI', country: 'Iraq', cq: '-', itu: '-' },
  { p: 'YJ', country: 'Vanuatu', cq: '-', itu: '-' },
  { p: 'YK', country: 'Syria', cq: '-', itu: '-' },
  { p: 'YL', country: 'Latvia', cq: '-', itu: '-' },
  { p: 'YN', country: 'Nicaragua', cq: '-', itu: '-' },
  { p: 'YO', country: 'Romania', cq: '-', itu: '-' },
  { p: 'YP', country: 'Romania', cq: '-', itu: '-' },
  { p: 'YQ', country: 'Romania', cq: '-', itu: '-' },
  { p: 'YR', country: 'Romania', cq: '-', itu: '-' },
  { p: 'YS', country: 'El Salvador', cq: '-', itu: '-' },
  { p: 'YT', country: 'Serbia', cq: '-', itu: '-' },
  { p: 'YU', country: 'Serbia', cq: '-', itu: '-' },
  { p: 'YV', country: 'Venezuela', cq: '-', itu: '-' },
  { p: 'YW', country: 'Venezuela', cq: '-', itu: '-' },
  { p: 'YX', country: 'Venezuela', cq: '-', itu: '-' },
  { p: 'YY', country: 'Venezuela', cq: '-', itu: '-' },
  { p: 'Z2', country: 'Zimbabwe', cq: '-', itu: '-' },
  { p: 'Z3', country: 'North Macedonia', cq: '-', itu: '-' },
  { p: 'Z6', country: 'Kosovo', cq: '-', itu: '-' },
  { p: 'Z8', country: 'South Sudan', cq: '-', itu: '-' },
  { p: 'ZA', country: 'Albania', cq: '-', itu: '-' },
  { p: 'ZF', country: 'Cayman Is.', cq: '-', itu: '-' },
  { p: 'ZL', country: 'New Zealand', cq: '-', itu: '-' },
  { p: 'ZM', country: 'New Zealand', cq: '-', itu: '-' },
  { p: 'ZP', country: 'Paraguay', cq: '-', itu: '-' },
  { p: 'ZR', country: 'South Africa', cq: '-', itu: '-' },
  { p: 'ZS', country: 'South Africa', cq: '-', itu: '-' },
  { p: 'ZT', country: 'South Africa', cq: '-', itu: '-' },
  { p: 'ZU', country: 'South Africa', cq: '-', itu: '-' },
  { p: 'B', country: 'China', cq: '-', itu: '-' },
  { p: 'F', country: 'France', cq: '-', itu: '-' },
  { p: 'G', country: 'England', cq: '-', itu: '-' },
  { p: 'I', country: 'Italy', cq: '-', itu: '-' },
  { p: 'K', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'M', country: 'England', cq: '-', itu: '-' },
  { p: 'N', country: 'United States of America', cq: '-', itu: '-' },
  { p: 'R', country: 'Russia', cq: '-', itu: '-' },
  { p: 'W', country: 'United States of America', cq: '-', itu: '-' },
].sort((a,b)=>b.p.length-a.p.length);

const qcodes = {
  QAZ:'Schalte wegen Gewitter ab',
  QRA:'Name der Funkstelle',
  QRB:'Entfernung zwischen Funkstellen',
  QRG:'Ihre genaue Frequenz ist … kHz',
  QRH:'Frequenzabweichung',
  QRI:'Tonhöhe',
  QRJ:'Zeichen zu schwach, Verbindung nicht möglich',
  QRK:'Lesbarkeit der Zeichen (1 bis 5)',
  QRL:'Bin beschäftigt, bitte nicht stören',
  QRM:'Werde durch andere Sender gestört',
  QRN:'Habe Störungen durch Statik',
  QRO:'Erhöhe die Sendeleistung',
  QRP:'Vermindere die Sendeleistung',
  QRQ:'Erhöhe das Morsetempo',
  QRR:'Automatischer Betrieb',
  QRS:'Vermindere das Morsetempo',
  QRT:'Ende der Sendung / Sendebetrieb einstellen',
  QRU:'Habe keine Meldungen vorliegen',
  QRV:'Bin empfangsbereit / betriebsbereit',
  QRW:'Bitte informieren',
  QRX:'Bitte warten / ich rufe später',
  QRY:'Reihe / turn',
  QRZ:'Wer ruft mich? / Sie werden gerufen von …',
  QSA:'Signalstärke',
  QSB:'Ihr Signal hat Fading (Schwund)',
  QSD:'Tastung mangelhaft, schwer lesbare Morsezeichen',
  QSG:'Senden Sie … Telegramme gleichzeitig',
  QSK:'Kann zwischen meinen Zeichen hören',
  QSL:'Empfang bestätigt / QSL-Karte',
  QSLL:'Nach Erhalt Ihrer QSL-Karte sende ich meine via Büro',
  QSM:'Wiederholen letztes Telegramm',
  QSN:'Haben Sie mich gehört?',
  QSO:'Funkverbindung / Kann mit … in Verbindung treten',
  QSP:'Kann übermitteln an …',
  QSQ:'QSL-Karte weiterleiten',
  QSR:'Wiederholungsfrequenz',
  QSS:'Arbeitsfrequenz ändern',
  QSU:'Senden auf dieser Frequenz',
  QSV:'Eine Reihe von Signalen senden',
  QSW:'Senden auf dieser Frequenz',
  QSX:'Höre auf anderer Frequenz / höre … auf … kHz',
  QSY:'Frequenzwechsel auf … kHz',
  QSZ:'Jedes Wort oder jede Gruppe senden',
  QTA:'Telegramm annullieren',
  QTB:'Mit meinem QRG nicht einverstanden?',
  QTC:'Habe Nachrichten für Sie',
  QTH:'Mein Standort ist … / Standort',
  QTI:'Eigene Sendung',
  QTJ:'Geschwindigkeit',
  QTK:'Abhören',
  QTL:'Kurs',
  QTM:'Sende mit …',
  QTN:'Abfahrtszeit',
  QTO:'Ausgangsort',
  QTP:'In Hafen einlaufen?',
  QTQ:'Signal geben',
  QTR:'Die genaue Zeit ist … UTC',
  QTS:'Kurs oder Peilung',
  QTU:'Öffnungszeiten',
  QTV:'Wache halten',
  QTW:'Stand der Überlebenden',
  QTX:'Bleiben Sie auf Empfang',
  QUA:'Haben Sie Nachricht von …?',
  QUB:'Sicht gut?',
  QUC:'Letztes Signal',
  QUD:'Normale Priorität erhalten?',
  QUE:'Sichtblende links?',
  QUF:'Notsignal empfangen?',
  QUH:'Druck',
  QUI:'Lichter einschalten?',
  QUJ:'Kurs',
  QUK:'Sichtblende rechts?',
  QUL:'Ruderdrehung links?',
  QUM:'Normale Reihenfolge wieder aufnehmen',
  QUN:'Schiffe im Hafen',
  QUO:'Kurs des Schiffes',
  QUP:'Position',
  QUQ:'Ankerplatz',
  QUR:'Verletzte',
  QUS:'Strömung / Surface current',
  QUT:'Landeplatz markieren',
  QUU:'Richtung Wind',
  QUV:'Suchgebiet',
  QUW:'Auf Überlebende gerichtet',
  QUX:'Gegenwind',
  QUY:'Position der Bake',
  QUZ:'Ruder rechts?'
};

function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

function timezoneForLatLon(lat, lon) {
  try { return tzLookup(lat, lon); } catch { return null; }
}

function fmtTimeForTimezone(timeZone) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone
    }).format(new Date());
  } catch { return '-'; }
}

function fmtDateForTimezone(timeZone) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone
    }).format(new Date());
  } catch { return '-'; }
}

function fmtUtcTime() {
  const now = new Date();
  return now.toUTCString().slice(17, 25) + ' UTC';
}

function maiden(lat, lon, precision = 3) {
  lon += 180; lat += 90;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let loc = '';
  loc += A[Math.floor(lon / 20)];
  loc += A[Math.floor(lat / 10)];
  loc += Math.floor((lon % 20) / 2);
  loc += Math.floor(lat % 10);
  if (precision >= 3) {
    loc += A[Math.floor((lon % 2) * 12)];
    loc += A[Math.floor((lat % 1) * 24)];
  }
  return loc;
}

function latlonToLocator(lat, lon, precision = 3) {
  return maiden(lat, lon, precision);
}

function maidenToLatLon(grid) {
  grid = grid.trim().toUpperCase();
  if (!/^[A-R]{2}\d{2}[A-X]{0,2}$/.test(grid)) return null;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lon = A.indexOf(grid[0]) * 20 - 180;
  let lat = A.indexOf(grid[1]) * 10 - 90;
  lon += parseInt(grid[2], 10) * 2;
  lat += parseInt(grid[3], 10);
  let lonSize = 2, latSize = 1;
  if (grid.length >= 6) {
    lon += A.indexOf(grid[4]) / 12;
    lat += A.indexOf(grid[5]) / 24;
    lonSize = 1 / 12; latSize = 1 / 24;
  }
  lon += lonSize / 2;
  lat += latSize / 2;
  return [lat, lon];
}

function parseCoords(s) {
  if (!s) return null;
  s = s.trim().toUpperCase().replace(/\s+/g, ' ').replace(/,\s*/g, ', ').trim();

  let m = s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];

  m = s.match(/(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*(\d{1,2}(?:\.\d+)?)\s*"\s*([NS])\s*(?:\||,)?\s*(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*(\d{1,2}(?:\.\d+)?)\s*"\s*([EW])/);
  if (m) {
    let lat = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
    let lon = Number(m[5]) + Number(m[6]) / 60 + Number(m[7]) / 3600;
    if (m[4] === 'S') lat = -lat;
    if (m[8] === 'W') lon = -lon;
    return [lat, lon];
  }

  m = s.match(/(\d{1,3})\s*°\s*(\d{1,2}(?:\.\d+)?)\s*'\s*([NS])\s*(?:\||,)?\s*(\d{1,3})\s*°\s*(\d{1,2}(?:\.\d+)?)\s*'\s*([EW])/);
  if (m) {
    let lat = Number(m[1]) + Number(m[2]) / 60;
    let lon = Number(m[4]) + Number(m[5]) / 60;
    if (m[3] === 'S') lat = -lat;
    if (m[6] === 'W') lon = -lon;
    return [lat, lon];
  }
  return null;
}

function fmtDMS(dec, isLat) {
  const dir = dec >= 0 ? (isLat ? 'N' : 'E') : (isLat ? 'S' : 'W');
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(2);
  return `${deg}° ${min}' ${sec}" ${dir}`;
}

function fmtDDM(dec, isLat) {
  const dir = dec >= 0 ? (isLat ? 'N' : 'E') : (isLat ? 'S' : 'W');
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(4);
  return `${deg}° ${min}' ${dir}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => (r * 180 / Math.PI + 360) % 360;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return toDeg(Math.atan2(y, x));
}

function bearingText(deg) {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function bandRecommendation(distanceKm) {
  const hour = new Date().getHours();
  const day = hour >= 7 && hour < 19;
  if (distanceKm < 30) return { band: '2 m / 70 cm', reason: tr('localShort') };
  if (distanceKm < 150) return { band: day ? '2 m / 70 cm or 10 m' : '80 m / 40 m', reason: tr('regional') };
  if (distanceKm < 500) return { band: day ? '20 m / 15 m' : '40 m / 80 m', reason: tr('medium') };
  if (distanceKm < 1500) return { band: day ? '20 m / 17 m' : '40 m', reason: tr('classicDx') };
  if (distanceKm < 4000) return { band: day ? '20 m / 15 m / 10 m' : '40 m / 30 m', reason: tr('wide') };
  return { band: day ? '20 m / 15 m / 10 m' : '40 m / 20 m', reason: tr('veryWide') };
}

async function reverseGeocode(lat, lon) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('addressdetails', '1');
  try {
    const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, 12000);
    if (!res.ok) throw new Error('Geocoding fehlgeschlagen');
    const j = await res.json();
    const a = j.address || {};
    return {
      country: a.country || '-',
      city: a.city || a.town || a.village || a.hamlet || a.county || '-',
      street: composeStreet(a, j.name || '', j.display_name || '')
    };
  } catch {}
  try {
    return await photonReverse(lat, lon);
  } catch {}
  try {
    const u = new URL('https://geocode.maps.co/reverse');
    u.searchParams.set('lat', String(lat));
    u.searchParams.set('lon', String(lon));
    const res = await fetchWithTimeout(u, { headers: { 'Accept': 'application/json' } }, 12000);
    if (!res.ok) throw new Error('Reverse geocoding failed');
    const j = await res.json();
    const a = j.address || {};
    return {
      country: a.country || '-',
      city: a.city || a.town || a.village || a.hamlet || a.county || '-',
      street: composeStreet(a, j.name || '', j.display_name || '')
    };
  } catch {}
  throw new Error('Reverse geocoding failed');
}

function normalizeAddressQuery(query) {
  return String(query || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}


function splitDisplayName(displayName) {
  const parts = String(displayName || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  return parts.slice(0, 3).join(', ');
}

function addressVariants(query) {
  const base = normalizeAddressQuery(query);
  if (!base) return [];
  const variants = new Set([base]);
  const deNorm = base
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss');
  variants.add(deNorm);
  if (!/,\s*(germany|deutschland)$/i.test(base)) {
    variants.add(`${base}, Germany`);
    variants.add(`${base}, Deutschland`);
  }
  return [...variants].filter(Boolean);
}

async function nominatimSearch(query, limit = 5) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('accept-language', state.lang === 'de' ? 'de,en' : 'en,de');
  url.searchParams.set('q', query);
  const res = await fetchWithTimeout(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Language': state.lang === 'de' ? 'de,en;q=0.9' : 'en,de;q=0.9'
    }
  }, 12000);
  if (!res.ok) throw new Error('Adresssuche fehlgeschlagen');
  return await res.json();
}

function mapAddressCandidate(item) {
  const a = item?.address || {};
  const country = a.country || '-';
  const city = a.city || a.town || a.village || a.hamlet || a.county || '-';
  const street = ((a.road || '') + (a.house_number ? ' ' + a.house_number : '')).trim() || item?.name || '-';
  return {
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    display: item.display_name || `${street}, ${city}, ${country}`,
    country,
    city,
    street,
  };
}

async function geocodeAddressCandidates(query) {
  const variants = addressVariants(query);
  const out = [];
  const seen = new Set();
  let lastErr = null;
  for (const variant of variants) {
    try {
      const data = await nominatimSearch(variant, 6);
      if (!Array.isArray(data)) continue;
      for (const item of data) {
        const hit = mapAddressCandidate(item);
        if (!Number.isFinite(hit.lat) || !Number.isFinite(hit.lon)) continue;
        const key = `${hit.lat.toFixed(6)},${hit.lon.toFixed(6)}|${hit.display}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(hit);
      }
      if (out.length >= 5) break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!out.length) {
    for (const variant of variants) {
      try {
        const data = await photonSearch(variant, 6);
        for (const hit of data) {
          const key = `${hit.lat.toFixed(6)},${hit.lon.toFixed(6)}|${hit.display}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(hit);
        }
        if (out.length >= 5) break;
      } catch (err) {
        lastErr = err;
      }
    }
  }
  if (!out.length) {
    if (lastErr) throw lastErr;
    throw new Error('Adresse nicht gefunden');
  }
  return out.slice(0, 5);
}

async function geocodeAddress(query) {
  const hits = await geocodeAddressCandidates(query);
  return hits[0];
}


function mapPhotonCandidate(item) {
  const props = item?.properties || {};
  const coords = item?.geometry?.coordinates || [];
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  const parts = [props.name, props.street, props.housenumber, props.postcode, props.city || props.town || props.village, props.country].filter(Boolean);
  return {
    lat, lon,
    display: parts.join(', '),
    country: props.country || '-',
    city: props.city || props.town || props.village || '-',
    street: [props.street, props.housenumber].filter(Boolean).join(' ') || props.name || '-',
    locator: latlonToLocator(lat, lon)
  };
}

async function photonSearch(query, limit = 6) {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  if (state.lang === 'de') url.searchParams.set('lang', 'de');
  const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, 12000);
  if (!res.ok) throw new Error('Photon-Suche fehlgeschlagen');
  const json = await res.json();
  return Array.isArray(json?.features) ? json.features.map(mapPhotonCandidate).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon)) : [];
}

function googleMapsUrl(lat, lon) {
  return `https://maps.google.com/?q=${lat},${lon}`;
}

function routeMapUrl(lat1, lon1, lat2, lon2) {
  return `https://www.google.com/maps/dir/${lat1},${lon1}/${lat2},${lon2}`;
}

async function copyTextValue(value) {
  const text = String(value || '').trim();
  if (!text || text === '-') return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

function bindCoordinateFieldCopies() {
  ['myLocator','fmtDms','fmtDdm'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.cursor = 'pointer';
    el.title = state.lang === 'de' ? 'Zum Kopieren antippen' : 'Tap to copy';
    el.onclick = () => copyTextValue(el.textContent);
  });
}

function myDataText() {
  const country = document.getElementById('myCountry')?.textContent || '-';
  const city = document.getElementById('myCity')?.textContent || '-';
  const street = document.getElementById('myStreet')?.textContent || '-';
  const gmaps = document.getElementById('gmapsLink')?.href || '-';
  return [
    `Name: ${state.myName || '-'}`,
    `Rufzeichen: ${state.myCallsign || '-'}`,
    `Land: ${country}`,
    `Stadt: ${city}`,
    `Straße: ${street}`,
    `Google Koordinaten: ${gmaps}`
  ].join('\n');
}

function editMyName() {
  const current = state.myName || '';
  const val = window.prompt(current ? `${tr('promptName')}\n${current}` : tr('promptName'), current);
  if (val === null) return;
  state.myName = val.trim();
  localStorage.setItem('myName', state.myName);
  const btn = document.getElementById('myNameBtn');
  if (btn) btn.textContent = state.myName || 'Name eingeben';
}

function editMyCallsign() {
  const current = state.myCallsign || '';
  const val = window.prompt(current ? `${tr('promptCallsign')}\n${current}` : tr('promptCallsign'), current);
  if (val === null) return;
  state.myCallsign = val.trim().toUpperCase();
  localStorage.setItem('myCallsign', state.myCallsign);
  const btn = document.getElementById('myCallsignBtn');
  if (btn) btn.textContent = state.myCallsign || 'Rufzeichen eingeben';
}


const translations = {
  de: {
    subtitle: "Mit Distanz, Richtung, Karte und Bandempfehlung.",
    nameEnter: "Name eingeben",
    callsignEnter: "Rufzeichen eingeben",
    theme: "☀️ / 🌙",
    myLocation: "Mein Standort",
    gpsGet: "GPS holen",
    gpsClear: "Reset",
    copyBlock: "Block kopieren",
    share: "Teilen",
    copyLocator: "Locator kopieren",
    notLoaded: "nicht geladen",
    addressPlaceholder: "Adresse eingeben, um den Locator zu berechnen",
    addressToLocator: "Adresse → Locator",
    country: "Land",
    city: "Stadt",
    street: "Straße",
    locator: "Locator",
    locatorTime: "Locator Zeit",
    locatorDate: "Locator Datum",
    gpsTime: "GPS-Standort Zeit",
    gpsDate: "GPS-Standort Datum",
    utcTime: "UTC Zeit",
    utcDate: "UTC Datum",
    googleCoords: "Google Koordinaten",
    decimalDegrees: "Dezimalgrad",
    dms: "Grad Minuten Sekunden",
    ddm: "Grad Dezimalminuten",
    remote: "Gegenstation / Kürzel / Landeskenner / Locator",
    remoteAddressPlaceholder: "Adresse der Gegenstation eingeben",
    remoteAddressToLocator: "Adresse Gegenstation → Karte / Distanz",
    remoteReset: "Reset",
    remoteInput: "Rufzeichen, Q-Code, Landeskenner oder Locator",
    remotePlaceholder: "z. B. DL1ABC, QSO, HB oder JO31QH",
    coordsField: "Koordinatenfeld",
    coordsPlaceholder: "Dezimalgrad, DMS oder Grad/Dezimalminuten",
    bnetza: "BNetzA öffnen",
    openMap: "Karte öffnen",
    countryMeaning: "Land / Bedeutung",
    cqitu: "CQ / ITU / Locator",
    note: "Hinweis",
    distance: "Entfernung",
    bearing: "Richtung / Azimut",
    bandRec: "Band / Frequenz Empfehlung",
    map: "Karte",
    routeMap: "Route / Karte öffnen",
    qCode: "Q-Code",
    qCodeDetected: "Q-Code erkannt",
    locatorDetected: "Locator erkannt",
    callsignDetected: "Rufzeichen erkannt",
    coordsDetected: "Koordinaten erkannt",
    addressDetected: "Adresse erkannt",
    coordsUnknown: "Koordinatenformat nicht erkannt",
    reverseFailed: "Reverse-Geocoding fehlgeschlagen",
    setGpsFirst: "erst GPS/Adresse setzen",
    gpsWaiting: "warte...",
    gpsLoaded: "geladen",
    gpsDeleted: "gelöscht",
    gpsDenied: "Standortberechtigung wurde nicht erteilt.",
    gpsErrorPrefix: "GPS-Fehler: ",
    addressSearching: "suche...",
    addressLoaded: "Adresse geladen",
    addressErrorPrefix: "Adresssuche: ",
    enterAddressFirst: "Bitte zuerst eine Adresse eingeben.",
    shareDialog: "Daten teilen",
    shareFallback: "Teilen nicht direkt verfügbar. Block wurde in die Zwischenablage kopiert.",
    promptName: "Name eingeben oder ändern:",
    promptCallsign: "Rufzeichen eingeben oder ändern:",
    localShort: "sehr kurze Distanz, lokal am einfachsten",
    regional: "regionaler Bereich",
    medium: "mittlere Distanz",
    classicDx: "klassischer DX-Bereich",
    wide: "weite Entfernung",
    veryWide: "sehr weite DX-Verbindung"
  },
  en: {
    subtitle: "With distance, bearing, map and band recommendation.",
    nameEnter: "Enter name",
    callsignEnter: "Enter callsign",
    theme: "☀️ / 🌙",
    myLocation: "My location",
    gpsGet: "Get GPS",
    gpsClear: "Reset",
    copyBlock: "Copy block",
    share: "Share",
    copyLocator: "Copy locator",
    notLoaded: "not loaded",
    addressPlaceholder: "Enter address to calculate the locator",
    addressToLocator: "Address → Locator",
    country: "Country",
    city: "City",
    street: "Street",
    locator: "Locator",
    locatorTime: "Locator time",
    locatorDate: "Locator date",
    gpsTime: "GPS location time",
    gpsDate: "GPS location date",
    utcTime: "UTC time",
    utcDate: "UTC date",
    googleCoords: "Google coordinates",
    decimalDegrees: "Decimal degrees",
    dms: "Degrees Minutes Seconds",
    ddm: "Degrees Decimal Minutes",
    remote: "Remote station / abbreviation / prefix / locator",
    remoteAddressPlaceholder: "Enter counterstation address",
    remoteAddressToLocator: "Counterstation address → map / distance",
    remoteReset: "Reset",
    remoteInput: "Callsign, Q-code, prefix or locator",
    remotePlaceholder: "e.g. DL1ABC, QSO, HB or JO31QH",
    coordsField: "Coordinates field",
    coordsPlaceholder: "Decimal, DMS or degrees/decimal minutes",
    bnetza: "Open BNetzA",
    openMap: "Open map",
    countryMeaning: "Country / meaning",
    cqitu: "CQ / ITU / Locator",
    note: "Note",
    distance: "Distance",
    bearing: "Bearing / azimuth",
    bandRec: "Band / frequency recommendation",
    map: "Map",
    routeMap: "Open route / map",
    qCode: "Q-Code",
    qCodeDetected: "Q-code detected",
    locatorDetected: "Locator detected",
    callsignDetected: "Callsign detected",
    coordsDetected: "Coordinates detected",
    addressDetected: "Address detected",
    coordsUnknown: "Coordinate format not recognized",
    reverseFailed: "Reverse geocoding failed",
    setGpsFirst: "set GPS/address first",
    gpsWaiting: "waiting...",
    gpsLoaded: "loaded",
    gpsDeleted: "deleted",
    gpsDenied: "Location permission was not granted.",
    gpsErrorPrefix: "GPS error: ",
    addressSearching: "searching...",
    addressLoaded: "Address loaded",
    addressErrorPrefix: "Address lookup: ",
    enterAddressFirst: "Please enter an address first.",
    shareDialog: "Share data",
    shareFallback: "Direct sharing is not available. The block was copied to the clipboard.",
    promptName: "Enter or change name:",
    promptCallsign: "Enter or change callsign:",
    localShort: "very short distance, easiest locally",
    regional: "regional range",
    medium: "medium distance",
    classicDx: "classic DX range",
    wide: "long distance",
    veryWide: "very long DX distance"
  },
  fr: {
    subtitle: "Avec distance, azimut, carte et recommandation de bande.",
    nameEnter: "Entrer le nom",
    callsignEnter: "Entrer l'indicatif",
    theme: "🌙 / ☀️ Thème",
    myLocation: "Ma position",
    gpsGet: "Obtenir GPS",
    gpsClear: "Effacer GPS",
    copyBlock: "Copier le bloc",
    share: "Partager",
    copyLocator: "Copier le locator",
    notLoaded: "non chargé",
    addressPlaceholder: "Entrer une adresse pour calculer le locator",
    addressToLocator: "Adresse → Locator",
    country: "Pays",
    city: "Ville",
    street: "Rue",
    locator: "Locator",
    locatorTime: "Heure du locator",
    locatorDate: "Date du locator",
    gpsTime: "Heure de la position GPS",
    gpsDate: "Date de la position GPS",
    utcTime: "Heure UTC",
    googleCoords: "Coordonnées Google",
    decimalDegrees: "Degrés décimaux",
    dms: "Degrés Minutes Secondes",
    ddm: "Degrés Minutes décimales",
    remote: "Station distante / abréviation / préfixe / locator",
    remoteInput: "Indicatif, Q-code, préfixe ou locator",
    remotePlaceholder: "p. ex. DL1ABC, QSO, HB ou JO31QH",
    coordsField: "Champ coordonnées",
    coordsPlaceholder: "Décimal, DMS ou degrés/minutes décimales",
    bnetza: "Ouvrir BNetzA",
    openMap: "Ouvrir la carte",
    countryMeaning: "Pays / signification",
    cqitu: "CQ / ITU / Locator",
    note: "Remarque",
    distance: "Distance",
    bearing: "Direction / azimut",
    bandRec: "Recommandation bande / fréquence",
    legalRec: "Autorisé N / E / A",
    map: "Carte",
    routeMap: "Ouvrir l'itinéraire / la carte",
    qCode: "Q-Code",
    qCodeDetected: "Q-code détecté",
    locatorDetected: "Locator détecté",
    callsignDetected: "Indicatif détecté",
    coordsDetected: "Coordonnées détectées",
    coordsUnknown: "Format de coordonnées non reconnu",
    reverseFailed: "Échec du géocodage inverse",
    setGpsFirst: "définir GPS/adresse d'abord",
    gpsWaiting: "attente...",
    gpsLoaded: "chargé",
    gpsDeleted: "supprimé",
    gpsDenied: "L'autorisation de localisation n'a pas été accordée.",
    gpsErrorPrefix: "Erreur GPS : ",
    addressSearching: "recherche...",
    addressLoaded: "Adresse chargée",
    addressErrorPrefix: "Recherche d'adresse : ",
    enterAddressFirst: "Veuillez d'abord entrer une adresse.",
    shareDialog: "Partager les données",
    shareFallback: "Le partage direct n'est pas disponible. Le bloc a été copié dans le presse-papiers.",
    promptName: "Entrer ou modifier le nom :",
    promptCallsign: "Entrer ou modifier l'indicatif :",
    localShort: "très courte distance, le plus simple en local",
    regional: "portée régionale",
    medium: "distance moyenne",
    classicDx: "portée DX classique",
    wide: "longue distance",
    veryWide: "très longue distance DX"
  }
};

function tr(key) {
  const dict = translations[state.lang] || translations.de;
  return dict[key] || translations.de[key] || key;
}


Object.assign(translations.de, {
  tabTools: 'Tools',
  tabBands: 'Bandempfehlung',
  tabClasses: 'DE Klassen',
  tabProp: 'Propagation',
  tabWeather: 'Wetter',
  bandEngineTitle: 'Bandempfehlung nach Standort, Tageszeit und Funkwetter',
  bandEngineText: 'Die Empfehlung nutzt deinen gesetzten Standort oder eine eingegebene Adresse. Rufzeichen sind dafür nicht nötig.',
  envMissing: 'Bitte zuerst GPS holen oder eine Adresse setzen.',
  refreshData: 'Daten aktualisieren',
  solarWeather: 'Funkwetter / Wetter',
  season: 'Jahreszeit',
  daylight: 'Tagesphase',
  bestBandsNow: 'Beste Bänder jetzt',
  likelyBandsLater: 'Später interessant',
  whyNow: 'Warum gerade jetzt',
  noDataYet: 'Noch keine Daten geladen',
  genericNotice: 'Allgemeine Empfehlung. Rechtlich maßgeblich bleibt der jeweilige nationale Bandplan.',
  dePlanTitle: 'Kurzer Band- und Frequenzplan für Deutschland',
  classN: 'Klasse N',
  classE: 'Klasse E',
  classA: 'Klasse A',
  privileges: 'Bänder / Bereiche',
  power: 'Leistung',
  usage: 'Typisch gut für',
  propagationTitle: 'Propagation nach HamQSL-Vorbild',
  hfCond: 'HF Conditions',
  vhfCond: 'VHF Conditions',
  updated: 'Aktualisiert',
  source: 'Quelle',
  weatherTitle: 'Wetter am gesetzten Standort',
  temperature: 'Temperatur',
  wind: 'Wind',
  cloudcover: 'Bewölkung',
  precipitation: 'Niederschlag',
  sunrise: 'Sonnenaufgang',
  sunset: 'Sonnenuntergang',
  weatherNote: 'Wetter beeinflusst nicht direkt die Ionosphäre, ist aber wichtig für Portabelbetrieb, Sicherheit und Tageslicht.',
  loading: 'lädt...',
  fair: 'mäßig',
  good: 'gut',
  poor: 'schlecht',
  excellent: 'sehr gut',
  closed: 'geschlossen',
  currentLocationLabel: 'Aktueller Referenz-Standort',
  de6mNote: 'Hinweis: 6 m ist seit 2026 nicht mehr per Duldung für Klasse E freigegeben.',
  useAddressTip: 'Tipp: Über die Adresssuche kannst du jeden Ort weltweit als Basis für die Empfehlung setzen.',
  classSummary: 'Kurzprofil',
  classBands: 'Bänder',
  classFreqs: 'Frequenzen',
  classPower: 'Leistung',
  classBestFor: 'Gut für',
  classNTagline: 'Einstieg auf 10 m, 2 m und 70 cm',
  classNBandList: '10 m · 2 m · 70 cm',
  classNFreqs: '28.0–29.7 · 144–146 · 430–440 MHz',
  classNPower: '10 W ERP auf 10 m · 10 W EIRP auf 2 m / 70 cm',
  classNBestFor: 'Einstieg, lokal, Relais, erste 10-m-DX-Chancen',
  classETagline: 'KW plus VHF/UHF mit mittlerer Leistung',
  classEBandList: '160 m · 80 m · 15 m · 10 m · 2 m · 70 cm · 23 cm',
  classEFreqs: '1.810–1.850 · 3.500–3.800 · 21.0–21.45 · 28.0–29.7 · 144–146 · 430–440 · 1240–1300 MHz',
  classEPower: 'meist bis 100 W PEP',
  classEBestFor: 'Portabel, SSB/CW/Digital, regional und DX',
  classATagline: 'Volle deutsche Amateurfunkklasse',
  classABandList: 'alle deutschen Amateurfunkbänder',
  classAFreqs: 'z. B. 1.810–2.000 · 3.500–3.800 · 7.000–7.200 · 14.0–14.35 · 21.0–21.45 · 28.0–29.7 · 50–52 · 144–146 · 430–440 MHz',
  classAPower: 'meist bis 750 W PEP',
  classABestFor: 'maximale Flexibilität auf HF, VHF, UHF und darüber',
  tabGpsInfo: 'GPS / GNSS',
  heading: 'Kompass',
  gpsInfoTitle: 'GPS / GNSS Informationen',
  gpsInfoText: 'Standort- und Satellitendaten des aktuellen GPS / GNSS-Fix.',
  visibleSatellites: 'Sichtbare Satelliten',
  usedSatellites: 'Genutzte Satelliten',
  provider: 'Provider',
  accuracyLabel: 'Genauigkeit',
  altitudeLabel: 'Höhe',
  speedLabel: 'Geschwindigkeit',
  bearingLabel: 'Kurs',
  lastFix: 'Letzter Fix',
  satelliteSystems: 'Satellitensysteme',
  satelliteBars: 'Satelliten-Signalbalken',
  inViewUsed: 'Im Blick / genutzt',
  snrLabel: 'SNR',
  noGnssData: 'Noch keine GNSS-Daten geladen',
  headingWaiting: 'noch kein Kompass',
  headingUnavailable: 'Kompass nicht verfügbar',
  gpsInfoNote: 'Satellitendetails hängen vom Gerät und Android-Laufzeitsupport ab.'
});

Object.assign(translations.en, {
  tabTools: 'Tools',
  tabBands: 'Band recommendation',
  tabClasses: 'DE classes',
  tabProp: 'Propagation',
  tabWeather: 'Weather',
  bandEngineTitle: 'Band recommendation by location, time of day and radio weather',
  bandEngineText: 'This uses your current position or an entered address. A callsign is not required.',
  envMissing: 'Please get GPS or set an address first.',
  refreshData: 'Refresh data',
  solarWeather: 'Radio weather / weather',
  season: 'Season',
  daylight: 'Day phase',
  bestBandsNow: 'Best bands now',
  likelyBandsLater: 'Interesting later',
  whyNow: 'Why right now',
  noDataYet: 'No data loaded yet',
  genericNotice: 'General recommendation. The national band plan remains legally decisive.',
  dePlanTitle: 'Short band and frequency plan for Germany',
  classN: 'Class N',
  classE: 'Class E',
  classA: 'Class A',
  privileges: 'Bands / ranges',
  power: 'Power',
  usage: 'Typically good for',
  propagationTitle: 'Propagation in HamQSL style',
  hfCond: 'HF Conditions',
  vhfCond: 'VHF Conditions',
  updated: 'Updated',
  source: 'Source',
  weatherTitle: 'Weather at the selected location',
  temperature: 'Temperature',
  wind: 'Wind',
  cloudcover: 'Cloud cover',
  precipitation: 'Precipitation',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  weatherNote: 'Weather does not directly drive the ionosphere, but it matters for portable operation, safety and daylight.',
  loading: 'loading...',
  fair: 'fair',
  good: 'good',
  poor: 'poor',
  excellent: 'excellent',
  closed: 'closed',
  currentLocationLabel: 'Current reference location',
  de6mNote: 'Note: since 2026, class E no longer has the tolerated 6 m access.',
  useAddressTip: 'Tip: the address search lets you use any place worldwide as the basis for the recommendation.',
  tabGpsInfo: 'GPS / GNSS',
  heading: 'Compass',
  gpsInfoTitle: 'GPS / GNSS information',
  gpsInfoText: 'Location and satellite details of the current GPS / GNSS fix.',
  visibleSatellites: 'Visible satellites',
  usedSatellites: 'Used satellites',
  provider: 'Provider',
  accuracyLabel: 'Accuracy',
  altitudeLabel: 'Altitude',
  speedLabel: 'Speed',
  bearingLabel: 'Course',
  lastFix: 'Last fix',
  satelliteSystems: 'Satellite systems',
  satelliteBars: 'Satellite signal bars',
  inViewUsed: 'In view / used',
  snrLabel: 'SNR',
  noGnssData: 'No GNSS data loaded yet',
  headingWaiting: 'no compass yet',
  headingUnavailable: 'Compass unavailable',
  gpsInfoNote: 'Satellite details depend on device support and Android runtime support.'
});

Object.assign(translations.fr, {
  tabTools: 'Outils',
  tabBands: 'Recommandation de bande',
  tabClasses: 'Classes DE',
  tabProp: 'Propagation',
  tabWeather: 'Météo',
  bandEngineTitle: "Recommandation selon la position, l'heure et la météo radio",
  bandEngineText: "Utilise la position actuelle ou une adresse saisie. Un indicatif n'est pas nécessaire.",
  envMissing: "Veuillez d'abord obtenir le GPS ou définir une adresse.",
  refreshData: 'Actualiser',
  solarWeather: 'Météo radio / météo',
  season: 'Saison',
  daylight: 'Phase du jour',
  bestBandsNow: 'Meilleures bandes maintenant',
  likelyBandsLater: 'Intéressant plus tard',
  whyNow: 'Pourquoi maintenant',
  noDataYet: 'Aucune donnée chargée',
  genericNotice: 'Recommandation générale. Le plan de bande national reste juridiquement déterminant.',
  dePlanTitle: "Plan court des bandes et fréquences pour l'Allemagne",
  classN: 'Classe N',
  classE: 'Classe E',
  classA: 'Classe A',
  privileges: 'Bandes / plages',
  power: 'Puissance',
  usage: 'Typiquement bon pour',
  propagationTitle: 'Propagation style HamQSL',
  hfCond: 'Conditions HF',
  vhfCond: 'Conditions VHF',
  updated: 'Mis à jour',
  source: 'Source',
  weatherTitle: 'Météo pour la position choisie',
  temperature: 'Température',
  wind: 'Vent',
  cloudcover: 'Nébulosité',
  precipitation: 'Précipitations',
  sunrise: 'Lever du soleil',
  sunset: 'Coucher du soleil',
  weatherNote: "La météo n'agit pas directement sur l'ionosphère, mais elle compte pour le portable, la sécurité et la lumière du jour.",
  loading: 'chargement...',
  fair: 'moyen',
  good: 'bon',
  poor: 'faible',
  excellent: 'très bon',
  closed: 'fermé',
  currentLocationLabel: 'Position de référence actuelle',
  de6mNote: "Remarque : depuis 2026, la classe E n'a plus d'accès toléré au 6 m.",
  useAddressTip: "Astuce : la recherche d'adresse permet d'utiliser n'importe quel lieu comme base de recommandation."
});


async function photonReverse(lat, lon) {
  const url = new URL('https://photon.komoot.io/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, 12000);
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const j = await res.json();
  const item = Array.isArray(j?.features) ? j.features[0] : null;
  if (!item) throw new Error('No reverse geocoding result');
  const hit = mapPhotonCandidate(item);
  return {
    country: hit.country || '-',
    city: hit.city || '-',
    street: hit.street || '-'
  };
}
function qcodeText(code, fallback) {
  const maps = {
    de: {
      QSO: "Funkverbindung / Kann mit … in Verbindung treten",
      QSY: "Frequenzwechsel auf … kHz",
      QRZ: "Wer ruft mich? / Sie werden gerufen von …",
      QTH: "Mein Standort ist … / Standort",
      QRM: "Werde durch andere Sender gestört",
      QRN: "Habe Störungen durch Statik",
      QRP: "Vermindere die Sendeleistung",
      QRO: "Erhöhe die Sendeleistung",
      QRT: "Ende der Sendung / Sendebetrieb einstellen",
      QRV: "Bin empfangsbereit / betriebsbereit",
      QSL: "Empfang bestätigt / QSL-Karte",
      QSB: "Ihr Signal hat Fading (Schwund)",
      QRX: "Bitte warten / ich rufe später",
      QTC: "Habe Nachrichten für Sie",
      QTR: "Die genaue Zeit ist … UTC"
    },
    en: {
      QSO: "Radio contact / Can communicate with …",
      QSY: "Change frequency to … kHz",
      QRZ: "Who is calling me? / You are being called by …",
      QTH: "My location is … / location",
      QRM: "Interference from other stations",
      QRN: "Static / atmospheric noise",
      QRP: "Reduce transmitter power",
      QRO: "Increase transmitter power",
      QRT: "Stop transmitting / end of transmission",
      QRV: "Ready / operational",
      QSL: "Reception confirmed / QSL card",
      QSB: "Signal fading",
      QRX: "Please wait / I will call later",
      QTC: "I have messages for you",
      QTR: "The exact time is … UTC"
    },
    fr: {
      QSO: "Contact radio / Peut communiquer avec …",
      QSY: "Changer de fréquence vers … kHz",
      QRZ: "Qui m'appelle ? / Vous êtes appelé par …",
      QTH: "Ma position est … / position",
      QRM: "Brouillage d'autres stations",
      QRN: "Parasites atmosphériques",
      QRP: "Réduire la puissance d'émission",
      QRO: "Augmenter la puissance d'émission",
      QRT: "Arrêt d'émission / fin de transmission",
      QRV: "Prêt / opérationnel",
      QSL: "Réception confirmée / carte QSL",
      QSB: "Évanouissement du signal",
      QRX: "Veuillez attendre / j'appellerai plus tard",
      QTC: "J'ai des messages pour vous",
      QTR: "L'heure exacte est … UTC"
    }
  };
  return (maps[state.lang] && maps[state.lang][code]) || fallback || code;
}

function classFrequencyRecommendation(distanceKm) {
  const hour = new Date().getHours();
  const day = hour >= 7 && hour < 19;
  if (distanceKm < 30) return { n: "144–146 / 430–440 MHz", e: "144–146 / 430–440 MHz", a: "144–146 / 430–440 MHz" };
  if (distanceKm < 150) return { n: day ? "28.0–29.7 or 144–146 MHz" : "144–146 / 430–440 MHz", e: day ? "28.0–29.7 or 144–146 MHz" : "7.0–7.2 or 144–146 MHz", a: day ? "28.0–29.7 or 144–146 MHz" : "7.0–7.2 or 3.5–3.8 MHz" };
  if (distanceKm < 500) return { n: "28.0–29.7 MHz", e: day ? "28.0–29.7 MHz" : "7.0–7.2 MHz", a: day ? "14.0–14.35 MHz" : "7.0–7.2 or 3.5–3.8 MHz" };
  if (distanceKm < 1500) return { n: "28.0–29.7 MHz", e: day ? "28.0–29.7 MHz" : "7.0–7.2 MHz", a: day ? "14.0–14.35 / 18.068–18.168 MHz" : "7.0–7.2 MHz" };
  if (distanceKm < 4000) return { n: "28.0–29.7 MHz", e: "21.0–21.45 / 28.0–29.7 MHz", a: day ? "14.0–14.35 / 21.0–21.45 MHz" : "10.1–10.15 / 7.0–7.2 MHz" };
  return { n: "28.0–29.7 MHz", e: "21.0–21.45 / 28.0–29.7 MHz", a: day ? "14.0–14.35 / 21.0–21.45 / 28.0–29.7 MHz" : "7.0–7.2 / 14.0–14.35 MHz" };
}

const DE_CLASS_PLAN = [
  {
    nameKey: 'classN',
    summaryKey: 'classNTagline',
    bandsKey: 'classNBandList',
    freqsKey: 'classNFreqs',
    powerKey: 'classNPower',
    bestForKey: 'classNBestFor'
  },
  {
    nameKey: 'classE',
    summaryKey: 'classETagline',
    bandsKey: 'classEBandList',
    freqsKey: 'classEFreqs',
    powerKey: 'classEPower',
    bestForKey: 'classEBestFor'
  },
  {
    nameKey: 'classA',
    summaryKey: 'classATagline',
    bandsKey: 'classABandList',
    freqsKey: 'classAFreqs',
    powerKey: 'classAPower',
    bestForKey: 'classABestFor'
  }
];

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function fetchWithTimeout(url, opts = {}, timeout = 12000) {
  return Promise.race([
    fetch(url, opts),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
  ]);
}

function translateConditionWord(value) {
  const v = String(value || '').toLowerCase();
  if (v.includes('excellent')) return tr('excellent');
  if (v.includes('good')) return tr('good');
  if (v.includes('fair')) return tr('fair');
  if (v.includes('poor')) return tr('poor');
  if (v.includes('closed')) return tr('closed');
  return value || '-';
}

function seasonForMonth(month) {
  if ([12, 1, 2].includes(month)) return state.lang === 'en' ? 'winter' : 'Winter';
  if ([3, 4, 5].includes(month)) return state.lang === 'en' ? 'spring' : 'Frühling';
  if ([6, 7, 8].includes(month)) return state.lang === 'en' ? 'summer' : 'Sommer';
  return state.lang === 'en' ? 'autumn' : 'Herbst';
}

function dayPhase(weather) {
  const nowHour = new Date().getHours();
  const sunrise = weather?.sunrise ? new Date(weather.sunrise) : null;
  const sunset = weather?.sunset ? new Date(weather.sunset) : null;
  if (sunrise && sunset) {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const sr = sunrise.getHours() + sunrise.getMinutes() / 60;
    const ss = sunset.getHours() + sunset.getMinutes() / 60;
    if (hour < sr || hour >= ss) return state.lang === 'en' ? 'night' : 'Nacht';
    if (hour < sr + 1.5 || hour > ss - 1.5) return state.lang === 'en' ? 'dawn / dusk' : 'Dämmerung';
    return state.lang === 'en' ? 'day' : 'Tag';
  }
  return nowHour >= 7 && nowHour < 19 ? (state.lang === 'en' ? 'day' : 'Tag') : (state.lang === 'en' ? 'night' : 'Nacht');
}

function parseXmlTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function parseSolarXml(xml) {
  const hfSection = parseXmlTag(xml, 'calculatedconditions');
  const hf = {};
  Array.from(hfSection.matchAll(/<band[^>]*name="([^"]+)"[^>]*time="([^"]+)"[^>]*>([^<]+)</gi)).forEach((m) => {
    const band = m[1].trim();
    const time = m[2].trim().toLowerCase();
    hf[band] ||= {};
    hf[band][time] = m[3].trim();
  });
  const vhfSection = parseXmlTag(xml, 'calculatedvhfconditions');
  const vhf = {};
  Array.from(vhfSection.matchAll(/<phenomenon[^>]*name="([^"]+)"[^>]*>([^<]+)</gi)).forEach((m) => {
    vhf[m[1].trim()] = m[2].trim();
  });
  return {
    updated: parseXmlTag(xml, 'updated') || parseXmlTag(xml, 'solardata_updated'),
    source: 'HamQSL',
    solarflux: parseXmlTag(xml, 'solarflux') || '-',
    aindex: parseXmlTag(xml, 'aindex') || '-',
    kindex: parseXmlTag(xml, 'kindex') || '-',
    sunspots: parseXmlTag(xml, 'sunspots') || '-',
    xray: parseXmlTag(xml, 'xray') || '-',
    signalnoise: parseXmlTag(xml, 'signalnoise') || '-',
    geomagfield: parseXmlTag(xml, 'geomagfield') || '-',
    aurora: parseXmlTag(xml, 'aurora') || '-',
    hf,
    vhf
  };
}


function deriveConditionsFromIndices(sfiRaw, kpRaw) {
  const sfi = Number(sfiRaw || 0);
  const kp = Number(kpRaw || 0);
  const score = sfi - kp * 8;
  const word = (v) => v >= 125 ? 'Good' : v >= 95 ? 'Fair' : 'Poor';
  const upperDay = word(score);
  const midDay = word(score + 10);
  const lowNight = word(score + 5);
  const upperNight = word(score - 15);
  const vhfWord = kp >= 5 ? 'Fair' : kp >= 3 ? 'Poor' : 'Poor';
  return {
    hf: {
      '80m-40m': { day: word(score - 10), night: lowNight },
      '30m-20m': { day: midDay, night: word(score - 5) },
      '17m-15m': { day: upperDay, night: upperNight },
      '12m-10m': { day: word(score - 10), night: 'Poor' }
    },
    vhf: {
      '2m Tropo': vhfWord,
      '6m': word(score - 5)
    }
  };
}

function buildOfflineSolarFallback() {
  const now = new Date().toISOString();
  const derived = deriveConditionsFromIndices(110, 3);
  return {
    updated: now,
    source: 'Offline fallback',
    solarflux: '110',
    aindex: '-',
    kindex: '3',
    sunspots: '-',
    xray: '-',
    signalnoise: '-',
    geomagfield: '-',
    aurora: '-',
    hf: derived.hf,
    vhf: derived.vhf
  };
}

function hasUsableSolarData(s) {
  return !!(s && (s.solarflux && s.solarflux !== '-' || s.kindex && s.kindex !== '-' || Object.keys(s.hf || {}).length || Object.keys(s.vhf || {}).length));
}

async function fetchNoaaSolarFallback() {
  const [fluxRes, kpRes] = await Promise.all([
    fetchWithTimeout('https://services.swpc.noaa.gov/json/f107_cm_flux.json'),
    fetchWithTimeout('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')
  ]);
  const fluxJson = await fluxRes.json();
  const kpJson = await kpRes.json();
  const latestFlux = Array.isArray(fluxJson) ? [...fluxJson].reverse().find((x) => x?.flux != null) : null;
  const latestKp = Array.isArray(kpJson) && kpJson.length > 1 ? kpJson[kpJson.length - 1] : null;
  const solarflux = latestFlux?.flux != null ? String(latestFlux.flux) : '-';
  const kindex = latestKp?.[1] != null ? String(latestKp[1]) : '-';
  const derived = deriveConditionsFromIndices(solarflux, kindex);
  return {
    updated: latestFlux?.time_tag || latestKp?.[0] || new Date().toISOString(),
    source: 'NOAA SWPC',
    solarflux,
    aindex: '-',
    kindex,
    sunspots: '-',
    xray: '-',
    signalnoise: '-',
    geomagfield: '-',
    aurora: '-',
    hf: derived.hf,
    vhf: derived.vhf
  };
}

async function fetchSolarData(force = false) {
  if (state.solarLoading) return state.solar;
  if (!hasUsableSolarData(state.solar)) {
    state.solar = buildOfflineSolarFallback();
    persistCoreState();
  }
  if (!force && hasUsableSolarData(state.solar) && (Date.now() - state.lastEnvFetch) < 15 * 60 * 1000) return state.solar;
  state.solarLoading = true;
  try {
    const res = await fetchWithTimeout('https://www.hamqsl.com/solarxml.php');
    const xml = await res.text();
    const parsed = parseSolarXml(xml);
    if (!parsed || (!parsed.solarflux && !parsed.kindex && !Object.keys(parsed.hf || {}).length && !Object.keys(parsed.vhf || {}).length)) {
      throw new Error('HamQSL returned no usable solar data');
    }
    state.solar = parsed;
    state.lastEnvFetch = Date.now();
    persistCoreState();
    return state.solar;
  } catch (err) {
    console.error('solar fetch failed, using NOAA fallback', err);
    try {
      state.solar = await fetchNoaaSolarFallback();
      state.lastEnvFetch = Date.now();
      persistCoreState();
      return state.solar;
    } catch (fallbackErr) {
      console.error('NOAA solar fallback failed', fallbackErr);
      if (state.solar) return state.solar;
      state.solar = buildOfflineSolarFallback();
      state.lastEnvFetch = Date.now();
      persistCoreState();
      return state.solar;
    }
  } finally {
    state.solarLoading = false;
  }
}

async function fetchWeatherForPosition(lat, lon, force = false) {
  if (lat == null || lon == null) return null;
  if (state.weatherLoading) return state.weather;
  if (!force && state.weather && state.weather.lat === lat && state.weather.lon === lon && (Date.now() - state.lastEnvFetch) < 15 * 60 * 1000) return state.weather;
  state.weatherLoading = true;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,cloud_cover,wind_speed_10m,precipitation,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
    const res = await fetchWithTimeout(url);
    const json = await res.json();
    state.weather = {
      lat,
      lon,
      source: 'Open-Meteo',
      current: json.current || {},
      sunrise: json.daily?.sunrise?.[0] || '',
      sunset: json.daily?.sunset?.[0] || ''
    };
    persistCoreState();
    return state.weather;
  } catch (err) {
    console.error('weather fetch failed', err);
    return state.weather;
  } finally {
    state.weatherLoading = false;
  }
}

async function ensureEnvironmentData(force = false) {
  if (!state.myPos) return;
  await Promise.allSettled([
    fetchSolarData(force),
    fetchWeatherForPosition(state.myPos[0], state.myPos[1], force)
  ]);
  state.lastEnvFetch = Date.now();
  updateDynamicPanels();
}

function getCurrentCountryLabel() {
  if (state.myGeo) {
    const parts = [state.myGeo.city, state.myGeo.country].filter(Boolean);
    if (parts.length) return parts.join(', ');
    if (state.myGeo.street) return state.myGeo.street;
  }
  if (state.myPos) return maiden(state.myPos[0], state.myPos[1]);
  return '-';
}

function buildBandAdvice() {
  if (!state.myPos) return null;
  const weather = state.weather;
  const solar = state.solar;
  const month = new Date().getMonth() + 1;
  const season = seasonForMonth(month);
  const phase = dayPhase(weather);
  const isDay = weather?.current?.is_day === 1 || /Tag|day|jour/.test(phase);
  const solarFlux = Number(solar?.solarflux || 0);
  const kIndex = Number(solar?.kindex || 99);
  const hf12 = String(solar?.hf?.['12m-10m']?.day || '').toLowerCase();
  const hf17 = String(solar?.hf?.['17m-15m']?.day || '').toLowerCase();
  const vhf2m = String(solar?.vhf?.['2m EsEU'] || solar?.vhf?.['2m EsNA'] || solar?.vhf?.['Aurora'] || '').toLowerCase();

  let best = [];
  let later = [];
  let why = [];

  if (!isDay) {
    best.push('40 m · 7.0–7.2 MHz');
    best.push('80 m · 3.5–3.8 MHz');
    why.push(state.lang === 'en' ? 'After sunset, lower HF bands usually become easier for regional to medium paths.' : state.lang === 'fr' ? 'Après le coucher du soleil, les bandes HF basses deviennent souvent plus faciles pour les liaisons régionales à moyennes.' : 'Nach Sonnenuntergang werden die unteren HF-Bänder meist einfacher für regionale bis mittlere Strecken.');
    later.push('20 m · 14.0–14.35 MHz am Morgen');
  } else {
    best.push('20 m · 14.0–14.35 MHz');
    why.push(state.lang === 'en' ? '20 m is the safest daytime all-rounder for many paths.' : state.lang === 'fr' ? '20 m est le meilleur choix polyvalent de jour pour de nombreuses liaisons.' : '20 m ist tagsüber meist das sicherste Allround-Band für viele Strecken.');
    if (solarFlux >= 120 || hf17.includes('good') || hf17.includes('fair')) {
      best.push('15 m · 21.0–21.45 MHz');
      later.push('17 m · 18.068–18.168 MHz');
      why.push(state.lang === 'en' ? 'Current solar values support the upper HF bands better than usual.' : state.lang === 'fr' ? 'Les valeurs solaires actuelles soutiennent mieux que d\'habitude les bandes HF supérieures.' : 'Die aktuellen Solarwerte stützen die oberen HF-Bänder besser als üblich.');
    }
    if (solarFlux >= 140 || hf12.includes('good')) {
      best.push('10 m · 28.0–29.7 MHz');
      why.push(state.lang === 'en' ? '10 m currently has a realistic chance because the solar situation is strong enough.' : state.lang === 'fr' ? '10 m a actuellement une vraie chance, car la situation solaire est assez forte.' : '10 m hat aktuell echte Chancen, weil die Solarlage stark genug ist.');
    } else {
      later.push('10 m · 28.0–29.7 MHz bei besserem Funkwetter');
    }
  }

  if (kIndex >= 5) {
    why.push(state.lang === 'en' ? 'Geomagnetic activity is elevated, so deep DX paths can become less stable. Lower bands are safer.' : state.lang === 'fr' ? 'L\'activité géomagnétique est élevée, donc les longues liaisons DX peuvent être moins stables. Les bandes basses sont plus sûres.' : 'Die geomagnetische Aktivität ist erhöht. Lange DX-Wege können instabiler sein. Tiefere Bänder sind dann oft sicherer.');
    if (!best.includes('40 m · 7.0–7.2 MHz')) best.push('40 m · 7.0–7.2 MHz');
  }

  if (vhf2m.includes('open') || vhf2m.includes('fair') || vhf2m.includes('good')) {
    best.push('2 m · 144–146 MHz');
    why.push(state.lang === 'en' ? 'VHF conditions show a possible opening for 2 m.' : state.lang === 'fr' ? 'Les conditions VHF montrent une ouverture possible sur 2 m.' : 'Die VHF-Bedingungen zeigen eine mögliche Öffnung auf 2 m.');
  } else {
    later.push('2 m / 70 cm lokal und über Relais');
  }

  if (weather?.current?.precipitation > 0 || (weather?.current?.wind_speed_10m || 0) > 35) {
    why.push(state.lang === 'en' ? 'Local weather is rough. Electrically this matters less than the ionosphere, but it matters for outdoor setup and antenna safety.' : state.lang === 'fr' ? 'La météo locale est rude. Électriquement c\'est moins important que l\'ionosphère, mais c\'est important pour l\'installation extérieure et la sécurité.' : 'Das lokale Wetter ist rau. Elektrisch zählt eher die Ionosphäre, praktisch aber ist das wichtig für Aufbau und Antennensicherheit.');
  }

  best = Array.from(new Set(best)).slice(0, 4);
  later = Array.from(new Set(later.filter((x) => !best.includes(x)))).slice(0, 4);

  return {
    season,
    phase,
    basedOn: getCurrentCountryLabel(),
    best,
    later,
    why
  };
}

function renderBandTab() {
  const advice = buildBandAdvice();
  const noPropData = !state.solar || (!state.solar.solarflux && !state.solar.kindex && !Object.keys(state.solar.hf || {}).length && !Object.keys(state.solar.vhf || {}).length);
  if (!advice) {
    return `<div class="card centerCard"><h2>${tr('bandEngineTitle')}</h2><p>${tr('bandEngineText')}</p><p>${tr('envMissing')}</p><p>${tr('useAddressTip')}</p></div>`;
  }
  return `
    <div class="card centerCard">
      <h2>${tr('bandEngineTitle')}</h2>
      <p class="sectionNote">${tr('bandEngineText')}</p>
      <div class="row centerRow"><button id="refreshEnvBtn" class="primary">${tr('refreshData')}</button></div>
      ${noPropData ? `<p>${state.lang === 'en' ? 'No live propagation data yet. Tap refresh.' : 'Noch keine Live-Propagation-Daten. Bitte aktualisieren.'}</p>` : ''}
      <div class="tripleCols centerGridBoxes" style="margin-top:8px">
        <div class="box"><div class="k">${tr('currentLocationLabel')}</div><div class="v">${escapeHtml(advice.basedOn)}</div></div>
        <div class="box"><div class="k">${tr('season')}</div><div class="v">${escapeHtml(advice.season)}</div></div>
        <div class="box"><div class="k">${tr('daylight')}</div><div class="v">${escapeHtml(advice.phase)}</div></div>
      </div>
      <div class="singleCenter centerGridBoxes">
        <div class="box"><div class="k">${tr('solarWeather')}</div><div class="v">SFI ${escapeHtml(state.solar?.solarflux || '-')} · K ${escapeHtml(state.solar?.kindex || '-')} · ${tr('temperature')} ${state.weather?.current?.temperature_2m ?? '-'}°C</div></div>
      </div>
    </div>
    <div class="two">
      <div class="card centerCard">
        <h2>${tr('bestBandsNow')}</h2>
        ${advice.best.map((item) => `<div class="box" style="margin-bottom:8px"><div class="v">${escapeHtml(item)}</div></div>`).join('') || `<p>${tr('noDataYet')}</p>`}
      </div>
      <div class="card centerCard">
        <h2>${tr('likelyBandsLater')}</h2>
        ${advice.later.map((item) => `<div class="box" style="margin-bottom:8px"><div class="v">${escapeHtml(item)}</div></div>`).join('') || `<p>${tr('noDataYet')}</p>`}
      </div>
    </div>
    <div class="card centerCard">
      <h2>${tr('whyNow')}</h2>
      ${advice.why.map((item) => `<p>• ${escapeHtml(item)}</p>`).join('')}
      <p>${tr('genericNotice')}</p>
    </div>
  `;
}

function renderPills(text, extraClass = '') {
  return String(text || '')
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => `<span class="pill ${extraClass}">${escapeHtml(item)}</span>`)
    .join('');
}

function renderClassesTab() {
  return `
    <div class="card centerCard deClassesIntro">
      <h2>${tr('dePlanTitle')}</h2>
      <p class="sectionNote">${tr('de6mNote')}</p>
    </div>
    <div class="stackFields classesStack">
      ${DE_CLASS_PLAN.map((item) => `
        <div class="card centerCard classCard classCardWide">
          <div class="badge">${tr(item.nameKey)}</div>
          <h2 class="classHeadline">${escapeHtml(tr(item.summaryKey))}</h2>

          <div class="classSection">
            <div class="classSectionLabel">${tr('classBands')}</div>
            <div class="pillWrap">${renderPills(tr(item.bandsKey), 'pillBand')}</div>
          </div>

          <div class="classSection">
            <div class="classSectionLabel">${tr('classFreqs')}</div>
            <div class="pillWrap">${renderPills(tr(item.freqsKey), 'pillFreq')}</div>
          </div>

          <div class="classBottomGrid">
            <div class="box classInfoBox">
              <div class="k">${tr('classPower')}</div>
              <div class="v">${escapeHtml(tr(item.powerKey))}</div>
            </div>
            <div class="box classInfoBox">
              <div class="k">${tr('classBestFor')}</div>
              <div class="v">${escapeHtml(tr(item.bestForKey))}</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPropagationTab() {
  const s = state.solar;
  const noPropData = !s || (!s.solarflux && !s.kindex && !Object.keys(s.hf || {}).length && !Object.keys(s.vhf || {}).length);
  return `
    <div class="card centerCard">
      <h2>${tr('propagationTitle')}</h2>
      <div class="row centerRow"><button id="refreshEnvBtn" class="primary">${tr('refreshData')}</button></div>
      ${noPropData ? `<p>${state.lang === 'en' ? 'No live propagation data yet. Tap refresh.' : 'Noch keine Live-Propagation-Daten. Bitte aktualisieren.'}</p>` : ''}
      <div class="grid centerGridBoxes" style="margin-top:8px">
        <div class="box"><div class="k">SFI</div><div class="v">${escapeHtml(s?.solarflux || '-')}</div></div>
        <div class="box"><div class="k">A-Index</div><div class="v">${escapeHtml(s?.aindex || '-')}</div></div>
        <div class="box"><div class="k">K-Index</div><div class="v">${escapeHtml(s?.kindex || '-')}</div></div>
        <div class="box"><div class="k">Sunspots</div><div class="v">${escapeHtml(s?.sunspots || '-')}</div></div>
        <div class="box"><div class="k">X-Ray</div><div class="v">${escapeHtml(s?.xray || '-')}</div></div>
        <div class="box"><div class="k">Noise / Geomag</div><div class="v">${escapeHtml(s?.signalnoise || '-')} · ${escapeHtml(s?.geomagfield || '-')}</div></div>
      </div>
    </div>
    <div class="two">
      <div class="card centerCard">
        <h2>${tr('hfCond')}</h2>
        <div class="tripleCols centerGridBoxes">
          <div class="box"><div class="k">80m-40m</div><div class="v">${translateConditionWord(s?.hf?.['80m-40m']?.day || '-')} / ${translateConditionWord(s?.hf?.['80m-40m']?.night || '-')}</div></div>
          <div class="box"><div class="k">30m-20m</div><div class="v">${translateConditionWord(s?.hf?.['30m-20m']?.day || '-')} / ${translateConditionWord(s?.hf?.['30m-20m']?.night || '-')}</div></div>
          <div class="box"><div class="k">17m-15m</div><div class="v">${translateConditionWord(s?.hf?.['17m-15m']?.day || '-')} / ${translateConditionWord(s?.hf?.['17m-15m']?.night || '-')}</div></div>
        </div>
        <div class="singleCenter centerGridBoxes">
          <div class="box"><div class="k">12m-10m</div><div class="v">${translateConditionWord(s?.hf?.['12m-10m']?.day || '-')} / ${translateConditionWord(s?.hf?.['12m-10m']?.night || '-')}</div></div>
        </div>
      </div>
      <div class="card centerCard">
        <h2>${tr('vhfCond')}</h2>
        <div class="grid centerGridBoxes">
          ${Object.entries(s?.vhf || {}).slice(0, 6).map(([k,v]) => `<div class="box"><div class="k">${escapeHtml(k)}</div><div class="v">${translateConditionWord(v)}</div></div>`).join('') || `<p>${tr('noDataYet')}</p>`}
        </div>
      </div>
    </div>
    <div class="card centerCard footerNote">
      <p>${tr('updated')}: ${escapeHtml(s?.updated || '-')}</p>
      <p>${tr('source')}: ${escapeHtml(s?.source || 'HamQSL')}</p>
    </div>
  `;
}

function renderWeatherTab() {
  const w = state.weather;
  const noPropData = !state.solar || (!state.solar.solarflux && !state.solar.kindex && !Object.keys(state.solar.hf || {}).length && !Object.keys(state.solar.vhf || {}).length);
  return `
    <div class="card centerCard">
      <h2>${tr('weatherTitle')}</h2>
      <div class="row centerRow"><button id="refreshEnvBtn" class="primary">${tr('refreshData')}</button></div>
      ${noPropData ? `<p>${state.lang === 'en' ? 'No live propagation data yet. Tap refresh.' : 'Noch keine Live-Propagation-Daten. Bitte aktualisieren.'}</p>` : ''}
      <div class="grid centerGridBoxes" style="margin-top:8px">
        <div class="box"><div class="k">${tr('temperature')}</div><div class="v">${w?.current?.temperature_2m ?? '-'} °C</div></div>
        <div class="box"><div class="k">${tr('wind')}</div><div class="v">${w?.current?.wind_speed_10m ?? '-'} km/h</div></div>
        <div class="box"><div class="k">${tr('cloudcover')}</div><div class="v">${w?.current?.cloud_cover ?? '-'} %</div></div>
        <div class="box"><div class="k">${tr('precipitation')}</div><div class="v">${w?.current?.precipitation ?? '-'} mm</div></div>
        <div class="box"><div class="k">${tr('sunrise')}</div><div class="v">${w?.sunrise ? new Date(w.sunrise).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</div></div>
        <div class="box"><div class="k">${tr('sunset')}</div><div class="v">${w?.sunset ? new Date(w.sunset).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</div></div>
      </div>
      <p class="sectionNote" style="margin-top:8px">${tr('weatherNote')}</p>
      <p class="footerNote">${tr('source')}: ${escapeHtml(w?.source || 'Open-Meteo')}</p>
    </div>
  `;
}



function formatHeadingText() {
  if (state.heading && Number.isFinite(state.heading.deg)) return `${Math.round(state.heading.deg)}° · ${state.heading.card}`;
  return state.headingAvailable ? tr('headingWaiting') : tr('headingUnavailable');
}

function formatHeadingDetailedText() {
  const main = formatHeadingText();
  const ori = state.heading && [state.heading.alpha, state.heading.beta, state.heading.gamma].every(v => Number.isFinite(v))
    ? `α ${Math.round(state.heading.alpha)} · β ${Math.round(state.heading.beta)} · γ ${Math.round(state.heading.gamma)}`
    : 'α - · β - · γ -';
  const mag = state.magneticField && [state.magneticField.x, state.magneticField.y, state.magneticField.z].every(v => Number.isFinite(v))
    ? `Mag ${state.magneticField.x.toFixed(1)} / ${state.magneticField.y.toFixed(1)} / ${state.magneticField.z.toFixed(1)} µT`
    : 'Mag -';
  return `${main}
${ori}
${mag}`;
}

function systemFromPrn(prn) {
  const n = Number(prn);
  if (!Number.isFinite(n)) return 'Unknown';
  if (n >= 1 && n <= 32) return 'GPS';
  if (n >= 33 && n <= 64) return 'SBAS';
  if (n >= 65 && n <= 96) return 'GLONASS';
  if (n >= 120 && n <= 158) return 'SBAS';
  if (n >= 193 && n <= 200) return 'QZSS';
  if (n >= 201 && n <= 237) return 'BeiDou';
  if (n >= 301 && n <= 336) return 'Galileo';
  return 'Unknown';
}

function buildGnssSystemRows(satellites) {
  const totals = new Map();
  for (const sat of satellites || []) {
    const key = sat.system || systemFromPrn(sat.prn);
    const prev = totals.get(key) || { visible: 0, used: 0 };
    prev.visible += 1;
    if (sat.used) prev.used += 1;
    totals.set(key, prev);
  }
  return Array.from(totals.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([name, counts]) => ({ name, ...counts }));
}

function updateHeadingUi() {
  const el = document.getElementById('myHeading');
  if (el) el.textContent = formatHeadingDetailedText();
  const gnssEl = document.getElementById('gnssHeading');
  if (gnssEl) gnssEl.textContent = formatHeadingDetailedText();
}


function satBarClass(cn0) {
  const v = Number(cn0);
  if (!Number.isFinite(v)) return 'satBarEmpty';
  if (v < 15) return 'satBarLow';
  if (v < 25) return 'satBarMid';
  if (v < 35) return 'satBarGood';
  return 'satBarStrong';
}

function gnssSystemVisual(system) {
  const name = String(system || 'GNSS');
  const key = name.toLowerCase();
  if (key.includes('gps')) return { flag: '🇺🇸', short: 'GPS' };
  if (key.includes('glon')) return { flag: '🇷🇺', short: 'GLON' };
  if (key.includes('gal')) return { flag: '🇪🇺', short: 'GAL' };
  if (key.includes('bei')) return { flag: '🇨🇳', short: 'BDS' };
  if (key.includes('qz')) return { flag: '🇯🇵', short: 'QZSS' };
  if (key.includes('sbas')) return { flag: '🛰️', short: 'SBAS' };
  if (key.includes('nav') || key.includes('irn')) return { flag: '🇮🇳', short: 'NavIC' };
  return { flag: '🛰️', short: name.slice(0, 4).toUpperCase() };
}

function renderSatelliteLegendMarkup() {
  const rows = Array.isArray(state.gnss.systems) ? state.gnss.systems : [];
  if (!rows.length) return '';
  return rows.map((row) => {
    const visual = gnssSystemVisual(row.name);
    return `<span class="satLegendChip"><span class="satLegendFlag">${visual.flag}</span><span class="satLegendText">${escapeHtml(visual.short)} ${row.used}/${row.visible}</span></span>`;
  }).join('');
}

function renderSatelliteBarsMarkup() {
  const sats = Array.isArray(state.gnss.satellites) ? state.gnss.satellites.slice() : [];
  if (!sats.length) return `<p>${tr('noGnssData')}</p>`;
  const sorted = sats.sort((a, b) => {
    const av = Number.isFinite(Number(a.cn0DbHz)) ? Number(a.cn0DbHz) : -1;
    const bv = Number.isFinite(Number(b.cn0DbHz)) ? Number(b.cn0DbHz) : -1;
    return bv - av;
  });
  return sorted.map((sat) => {
    const svid = escapeHtml(String(sat.svid ?? '-'));
    const systemName = String(sat.system || 'GNSS');
    const system = escapeHtml(systemName);
    const visual = gnssSystemVisual(systemName);
    const cn0 = Number.isFinite(Number(sat.cn0DbHz)) ? Number(sat.cn0DbHz) : null;
    const used = !!sat.used;
    const az = Number.isFinite(Number(sat.azimuth)) ? `${Math.round(Number(sat.azimuth))}°` : '–';
    const el = Number.isFinite(Number(sat.elevation)) ? `${Math.round(Number(sat.elevation))}°` : '–';
    const segmentCount = 20;
    const barCount = cn0 == null ? 0 : Math.max(1, Math.min(segmentCount, Math.round(cn0 / 2.5)));
    const segments = Array.from({ length: segmentCount }, (_, i) => `<span class="satSegment ${i < barCount ? satBarClass(cn0) : 'satBarEmpty'}"></span>`).join('');
    return `<div class="satRow ${used ? 'satUsed' : ''}">
      <div class="satMeta satMetaMock">
        <div class="satPrnRow"><span class="satFlag">${visual.flag}</span><span class="satPrnId">${svid}</span></div>
        <div class="satSystemAbbr">${escapeHtml(visual.short)}</div>
      </div>
      <div class="satDbLeft">${cn0 == null ? '-' : `${cn0.toFixed(0)} dB`}</div>
      <div class="satBarWrap satBarWrapMock">${segments}</div>
      <div class="satRight satRightMock">
        <div class="satDb">${cn0 == null ? '-' : `${cn0.toFixed(0)} dB`}</div>
        <div class="satUse">${used ? 'Fix' : (state.lang === 'de' ? 'Sicht' : 'View')}</div>
      </div>
      <div class="satAngles"><span>${az}</span><span>${el}</span></div>
    </div>`;
  }).join('');
}

function updateGnssUi() {
  const map = {
    gnssProvider: state.gnss.provider || '-',
    gnssVisible: state.gnss.satellitesVisible ?? '-',
    gnssUsed: state.gnss.satellitesUsed ?? '-',
    gnssAccuracy: state.gnss.accuracy || '-',
    gnssAltitude: state.gnss.altitude || '-',
    gnssSpeed: state.gnss.speed || '-',
    gnssBearing: state.gnss.bearing || '-',
    gnssLastFix: state.gnss.lastFix || '-',
  };
  Object.entries(map).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
  const list = document.getElementById('gnssSystems');
  if (list) {
    const rows = Array.isArray(state.gnss.systems) ? state.gnss.systems : [];
    list.innerHTML = rows.length
      ? rows.map((row) => `<div class="box gnssSystemBox"><div class="k">${escapeHtml(row.name)}</div><div class="v">${row.used} / ${row.visible}</div></div>`).join('')
      : `<p>${tr('noGnssData')}</p>`;
  }
  const bars = document.getElementById('gnssBars');
  if (bars) bars.innerHTML = renderSatelliteBarsMarkup();
  const count = document.getElementById('gnssInViewUsed');
  if (count) count.textContent = `${state.gnss.satellitesUsed ?? '-'} / ${state.gnss.satellitesVisible ?? '-'}`;
  const note = document.getElementById('gnssNote');
  if (note) note.textContent = state.gnss.note || tr('gpsInfoNote');
  const legend = document.getElementById('gnssLegend');
  if (legend) legend.innerHTML = renderSatelliteLegendMarkup();
}

function renderGpsInfoTab() {
  return `
    <div class="card centerCard">
      <h2>${tr('gpsInfoTitle')}</h2>
      <p class="sectionNote">${tr('gpsInfoText')}</p>
      <div class="grid centerGridBoxes" style="margin-top:8px">
        <div class="box"><div class="k">${tr('provider')}</div><div class="v" id="gnssProvider">${escapeHtml(state.gnss.provider || '-')}</div></div>
        <div class="box"><div class="k">${tr('visibleSatellites')}</div><div class="v" id="gnssVisible">${escapeHtml(state.gnss.satellitesVisible || '-')}</div></div>
        <div class="box"><div class="k">${tr('usedSatellites')}</div><div class="v" id="gnssUsed">${escapeHtml(state.gnss.satellitesUsed || '-')}</div></div>
        <div class="box"><div class="k">${tr('accuracyLabel')}</div><div class="v" id="gnssAccuracy">${escapeHtml(state.gnss.accuracy || '-')}</div></div>
        <div class="box"><div class="k">${tr('altitudeLabel')}</div><div class="v" id="gnssAltitude">${escapeHtml(state.gnss.altitude || '-')}</div></div>
        <div class="box"><div class="k">${tr('speedLabel')}</div><div class="v" id="gnssSpeed">${escapeHtml(state.gnss.speed || '-')}</div></div>
        <div class="box"><div class="k">${tr('bearingLabel')}</div><div class="v" id="gnssBearing">${escapeHtml(state.gnss.bearing || '-')}</div></div>
        <div class="box"><div class="k">${tr('lastFix')}</div><div class="v" id="gnssLastFix">${escapeHtml(state.gnss.lastFix || '-')}</div></div>
        <div class="box"><div class="k">${tr('heading')}</div><div class="v" id="gnssHeading">${escapeHtml(formatHeadingDetailedText())}</div></div>
      </div>
      <div class="innerSubCard" style="margin-top:14px">
        <h2 class="subSectionTitle">${tr('satelliteSystems')}</h2>
        <div class="grid centerGridBoxes gnssSystemsRow" id="gnssSystems">
          ${(state.gnss.systems || []).length ? (state.gnss.systems || []).map((row) => `<div class="box gnssSystemBox"><div class="k">${escapeHtml(row.name)}</div><div class="v">${row.used} / ${row.visible}</div></div>`).join('') : `<p>${tr('noGnssData')}</p>`}
        </div>
        <p class="footerNote" id="gnssNote">${escapeHtml(state.gnss.note || tr('gpsInfoNote'))}</p>
      </div>
    </div>
    <div class="card centerCard">
      <h2>${tr('satelliteBars')}</h2>
      <p class="sectionNote satSummaryLine satSummaryLineBig"><span class="miniInlineLabel">${tr('inViewUsed')}</span> <span id="gnssInViewUsed">${escapeHtml(`${state.gnss.satellitesUsed ?? '-'} / ${state.gnss.satellitesVisible ?? '-'}`)}</span></p>
      <div class="satLegend">
        <span class="satLegendLeft">${tr('snrLabel')}</span>
        <span class="satLegendMid">${state.lang === 'de' ? 'Satellit' : 'Satellite'}</span>
        <span class="satLegendDot fixDot"></span><span>${state.lang === 'de' ? 'Fix' : 'Fix'}</span>
        <span class="satLegendDot viewDot"></span><span>${state.lang === 'de' ? 'Sicht' : 'View'}</span>
      </div>
      <div class="satList satListLarge" id="gnssBars">${renderSatelliteBarsMarkup()}</div>
      <div class="satSystemLegend" id="gnssLegend">${renderSatelliteLegendMarkup()}</div>
    </div>
  `;
}

function handleGnssLocationLike(payload) {
  const accuracy = payload.accuracy != null ? `${Number(payload.accuracy).toFixed(1)} m` : '-';
  const altitude = payload.altitude != null ? `${Number(payload.altitude).toFixed(1)} m` : '-';
  const speedMs = payload.speed != null ? Number(payload.speed) : null;
  const speed = Number.isFinite(speedMs) ? `${(speedMs * 3.6).toFixed(1)} km/h` : '-';
  const bearing = payload.bearing != null ? `${Number(payload.bearing).toFixed(0)}°` : '-';
  const tsRaw = payload.timestamp ?? payload.time ?? Date.now();
  const tsNum = Number(tsRaw);
  const ts = Number.isFinite(tsNum) ? new Date(tsNum) : new Date();
  state.gnss.provider = String(payload.provider || 'gps');
  state.gnss.accuracy = accuracy;
  state.gnss.altitude = altitude;
  state.gnss.speed = speed;
  state.gnss.bearing = bearing;
  state.gnss.lastFix = ts && !isNaN(ts) ? ts.toLocaleString(state.lang === 'de' ? 'de-DE' : 'en-GB') : '-';
  state.gnss.available = true;
  updateGnssUi();
}

function handleNativeGnssStatus(payload) {
  if (!payload || typeof payload !== 'object') return;
  const visible = Number(payload.visible);
  const used = Number(payload.used);
  state.gnss.satellitesVisible = Number.isFinite(visible) ? String(visible) : '-';
  state.gnss.satellitesUsed = Number.isFinite(used) ? String(used) : '-';
  const systems = Array.isArray(payload.systems) ? payload.systems : [];
  state.gnss.systems = systems.map((row) => ({
    name: String(row.name || 'Unknown'),
    visible: Number.isFinite(Number(row.visible)) ? Number(row.visible) : 0,
    used: Number.isFinite(Number(row.used)) ? Number(row.used) : 0
  }));
  const satellites = Array.isArray(payload.satellites) ? payload.satellites : [];
  state.gnss.satellites = satellites.map((sat) => ({
    svid: Number.isFinite(Number(sat.svid)) ? Number(sat.svid) : sat.svid,
    system: String(sat.system || 'GNSS'),
    used: !!sat.used,
    cn0DbHz: Number.isFinite(Number(sat.cn0DbHz)) ? Number(sat.cn0DbHz) : null,
    azimuth: Number.isFinite(Number(sat.azimuthDegrees)) ? Number(sat.azimuthDegrees) : null,
    elevation: Number.isFinite(Number(sat.elevationDegrees)) ? Number(sat.elevationDegrees) : null,
  }));
  state.gnss.available = state.gnss.available || systems.length > 0 || Number.isFinite(visible);
  state.gnss.note = tr('gpsInfoNote');
  updateGnssUi();
}

function handleNativeGnssLocation(payload) {
  handleGnssLocationLike(payload || {});
}

async function startNativeGnssIfAvailable() {
  if (!Capacitor.isNativePlatform() || state._gnssStarted) return;
  state._gnssStarted = true;
  try {
    if (!state._gnssStatusListener) {
      state._gnssStatusListener = await GnssBridge.addListener('gnssStatus', (payload) => handleNativeGnssStatus(payload));
    }
    if (!state._gnssLocationListener) {
      state._gnssLocationListener = await GnssBridge.addListener('gnssLocation', (payload) => handleNativeGnssLocation(payload));
    }
    if (!state._gnssMetaListener) {
      state._gnssMetaListener = await GnssBridge.addListener('gnssMeta', (payload) => {
        if (payload?.status === 'stopped' && state.gnss.satellitesVisible === '-') {
          state.gnss.note = state.lang === 'de' ? 'GNSS gestoppt.' : 'GNSS stopped.';
          updateGnssUi();
        }
      });
    }
    await GnssBridge.start();
    try {
      const snap = await GnssBridge.getSnapshot();
      if (snap?.location) handleNativeGnssLocation(snap.location);
    } catch {}
    state.gnss.note = tr('gpsInfoNote');
    updateGnssUi();
  } catch (err) {
    state._gnssStarted = false;
    state.gnss.note = err?.message || String(err);
    updateGnssUi();
  }
}

async function startHeadingWatch() {
  if (state.headingWatchStarted) return;
  state.headingWatchStarted = true;
  const applyHeading = (deg, extra = {}) => {
    if (!Number.isFinite(deg)) return;
    state.headingAvailable = true;
    state.heading = {
      deg,
      card: bearingText(deg),
      alpha: Number.isFinite(extra.alpha) ? extra.alpha : state.heading?.alpha,
      beta: Number.isFinite(extra.beta) ? extra.beta : state.heading?.beta,
      gamma: Number.isFinite(extra.gamma) ? extra.gamma : state.heading?.gamma,
    };
    updateHeadingUi();
  };
  try {
    const handle = await Motion.addListener('orientation', (ev) => {
      const raw = ev?.webkitCompassHeading ?? ev?.alpha;
      const heading = Number.isFinite(raw) ? ((raw + 360) % 360) : null;
      if (Number.isFinite(heading)) applyHeading(heading, { alpha: ev?.alpha, beta: ev?.beta, gamma: ev?.gamma });
    });
    state._headingHandle = handle;
  } catch {}
  try {
    const accelHandle = await Motion.addListener('accel', (ev) => {
      const a = ev?.accelerationIncludingGravity || ev?.acceleration;
      if (a && [a.x, a.y, a.z].some(v => Number.isFinite(v))) {
        state.accelVec = { x: Number(a.x || 0), y: Number(a.y || 0), z: Number(a.z || 0) };
      }
    });
    state._accelHandle = accelHandle;
  } catch {}
  if (typeof window !== 'undefined') {
    window.addEventListener('deviceorientation', (ev) => {
      const raw = ev.webkitCompassHeading ?? (ev.absolute ? ev.alpha : null);
      const heading = Number.isFinite(raw) ? ((raw + 360) % 360) : null;
      if (Number.isFinite(heading)) applyHeading(heading, { alpha: ev?.alpha, beta: ev?.beta, gamma: ev?.gamma });
    }, true);
    if ('Magnetometer' in window) {
      try {
        const sensor = new window.Magnetometer({ frequency: 2 });
        sensor.addEventListener('reading', () => {
          state.magneticField = { x: sensor.x, y: sensor.y, z: sensor.z };
          updateHeadingUi();
        });
        sensor.start();
        state._magSensor = sensor;
      } catch {}
    }
  }
}

function renderDynamicContent() {
  if (state.activeTab === 'bands') return renderBandTab();
  if (state.activeTab === 'classes') return renderClassesTab();
  if (state.activeTab === 'prop') return renderPropagationTab();
  if (state.activeTab === 'weather') return renderWeatherTab();
  if (state.activeTab === 'gpsinfo') return renderGpsInfoTab();
  return '';
}

function updateDynamicPanels() {
  const host = document.getElementById('dynamicPanels');
  if (host) host.innerHTML = renderDynamicContent();
  bindDynamicButtons();
}

function bindDynamicButtons() {
  document.querySelectorAll('#refreshEnvBtn').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        if (state.activeTab === 'prop' && !state.myPos) {
          await fetchSolarData(true);
          updateDynamicPanels();
        } else if (state.activeTab === 'weather' && !state.myPos) {
          alert(tr('envMissing'));
        } else {
          await ensureEnvironmentData(true);
        }
      } finally {
        btn.disabled = false;
      }
    };
  });
}


function render() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  app.innerHTML = `
    <style>
      :root{--bg:#f3f6fb;--bg2:#e9eef8;--card:#fff;--card2:#f8fbff;--line:#d7deea;--text:#172033;--muted:#667085;--accent:#0b3d91;--accent2:#4f8cff;--ok:#2fa44f;--warn:#d8a208}
      html.dark{--bg:#0b1017;--bg2:#111827;--card:#151c25;--card2:#10161f;--line:#2c3644;--text:#edf3fb;--muted:#98a6b8;--accent:#5f97ff;--accent2:#87b3ff;--ok:#47c96a;--warn:#f0c23a}
      *{box-sizing:border-box} body{margin:0;font-family:Arial,Helvetica,sans-serif;background:radial-gradient(circle at top, var(--bg2) 0%, var(--bg) 42%), var(--bg);color:var(--text);font-size:11px;line-height:1.22}
      .wrap{max-width:1200px;margin:0 auto;padding:calc(env(safe-area-inset-top, 0px) + 22px) 10px 10px 10px}.card{background:linear-gradient(180deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:18px;padding:10px;margin-bottom:10px}
      h1{font-size:20px;margin:0 0 5px;color:var(--accent)}h2{font-size:14px;margin:0 0 7px;color:var(--accent)}p{margin:2px 0;color:var(--muted);font-size:11px}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:8px}.box{background:linear-gradient(180deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:14px;padding:6px 8px;min-height:50px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}.tripleCols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.tripleCols .stackFields{height:100%}
      .k{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;text-align:center}.v{font-size:12px;font-weight:bold;margin-top:3px;color:var(--text);word-break:break-word;text-align:center;width:100%;white-space:pre-line}
      .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.tabs{display:flex;gap:8px;flex-wrap:wrap}.two{display:grid;grid-template-columns:minmax(0,0.82fr) minmax(0,0.82fr);gap:10px;justify-content:center}.stackFields{display:grid;grid-template-columns:1fr;gap:8px}.compactSelect{width:auto;min-width:170px;max-width:220px}.slimInput{padding:5px 10px!important;min-height:28px}.slimBtn{padding:4px 10px!important;min-height:26px;display:inline-flex!important;align-items:center!important;justify-content:center!important;text-align:center!important}.slimLabel{margin:0 0 3px 0;display:block}.titleRow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center}.titleRow .grow{flex:1 1 auto}.titleRow .compactSelect{margin-left:0}.centerRow{justify-content:center!important}.centerInput{text-align:center!important}.centerInput::placeholder{text-align:center!important}.centerCard{text-align:center!important}.centerCard .titleRow{justify-content:center!important}.centerCard h2,.centerCard p,.centerCard .sectionNote,.centerCard .footerNote{text-align:center!important}.centerCard .row{justify-content:center}.row button{text-align:center!important}.centerSelectWrap{display:flex;justify-content:center;margin-top:8px}.singleCenter{display:flex;justify-content:center;margin-top:8px}.singleCenter .box{width:min(320px,100%)}.subCenterLabel{text-align:center!important;display:block;width:100%}.centerFormBlock label{text-align:center!important;display:block;width:100%}.centerFormBlock .row{justify-content:center!important}.centerFormBlock input{text-align:center!important}.centerFormBlock input::placeholder{text-align:center!important}.centerGridBoxes .box{text-align:center!important;align-items:center!important}.centerGridBoxes .v,.centerGridBoxes .k{text-align:center!important}.gpsRow{justify-content:center!important}.gpsStatusSpacer{display:none}.langBtn{min-width:48px}.gpsIdle{background:linear-gradient(180deg,var(--accent2),var(--accent));color:#fff;border-color:transparent}.gpsFetching{background:linear-gradient(180deg,#ffd966,var(--warn));color:#111;border-color:transparent}.gpsFixed{background:linear-gradient(180deg,#62df89,var(--ok));color:#fff;border-color:transparent}.deClassesIntro{margin-bottom:10px}.classCardWide{padding:14px 14px 16px}.classHeadline{margin:10px 0 10px 0;line-height:1.2}.classSection{margin-top:8px}.classSectionLabel{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;text-align:center}.pillWrap{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}.pill{display:inline-flex;align-items:center;justify-content:center;text-align:center;padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:linear-gradient(180deg,var(--card),var(--card2));color:var(--text);line-height:1.2;max-width:100%}.pillBand{font-weight:700}.pillFreq{font-size:13px}.classBottomGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.classInfoBox{min-height:76px;padding:10px 12px}.classInfoBox .v{line-height:1.3}.classesStack{gap:12px}.miniInlineLabel{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.satSummaryLine{margin-bottom:8px}.satLegend{display:grid;grid-template-columns:56px 92px 10px auto 10px auto;gap:8px;align-items:center;justify-content:start;margin:6px 0 10px 0;text-align:left}.satLegendLeft,.satLegendMid{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.satLegendDot{width:10px;height:10px;border-radius:999px;display:inline-block}.fixDot{background:#77d78f}.viewDot{background:#6d778f}.satList{display:flex;flex-direction:column;gap:3px;margin-top:6px}.satListLarge{gap:2px}.satRow{display:grid;grid-template-columns:104px minmax(0,1fr) 74px;gap:12px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(180deg,var(--card),var(--card2))}.satMeta{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:3px;min-width:0}.satPrn{font-size:16px;font-weight:700;color:var(--text);line-height:1.1}.satSnr{font-size:13px;color:var(--muted);line-height:1.1}.satBarWrap{display:grid;grid-template-columns:repeat(20,minmax(0,1fr));gap:3px;align-items:end}.satSegment{display:block;height:18px;border-radius:4px;border:1px solid var(--line);background:transparent}.satBarLow{background:#ea7a42;border-color:transparent}.satBarMid{background:#e6d63d;border-color:transparent}.satBarGood{background:#71cf3b;border-color:transparent}.satBarStrong{background:#24bf2d;border-color:transparent}.satBarEmpty{background:transparent}.satRight{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right}.satDb{font-size:14px;font-weight:700;color:var(--text);line-height:1}.satUse{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);text-align:right;line-height:1}.satUsed .satUse{color:#77d78f}
.satSummaryLineBig{font-size:15px;text-align:left!important;margin-bottom:6px}.satSummaryLineBig #gnssInViewUsed{font-size:15px;font-weight:800}.satLegendMock{grid-template-columns:52px 86px 10px auto 10px auto 28px 28px;gap:6px;align-items:center}.satLegendRight{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;text-align:right}.satRow{grid-template-columns:72px 60px minmax(0,1fr) 66px 46px;gap:8px;align-items:center;padding:3px 6px;border-radius:6px}.satMetaMock{gap:1px}.satPrnRow{display:flex;align-items:center;gap:6px}.satFlag{font-size:20px;line-height:1}.satPrnId{font-size:15px;font-weight:800;color:var(--text)}.satSystemAbbr{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-left:26px}.satDbLeft{font-size:16px;font-weight:700;color:var(--text);text-align:left;white-space:nowrap}.satBarWrapMock{gap:1px}.satSegment{height:14px;border-radius:3px}.satRightMock{align-items:flex-end;gap:1px}.satAngles{display:flex;flex-direction:column;align-items:flex-end;gap:1px;font-size:11px;color:var(--muted);line-height:1}.satSystemLegend{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:flex-start;margin-top:6px;padding-top:5px;border-top:1px solid var(--line)}.innerSubCard{margin-top:12px;padding-top:4px;border-top:1px solid var(--line)}.subSectionTitle{font-size:17px;margin:0 0 10px;text-align:center;color:var(--accent)}.satLegendChip{display:inline-flex;align-items:center;gap:6px;font-size:14px;color:var(--text)}.satLegendFlag{font-size:18px;line-height:1}.satLegendText{white-space:nowrap}.gnssSystemsRow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:stretch}.gnssSystemsRow .gnssSystemBox{min-height:44px;padding:6px 6px;border-radius:12px}.gnssSystemsRow .k{font-size:10px;letter-spacing:.1em}.gnssSystemsRow .v{font-size:14px;font-weight:800}.gnssSystemsRow p{grid-column:1/-1}.footerNote{margin-top:8px}.footerNote#gnssNote{margin-top:10px}.addrInputWrap{position:relative}.addrInputWrap .slimInput{padding-right:42px;margin-bottom:0}.suggestToggleBtn{position:absolute;right:8px;top:50%;transform:translateY(-50%);height:28px;min-width:28px;padding:0 8px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--text);font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center}.suggestListWrap{display:none;position:relative;z-index:2}.suggestListWrap .suggestItem{display:block;width:100%;text-align:left;margin:0 0 6px;padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.suggestListWrap .suggestItem:last-child{margin-bottom:0}.suggestListWrap .suggestItem:hover{background:rgba(255,255,255,.04)}

      input,textarea,select{width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:12px;font-size:11px;outline:none;background:var(--card2);color:var(--text)}
      select.langsel{width:auto;min-width:120px}
      textarea{min-height:58px;resize:vertical}
      html.dark input,html.dark textarea,html.dark select{background:#0f141b!important;color:#fff!important;border-color:#3a4454!important}
      button{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:12px;padding:5px 10px;cursor:pointer;font-size:11px;line-height:1.1;text-align:center;display:inline-flex;align-items:center;justify-content:center}.primary{background:linear-gradient(180deg,var(--accent2),var(--accent));color:#fff;border-color:transparent}
      .badge{display:inline-block;padding:4px 8px;border-radius:999px;background:rgba(95,151,255,.14);color:var(--accent);font-size:9px;font-weight:bold}.statusText{font-size:10px;color:var(--muted)}
      .link{color:var(--accent2);text-decoration:none}
      html.dark .box{background:linear-gradient(180deg,#151c25,#111821)!important;border-color:#313b4b!important}html.dark .v{color:#eef2f7!important}html.dark .k{color:#a9b7ca!important}html.dark button{background:#151c25!important;color:#eef2f7!important;border-color:#313b4b!important}html.dark .primary{background:linear-gradient(180deg,#6ba6ff,#4f8cff)!important;color:#fff!important;border-color:transparent!important}
      @media (max-width:900px){.two{grid-template-columns:1fr}.tripleCols{grid-template-columns:repeat(3,minmax(0,1fr))}.classBottomGrid{grid-template-columns:1fr}.satLegend{grid-template-columns:44px 70px 10px auto 10px auto 20px 20px;gap:6px}.satLegendLeft,.satLegendMid,.satLegendRight{font-size:9px}.satRow{grid-template-columns:58px 46px minmax(0,1fr) 46px 28px;gap:4px;padding:2px 4px}.satMeta{align-items:flex-start;text-align:left}.satFlag{font-size:15px}.satPrnId{font-size:11px}.satSystemAbbr{font-size:9px;margin-left:21px}.satDbLeft{font-size:11px}.satBarWrap{grid-template-columns:repeat(20,minmax(0,1fr));gap:1px}.satSegment{height:10px}.satDb{font-size:10px}.satUse{font-size:8px;margin-top:0}.satAngles{font-size:9px}.satLegendChip{font-size:11px}.satLegendFlag{font-size:14px}}
    </style>
    <div class="wrap">
      <div class="card centerCard">
        <h1>Schippi's Ham&Cheese</h1>
        <p>${tr('subtitle')}</p>
        <div class="titleRow">
          <button class="slimBtn" id="myNameBtn">${state.myName || tr('nameEnter')}</button>
          <button class="slimBtn" id="myCallsignBtn">${state.myCallsign || tr('callsignEnter')}</button>
          <button class="slimBtn" id="themeBtn" title="Theme">☀️ / 🌙</button>
          <button class="slimBtn langBtn" id="langBtn">${state.lang === 'de' ? 'DE' : 'EN'}</button>
        </div>
        <div class="centerSelectWrap">
          <select id="tabSel" class="compactSelect slimInput centerInput">
            <option value="tools" ${state.activeTab === 'tools' ? 'selected' : ''}>${tr('tabTools')}</option>
            <option value="bands" ${state.activeTab === 'bands' ? 'selected' : ''}>${tr('tabBands')}</option>
            <option value="classes" ${state.activeTab === 'classes' ? 'selected' : ''}>${tr('tabClasses')}</option>
            <option value="prop" ${state.activeTab === 'prop' ? 'selected' : ''}>${tr('tabProp')}</option>
            <option value="weather" ${state.activeTab === 'weather' ? 'selected' : ''}>${tr('tabWeather')}</option>
            <option value="gpsinfo" ${state.activeTab === 'gpsinfo' ? 'selected' : ''}>${tr('tabGpsInfo')}</option>
          </select>
        </div>
      </div>

      <div class="two" style="display:${state.activeTab === 'tools' ? 'grid' : 'none'}">
        <div class="card centerCard">
          <h2>${tr('myLocation')}</h2>
          <div class="row gpsRow">
            <button class="slimBtn ${gpsButtonClass()}" id="gpsBtn">${gpsButtonLabel()} </button>
          </div>
          <div class="row centerRow" style="margin-top:8px">
            <button class="slimBtn" id="shareMyBlockBtn">${tr('share')}</button>
            <button class="slimBtn" id="copyLocBtn">${tr('copyLocator')}</button>
            <button class="slimBtn" id="gpsClearBtn">${tr('gpsClear')}</button>
            <button class="slimBtn" id="copyMyBlockBtn">${tr('copyBlock')}</button>
          </div>
          <div style="margin-top:8px">
            <div class="addrInputWrap" style="margin-bottom:8px">
              <input class="slimInput centerInput" id="addrLookup" value="${escapeHtml(state.addrQuery)}" placeholder="${tr('addressPlaceholder')}" autocomplete="off">
              <button class="suggestToggleBtn" id="addrSuggestToggle" type="button">▼</button>
            </div>
            <div class="row centerRow" style="margin-bottom:8px">
              <button class="slimBtn" id="addrLookupBtn">${tr('addressToLocator')}</button>
            </div>
            <div id="addrSuggestWrap" class="suggestListWrap" style="display:none;margin-bottom:8px"></div>
          </div>
          <div class="tripleCols centerGridBoxes" style="margin-top:8px">
            <div class="box"><div class="k">${tr('country')}</div><div class="v" id="myCountry">-</div></div>
            <div class="box"><div class="k">${tr('city')}</div><div class="v" id="myCity">-</div></div>
            <div class="box"><div class="k">${tr('street')}</div><div class="v" id="myStreet">-</div></div>
          </div>
          <div class="singleCenter centerGridBoxes">
            <div class="box"><div class="k">${tr('locator')}</div><div class="v" id="myLocator">-</div></div>
          </div>
          <div class="singleCenter centerGridBoxes">
            <div class="box"><div class="k">${tr('heading')}</div><div class="v" id="myHeading">-</div></div>
          </div>
          <div class="tripleCols" style="margin-top:8px">
            <div class="stackFields">
              <div class="box"><div class="k">${tr('gpsTime')}</div><div class="v" id="myGpsLocalTime">-</div></div>
              <div class="box"><div class="k">${tr('gpsDate')}</div><div class="v" id="myGpsLocalDate">-</div></div>
            </div>
            <div class="stackFields">
              <div class="box"><div class="k">${tr('utcTime')}</div><div class="v" id="myUtcTime">-</div></div>
              <div class="box"><div class="k">${tr('utcDate')}</div><div class="v" id="myUtcDate">-</div></div>
            </div>
            <div class="stackFields">
              <div class="box"><div class="k">${tr('locatorTime')}</div><div class="v" id="myLocalTime">-</div></div>
              <div class="box"><div class="k">${tr('locatorDate')}</div><div class="v" id="myLocalDate">-</div></div>
            </div>
          </div>
          <div class="stackFields" style="margin-top:8px">
            <div class="box"><div class="k">${tr('googleCoords')}</div><div class="v" id="gmaps">-</div></div>
            <div class="box"><div class="k">${tr('dms')}</div><div class="v" id="fmtDms">-</div></div>
            <div class="box"><div class="k">${tr('ddm')}</div><div class="v" id="fmtDdm">-</div></div>
          </div>
        </div>

        <div class="card centerCard centerFormBlock">
          <h2>${tr('remote')}</h2>
          <input class="slimInput centerInput" id="dxAddrLookup" value="${escapeHtml(state.dxAddrQuery)}" placeholder="${tr('remoteAddressPlaceholder')}" style="margin-bottom:8px" autocomplete="off">
          <div class="row centerRow" style="margin-bottom:8px">
            <button class="slimBtn" id="dxAddrLookupBtn">${tr('remoteAddressToLocator')}</button>
            <button class="slimBtn" id="dxResetBtn">${tr('remoteReset')}</button>
          </div>
          <div id="dxAddrSuggestWrap" style="display:none;margin-bottom:8px">
            <select id="dxAddrSuggest" class="slimInput centerInput" style="width:100%"></select>
          </div>
          <label class="slimLabel subCenterLabel">${tr('remoteInput')}</label><input class="slimInput centerInput" id="dxCall" value="${escapeHtml(state.dxCallInput)}" placeholder="${tr('remotePlaceholder')}">
          <label class="slimLabel subCenterLabel">${tr('coordsField')}</label><input class="slimInput centerInput" id="dxCoords" value="${escapeHtml(state.dxCoordsInput)}" placeholder="${tr('coordsPlaceholder')}">
          <div class="row centerRow">
            ${state.lang === 'de' ? `<button class="slimBtn" id="bnetzaBtn">${tr('bnetza')}</button>` : ''}
            <button class="slimBtn" id="routeMapBtn">${tr('openMap')}</button>
          </div>
          <div class="grid centerGridBoxes">
            <div class="box"><div class="k">${tr('countryMeaning')}</div><div class="v" id="dxCountry">-</div></div>
            <div class="box"><div class="k">${tr('city')}</div><div class="v" id="dxCity">-</div></div>
            <div class="box"><div class="k">${tr('street')}</div><div class="v" id="dxStreet">-</div></div>
            <div class="box"><div class="k">${tr('cqitu')}</div><div class="v" id="dxZones">-</div></div>
            <div class="box"><div class="k">${tr('note')}</div><div class="v" id="dxNote">-</div></div>
            <div class="box"><div class="k">${tr('distance')}</div><div class="v" id="dxDistance">-</div></div>
            <div class="box"><div class="k">${tr('bearing')}</div><div class="v" id="dxBearing">-</div></div>
            <div class="box"><div class="k">${tr('bandRec')}</div><div class="v" id="dxBandRec">-</div></div>
            <div class="box"><div class="k">${tr('locatorTime')}</div><div class="v" id="dxLocatorTime">-</div></div>
          </div>
          <div class="singleCenter centerGridBoxes">
            <div class="box"><div class="k">${tr('map')}</div><div class="v" id="dxMapLink">-</div></div>
          </div>
        </div>
      </div>
      <div id="dynamicPanels">${renderDynamicContent()}</div>
    </div>
  `;
}

function hydrateMyFromState() {
  if (!state.myPos) return;
  if (state.myGeo) fillMy(state.myGeo, state.myPos[0], state.myPos[1]);
  else {
    const locEl = document.getElementById('myLocator');
    const dmsEl = document.getElementById('fmtDms');
    const ddmEl = document.getElementById('fmtDdm');
    const mapsEl = document.getElementById('gmaps');
    if (locEl) locEl.textContent = maiden(state.myPos[0], state.myPos[1]);
    if (dmsEl) dmsEl.textContent = `${fmtDMS(state.myPos[0], true)} | ${fmtDMS(state.myPos[1], false)}`;
    if (ddmEl) ddmEl.textContent = `${fmtDDM(state.myPos[0], true)} | ${fmtDDM(state.myPos[1], false)}`;
    if (mapsEl) mapsEl.innerHTML = `<a id="gmapsLink" class="link" target="_blank" href="${googleMapsUrl(state.myPos[0], state.myPos[1])}">${state.myPos[0].toFixed(6)}, ${state.myPos[1].toFixed(6)}</a>`;
  }
}

function gpsButtonLabel() {
  if (state.gpsLoading) return state.lang === 'en' ? 'Fetching GPS' : 'GPS wird geholt';
  if (state.myPos) return state.lang === 'en' ? 'GPS fix' : 'GPS fix';
  return tr('gpsGet');
}

function gpsButtonClass() {
  if (state.gpsLoading) return 'gpsFetching';
  if (state.myPos) return 'gpsFixed';
  return 'gpsIdle';
}

function updateGpsStatusBadge() {
  const btn = document.getElementById('gpsBtn');
  if (btn) {
    btn.textContent = gpsButtonLabel();
    btn.classList.remove('gpsIdle','gpsFetching','gpsFixed','primary');
    btn.classList.add(gpsButtonClass());
  }
}

function hydrateUiFromState() {
  hydrateMyFromState();
  updateClock();
  updateGpsStatusBadge();
  updateHeadingUi();
  updateGnssUi();
  const dxCallEl = document.getElementById('dxCall');
  if (dxCallEl) dxCallEl.value = state.dxCallInput || '';
  const dxCoordsEl = document.getElementById('dxCoords');
  if (dxCoordsEl) dxCoordsEl.value = state.dxCoordsInput || '';
  const addrEl = document.getElementById('addrLookup');
  if (addrEl) addrEl.value = state.addrQuery || '';
  const dxAddrEl = document.getElementById('dxAddrLookup');
  if (dxAddrEl) dxAddrEl.value = state.dxAddrQuery || '';
}

function updateClock() {
  const locatorTz = state.myPos ? timezoneForLatLon(state.myPos[0], state.myPos[1]) : null;
  const gpsTz = state.gpsActualTimeZone || null;
  const dxTz = state.dxPos ? timezoneForLatLon(state.dxPos[0], state.dxPos[1]) : null;

  const myLocalTime = document.getElementById('myLocalTime');
  const myLocalDate = document.getElementById('myLocalDate');
  const myGpsLocalTime = document.getElementById('myGpsLocalTime');
  const myGpsLocalDate = document.getElementById('myGpsLocalDate');
  const myUtcTime = document.getElementById('myUtcTime');
  const myUtcDate = document.getElementById('myUtcDate');
  const dxLocatorTime = document.getElementById('dxLocatorTime');

  if (myLocalTime) myLocalTime.textContent = locatorTz ? fmtTimeForTimezone(locatorTz) : '-';
  if (myLocalDate) myLocalDate.textContent = locatorTz ? fmtDateForTimezone(locatorTz) : '-';
  if (myGpsLocalTime) myGpsLocalTime.textContent = gpsTz ? fmtTimeForTimezone(gpsTz) : '-';
  if (myGpsLocalDate) myGpsLocalDate.textContent = gpsTz ? fmtDateForTimezone(gpsTz) : '-';
  if (myUtcTime) myUtcTime.textContent = fmtUtcTime();
  if (myUtcDate) myUtcDate.textContent = fmtDateForTimezone('UTC');
  if (dxLocatorTime) dxLocatorTime.textContent = dxTz ? fmtTimeForTimezone(dxTz) : '-';
}

function clearMyGps() {
  state.myPos = null;
  state.myGeo = null;
  state.gpsActualTimeZone = null;
  state.gpsLoading = false;
  state.addrQuery = '';
  state.addrSuggestions = [];
  document.getElementById('myCountry').textContent = '-';
  document.getElementById('myCity').textContent = '-';
  document.getElementById('myStreet').textContent = '-';
  document.getElementById('myLocator').textContent = '-';
  document.getElementById('fmtDms').textContent = '-';
  document.getElementById('fmtDdm').textContent = '-';
  document.getElementById('gmaps').textContent = '-';
  const addrEl = document.getElementById('addrLookup');
  if (addrEl) addrEl.value = '';
  renderAddressSuggestions();
  hideAddressSuggestions();
  updateClock();
  updateGpsStatusBadge();
  persistCoreState();
}

function clearDx() {
  state.dxPos = null;
  state.dxAddrQuery = '';
  state.dxAddrSuggestions = [];
  state.dxAddrHit = null;
  state.dxCallInput = '';
  state.dxCoordsInput = '';
  ['dxCall', 'dxCoords', 'dxAddrLookup'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['dxCountry','dxCity','dxStreet','dxZones','dxNote','dxDistance','dxBearing','dxBandRec','dxLocatorTime','dxMapLink'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '-';
  });
  renderDxAddressSuggestions();
  hideDxAddressSuggestions();
  updateClock();
  persistCoreState();
}

function fillMy(geo, lat, lon) {
  state.myGeo = geo;
  document.getElementById('myCountry').textContent = geo.country;
  document.getElementById('myCity').textContent = geo.city;
  document.getElementById('myStreet').textContent = geo.street;
  document.getElementById('myLocator').textContent = maiden(lat, lon);
  document.getElementById('fmtDms').textContent = `${fmtDMS(lat, true)} | ${fmtDMS(lon, false)}`;
  document.getElementById('fmtDDm');
  document.getElementById('fmtDdm').textContent = `${fmtDDM(lat, true)} | ${fmtDDM(lon, false)}`;
  document.getElementById('gmaps').innerHTML = `<a id="gmapsLink" class="link" target="_blank" href="${googleMapsUrl(lat, lon)}">${lat.toFixed(6)}, ${lon.toFixed(6)}</a>`;
  updateClock();
  updateGpsStatusBadge();
  persistCoreState();
}

function applyCoordsToGnss(coords, provider = 'gps') {
  if (!coords) return;
  handleGnssLocationLike({
    provider,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    speed: coords.speed,
    bearing: coords.heading ?? coords.bearing,
    timestamp: coords.timestamp || Date.now()
  });
}

async function startBasicGnssWatch() {
  if (state._basicGnssWatchStarted) return;
  state._basicGnssWatchStarted = true;
  try {
    if (Capacitor.isNativePlatform()) {
      const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, (pos, err) => {
        if (err || !pos?.coords) return;
        applyCoordsToGnss(pos.coords, 'gps');
      });
      state._basicGnssWatchId = id;
    } else if (navigator.geolocation?.watchPosition) {
      const id = navigator.geolocation.watchPosition((pos) => {
        if (pos?.coords) applyCoordsToGnss(pos.coords, 'gps');
      }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      state._basicGnssWatchId = id;
    }
  } catch {}
}

async function getPosition() {
  state.gpsLoading = true;
  updateGpsStatusBadge();
  startHeadingWatch();
  startNativeGnssIfAvailable();
  startBasicGnssWatch();
  try {
    let latitude, longitude;
    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions();
      const granted = perm.location === 'granted' || perm.coarseLocation === 'granted';
      if (!granted) {
        alert(tr('gpsDenied'));
        return;
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      applyCoordsToGnss(pos.coords, 'gps');
      applyCoordsToGnss(pos.coords, 'gps');
    } else {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    }
    state.myPos = [latitude, longitude];
    state.gpsActualTimeZone = deviceTimeZone();
    let geo = null;
    try {
      geo = await reverseGeocode(latitude, longitude);
    } catch {}
    fillMy(geo || { country: '-', city: '-', street: '-' }, latitude, longitude);
    await ensureEnvironmentData(true);
    persistCoreState();
    evaluateDx();
  } catch (err) {
    alert(tr('gpsErrorPrefix') + (err?.message || String(err)));
  } finally {
    state.gpsLoading = false;
    updateGpsStatusBadge();
  }
}

async function getGpsTimeOnly() {
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions();
      const granted = perm.location === 'granted' || perm.coarseLocation === 'granted';
      if (!granted) {
        alert(tr('gpsDenied'));
        return;
      }
      await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    } else {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });
    }
    state.gpsActualTimeZone = deviceTimeZone();
    updateClock();
  } catch (err) {
    alert('GPS-Zeit-Fehler: ' + (err?.message || String(err)));
  }
}

function renderAddressSuggestions() {
  const wrap = document.getElementById('addrSuggestWrap');
  if (!wrap) return;
  const list = Array.isArray(state.addrSuggestions) ? state.addrSuggestions : [];
  if (!state.addrSuggestOpen || !list.length) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  wrap.style.display = 'block';
  wrap.innerHTML = list.slice(0,5).map((hit, idx) => `
    <button type="button" class="suggestItem" data-idx="${idx}">${escapeHtml(splitDisplayName(hit.display))}</button>
  `).join('');
  wrap.querySelectorAll('.suggestItem').forEach(btn => btn.onclick = async () => {
    const hit = list[Number(btn.dataset.idx)];
    if (!hit) return;
    state.addrQuery = hit.display;
    const input = document.getElementById('addrLookup');
    if (input) input.value = hit.display;
    state.addrSuggestOpen = false;
    renderAddressSuggestions();
    await applyAddressCandidate(hit);
    persistCoreState();
  });
}

function renderDxAddressSuggestions() {
  const wrap = document.getElementById('dxAddrSuggestWrap');
  if (!wrap) return;
  const list = Array.isArray(state.dxAddrSuggestions) ? state.dxAddrSuggestions : [];
  if (!state.dxAddrSuggestOpen || !list.length) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  wrap.style.display = 'block';
  wrap.innerHTML = list.slice(0,5).map((hit, idx) => `
    <button type="button" class="suggestItem" data-idx="${idx}">${escapeHtml(splitDisplayName(hit.display))}</button>
  `).join('');
  wrap.querySelectorAll('.suggestItem').forEach(btn => btn.onclick = async () => {
    const hit = list[Number(btn.dataset.idx)];
    if (!hit) return;
    state.dxAddrQuery = hit.display;
    const input = document.getElementById('dxAddrLookup');
    if (input) input.value = hit.display;
    state.dxAddrSuggestOpen = false;
    renderDxAddressSuggestions();
    await applyDxAddressCandidate(hit);
    persistCoreState();
  });
}

async function applyDxAddressCandidate(hit) {
  if (!hit) return;
  state.dxAddrHit = hit;
  state.dxPos = [hit.lat, hit.lon];
  document.getElementById('dxCountry').textContent = hit.country || '-';
  document.getElementById('dxCity').textContent = hit.city || '-';
  document.getElementById('dxStreet').textContent = hit.street || '-';
  document.getElementById('dxZones').textContent = maiden(hit.lat, hit.lon);
  document.getElementById('dxNote').textContent = tr('addressDetected');
  setDxGeoExtras(hit.lat, hit.lon);
  updateClock();
  persistCoreState();
}

async function updateDxAddressSuggestions(query, immediate = false) {
  const clean = normalizeAddressQuery(query);
  state.dxAddrQuery = clean;
  if (!clean || clean.length < 3) {
    state.dxAddrSuggestions = [];
    state.dxAddrHit = null;
    state.dxAddrSuggestOpen = false;
    renderDxAddressSuggestions();
    persistCoreState();
    return;
  }
  const runner = async () => {
    try {
      const hits = await geocodeAddressCandidates(clean);
      state.dxAddrSuggestions = hits;
      state.dxAddrSuggestOpen = hits.length > 0;
      renderDxAddressSuggestions();
    } catch {
      state.dxAddrSuggestions = [];
      state.dxAddrSuggestOpen = false;
      renderDxAddressSuggestions();
    }
  };
  if (immediate) return runner();
  clearTimeout(state.dxAddrSuggestTimer);
  state.dxAddrSuggestTimer = setTimeout(runner, 180);
}

async function lookupDxAddress() {
  const query = normalizeAddressQuery(document.getElementById('dxAddrLookup')?.value || '');
  state.dxAddrQuery = query;
  if (!query) {
    alert(tr('enterAddressFirst'));
    return;
  }
  try {
    const hits = await geocodeAddressCandidates(query);
    state.dxAddrSuggestions = hits;
    state.dxAddrSuggestOpen = hits.length > 0;
    renderDxAddressSuggestions();
    await applyDxAddressCandidate(hits[0]);
  } catch (err) {
    state.dxAddrSuggestOpen = false;
    state.addrSuggestOpen = false;
    renderDxAddressSuggestions();
    renderAddressSuggestions();
    alert(tr('addressErrorPrefix') + (err?.message || String(err)));
  }
}

async function applyAddressCandidate(hit) {
  if (!hit) return;
  state.myPos = [hit.lat, hit.lon];
  state.gpsActualTimeZone = deviceTimeZone();
  const geo = {
    country: hit.country || '-',
    city: hit.city || '-',
    street: hit.street || '-'
  };
  state.myGeo = geo;
  fillMy(geo, hit.lat, hit.lon);
  await ensureEnvironmentData(true);
  persistCoreState();
  evaluateDx();
}

async function updateAddressSuggestions(query, immediate = false) {
  const clean = normalizeAddressQuery(query);
  state.addrQuery = clean;
  if (!clean || clean.length < 3) {
    state.addrSuggestions = [];
    state.addrSuggestOpen = false;
    renderAddressSuggestions();
    persistCoreState();
    return;
  }
  const runner = async () => {
    try {
      const hits = await geocodeAddressCandidates(clean);
      state.addrSuggestions = hits;
      state.addrSuggestOpen = hits.length > 0;
      renderAddressSuggestions();
    } catch {
      state.addrSuggestions = [];
      state.addrSuggestOpen = false;
      renderAddressSuggestions();
    }
  };
  if (immediate) return runner();
  clearTimeout(state.addrSuggestTimer);
  state.addrSuggestTimer = setTimeout(runner, 180);
}

async function lookupAddressToLocator() {
  const query = normalizeAddressQuery(document.getElementById('addrLookup')?.value || '');
  state.addrQuery = query;
  if (!query) {
    alert(tr('enterAddressFirst'));
    return;
  }
  try {
    const hits = await geocodeAddressCandidates(query);
    state.addrSuggestions = hits;
    state.addrSuggestOpen = hits.length > 0;
    renderAddressSuggestions();
    await applyAddressCandidate(hits[0]);
  } catch (err) {
    alert(tr('addressErrorPrefix') + (err?.message || String(err)));
  }
}

function setDxGeoExtras(lat, lon) {
  if (state.myPos) {
    const distance = haversineKm(state.myPos[0], state.myPos[1], lat, lon);
    const bearing = bearingDeg(state.myPos[0], state.myPos[1], lat, lon);
    const rec = bandRecommendation(distance);
    document.getElementById('dxDistance').textContent = `${distance.toFixed(1)} km`;
    document.getElementById('dxBearing').textContent = `${bearing.toFixed(0)}° ${bearingText(bearing)}`;
    document.getElementById('dxBandRec').textContent = `${rec.band} · ${rec.reason}`;
    document.getElementById('dxMapLink').innerHTML = `<a class="link" target="_blank" href="${routeMapUrl(state.myPos[0], state.myPos[1], lat, lon)}">${tr('routeMap')}</a>`;
  } else {
    document.getElementById('dxDistance').textContent = '-';
    document.getElementById('dxBearing').textContent = '-';
    document.getElementById('dxBandRec').textContent = tr('setGpsFirst');
    document.getElementById('dxMapLink').textContent = tr('setGpsFirst');
  }
}

async function evaluateDx() {
  const raw = document.getElementById('dxCall').value.trim();
  const coords = document.getElementById('dxCoords').value.trim();
  const dxAddr = normalizeAddressQuery(document.getElementById('dxAddrLookup')?.value || state.dxAddrQuery || '');
  const dxCountry = document.getElementById('dxCountry');
  const dxCity = document.getElementById('dxCity');
  const dxStreet = document.getElementById('dxStreet');
  const dxZones = document.getElementById('dxZones');
  const dxNote = document.getElementById('dxNote');

  state.dxPos = null;

  dxCountry.textContent = '-';
  dxCity.textContent = '-';
  dxStreet.textContent = '-';
  dxZones.textContent = '-';
  dxNote.textContent = '-';
  document.getElementById('dxDistance').textContent = '-';
  document.getElementById('dxBearing').textContent = '-';
  document.getElementById('dxBandRec').textContent = '-';
  document.getElementById('dxMapLink').textContent = '-';

  const upper = raw.toUpperCase();

  if (dxAddr && state.dxAddrHit) {
    state.dxPos = [state.dxAddrHit.lat, state.dxAddrHit.lon];
    dxCountry.textContent = state.dxAddrHit.country || '-';
    dxCity.textContent = state.dxAddrHit.city || '-';
    dxStreet.textContent = state.dxAddrHit.street || '-';
    dxZones.textContent = maiden(state.dxAddrHit.lat, state.dxAddrHit.lon);
    dxNote.textContent = tr('addressDetected');
    setDxGeoExtras(state.dxAddrHit.lat, state.dxAddrHit.lon);
    updateClock();
    return;
  }

  if (upper && typeof qcodes === 'object' && Object.prototype.hasOwnProperty.call(qcodes, upper)) {
    dxCountry.textContent = qcodeText(upper, qcodes[upper]);
    dxZones.textContent = tr('qCode');
    dxNote.textContent = tr('qCodeDetected');
    updateClock();
    return;
  }

  if (upper) {
    const locator = maidenToLatLon(upper);
    if (locator) {
      try {
        const geo = await reverseGeocode(locator[0], locator[1]);
        dxCountry.textContent = geo.country;
        dxCity.textContent = geo.city;
        dxStreet.textContent = geo.street;
      } catch {}
      state.dxPos = [locator[0], locator[1]];
      dxZones.textContent = upper;
      dxNote.textContent = tr('locatorDetected');
      setDxGeoExtras(locator[0], locator[1]);
      updateClock();
      return;
    }
  }

  if (upper && Array.isArray(prefixes)) {
    const hit = prefixes.find((e) => {
      if (typeof e === 'string') return upper.startsWith(e.toUpperCase());
      if (e?.prefix && typeof e.prefix === 'string') return upper.startsWith(e.prefix.toUpperCase());
      if (e?.prefix instanceof RegExp) return e.prefix.test(upper);
      if (e?.p && typeof e.p === 'string') return upper.startsWith(e.p.toUpperCase());
      return false;
    });
    if (hit) {
      dxCountry.textContent = hit.country || hit.name || '-';
      const cq = hit.cq ? `CQ ${hit.cq}` : '';
      const itu = hit.itu ? `ITU ${hit.itu}` : '';
      dxZones.textContent = [cq, itu].filter(Boolean).join(' / ') || '-';
      dxNote.textContent = tr('callsignDetected');
      updateClock();
      return;
    }
  }

  if (coords) {
    try {
      const parsed = parseCoords(coords);
      if (!parsed) {
        dxNote.textContent = tr('coordsUnknown');
        updateClock();
        return;
      }
      const geo = await reverseGeocode(parsed[0], parsed[1]);
      dxCountry.textContent = geo.country;
      dxCity.textContent = geo.city;
      dxStreet.textContent = geo.street;
      dxNote.textContent = tr('coordsDetected');
      state.dxPos = [parsed[0], parsed[1]];
      setDxGeoExtras(parsed[0], parsed[1]);
      updateClock();
      return;
    } catch {
      dxNote.textContent = tr('reverseFailed');
      updateClock();
      return;
    }
  }

  updateClock();
}

async function shareMyBlock() {
  const text = myDataText();
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title: "Schippi's Ham&Cheese",
        text,
        dialogTitle: tr('shareDialog')
      });
      return;
    }
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    alert(tr('shareFallback'));
  } catch (err) {
    console.error(err);
  }
}

function bind() {
  document.getElementById('myNameBtn').onclick = editMyName;
  document.getElementById('myCallsignBtn').onclick = editMyCallsign;
  hydrateUiFromState();
  const dxAddrEl = document.getElementById('dxAddrLookup');
  if (dxAddrEl) dxAddrEl.value = state.dxAddrQuery || '';
  renderDxAddressSuggestions();
  const tabSel = document.getElementById('tabSel');
  if (tabSel) {
    tabSel.onchange = async (e) => {
      state.activeTab = e.target.value;
      localStorage.setItem('activeTab', state.activeTab);
      persistCoreState();
      render();
      bind();
      startClock();
      hydrateUiFromState();
  const dxAddrEl = document.getElementById('dxAddrLookup');
  if (dxAddrEl) dxAddrEl.value = state.dxAddrQuery || '';
  renderDxAddressSuggestions();
      if (state.activeTab === 'prop') await fetchSolarData(true);
      if (state.myPos && state.activeTab !== 'tools') await ensureEnvironmentData(false);
      updateDynamicPanels();
      updateHeadingUi();
      updateGnssUi();
      evaluateDx();
    };
  }
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.onclick = () => {
    state.lang = state.lang === 'de' ? 'en' : 'de';
    localStorage.setItem('lang', state.lang);
    render();
    bind();
    startClock();
    hydrateUiFromState();
  const dxAddrEl = document.getElementById('dxAddrLookup');
  if (dxAddrEl) dxAddrEl.value = state.dxAddrQuery || '';
  renderDxAddressSuggestions();
    evaluateDx();
    updateDynamicPanels();
  };

  document.getElementById('themeBtn').onclick = () => {
    localStorage.setItem('theme', (localStorage.getItem('theme') || 'dark') === 'dark' ? 'light' : 'dark');
    render();
    bind();
    startClock();
    if (state.myPos) {
      reverseGeocode(state.myPos[0], state.myPos[1]).then(geo => fillMy(geo, state.myPos[0], state.myPos[1])).catch(()=>{});
    } else {
      updateClock();
    }
    evaluateDx();
  };

  document.getElementById('dxCall').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    state.dxCallInput = e.target.value;
    persistCoreState();
    evaluateDx();
  });
  document.getElementById('dxCoords').addEventListener('input', (e) => {
    state.dxCoordsInput = e.target.value;
    persistCoreState();
    evaluateDx();
  });
  document.getElementById('dxAddrLookup').addEventListener('input', (e) => {
    state.dxAddrQuery = e.target.value;
    state.dxAddrHit = null;
    persistCoreState();
    updateDxAddressSuggestions(e.target.value);
  });
  document.getElementById('addrLookup').addEventListener('input', (e) => {
    state.addrQuery = e.target.value;
  });

  document.getElementById('gpsBtn').onclick = getPosition;
  document.getElementById('gpsClearBtn').onclick = () => { clearMyGps(); evaluateDx(); };
  document.getElementById('dxAddrLookupBtn').onclick = lookupDxAddress;
  const dxResetBtn = document.getElementById('dxResetBtn');
  if (dxResetBtn) dxResetBtn.onclick = clearDx;
  document.getElementById('addrLookupBtn').onclick = lookupAddressToLocator;
  document.getElementById('addrLookup').addEventListener('input', (e) => { state.addrQuery = e.target.value; persistCoreState(); });
  document.getElementById('addrLookup').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupAddressToLocator();
  });
  document.getElementById('dxAddrLookup').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupDxAddress();
  });

  document.getElementById('copyMyBlockBtn').onclick = async () => {
    try { await navigator.clipboard.writeText(myDataText()); } catch {}
  };
  document.getElementById('shareMyBlockBtn').onclick = shareMyBlock;
  document.getElementById('copyLocBtn').onclick = async () => {
    const t = document.getElementById('myLocator').textContent || '';
    try { await navigator.clipboard.writeText(t); } catch {}
  };

  const addrSuggest = document.getElementById('addrSuggest');
  if (addrSuggest) addrSuggest.onchange = async (e) => {
    const idx = Number(e.target.value);
    if (!Number.isFinite(idx)) return;
    const hit = state.addrSuggestions?.[idx];
    if (hit) await applyAddressCandidate(hit);
  };
  const dxAddrSuggest = document.getElementById('dxAddrSuggest');
  if (dxAddrSuggest) dxAddrSuggest.onchange = async (e) => {
    const idx = Number(e.target.value);
    if (!Number.isFinite(idx)) return;
    const hit = state.dxAddrSuggestions?.[idx];
    if (hit) await applyDxAddressCandidate(hit);
  };

  bindCoordinateFieldCopies();

  const bnetzaBtn = document.getElementById('bnetzaBtn');
  if (bnetzaBtn) {
    bnetzaBtn.onclick = () => {
      window.open('https://ans.bundesnetzagentur.de/Amateurfunk/Rufzeichen.aspx', '_blank');
    };
  }

  document.getElementById('routeMapBtn').onclick = () => {
    const link = document.querySelector('#dxMapLink a');
    if (link) { window.open(link.href, '_blank'); return; }
    if (state.dxPos) { window.open(googleMapsUrl(state.dxPos[0], state.dxPos[1]), '_blank'); return; }
    if (state.myPos) { window.open(googleMapsUrl(state.myPos[0], state.myPos[1]), '_blank'); return; }
    window.open('https://www.google.com/maps', '_blank');
  };

  bindDynamicButtons();
}

function startClock() {
  if (state.clockTimer) clearInterval(state.clockTimer);
  updateClock();
  state.clockTimer = setInterval(updateClock, 1000);
}

render();
bind();
startClock();
hydrateUiFromState();
startHeadingWatch();
startNativeGnssIfAvailable();
if (state.myPos) ensureEnvironmentData(false);
else if (state.activeTab === 'prop') fetchSolarData(true).then(updateDynamicPanels).catch(() => {});
