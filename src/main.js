
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import tzLookup from 'tz-lookup';

const app = document.getElementById('app');

const state = {
  myPos: null,                 // aktuell angezeigter Locator / obere Felder
  dxPos: null,                 // Gegenstation
  gpsActualTimeZone: null,     // echte aktuelle Geräte-/GPS-Standortzeit
  myCallsign: localStorage.getItem('myCallsign') || '',
  myName: localStorage.getItem('myName') || '',
  clockTimer: null,
};

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
  if (distanceKm < 30) return { band: '2 m / 70 cm', reason: 'sehr kurze Distanz, lokal am einfachsten' };
  if (distanceKm < 150) return { band: day ? '2 m / 70 cm oder 10 m' : '80 m / 40 m', reason: 'regionaler Bereich' };
  if (distanceKm < 500) return { band: day ? '20 m / 15 m' : '40 m / 80 m', reason: 'mittlere Distanz' };
  if (distanceKm < 1500) return { band: day ? '20 m / 17 m' : '40 m', reason: 'klassischer DX-Bereich' };
  if (distanceKm < 4000) return { band: day ? '20 m / 15 m / 10 m' : '40 m / 30 m', reason: 'weite Entfernung' };
  return { band: day ? '20 m / 15 m / 10 m' : '40 m / 20 m', reason: 'sehr weite DX-Verbindung' };
}

async function reverseGeocode(lat, lon) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('Geocoding fehlgeschlagen');
  const j = await res.json();
  const a = j.address || {};
  return {
    country: a.country || '-',
    city: a.city || a.town || a.village || a.hamlet || '-',
    street: ((a.road || '') + (a.house_number ? ' ' + a.house_number : '')).trim() || '-'
  };
}

async function geocodeAddress(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('Adresssuche fehlgeschlagen');
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error('Adresse nicht gefunden');
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function googleMapsUrl(lat, lon) {
  return `https://maps.google.com/?q=${lat},${lon}`;
}

function routeMapUrl(lat1, lon1, lat2, lon2) {
  return `https://www.google.com/maps/dir/${lat1},${lon1}/${lat2},${lon2}`;
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
  const val = window.prompt('Name eingeben oder ändern:', state.myName || '');
  if (val === null) return;
  state.myName = val.trim();
  localStorage.setItem('myName', state.myName);
  const btn = document.getElementById('myNameBtn');
  if (btn) btn.textContent = state.myName || 'Name eingeben';
}

function editMyCallsign() {
  const val = window.prompt('Rufzeichen eingeben oder ändern:', state.myCallsign || '');
  if (val === null) return;
  state.myCallsign = val.trim().toUpperCase();
  localStorage.setItem('myCallsign', state.myCallsign);
  const btn = document.getElementById('myCallsignBtn');
  if (btn) btn.textContent = state.myCallsign || 'Rufzeichen eingeben';
}

function render() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  app.innerHTML = `
    <style>
      :root{--bg:#f3f6fb;--bg2:#e9eef8;--card:#fff;--card2:#f8fbff;--line:#d7deea;--text:#172033;--muted:#667085;--accent:#0b3d91;--accent2:#4f8cff}
      html.dark{--bg:#0b1017;--bg2:#111827;--card:#151c25;--card2:#10161f;--line:#2c3644;--text:#edf3fb;--muted:#98a6b8;--accent:#5f97ff;--accent2:#87b3ff}
      *{box-sizing:border-box} body{margin:0;font-family:Arial,Helvetica,sans-serif;background:radial-gradient(circle at top, var(--bg2) 0%, var(--bg) 42%), var(--bg);color:var(--text);font-size:12px;line-height:1.28}
      .wrap{max-width:1200px;margin:0 auto;padding:calc(env(safe-area-inset-top, 0px) + 22px) 10px 10px 10px}.card{background:linear-gradient(180deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:18px;padding:10px;margin-bottom:10px}
      h1{font-size:22px;margin:0 0 6px;color:var(--accent)}h2{font-size:15px;margin:0 0 8px;color:var(--accent)}p{margin:3px 0;color:var(--muted)}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.box{background:linear-gradient(180deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:16px;padding:8px;min-height:70px}
      .k{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.v{font-size:14px;font-weight:bold;margin-top:4px;color:var(--text);word-break:break-word}
      .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.tabs{display:flex;gap:8px;flex-wrap:wrap}.two{display:grid;grid-template-columns:1.1fr 1fr;gap:10px}
      input,textarea{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:14px;font-size:13px;outline:none;background:var(--card2);color:var(--text)}
      textarea{min-height:58px;resize:vertical}
      html.dark input,html.dark textarea{background:#0f141b!important;color:#fff!important;border-color:#3a4454!important}
      button{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:14px;padding:9px 12px;cursor:pointer;font-size:12px}.primary{background:linear-gradient(180deg,var(--accent2),var(--accent));color:#fff;border-color:transparent}
      .badge{display:inline-block;padding:4px 8px;border-radius:999px;background:rgba(95,151,255,.14);color:var(--accent);font-size:10px;font-weight:bold}
      .link{color:var(--accent2);text-decoration:none}
      html.dark .box{background:linear-gradient(180deg,#151c25,#111821)!important;border-color:#313b4b!important}html.dark .v{color:#eef2f7!important}html.dark .k{color:#a9b7ca!important}html.dark button{background:#151c25!important;color:#eef2f7!important;border-color:#313b4b!important}html.dark .primary{background:linear-gradient(180deg,#6ba6ff,#4f8cff)!important;color:#fff!important;border-color:transparent!important}
      @media (max-width:900px){.two{grid-template-columns:1fr}}
    </style>
    <div class="wrap">
      <div class="card">
        <h1>Schippi's Ham&Cheese</h1>
        <p>Mit Distanz, Richtung, Karte und Bandempfehlung.</p>
        <div class="tabs">
          <button id="myNameBtn">${state.myName || 'Name eingeben'}</button>
          <button id="myCallsignBtn">${state.myCallsign || 'Rufzeichen eingeben'}</button>
          <button id="themeBtn">🌙 / ☀️ Theme</button>
        </div>
      </div>

      <div class="two">
        <div class="card">
          <h2>Mein Standort</h2>
          <div class="row">
            <button id="gpsBtn" class="primary">GPS holen</button>
                        <button id="gpsClearBtn">GPS löschen</button>
            <button id="copyMyBlockBtn">Block kopieren</button>
            <button id="shareMyBlockBtn">Teilen</button>
            <button id="copyLocBtn">Locator kopieren</button>
            <span class="badge" id="gpsState">nicht geladen</span>
          </div>
          <div class="row" style="margin-top:8px">
            <input id="addrLookup" placeholder="Adresse eingeben, um den Locator zu berechnen" style="flex:1;min-width:220px">
            <button id="addrLookupBtn">Adresse → Locator</button>
          </div>
          <div class="grid">
            <div class="box"><div class="k">Land</div><div class="v" id="myCountry">-</div></div>
            <div class="box"><div class="k">Stadt</div><div class="v" id="myCity">-</div></div>
            <div class="box"><div class="k">Straße</div><div class="v" id="myStreet">-</div></div>
            <div class="box"><div class="k">Locator</div><div class="v" id="myLocator">-</div></div>
            <div class="box"><div class="k">Locator Zeit</div><div class="v" id="myLocalTime">-</div></div>
            <div class="box"><div class="k">Locator Datum</div><div class="v" id="myLocalDate">-</div></div>
            <div class="box"><div class="k"></div><div class="v" id="myGpsLocalTime">-</div></div>
            <div class="box"><div class="k">GPS-Standort Datum</div><div class="v" id="myGpsLocalDate">-</div></div>
            <div class="box"><div class="k">UTC Zeit</div><div class="v" id="myUtcTime">-</div></div>
            <div class="box"><div class="k">Google Koordinaten</div><div class="v" id="gmaps">-</div></div>
            <div class="box"><div class="k">Dezimalgrad</div><div class="v" id="fmtDec">-</div></div>
            <div class="box"><div class="k">Grad Minuten Sekunden</div><div class="v" id="fmtDms">-</div></div>
            <div class="box"><div class="k">Grad Dezimalminuten</div><div class="v" id="fmtDdm">-</div></div>
          </div>
        </div>

        <div class="card">
          <h2>Gegenstation / Kürzel / Landeskenner / Locator</h2>
          <label>Rufzeichen, Q-Code, Landeskenner oder Locator</label><input id="dxCall" placeholder="z. B. DL1ABC, QSO, HB oder JO31QH">
          <label>Koordinatenfeld</label><textarea id="dxCoords" placeholder="Dezimalgrad, DMS oder Grad/Dezimalminuten"></textarea>
          <div class="row">
            <button id="bnetzaBtn">BNetzA öffnen</button>
            <button id="routeMapBtn">Karte öffnen</button>
          </div>
          <div class="grid">
            <div class="box"><div class="k">Land / Bedeutung</div><div class="v" id="dxCountry">-</div></div>
            <div class="box"><div class="k">Stadt</div><div class="v" id="dxCity">-</div></div>
            <div class="box"><div class="k">Straße</div><div class="v" id="dxStreet">-</div></div>
            <div class="box"><div class="k">CQ / ITU / Locator</div><div class="v" id="dxZones">-</div></div>
            <div class="box"><div class="k">Hinweis</div><div class="v" id="dxNote">-</div></div>
            <div class="box"><div class="k">Entfernung</div><div class="v" id="dxDistance">-</div></div>
            <div class="box"><div class="k">Richtung / Azimut</div><div class="v" id="dxBearing">-</div></div>
            <div class="box"><div class="k">Band / Frequenz Empfehlung</div><div class="v" id="dxBandRec">-</div></div>
            <div class="box"><div class="k">Locator Zeit</div><div class="v" id="dxLocatorTime">-</div></div>
            <div class="box"><div class="k">Karte</div><div class="v" id="dxMapLink">-</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
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
  const dxLocatorTime = document.getElementById('dxLocatorTime');

  if (myLocalTime) myLocalTime.textContent = locatorTz ? fmtTimeForTimezone(locatorTz) : '-';
  if (myLocalDate) myLocalDate.textContent = locatorTz ? fmtDateForTimezone(locatorTz) : '-';
  if (myGpsLocalTime) myGpsLocalTime.textContent = gpsTz ? fmtTimeForTimezone(gpsTz) : '-';
  if (myGpsLocalDate) myGpsLocalDate.textContent = gpsTz ? fmtDateForTimezone(gpsTz) : '-';
  if (myUtcTime) myUtcTime.textContent = fmtUtcTime();
  if (dxLocatorTime) dxLocatorTime.textContent = dxTz ? fmtTimeForTimezone(dxTz) : '-';
}

function clearMyGps() {
  state.myPos = null;
  state.gpsActualTimeZone = null;
  document.getElementById('myCountry').textContent = '-';
  document.getElementById('myCity').textContent = '-';
  document.getElementById('myStreet').textContent = '-';
  document.getElementById('myLocator').textContent = '-';
  document.getElementById('fmtDec').textContent = '-';
  document.getElementById('fmtDms').textContent = '-';
  document.getElementById('fmtDdm').textContent = '-';
  document.getElementById('gmaps').textContent = '-';
  document.getElementById('gpsState').textContent = 'gelöscht';
  updateClock();
}

function fillMy(geo, lat, lon) {
  document.getElementById('myCountry').textContent = geo.country;
  document.getElementById('myCity').textContent = geo.city;
  document.getElementById('myStreet').textContent = geo.street;
  document.getElementById('myLocator').textContent = maiden(lat, lon);
  document.getElementById('fmtDec').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  document.getElementById('fmtDms').textContent = `${fmtDMS(lat, true)} | ${fmtDMS(lon, false)}`;
  document.getElementById('fmtDDm');
  document.getElementById('fmtDdm').textContent = `${fmtDDM(lat, true)} | ${fmtDDM(lon, false)}`;
  document.getElementById('gpsState').textContent = 'geladen';
  document.getElementById('gmaps').innerHTML = `<a id="gmapsLink" class="link" target="_blank" href="${googleMapsUrl(lat, lon)}">${lat.toFixed(6)}, ${lon.toFixed(6)}</a>`;
  updateClock();
}

async function getPosition() {
  const stateEl = document.getElementById('gpsState');
  stateEl.textContent = 'warte...';
  try {
    let latitude, longitude;
    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions();
      const granted = perm.location === 'granted' || perm.coarseLocation === 'granted';
      if (!granted) {
        stateEl.textContent = 'verweigert';
        alert('Standortberechtigung wurde nicht erteilt.');
        return;
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
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
    const geo = await reverseGeocode(latitude, longitude);
    fillMy(geo, latitude, longitude);
    evaluateDx();
  } catch (err) {
    stateEl.textContent = 'fehler';
    alert('GPS-Fehler: ' + (err?.message || String(err)));
  }
}

async function getGpsTimeOnly() {
  const stateEl = document.getElementById('gpsState');
  stateEl.textContent = 'GPS-Zeit...';
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions();
      const granted = perm.location === 'granted' || perm.coarseLocation === 'granted';
      if (!granted) {
        stateEl.textContent = 'verweigert';
        alert('Standortberechtigung wurde nicht erteilt.');
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
    stateEl.textContent = 'GPS-Zeit geladen';
  } catch (err) {
    stateEl.textContent = 'fehler';
    alert('GPS-Zeit-Fehler: ' + (err?.message || String(err)));
  }
}

async function lookupAddressToLocator() {
  const query = (document.getElementById('addrLookup')?.value || '').trim();
  if (!query) {
    alert('Bitte zuerst eine Adresse eingeben.');
    return;
  }
  const stateEl = document.getElementById('gpsState');
  const oldState = stateEl.textContent;
  stateEl.textContent = 'suche...';
  try {
    const hit = await geocodeAddress(query);
    state.myPos = [hit.lat, hit.lon];
    const geo = await reverseGeocode(hit.lat, hit.lon);
    fillMy(geo, hit.lat, hit.lon);
    stateEl.textContent = 'Adresse geladen';
    evaluateDx();
  } catch (err) {
    stateEl.textContent = oldState || 'fehler';
    alert('Adresssuche: ' + (err?.message || String(err)));
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
    document.getElementById('dxMapLink').innerHTML = `<a class="link" target="_blank" href="${routeMapUrl(state.myPos[0], state.myPos[1], lat, lon)}">Route / Karte öffnen</a>`;
  } else {
    document.getElementById('dxDistance').textContent = '-';
    document.getElementById('dxBearing').textContent = '-';
    document.getElementById('dxBandRec').textContent = 'erst GPS/Adresse setzen';
    document.getElementById('dxMapLink').textContent = 'erst GPS/Adresse setzen';
  }
}

async function evaluateDx() {
  const raw = document.getElementById('dxCall').value.trim();
  const coords = document.getElementById('dxCoords').value.trim();
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

  // 1. Q-Codes immer zuerst
  if (upper && typeof qcodes === 'object' && Object.prototype.hasOwnProperty.call(qcodes, upper)) {
    dxCountry.textContent = qcodes[upper];
    dxCity.textContent = '-';
    dxStreet.textContent = '-';
    dxZones.textContent = 'Q-Code';
    dxNote.textContent = 'Q-Code erkannt';
    state.dxPos = null;
    updateClock();
    return;
  }

  // 2. Locator
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
      dxNote.textContent = 'Locator erkannt';
      setDxGeoExtras(locator[0], locator[1]);
      updateClock();
      return;
    }
  }

  // 3. Rufzeichen / Präfix
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
      dxNote.textContent = 'Rufzeichen erkannt';
      updateClock();
      return;
    }
  }

  // 4. Koordinatenfeld
  if (coords) {
    try {
      const parsed = parseCoords(coords);
      if (!parsed) {
        dxNote.textContent = 'Koordinatenformat nicht erkannt';
        updateClock();
        return;
      }

      const geo = await reverseGeocode(parsed[0], parsed[1]);
      dxCountry.textContent = geo.country;
      dxCity.textContent = geo.city;
      dxStreet.textContent = geo.street;
      dxNote.textContent = 'Koordinaten erkannt';
      state.dxPos = [parsed[0], parsed[1]];
      setDxGeoExtras(parsed[0], parsed[1]);
      updateClock();
      return;
    } catch {
      dxNote.textContent = 'Reverse-Geocoding fehlgeschlagen';
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
        dialogTitle: 'Daten teilen'
      });
      return;
    }
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    alert('Teilen nicht direkt verfügbar. Block wurde in die Zwischenablage kopiert.');
  } catch (err) {
    console.error(err);
  }
}

function bind() {
  document.getElementById('myNameBtn').onclick = editMyName;
  document.getElementById('myCallsignBtn').onclick = editMyCallsign;
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
    evaluateDx();
  });

  document.getElementById('dxCoords').addEventListener('input', () => {
    evaluateDx();
  });

  document.getElementById('gpsBtn').onclick = getPosition;
  document.getElementById('gpsClearBtn').onclick = () => { clearMyGps(); evaluateDx(); };
  document.getElementById('addrLookupBtn').onclick = lookupAddressToLocator;
  document.getElementById('addrLookup').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupAddressToLocator();
  });

  document.getElementById('copyMyBlockBtn').onclick = async () => {
    try { await navigator.clipboard.writeText(myDataText()); } catch {}
  };
  document.getElementById('shareMyBlockBtn').onclick = shareMyBlock;
  document.getElementById('copyLocBtn').onclick = async () => {
    const t = document.getElementById('myLocator').textContent || '';
    try { await navigator.clipboard.writeText(t); } catch {}
  };
  document.getElementById('bnetzaBtn').onclick = () => {
    window.open('https://ans.bundesnetzagentur.de/Amateurfunk/Rufzeichen.aspx', '_blank');
  };
  document.getElementById('routeMapBtn').onclick = () => {
    const link = document.querySelector('#dxMapLink a');
    if (link) window.open(link.href, '_blank');
  };
}

function startClock() {
  if (state.clockTimer) clearInterval(state.clockTimer);
  updateClock();
  state.clockTimer = setInterval(updateClock, 1000);
}

render();
bind();
startClock();
