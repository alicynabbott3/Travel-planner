import { useState, useEffect, useRef, useCallback } from 'react';
import { db, configured } from './firebase';
import { ref as fbRef, set as fbSet, onValue } from 'firebase/database';

/* ─── PALETTE ──────────────────────────────────────────── */
const C = {
  terracotta:  '#6B9A2A',   // ogre green — primary CTAs
  terracottaL: '#9DC040',   // light ogre green
  terracottaD: '#4A7010',   // dark swamp green
  ivory:       '#EFF5E0',   // swamp mist — main background
  ivoryMid:    '#E2ECD0',   // card surface
  ivoryDark:   '#BDD09A',   // borders & dividers
  navy:        '#1E3C08',   // deep swamp — header
  navyMid:     '#2E5A10',   // secondary swamp
  gold:        '#A67C00',   // firefly gold
  goldL:       '#D4A830',   // light gold
  text:        '#1A2C08',   // near-black swamp
  textMid:     '#3D5A1E',   // medium swamp green
  textLight:   '#6A8C45',   // muted green
  white:       '#FFFFFF',
  green:       '#2E7D52',
  orange:      '#C07830',
  purple:      '#6B3FA0',
  red:         '#B02828',
};

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Inter:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap';

/* ─── STATUS & TYPE ─────────────────────────────────────── */
const STATUS = {
  confirmed:     { icon: '✅', label: 'Confirmed',       color: C.terracotta },
  pending:       { icon: '⏳', label: 'Pending',         color: C.orange },
  payAtLocation: { icon: '💳', label: 'Pay at Location', color: C.purple },
};
const STATUSES = ['confirmed', 'pending', 'payAtLocation'];

const TYPE = {
  flight:    { icon: '✈️',  label: 'Flight' },
  hotel:     { icon: '🏨',  label: 'Hotel' },
  activity:  { icon: '🎯',  label: 'Activity' },
  food:      { icon: '🍽️', label: 'Dining' },
  transport: { icon: '🚗',  label: 'Transport' },
  cruise:    { icon: '🚢',  label: 'Cruise' },
  beach:     { icon: '🏖️', label: 'Beach' },
  other:     { icon: '📌',  label: 'Other' },
};

/* ─── UTILS ─────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).substr(2, 9);
const nextStatus = (s) => STATUSES[(STATUSES.indexOf(s) + 1) % STATUSES.length];

/* ─── PACKING TEMPLATE ──────────────────────────────────── */
const PACK_CATS = [
  'Documents & Travel', 'Money & Cards', 'Cruise Essentials',
  'Clothing', 'Footwear', 'Beach & Pool', 'Toiletries & Beauty',
  'Health & Wellness', 'Electronics', 'Bags & Luggage',
];

const PACKING_TEMPLATE = [
  // Documents & Travel
  { cat: 'Documents & Travel', item: 'Passport (valid 6+ months past June 28, 2026)', notes: 'Check expiry NOW!' },
  { cat: 'Documents & Travel', item: 'Flight confirmations (CBWO8M, 8U8KBK, C7253B)', notes: 'Print or save to phone' },
  { cat: 'Documents & Travel', item: 'Travel insurance documents', notes: 'Keep accessible at all times' },
  { cat: 'Documents & Travel', item: 'Dog Admiral confirmation BB26031720350199', notes: '' },
  { cat: 'Documents & Travel', item: 'H10 Art Gallery confirmation', notes: "See Alicyn's email" },
  { cat: 'Documents & Travel', item: 'Cruise confirmation 2478994', notes: '' },
  { cat: 'Documents & Travel', item: "Driver's license (backup ID)", notes: '' },
  { cat: 'Documents & Travel', item: 'Copies of all docs saved to phone & cloud', notes: 'Email to yourself too' },
  { cat: 'Documents & Travel', item: 'Virgin Voyages app downloaded & account set up', notes: 'Set up Sailor Loot onboard account' },
  // Money & Cards
  { cat: 'Money & Cards', item: 'Euros (€200+ recommended)', notes: '€10 cash for Sóller tram (June 18)' },
  { cat: 'Money & Cards', item: 'Credit card with no foreign transaction fees', notes: '' },
  { cat: 'Money & Cards', item: 'Backup debit card', notes: '' },
  { cat: 'Money & Cards', item: 'Emergency cash (hidden separately)', notes: '' },
  { cat: 'Money & Cards', item: 'Bank notified of travel dates', notes: '' },
  // Cruise Essentials
  { cat: 'Cruise Essentials', item: 'Scarlet / red outfit for Scarlet Night (June 25)', notes: 'Dress code: SCARLET / RED 🌹' },
  { cat: 'Cruise Essentials', item: 'Pajamas for PJ Night (June 21)', notes: 'Themed party onboard 😴' },
  { cat: 'Cruise Essentials', item: 'Dressy cocktail outfit for ship dining', notes: '' },
  { cat: 'Cruise Essentials', item: 'Smart casual outfits (5–6 sets)', notes: '' },
  { cat: 'Cruise Essentials', item: 'Lanyard or card holder for ship key card', notes: 'Handy onboard' },
  // Clothing
  { cat: 'Clothing', item: 'Casual sundresses (4–5)', notes: '' },
  { cat: 'Clothing', item: 'Lightweight pants / jeans (2 pairs)', notes: '' },
  { cat: 'Clothing', item: 'Comfortable walking outfits (2)', notes: 'Cobblestones in Barcelona & Rome!' },
  { cat: 'Clothing', item: 'Light cardigan or wrap', notes: 'Evenings on deck can be breezy' },
  { cat: 'Clothing', item: 'Tank tops / t-shirts (3–4)', notes: '' },
  // Footwear
  { cat: 'Footwear', item: 'Comfortable walking shoes', notes: 'ESSENTIAL — Barcelona, Rome & Cinque Terre!' },
  { cat: 'Footwear', item: 'Sandals / flats', notes: '' },
  { cat: 'Footwear', item: 'Heels or wedges for dinner', notes: '' },
  { cat: 'Footwear', item: 'Flip flops / slides', notes: 'Pool deck & beach club' },
  // Beach & Pool
  { cat: 'Beach & Pool', item: 'Swimsuit (2–3)', notes: '' },
  { cat: 'Beach & Pool', item: 'Cover-up / sarong', notes: '' },
  { cat: 'Beach & Pool', item: 'Reef-safe sunscreen SPF 50+', notes: 'Required at Cinque Terre & Cala Bassa' },
  { cat: 'Beach & Pool', item: 'Sunglasses + case', notes: '' },
  { cat: 'Beach & Pool', item: 'Beach tote / bag', notes: '' },
  { cat: 'Beach & Pool', item: 'Waterproof phone pouch', notes: 'Cinque Terre swimming & Cala Bassa Beach Club' },
  { cat: 'Beach & Pool', item: 'After-sun lotion', notes: '' },
  { cat: 'Beach & Pool', item: 'Lip balm with SPF', notes: '' },
  // Toiletries & Beauty
  { cat: 'Toiletries & Beauty', item: 'Shampoo & conditioner (travel size)', notes: 'Cruise cabin has basics' },
  { cat: 'Toiletries & Beauty', item: 'Body wash & face wash', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Moisturizer & face SPF', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Makeup kit', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Makeup remover wipes', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Deodorant', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Razor + refills', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Feminine hygiene products', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Toothbrush & toothpaste', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Hair tools (straightener / curling iron)', notes: 'Bring universal adapter!' },
  { cat: 'Toiletries & Beauty', item: 'Dry shampoo', notes: '' },
  { cat: 'Toiletries & Beauty', item: 'Perfume (travel size)', notes: '' },
  // Health & Wellness
  { cat: 'Health & Wellness', item: 'Motion sickness medication', notes: 'Sea days: June 21, 25 & sailing nights!' },
  { cat: 'Health & Wellness', item: 'Pain reliever (ibuprofen / Tylenol)', notes: '' },
  { cat: 'Health & Wellness', item: 'Prescription medications (full supply + 2 extra days)', notes: 'Keep in carry-on!' },
  { cat: 'Health & Wellness', item: 'Antacid / digestive tablets', notes: 'Rich food ahead!' },
  { cat: 'Health & Wellness', item: 'Band-aids & blister pads', notes: 'Lots of walking!' },
  { cat: 'Health & Wellness', item: 'Hand sanitizer', notes: '' },
  { cat: 'Health & Wellness', item: 'Allergy medication (if needed)', notes: '' },
  { cat: 'Health & Wellness', item: 'Melatonin', notes: 'Jet lag & overnight flight June 16' },
  // Electronics
  { cat: 'Electronics', item: 'Phone + charging cable', notes: '' },
  { cat: 'Electronics', item: 'Universal power adapter Type C/F', notes: 'Spain, France & Italy — all need it!' },
  { cat: 'Electronics', item: 'Portable power bank', notes: '' },
  { cat: 'Electronics', item: 'Headphones / earbuds', notes: 'LAX → Montreal → Barcelona overnight flight' },
  { cat: 'Electronics', item: 'Camera + extra memory card', notes: 'Optional' },
  { cat: 'Electronics', item: 'Eye mask & earplugs', notes: 'Overnight flight June 16' },
  { cat: 'Electronics', item: 'Travel pillow', notes: '8+ hours in the air each way' },
  // Bags & Luggage
  { cat: 'Bags & Luggage', item: 'Checked luggage', notes: '' },
  { cat: 'Bags & Luggage', item: 'Carry-on bag', notes: 'Keep valuables & meds in here' },
  { cat: 'Bags & Luggage', item: 'Anti-theft crossbody bag', notes: 'Barcelona, Rome & Cannes city days' },
  { cat: 'Bags & Luggage', item: 'Day backpack for excursions', notes: 'Cinque Terre & Valldemossa tour' },
  { cat: 'Bags & Luggage', item: 'Packing cubes', notes: 'Game changer for cruise cabin space!' },
  { cat: 'Bags & Luggage', item: 'Reusable water bottle', notes: '' },
];

const makePackingList = (prefix) =>
  PACKING_TEMPLATE.map((t, i) => ({ ...t, id: `${prefix}_${i}`, packed: false }));

/* ─── INITIAL DATA ──────────────────────────────────────── */
const INIT = {
  meta: {
    tripName: 'Far Far Away Girls Trip 🌿',
    tagline: 'Ogres have layers. So do our travel plans.',
    dates: 'June 15–28, 2026',
    travelers: ['Alicyn Kitamura', 'Felicia Mapa', 'Sabrina Hammou'],
  },

  flights: [
    { id: 'fl1', airline: 'Air Canada', numbers: 'AC774 / AC822', route: 'LAX → YUL → BCN',
      date: 'June 16', departure: '8:15 AM LAX', arrival: '8:00 AM BCN (June 17)',
      confirmation: 'CBWO8M', passengers: 'Alicyn, Felicia, Sabrina',
      status: 'confirmed', notes: 'Layover YUL: arrive 4:40 PM, depart 6:30 PM (1h 55m)' },
    { id: 'fl2', airline: 'Air Europa', numbers: 'UX6037', route: 'BCN → PMI',
      date: 'June 17', departure: '11:55 AM', arrival: '12:40 PM',
      confirmation: '8U8KBK', passengers: 'Alicyn, Felicia, Sabrina',
      status: 'confirmed', notes: 'Barcelona → Palma de Mallorca' },
    { id: 'fl3', airline: 'Ryanair', numbers: 'FR6379', route: 'PMI → BCN',
      date: 'June 19', departure: '12:10 PM', arrival: '1:05 PM',
      confirmation: 'C7253B', passengers: 'Alicyn, Felicia, Sabrina',
      status: 'confirmed', notes: 'Palma → Barcelona. Gate closes 30 min early!' },
    { id: 'fl4', airline: 'Air Canada', numbers: 'AC821 / AC795', route: 'BCN → YYZ → LAX',
      date: 'June 28', departure: '1:15 PM BCN', arrival: '9:00 PM LAX',
      confirmation: 'CBWO8M', passengers: 'Alicyn, Felicia, Sabrina',
      status: 'confirmed', notes: 'Layover in Toronto (YYZ)' },
  ],

  hotels: [
    { id: 'ht1', name: 'Dog Admiral Urban Guest House',
      address: 'Carrer del Conquistador 2, Palma de Mallorca',
      checkIn: 'June 17, 2026', checkOut: 'June 19, 2026', nights: 2,
      room: 'Flamingo Suite', guests: 3,
      confirmation: 'BB26031720350199', status: 'payAtLocation',
      notes: 'Pay at location upon arrival' },
    { id: 'ht2', name: 'H10 Art Gallery Hotel',
      address: 'Enric Granados 62–64, Barcelona',
      checkIn: 'June 19, 2026', checkOut: 'June 20, 2026', nights: 1,
      room: 'Atrium Room', guests: 3,
      confirmation: "See Alicyn's email", status: 'confirmed',
      notes: 'Paid by Alicyn' },
    { id: 'ht3', name: 'Virgin Voyages — Valiant Lady 🚢',
      address: 'Port of Barcelona, Moll Adossat Terminal A/B',
      checkIn: 'June 20, 2026 (3:15 PM)', checkOut: 'June 28, 2026 (6–8 AM)', nights: 7,
      room: 'Seaview Cabin (3 pax)', guests: 3,
      confirmation: '2478994', status: 'confirmed',
      notes: '"Italian Vistas to Spanish Sunsets" — Ports: Rome, Cinque Terre, Cannes, Ibiza' },
  ],

  days: [
    {
      date: '2026-06-15', label: 'Monday, June 15',
      location: 'Los Angeles', subtitle: 'Pre-Departure',
      events: [
        { id: 'e0615a', time: '3:00 AM', title: 'Online Check-in for Air Europa UX6037', description: 'Check-in opens for June 17 BCN→PMI flight', location: 'Online', type: 'flight', status: 'confirmed', notes: '' },
        { id: 'e0615b', time: 'Evening', title: 'Final Pack & Prep', description: 'Passport · adapter · euros · print confirmations', location: 'Home', type: 'activity', status: 'confirmed', notes: '' },
      ],
    },
    {
      date: '2026-06-16', label: 'Tuesday, June 16',
      location: 'Los Angeles → (In Air)', subtitle: '✈️ Travel Day',
      events: [
        { id: 'e0616a', time: '8:15 AM', title: 'Depart LAX — Air Canada AC774', description: 'LAX → YUL (Montreal)', location: 'LAX Terminal B', type: 'flight', status: 'confirmed', notes: 'Conf: CBWO8M · 3 pax' },
        { id: 'e0616b', time: '4:40 PM', title: 'Arrive Montreal YUL — 1hr 55min Layover', description: 'Connect to AC822 → Barcelona · departs 6:30 PM', location: 'Montreal YUL', type: 'flight', status: 'confirmed', notes: '1 hr 55 min layover' },
        { id: 'e0616c', time: '6:30 PM', title: 'Depart Montreal — Overnight Flight to Barcelona', description: 'AC822 YUL → BCN · 7.5 hr flight · Arrives 8 AM June 17', location: 'In Air', type: 'flight', status: 'confirmed', notes: 'Sleep 💤' },
      ],
    },
    {
      date: '2026-06-17', label: 'Wednesday, June 17',
      location: 'Barcelona → Palma de Mallorca', subtitle: '🌴 Palma Arrival',
      events: [
        { id: 'e0617a', time: '8:00 AM', title: 'Arrive Barcelona El Prat (BCN)', description: 'Arrive from Montreal. Freshen up & breakfast at airport.', location: 'BCN Airport', type: 'flight', status: 'confirmed', notes: '' },
        { id: 'e0617b', time: '11:55 AM', title: 'Fly BCN → PMI — Air Europa UX6037', description: 'Barcelona to Palma de Mallorca', location: 'BCN Terminal 1', type: 'flight', status: 'confirmed', notes: 'Conf: 8U8KBK' },
        { id: 'e0617c', time: '12:40 PM', title: 'Arrive Palma (PMI)', description: 'Land in Mallorca 🌞', location: 'Palma Airport PMI', type: 'flight', status: 'confirmed', notes: '' },
        { id: 'e0617d', time: '1:00 PM', title: 'Taxi to Dog Admiral', description: '~12 min · ~€15 from airport', location: 'Carrer del Conquistador 2', type: 'transport', status: 'confirmed', notes: '' },
        { id: 'e0617e', time: '1:30 PM', title: 'Check In — Dog Admiral Urban Guest House', description: 'Flamingo Suite · Pay at location', location: 'Carrer del Conquistador 2, Palma', type: 'hotel', status: 'payAtLocation', notes: 'Conf: BB26031720350199' },
        { id: 'e0617f', time: '5:30 PM', title: 'Hammam Al Andalus', description: 'Traditional Arab bath experience', location: 'Hammam Al Andalus, Palma', type: 'activity', status: 'confirmed', notes: 'Pre-booked · Allow 1.5–2 hrs' },
        { id: 'e0617g', time: '6:00 PM', title: 'Dinner — Pink Agave', description: 'Mexican restaurant in Palma', location: 'Pink Agave, Palma', type: 'food', status: 'confirmed', notes: 'Reservation 6:00 PM' },
      ],
    },
    {
      date: '2026-06-18', label: 'Thursday, June 18',
      location: 'Palma de Mallorca', subtitle: '🏔️ Valldemossa · Deià · Sóller',
      events: [
        { id: 'e0618a', time: '9:30 AM', title: 'Valldemossa / Deià / Sóller VIP Tour', description: 'Meet at Cathedral Basilica de Santa Maria de Mallorca (5 min walk from hotel)', location: 'Cathedral Basilica de Santa Maria de Mallorca', type: 'activity', status: 'confirmed', notes: '⚠️ Bring €10 cash for tram in Sóller!' },
        { id: 'e0618b', time: '5:00 PM', title: 'Return to Palma', description: 'Tour ends ~5 PM', location: 'Palma', type: 'transport', status: 'confirmed', notes: '' },
        { id: 'e0618c', time: 'Evening', title: 'Free Evening in Palma', description: 'Old town, tapas, sunset walks', location: 'Palma Old Town', type: 'food', status: 'pending', notes: 'No reservation' },
      ],
    },
    {
      date: '2026-06-19', label: 'Friday, June 19',
      location: 'Palma → Barcelona', subtitle: '🌆 Barcelona Bound',
      events: [
        { id: 'e0619a', time: 'Morning', title: 'Check Out — Dog Admiral', description: 'Pack up, settle bill', location: 'Dog Admiral, Palma', type: 'hotel', status: 'confirmed', notes: '' },
        { id: 'e0619b', time: '12:10 PM', title: 'Fly PMI → BCN — Ryanair FR6379', description: 'Palma to Barcelona', location: 'Palma Airport', type: 'flight', status: 'confirmed', notes: 'Conf: C7253B · Gate closes 30 min early!' },
        { id: 'e0619c', time: '1:05 PM', title: 'Arrive Barcelona BCN', description: 'Land at El Prat', location: 'Barcelona Airport', type: 'flight', status: 'confirmed', notes: '' },
        { id: 'e0619d', time: '~1:30 PM', title: 'Uber to H10 Art Gallery', description: '~20 min Uber from airport', location: 'Enric Granados 62–64', type: 'transport', status: 'confirmed', notes: '' },
        { id: 'e0619e', time: '3:00 PM', title: 'Check In — H10 Art Gallery Hotel', description: 'Atrium Room · pre-paid by Alicyn', location: 'Enric Granados 62–64, Barcelona', type: 'hotel', status: 'confirmed', notes: 'Paid by Alicyn' },
        { id: 'e0619f', time: '6:45 PM', title: 'Dinner — Extra Virgin', description: 'Restaurant in Eixample, Barcelona', location: 'Extra Virgin, Barcelona', type: 'food', status: 'confirmed', notes: 'Reservation 6:45 PM' },
      ],
    },
    {
      date: '2026-06-20', label: 'Saturday, June 20',
      location: 'Barcelona → Cruise', subtitle: '🚢 Embarkation Day!',
      events: [
        { id: 'e0620a', time: '11:00 AM', title: 'Parc Güell', description: "Gaudí's iconic park — pre-booked timed entry", location: 'Parc Güell, Barcelona', type: 'activity', status: 'confirmed', notes: 'Book tickets in advance!' },
        { id: 'e0620b', time: '12:00 PM', title: 'Check Out — H10 Art Gallery', description: 'Check out or store luggage', location: 'H10 Art Gallery, Barcelona', type: 'hotel', status: 'confirmed', notes: '' },
        { id: 'e0620c', time: '~1:30 PM', title: 'Uber to Cruise Port', description: 'Moll Adossat Terminal A/B · ~€30', location: 'Port of Barcelona', type: 'transport', status: 'confirmed', notes: '' },
        { id: 'e0620d', time: '3:15 PM', title: 'Board Valiant Lady 🚢', description: 'Virgin Voyages — Italian Vistas to Spanish Sunsets', location: 'Moll Adossat Terminal A/B, Barcelona', type: 'cruise', status: 'confirmed', notes: 'Conf: 2478994 · Seaview Cabin ×3' },
        { id: 'e0620f', time: '9:00 PM', title: 'The Wake Show', description: 'Show & dining at The Wake', location: 'The Wake, Valiant Lady', type: 'activity', status: 'confirmed', notes: '' },
      ],
    },
    {
      date: '2026-06-21', label: 'Sunday, June 21',
      location: 'At Sea', subtitle: '⚓ Sailing Day',
      events: [
        { id: 'e0621a', time: '8:15 AM', title: 'Breakfast — Razzle Dazzle', description: 'Vegetarian-forward breakfast restaurant', location: 'Razzle Dazzle, Valiant Lady', type: 'food', status: 'confirmed', notes: 'Reservation 8:15 AM' },
        { id: 'e0621b', time: '11:45 AM', title: 'Brunch — The Wake', description: 'Brunch on the ship', location: 'The Wake, Valiant Lady', type: 'food', status: 'confirmed', notes: 'Reservation 11:45 AM' },
        { id: 'e0621c', time: 'Afternoon', title: 'Pool Deck & Richard\'s Rooftop', description: 'Relax at The Perch or upper decks', location: 'Upper Deck, Valiant Lady', type: 'activity', status: 'confirmed', notes: '' },
        { id: 'e0621d', time: '8:30 PM', title: 'Dinner — Ariya', description: 'Pan-Asian restaurant onboard', location: 'Ariya, Valiant Lady', type: 'food', status: 'confirmed', notes: 'Reservation 8:30 PM' },
        { id: 'e0621e', time: 'Night', title: 'PJ Night — Onboard Party 🎉', description: 'Themed party on Valiant Lady — PAJAMAS!', location: 'Valiant Lady', type: 'activity', status: 'confirmed', notes: 'Dress code: PAJAMAS 😴' },
      ],
    },
    {
      date: '2026-06-22', label: 'Monday, June 22',
      location: 'Civitavecchia / Rome, Italy', subtitle: '🏛️ Eternal City',
      events: [
        { id: 'e0622a', time: '7:00 AM', title: 'Arrive Civitavecchia', description: 'Train/shuttle to Rome ~45 min · ~€8 each way', location: 'Civitavecchia Port, Italy', type: 'cruise', status: 'confirmed', notes: 'Train to Roma Termini' },
        { id: 'e0622b', time: '9:00 AM', title: 'Explore Rome', description: 'Colosseum, Roman Forum, Trevi Fountain, Vatican', location: 'Rome, Italy', type: 'activity', status: 'pending', notes: 'Book Colosseum tickets in advance!' },
        { id: 'e0622c', time: 'Afternoon', title: 'Lunch & Gelato', description: 'Piazza Navona, Campo de\' Fiori, shopping', location: 'Rome, Italy', type: 'food', status: 'pending', notes: '' },
        { id: 'e0622d', time: 'Evening', title: 'Return to Civitavecchia', description: 'Back to port — check all-aboard time!', location: 'Civitavecchia Port', type: 'transport', status: 'confirmed', notes: 'All-aboard time TBD' },
      ],
    },
    {
      date: '2026-06-23', label: 'Tuesday, June 23',
      location: 'Cinque Terre, Italy', subtitle: '🌊 Italian Riviera',
      events: [
        { id: 'e0623a', time: '8:30 AM', title: 'Arrive Cinque Terre (Tender Port)', description: 'Take ship tender to shore — line up early!', location: 'Cinque Terre, Italy', type: 'cruise', status: 'confirmed', notes: '' },
        { id: 'e0623b', time: 'Morning', title: 'Explore the Five Villages', description: 'Vernazza, Monterosso, Riomaggiore — hike or ferry', location: 'Cinque Terre, Italy', type: 'activity', status: 'pending', notes: 'Ferry between villages ~€10' },
        { id: 'e0623c', time: 'Afternoon', title: 'Beach & Lunch', description: 'Swim in the Ligurian Sea · cliffside lunch', location: 'Cinque Terre, Italy', type: 'food', status: 'pending', notes: '' },
        { id: 'e0623d', time: '9:15 PM', title: 'Dinner — Test Kitchen', description: 'Experimental dining on the ship', location: 'Test Kitchen, Valiant Lady', type: 'food', status: 'confirmed', notes: 'Reservation 9:15 PM' },
      ],
    },
    {
      date: '2026-06-24', label: 'Wednesday, June 24',
      location: 'Cannes, France', subtitle: '🎬 French Riviera',
      events: [
        { id: 'e0624a', time: '8:00 AM', title: 'Arrive Cannes', description: 'Tender to shore', location: 'Cannes, France', type: 'cruise', status: 'confirmed', notes: '' },
        { id: 'e0624b', time: 'Morning', title: 'La Croisette & Old Port', description: 'Promenade, Palais des Festivals, luxury boutiques', location: 'Cannes, France', type: 'activity', status: 'pending', notes: '' },
        { id: 'e0624c', time: 'Afternoon', title: 'Île Sainte-Marguerite (optional)', description: 'Boat to island, swim, walk', location: 'Cannes Islands', type: 'activity', status: 'pending', notes: 'Ferry from old port' },
        { id: 'e0624d', time: 'Evening', title: 'Dinner on Ship', description: 'Onboard dining of choice', location: 'Valiant Lady', type: 'food', status: 'pending', notes: '' },
      ],
    },
    {
      date: '2026-06-25', label: 'Thursday, June 25',
      location: 'At Sea', subtitle: '⚓ Sea Day',
      events: [
        { id: 'e0625a', time: 'Morning', title: 'Redemption Spa', description: 'Onboard spa — book in advance', location: 'Redemption Spa, Valiant Lady', type: 'activity', status: 'pending', notes: '' },
        { id: 'e0625b', time: 'Afternoon', title: "Richard's Rooftop & Pool", description: 'Soak up the sun', location: 'Top Deck, Valiant Lady', type: 'activity', status: 'confirmed', notes: '' },
        { id: 'e0625c', time: '8:45 PM', title: 'Dinner — The Wake', description: 'Dinner at The Wake', location: 'The Wake, Valiant Lady', type: 'food', status: 'confirmed', notes: 'Reservation 8:45 PM' },
        { id: 'e0625d', time: 'Night', title: 'Dinner — Gunbae (Scarlet Night 🌹)', description: 'Korean BBQ onboard — Scarlet Night theme!', location: 'Gunbae, Valiant Lady', type: 'food', status: 'confirmed', notes: 'Dress code: SCARLET / RED' },
      ],
    },
    {
      date: '2026-06-26', label: 'Friday, June 26',
      location: 'Ibiza, Spain', subtitle: '🌅 Ibiza Night',
      events: [
        { id: 'e0626a', time: '8:00 PM', title: 'Arrive Ibiza (Evening Port)', description: 'Evening arrival — Ibiza Town at night is magical', location: 'Ibiza Port', type: 'cruise', status: 'confirmed', notes: '' },
        { id: 'e0626b', time: 'Evening', title: 'Dalt Vila — UNESCO Old Town', description: 'Historic walled city, sunset views, tapas', location: 'Dalt Vila, Ibiza', type: 'activity', status: 'pending', notes: '' },
      ],
    },
    {
      date: '2026-06-27', label: 'Saturday, June 27',
      location: 'Ibiza — Cala Bassa', subtitle: '🏖️ Beach Club Day',
      events: [
        { id: 'e0627a', time: 'Morning', title: 'Cala Bassa Beach Club ⭐ PREPAID', description: '3 sunbeds + champagne, all prepaid! Taxi ~€15', location: 'Cala Bassa Beach Club, Ibiza', type: 'beach', status: 'confirmed', notes: 'PREPAID: 3 sunbeds + champagne 🥂' },
        { id: 'e0627b', time: 'All Day', title: 'Sun, Sea & Vibes at CBBC', description: 'Crystal-clear Ibiza waters, live music', location: 'Cala Bassa, Ibiza', type: 'beach', status: 'confirmed', notes: '' },
        { id: 'e0627c', time: 'Evening', title: 'Last Night on Valiant Lady 🥂', description: 'Final evening at sea!', location: 'Ibiza Port → Valiant Lady', type: 'transport', status: 'confirmed', notes: "Don't miss all-aboard time!" },
      ],
    },
    {
      date: '2026-06-28', label: 'Sunday, June 28',
      location: 'Barcelona → Los Angeles', subtitle: '✈️ Homeward Bound',
      events: [
        { id: 'e0628a', time: '6:00–8:00 AM', title: 'Dock & Disembark — Barcelona', description: 'Have luggage outside cabin the night before!', location: 'Moll Adossat Terminal A/B, Barcelona', type: 'cruise', status: 'confirmed', notes: 'Luggage outside cabin night before' },
        { id: 'e0628b', time: '9:00 AM', title: 'Breakfast near Port / Barceloneta', description: 'Coffee & breakfast while waiting', location: 'Barceloneta, Barcelona', type: 'food', status: 'pending', notes: '' },
        { id: 'e0628c', time: '11:00 AM', title: 'Transfer to Barcelona Airport', description: 'Allow 2+ hours for check-in · ~30 min Uber', location: 'Barcelona El Prat Airport', type: 'transport', status: 'confirmed', notes: '' },
        { id: 'e0628d', time: '1:15 PM', title: 'Depart BCN — Air Canada AC821', description: 'Barcelona → Toronto (YYZ) → LAX', location: 'Barcelona Airport', type: 'flight', status: 'confirmed', notes: 'Conf: CBWO8M' },
        { id: 'e0628e', time: '9:00 PM', title: 'Arrive LAX 🏠', description: 'Home sweet home!', location: 'LAX Airport', type: 'flight', status: 'confirmed', notes: 'Connection in Toronto YYZ' },
      ],
    },
  ],

  restaurants: [
    { id: 'r1',  name: 'Pink Agave',             cuisine: 'Mexican',           city: 'Palma',         date: 'June 17', time: '6:00 PM',  status: 'confirmed', notes: 'Reservation 6:00 PM' },
    { id: 'r2',  name: 'Extra Virgin',            cuisine: 'Mediterranean',     city: 'Barcelona',     date: 'June 19', time: '6:45 PM',  status: 'confirmed', notes: 'Reservation 6:45 PM' },
    { id: 'r3',  name: 'Gunbae',                  cuisine: 'Korean BBQ',        city: 'Valiant Lady',  date: 'June 25', time: '6:00 PM',  status: 'confirmed', notes: 'Scarlet Night theme — wear RED 🌹' },
    { id: 'r4',  name: 'The Wake (show)',          cuisine: 'American',          city: 'Valiant Lady',  date: 'June 20', time: '9:00 PM',  status: 'confirmed', notes: 'Show & dinner experience' },
    { id: 'r5',  name: 'Razzle Dazzle',           cuisine: 'Vegetarian',        city: 'Valiant Lady',  date: 'June 21', time: '8:15 AM',  status: 'confirmed', notes: 'Breakfast reservation' },
    { id: 'r6',  name: 'The Wake (brunch)',        cuisine: 'American',          city: 'Valiant Lady',  date: 'June 21', time: '11:45 AM', status: 'confirmed', notes: 'Brunch reservation' },
    { id: 'r7',  name: 'Ariya',                   cuisine: 'Pan-Asian',         city: 'Valiant Lady',  date: 'June 21', time: '8:30 PM',  status: 'confirmed', notes: 'Dinner reservation' },
    { id: 'r8',  name: 'Test Kitchen',            cuisine: 'Experimental',      city: 'Valiant Lady',  date: 'June 23', time: '9:15 PM',  status: 'confirmed', notes: 'After Cinque Terre day' },
    { id: 'r9',  name: 'The Wake (sea day)',       cuisine: 'American',          city: 'Valiant Lady',  date: 'June 25', time: '8:45 PM',  status: 'confirmed', notes: 'Sea day dinner' },
    { id: 'r10', name: 'Cala Bassa Beach Club',   cuisine: 'Mediterranean',     city: 'Ibiza',         date: 'June 27', time: 'All Day',  status: 'confirmed', notes: 'PREPAID: 3 sunbeds + champagne 🥂' },
  ],

  todos: [
    { id: 'td1',  cat: 'Documents', task: 'Passport packed & valid 6+ months past return',           done: true  },
    { id: 'td2',  cat: 'Documents', task: 'Print/save all flight confirmations (CBWO8M, 8U8KBK, C7253B)', done: true  },
    { id: 'td3',  cat: 'Documents', task: 'Save hotel confirmations (Dog Admiral, H10)',              done: true  },
    { id: 'td4',  cat: 'Documents', task: 'Save cruise confirmation (2478994)',                       done: true  },
    { id: 'td5',  cat: 'Documents', task: 'Travel insurance documents accessible',                   done: true  },
    { id: 'td6',  cat: 'Documents', task: 'Share emergency contacts with family at home',            done: false },
    { id: 'td7',  cat: 'Money',     task: 'Get euros (€200+ each recommended)',                      done: false },
    { id: 'td8',  cat: 'Money',     task: 'Notify bank/credit card of travel dates',                 done: false },
    { id: 'td9',  cat: 'Money',     task: 'Bring €10 cash for Sóller tram (June 18)',               done: false },
    { id: 'td10', cat: 'Cruise',    task: 'Download Virgin Voyages app',                             done: false },
    { id: 'td11', cat: 'Cruise',    task: 'Set up Sailor Loot / onboard account',                   done: false },
    { id: 'td12', cat: 'Cruise',    task: 'Book Redemption Spa appointments',                        done: false },
    { id: 'td13', cat: 'Cruise',    task: 'Pack scarlet/red outfit for Scarlet Night (June 25)',     done: false },
    { id: 'td14', cat: 'Cruise',    task: 'Pack pajamas for PJ Night (June 21)',                     done: false },
    { id: 'td15', cat: 'Activities', task: 'Confirm Hammam Al Andalus booking (June 17, 5:30 PM)',  done: true  },
    { id: 'td16', cat: 'Activities', task: 'Confirm Valldemossa Tour (June 18, 9:30 AM at Cathedral)', done: true },
    { id: 'td17', cat: 'Activities', task: 'Book Parc Güell timed entry (June 20, 11 AM)',          done: false },
    { id: 'td18', cat: 'Activities', task: 'Book Rome Colosseum tickets',                            done: false },
    { id: 'td19', cat: 'Activities', task: 'Cala Bassa Beach Club confirmed & prepaid (June 27)',    done: true  },
    { id: 'td20', cat: 'Packing',  task: 'Sunscreen (reef-safe) & beach gear',                      done: false },
    { id: 'td21', cat: 'Packing',  task: 'Comfortable walking shoes',                               done: false },
    { id: 'td22', cat: 'Packing',  task: 'Universal power adapter (Spain/France/Italy Type C/F)',   done: false },
    { id: 'td23', cat: 'Packing',  task: 'Motion sickness medication (sea days)',                   done: false },
    { id: 'td24', cat: 'Packing',  task: 'Portable charger / power bank',                           done: false },
  ],

  packing: {
    alicyn:  makePackingList('pka'),
    felicia: makePackingList('pkf'),
    sabrina: makePackingList('pks'),
  },

  budget: {
    totals: { felicia: 6237.24, alicyn: 6628.89 },
    items: [
      { id: 'bg1',  description: 'Air Canada flights — 3 pax r/t LAX–BCN (CBWO8M)',  paidBy: 'Split',          felicia: '', alicyn: '', notes: 'AC774/AC822 + AC821/AC795' },
      { id: 'bg2',  description: 'Air Europa BCN→PMI — UX6037',                       paidBy: 'Split',          felicia: '', alicyn: '', notes: 'Conf: 8U8KBK' },
      { id: 'bg3',  description: 'Ryanair PMI→BCN — FR6379',                          paidBy: 'Split',          felicia: '', alicyn: '', notes: 'Conf: C7253B' },
      { id: 'bg4',  description: 'Dog Admiral — Flamingo Suite, 2 nights',            paidBy: 'Pay at location', felicia: '', alicyn: '', notes: 'BB26031720350199' },
      { id: 'bg5',  description: 'H10 Art Gallery — Atrium Room, 2 nights',           paidBy: 'Alicyn',         felicia: '', alicyn: '', notes: 'Pre-paid by Alicyn' },
      { id: 'bg6',  description: 'Virgin Voyages — Seaview Cabin, 7 nights, 3 pax',  paidBy: 'Felicia',        felicia: '', alicyn: '', notes: 'Conf: 2478994' },
      { id: 'bg7',  description: 'Hammam Al Andalus (3 pax, June 17)',                paidBy: 'Split',          felicia: '', alicyn: '', notes: '' },
      { id: 'bg8',  description: 'Valldemossa / Deià / Sóller Tour (3 pax, June 18)', paidBy: 'Split',         felicia: '', alicyn: '', notes: '' },
      { id: 'bg9',  description: 'Cala Bassa Beach Club — 3 sunbeds + champagne',     paidBy: 'Split',          felicia: '', alicyn: '', notes: 'PREPAID, June 27' },
      { id: 'bg10', description: 'Travel Insurance',                                  paidBy: 'Split',          felicia: '', alicyn: '', notes: '' },
      { id: 'bg11', description: 'Misc / Ubers / Transfers',                          paidBy: 'Split',          felicia: '', alicyn: '', notes: '' },
    ],
  },

  emergency: {
    numbers: [
      { id: 'em1', country: 'Spain',  number: '112',             description: 'General Emergency' },
      { id: 'em2', country: 'Spain',  number: '061',             description: 'Medical Emergency' },
      { id: 'em3', country: 'Italy',  number: '112',             description: 'General Emergency' },
      { id: 'em4', country: 'Italy',  number: '118',             description: 'Medical Emergency' },
      { id: 'em5', country: 'France', number: '112',             description: 'General Emergency' },
      { id: 'em6', country: 'France', number: '15',              description: 'Medical Emergency (SAMU)' },
      { id: 'em7', country: 'All',    number: '+1-888-407-4747', description: 'US State Dept — 24/7 Citizen Services' },
    ],
    consulates: [
      { id: 'co1', country: 'Spain',  name: 'US Consulate Barcelona', address: 'Passeig de la Reina Elisenda de Montcada 23, 08034 Barcelona', phone: '+34 93 280 2227' },
      { id: 'co2', country: 'Italy',  name: 'US Embassy Rome',        address: 'Via Vittorio Veneto 121, 00187 Roma',                         phone: '+39 06 46741' },
      { id: 'co3', country: 'France', name: 'US Consulate Marseille', address: 'Place Varian Fry, 13086 Marseille',                           phone: '+33 4 91 54 92 00' },
    ],
    travelers: [
      { id: 'tr1', name: 'Alicyn Kitamura', contact: '', contactPhone: '', bloodType: '', allergies: '', insurance: '' },
      { id: 'tr2', name: 'Felicia Mapa',    contact: '', contactPhone: '', bloodType: '', allergies: '', insurance: '' },
      { id: 'tr3', name: 'Sabrina Hammou',  contact: '', contactPhone: '', bloodType: '', allergies: '', insurance: '' },
    ],
    allergyTranslations: [
      { id: 'at1', allergy: '', spanish: '', italian: '', french: '' },
    ],
  },

  lastUpdated: null,
};

/* ─── STORAGE HOOK ──────────────────────────────────────── */
function useSharedStorage(key, fallback) {
  // null = still loading; real data once hydrated
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!configured) {
      // localStorage fallback (single-device)
      try {
        const raw = localStorage.getItem(key);
        setData(raw ? JSON.parse(raw) : fallback);
      } catch {
        setData(fallback);
      }
      return;
    }

    // Firebase Realtime Database — live sync across all devices
    const r = fbRef(db, key);
    const unsub = onValue(
      r,
      (snap) => {
        if (snap.exists()) {
          setData(snap.val());
        } else {
          // First run: seed with default data
          fbSet(r, fallback).catch(() => {});
          setData(fallback);
        }
      },
      () => setData(fallback), // error fallback
    );
    return unsub;
  }, [key]); // eslint-disable-line

  const save = useCallback((updater) => {
    setData((prev) => {
      const base = prev ?? fallback;
      const next = typeof updater === 'function' ? updater(base) : updater;
      if (configured) {
        fbSet(fbRef(db, key), next).catch(() => {});
      } else {
        try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [key]); // eslint-disable-line

  return [data, save];
}

/* ─── HOOKS ─────────────────────────────────────────────── */
function useIsMobile(bp = 640) {
  const [is, setIs] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setIs(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return is;
}

/* ─── MICRO COMPONENTS ──────────────────────────────────── */
function StatusBadge({ status, onClick }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span onClick={onClick} title={onClick ? 'Click to cycle status' : s.label} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.color + '18', color: s.color,
      border: `1px solid ${s.color}44`, borderRadius: 4,
      padding: '2px 9px', fontSize: 11, fontFamily: 'Inter,sans-serif',
      fontWeight: 600, cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap', userSelect: 'none',
    }}>
      {s.icon} {s.label}
    </span>
  );
}

function Pill({ icon, label, small, mono }) {
  if (!label && label !== 0) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: small ? 11 : 12, color: C.textMid,
      fontFamily: mono ? 'monospace' : 'Inter,sans-serif',
      background: C.ivoryMid, borderRadius: 3, padding: '2px 8px',
    }}>
      {icon} {label}
    </span>
  );
}

function Btn({ children, onClick, variant = 'ghost', small, style: sx, title }) {
  const v = {
    primary: { background: C.terracotta, color: C.white, border: 'none' },
    ghost:   { background: 'transparent', color: C.terracotta, border: `1px solid ${C.terracotta}55` },
    danger:  { background: C.red + '14', color: C.red, border: `1px solid ${C.red}44` },
    navy:    { background: C.navy, color: C.white, border: 'none' },
  };
  return (
    <button onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      borderRadius: 3, cursor: 'pointer',
      fontFamily: 'Inter,sans-serif', fontWeight: 600,
      fontSize: small ? 12 : 13, padding: small ? '4px 10px' : '7px 14px',
      transition: 'all .15s', ...v[variant], ...sx,
    }}>{children}</button>
  );
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const write = navigator.clipboard?.writeText(value);
    const ok = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
    if (write) { write.then(ok).catch(ok); } else {
      const ta = Object.assign(document.createElement('textarea'), { value });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); ok();
    }
  };
  return (
    <button onClick={copy} title={`Copy ${value}`} style={{
      background: copied ? C.green + '20' : C.ivoryMid,
      border: `1px solid ${copied ? C.green + '55' : C.ivoryDark}`,
      borderRadius: 3, cursor: 'pointer', fontSize: 11, padding: '2px 8px',
      color: copied ? C.green : C.textMid, fontFamily: 'Inter,sans-serif',
      fontWeight: 600, transition: 'all .2s', whiteSpace: 'nowrap',
    }}>{copied ? '✓ Copied' : '📋'}</button>
  );
}

function Card({ children, style: sx }) {
  return (
    <div style={{
      background: C.white, borderRadius: 16,
      border: `1px solid ${C.ivoryDark}`,
      boxShadow: '0 4px 24px rgba(13,27,42,.07)',
      padding: '16px 18px', ...sx,
    }}>{children}</div>
  );
}

function SectionHead({ title, icon, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontFamily: 'Playfair Display,serif', fontSize: 28, color: C.navy, fontWeight: 700, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon} {title}
      </h2>
      {action}
    </div>
  );
}

function SubHead({ children }) {
  return (
    <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 17, color: C.navy, fontWeight: 700, letterSpacing: '0px', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${C.ivoryDark}` }}>
      {children}
    </div>
  );
}

/* ─── MODAL ─────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(28,45,80,.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: C.ivory, borderRadius: 8, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(28,45,80,.18)',
        border: `1px solid ${C.ivoryDark}`,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 22px 14px', borderBottom: `1px solid ${C.ivoryDark}`,
          position: 'sticky', top: 0, background: C.ivory, borderRadius: '8px 8px 0 0',
        }}>
          <span style={{ fontFamily: 'Playfair Display,serif', fontSize: 18, color: C.navy, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.textLight, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px' }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', options, rows }) {
  const base = {
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${C.ivoryDark}`, borderRadius: 4,
    padding: '8px 12px', fontFamily: 'Inter,sans-serif', fontSize: 13,
    background: C.white, color: C.text, outline: 'none', marginTop: 4,
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: C.textMid, fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</label>
      {options
        ? <select name={name} value={value} onChange={onChange} style={base}>{options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select>
        : rows
          ? <textarea name={name} value={value} onChange={onChange} rows={rows} style={{ ...base, resize: 'vertical' }} />
          : <input type={type} name={name} value={value} onChange={onChange} style={base} />
      }
    </div>
  );
}

/* ─── CONFIRM MODAL ─────────────────────────────────────── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Are you sure?" onClose={onCancel}>
      <p style={{ fontFamily: 'Inter,sans-serif', fontSize: 14, color: C.text, margin: '0 0 22px', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
      </div>
    </Modal>
  );
}

function useConfirm() {
  const [pending, setPending] = useState(null);
  const confirm = (message) => new Promise(resolve => setPending({ message, resolve }));
  const modal = pending ? (
    <ConfirmModal
      message={pending.message}
      onConfirm={() => { pending.resolve(true);  setPending(null); }}
      onCancel={()  => { pending.resolve(false); setPending(null); }}
    />
  ) : null;
  return [confirm, modal];
}

/* ─── FLIGHTS VIEW ──────────────────────────────────────── */
const MALLORCA_IDS = ['fl2', 'fl3'];

function FlightsView({ data, onUpdate }) {
  const [editItem, setEditItem] = useState(null);
  const [confirm, confirmModal] = useConfirm();
  const [flUnlocked, setFlUnlocked] = useState(() => {
    try { return sessionStorage.getItem('flights_unlocked') === '1'; } catch { return false; }
  });
  const [flPw, setFlPw] = useState('');
  const [flPwErr, setFlPwErr] = useState(false);
  const blank = { airline: '', numbers: '', route: '', date: '', departure: '', arrival: '', confirmation: '', passengers: '', status: 'confirmed', notes: '' };

  const tryFlUnlock = () => {
    if (flPw === 'Sabrina26') {
      try { sessionStorage.setItem('flights_unlocked', '1'); } catch {}
      setFlUnlocked(true); setFlPwErr(false);
    } else {
      setFlPwErr(true);
      setTimeout(() => setFlPwErr(false), 2500);
    }
  };

  const save = (item) => {
    onUpdate(d => {
      const list = item.id
        ? d.flights.map(f => f.id === item.id ? item : f)
        : [...d.flights, { ...item, id: uid() }];
      return { ...d, flights: list, lastUpdated: new Date().toISOString() };
    });
    setEditItem(null);
  };
  const del = async (id, label) => {
    if (await confirm(`Delete "${label}"? This cannot be undone.`))
      onUpdate(d => ({ ...d, flights: d.flights.filter(f => f.id !== id), lastUpdated: new Date().toISOString() }));
  };
  const cycle = (id) => onUpdate(d => ({ ...d, lastUpdated: new Date().toISOString(), flights: d.flights.map(f => f.id === id ? { ...f, status: nextStatus(f.status) } : f) }));

  const renderFlight = (f) => (
    <Card key={f.id}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 17, color: C.navy, fontWeight: 600 }}>{f.airline}</span>
            <span style={{ fontSize: 12, color: C.textLight, fontFamily: 'Inter,sans-serif' }}>{f.numbers}</span>
          </div>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 22, color: C.terracotta, fontWeight: 700, marginBottom: 8 }}>{f.route}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <Pill icon="📅" label={f.date} />
            <Pill icon="🛫" label={f.departure} />
            <Pill icon="🛬" label={f.arrival} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Pill icon="🔑" label={f.confirmation} mono />
            {f.confirmation && <CopyBtn value={f.confirmation} />}
            <Pill icon="👥" label={f.passengers} />
          </div>
          {f.notes && <div style={{ marginTop: 8, padding: '6px 10px', background: C.gold + '18', borderLeft: `3px solid ${C.gold}`, borderRadius: 6, fontSize: 12, color: C.textMid, fontFamily: 'Inter,sans-serif' }}>{f.notes}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <StatusBadge status={f.status} onClick={() => cycle(f.id)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn small variant="ghost" onClick={() => setEditItem(f)}>Edit</Btn>
            <Btn small variant="danger" onClick={() => del(f.id, `${f.airline} ${f.route}`)}>Del</Btn>
          </div>
        </div>
      </div>
    </Card>
  );

  const publicFlights  = data.flights.filter(f => !MALLORCA_IDS.includes(f.id));
  const privateFlights = data.flights.filter(f =>  MALLORCA_IDS.includes(f.id));

  return (
    <div>
      <SectionHead title="Dragon's Wings" icon="🐉" action={<Btn variant="primary" small onClick={() => setEditItem(blank)}>+ Add Flight</Btn>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {publicFlights.map(renderFlight)}

        {/* Mallorca flights — password gated */}
        {flUnlocked ? (
          privateFlights.map(renderFlight)
        ) : (
          <Card style={{ textAlign: 'center', padding: '20px 18px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
            <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 16, color: C.navy, fontWeight: 700, marginBottom: 4 }}>Additional Flights</div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: C.textMid, marginBottom: 16 }}>Enter the password to view.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <input
                type="password" value={flPw} onChange={e => setFlPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && tryFlUnlock()}
                placeholder="Speak, friend, and enter…"
                style={{ border: `1px solid ${flPwErr ? C.red : C.ivoryDark}`, borderRadius: 8, padding: '9px 14px', fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none', width: 220, color: C.text }}
              />
              <Btn variant="primary" onClick={tryFlUnlock}>🔓 Open Sesame</Btn>
            </div>
            {flPwErr && <div style={{ marginTop: 10, fontSize: 12, color: C.red, fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>Wrong password! Do you know the Muffin Man?!</div>}
          </Card>
        )}
      </div>
      {editItem && <FlightForm initial={editItem} onSave={save} onClose={() => setEditItem(null)} />}
      {confirmModal}
    </div>
  );
}

function FlightForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const ch = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  return (
    <Modal title={initial.id ? 'Edit Flight' : 'Add Flight'} onClose={onClose}>
      <Field label="Airline" name="airline" value={form.airline} onChange={ch} />
      <Field label="Flight Numbers" name="numbers" value={form.numbers} onChange={ch} />
      <Field label="Route" name="route" value={form.route} onChange={ch} />
      <Field label="Date" name="date" value={form.date} onChange={ch} />
      <Field label="Departure" name="departure" value={form.departure} onChange={ch} />
      <Field label="Arrival" name="arrival" value={form.arrival} onChange={ch} />
      <Field label="Confirmation #" name="confirmation" value={form.confirmation} onChange={ch} />
      <Field label="Passengers" name="passengers" value={form.passengers} onChange={ch} />
      <Field label="Status" name="status" value={form.status} onChange={ch} options={STATUSES.map(s => ({ value: s, label: STATUS[s].label }))} />
      <Field label="Notes" name="notes" value={form.notes} onChange={ch} rows={2} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(form)}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ─── HOTELS VIEW ───────────────────────────────────────── */
function HotelsView({ data, onUpdate }) {
  const [editItem, setEditItem] = useState(null);
  const [confirm, confirmModal] = useConfirm();
  const blank = { name: '', address: '', checkIn: '', checkOut: '', nights: '', room: '', guests: '', confirmation: '', status: 'confirmed', notes: '' };

  const save = (item) => {
    onUpdate(d => {
      const list = item.id ? d.hotels.map(h => h.id === item.id ? item : h) : [...d.hotels, { ...item, id: uid() }];
      return { ...d, hotels: list, lastUpdated: new Date().toISOString() };
    });
    setEditItem(null);
  };
  const del = async (id, label) => {
    if (await confirm(`Delete "${label}"? This cannot be undone.`))
      onUpdate(d => ({ ...d, hotels: d.hotels.filter(h => h.id !== id), lastUpdated: new Date().toISOString() }));
  };
  const cycle = (id) => onUpdate(d => ({ ...d, lastUpdated: new Date().toISOString(), hotels: d.hotels.map(h => h.id === id ? { ...h, status: nextStatus(h.status) } : h) }));

  return (
    <div>
      <SectionHead title="Swamp Stays & Castles" icon="🌿" action={<Btn variant="primary" small onClick={() => setEditItem(blank)}>+ Add</Btn>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {data.hotels.map(h => (
          <Card key={h.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 22 }}>{h.name.includes('Virgin') ? '🚢' : '🏨'}</span>
                  <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 18, color: C.navy, fontWeight: 700 }}>{h.name}</span>
                </div>
                <div style={{ fontSize: 13, color: C.textMid, fontFamily: 'Inter,sans-serif', marginBottom: 10 }}>📍 {h.address}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <Pill icon="📅" label={`${h.checkIn} → ${h.checkOut}`} />
                  <Pill icon="🌙" label={`${h.nights} nights`} />
                  <Pill icon="🛏️" label={h.room} />
                  <Pill icon="👥" label={`${h.guests} guests`} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Pill icon="🔑" label={h.confirmation} mono />
                  {h.confirmation && <CopyBtn value={h.confirmation} />}
                </div>
                {h.notes && <div style={{ marginTop: 8, padding: '6px 10px', background: C.gold + '18', borderLeft: `3px solid ${C.gold}`, borderRadius: 6, fontSize: 12, color: C.textMid, fontFamily: 'Inter,sans-serif' }}>{h.notes}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <StatusBadge status={h.status} onClick={() => cycle(h.id)} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn small variant="ghost" onClick={() => setEditItem(h)}>Edit</Btn>
                  <Btn small variant="danger" onClick={() => del(h.id, h.name)}>Del</Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {editItem && <HotelForm initial={editItem} onSave={save} onClose={() => setEditItem(null)} />}
      {confirmModal}
    </div>
  );
}

function HotelForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const ch = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  return (
    <Modal title={initial.id ? 'Edit Accommodation' : 'Add Accommodation'} onClose={onClose}>
      <Field label="Property Name" name="name" value={form.name} onChange={ch} />
      <Field label="Address" name="address" value={form.address} onChange={ch} />
      <Field label="Check-In" name="checkIn" value={form.checkIn} onChange={ch} />
      <Field label="Check-Out" name="checkOut" value={form.checkOut} onChange={ch} />
      <Field label="Nights" name="nights" value={form.nights} onChange={ch} />
      <Field label="Room Type" name="room" value={form.room} onChange={ch} />
      <Field label="Guests" name="guests" value={form.guests} onChange={ch} />
      <Field label="Confirmation #" name="confirmation" value={form.confirmation} onChange={ch} />
      <Field label="Status" name="status" value={form.status} onChange={ch} options={STATUSES.map(s => ({ value: s, label: STATUS[s].label }))} />
      <Field label="Notes" name="notes" value={form.notes} onChange={ch} rows={2} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(form)}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ─── DAILY ITINERARY ───────────────────────────────────── */
function DailyView({ data, onUpdate }) {
  const [dragSrc, setDragSrc]   = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [editEvt, setEditEvt]   = useState(null);
  const [confirm, confirmModal] = useConfirm();
  const isMobile = useIsMobile();

  const days     = data.days || [];
  const todayStr = new Date().toISOString().split('T')[0];

  const [selIdx, setSelIdx] = useState(() => {
    const i = days.findIndex(d => d.date === todayStr);
    return i >= 0 ? i : 0;
  });

  const blankEvt = { time: '', title: '', description: '', location: '', type: 'activity', status: 'pending', notes: '' };
  const DOW      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // June 15 is Monday → two perfect Mon–Sun weeks
  const weeks    = [days.slice(0, 7), days.slice(7, 14)];

  /* ── event ops ── */
  const saveEvt = ({ dayIdx, event }) => {
    onUpdate(d => ({
      ...d, lastUpdated: new Date().toISOString(),
      days: d.days.map((day, i) => i !== dayIdx ? day : {
        ...day, events: event.id
          ? day.events.map(e => e.id === event.id ? event : e)
          : [...day.events, { ...event, id: uid() }],
      }),
    }));
    setEditEvt(null);
  };

  const delEvt = async (dayIdx, id, title) => {
    if (await confirm(`Delete "${title}"? This cannot be undone.`))
      onUpdate(d => ({
        ...d, lastUpdated: new Date().toISOString(),
        days: d.days.map((day, i) => i !== dayIdx ? day : { ...day, events: day.events.filter(e => e.id !== id) }),
      }));
  };

  const cycleEvt = (dayIdx, id) => onUpdate(d => ({
    ...d, lastUpdated: new Date().toISOString(),
    days: d.days.map((day, i) => i !== dayIdx ? day : {
      ...day, events: day.events.map(e => e.id !== id ? e : { ...e, status: nextStatus(e.status) }),
    }),
  }));

  const moveEvt = (dayIdx, evtIdx, dir) => {
    const ni = evtIdx + dir;
    onUpdate(d => {
      const ds = d.days.map(day => ({ ...day, events: [...day.events] }));
      const evts = ds[dayIdx].events;
      if (ni < 0 || ni >= evts.length) return d;
      [evts[evtIdx], evts[ni]] = [evts[ni], evts[evtIdx]];
      return { ...d, days: ds, lastUpdated: new Date().toISOString() };
    });
  };

  const onDrop = (toDayIdx, toEvtIdx) => {
    if (!dragSrc) return;
    if (dragSrc.dayIdx === toDayIdx && dragSrc.evtIdx === toEvtIdx) { setDragSrc(null); setDragOver(null); return; }
    onUpdate(d => {
      const ds = d.days.map(day => ({ ...day, events: [...day.events] }));
      const [moved] = ds[dragSrc.dayIdx].events.splice(dragSrc.evtIdx, 1);
      ds[toDayIdx].events.splice(toEvtIdx, 0, moved);
      return { ...d, days: ds, lastUpdated: new Date().toISOString() };
    });
    setDragSrc(null); setDragOver(null);
  };

  const selDay = days[selIdx];

  // Countdown for pill banner
  const _now = new Date();
  const _dep = new Date('2026-06-15T00:00:00');
  const _end = new Date('2026-06-28T23:59:59');
  const _msDay = 86400000;
  const _daysUntil = Math.ceil((_dep - _now) / _msDay);
  const _dayInTrip = _now >= _dep && _now <= _end ? Math.floor((_now - _dep) / _msDay) + 1 : null;
  const _todayStr = _now.toISOString().split('T')[0];
  const _todayDay = days.find(d => d.date === _todayStr);
  let pillMsg = null, pillGrad = `linear-gradient(135deg, ${C.gold}, ${C.terracottaL})`;
  if (_daysUntil > 0) {
    pillMsg = `✈️  T-${_daysUntil} day${_daysUntil !== 1 ? 's' : ''} until departure`;
  } else if (_dayInTrip) {
    pillMsg = `🌍  Day ${_dayInTrip} of 14 — ${_todayDay ? _todayDay.location : 'on your trip'}`;
    pillGrad = `linear-gradient(135deg, #2E7D52, #4CAF7D)`;
  } else if (_now > _end) {
    pillMsg = `🏠  What an incredible trip!`;
    pillGrad = `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`;
  }

  return (
    <div>
      {pillMsg && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            background: pillGrad, borderRadius: 999, padding: '9px 22px',
            fontFamily: 'Inter,sans-serif', fontSize: 12, color: C.white, fontWeight: 700,
            letterSpacing: '.4px', boxShadow: `0 4px 20px rgba(201,150,58,.35)`,
          }}>{pillMsg}</div>
        </div>
      )}
      <SectionHead title="The Quest" icon="🗺️" action={
        <Btn variant="ghost" small onClick={() => { const i = days.findIndex(d => d.date === todayStr); if (i >= 0) setSelIdx(i); }}>
          Today
        </Btn>
      } />

      {/* ── CALENDAR GRID ── */}
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.ivoryDark}`, overflow: 'hidden', marginBottom: 22, boxShadow: '0 4px 24px rgba(13,27,42,.07)' }}>

        {/* Month header */}
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`, borderBottom: `1px solid rgba(255,255,255,.08)`, padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 17, color: C.white, fontWeight: 600, letterSpacing: .3 }}>June 2026</div>
          <div style={{ fontSize: 11, color: C.goldL, fontFamily: 'Inter,sans-serif' }}>
            {days.length} days &nbsp;·&nbsp; {days.reduce((s, d) => s + d.events.length, 0)} events
          </div>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${C.ivoryDark}`, background: C.ivory }}>
          {DOW.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', padding: '7px 2px',
              fontSize: 10, fontWeight: 700, letterSpacing: .8, textTransform: 'uppercase',
              color: i >= 5 ? C.terracotta : C.textLight,
              fontFamily: 'Inter,sans-serif',
              borderRight: i < 6 ? `1px solid ${C.ivoryDark}` : 'none',
            }}>
              {isMobile ? d[0] : d}
            </div>
          ))}
        </div>

        {/* Two week rows */}
        {weeks.map((week, wIdx) => (
          <div key={wIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wIdx === 0 ? `1px solid ${C.ivoryDark}` : 'none' }}>
            {week.map((day, dIdx) => {
              const globalIdx  = wIdx * 7 + dIdx;
              const isToday    = day.date === todayStr;
              const isSel      = globalIdx === selIdx;
              const isPast     = day.date < todayStr && !isToday;
              const maxIcons   = isMobile ? 3 : 5;
              const typeIcons  = [...new Set(day.events.map(e => (TYPE[e.type] || TYPE.other).icon))].slice(0, maxIcons);
              const overflow   = day.events.length > maxIcons ? day.events.length - maxIcons : 0;
              const isWeekend  = dIdx >= 5;

              return (
                <div
                  key={day.date}
                  onClick={() => setSelIdx(globalIdx)}
                  style={{
                    padding: isMobile ? '7px 4px 6px' : '10px 8px 8px',
                    cursor: 'pointer',
                    background: isSel ? C.navy : isToday ? C.terracotta + '14' : isWeekend ? C.ivoryMid + '60' : 'transparent',
                    borderRight: dIdx < 6 ? `1px solid ${C.ivoryDark}` : 'none',
                    transition: 'background .12s',
                    minHeight: isMobile ? 74 : 90,
                    display: 'flex', flexDirection: 'column',
                    outline: isSel ? `2px solid ${C.gold}` : isToday && !isSel ? `2px solid ${C.terracotta}` : 'none',
                    outlineOffset: -2,
                    position: 'relative',
                  }}
                >
                  {/* Date number circle */}
                  <div style={{
                    width: isMobile ? 22 : 26, height: isMobile ? 22 : 26,
                    borderRadius: '50%',
                    background: isToday ? C.terracotta : isSel ? C.gold : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Inter,sans-serif',
                    fontSize: isMobile ? 13 : 15, fontWeight: 700,
                    color: isToday || isSel ? C.white : isPast ? C.textLight : C.navy,
                    flexShrink: 0, marginBottom: 3,
                  }}>
                    {new Date(day.date + 'T12:00:00').getDate()}
                  </div>

                  {/* Location — desktop only */}
                  {!isMobile && (
                    <div style={{
                      fontSize: 9, lineHeight: 1.2, marginBottom: 4,
                      color: isSel ? C.goldL : C.textLight,
                      fontFamily: 'Inter,sans-serif',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}>
                      {day.location.split(/[,→·]/)[0].trim()}
                    </div>
                  )}

                  {/* Event type icons */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    {typeIcons.map((icon, i) => (
                      <span key={i} style={{ fontSize: isMobile ? 10 : 12, lineHeight: 1 }}>{icon}</span>
                    ))}
                    {overflow > 0 && (
                      <span style={{ fontSize: 9, color: isSel ? C.goldL : C.textLight, fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>+{overflow}</span>
                    )}
                  </div>

                  {/* Event count dot */}
                  {day.events.length > 0 && (
                    <div style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 16, height: 16, borderRadius: '50%',
                      background: isSel ? C.white + '22' : C.ivoryDark,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontFamily: 'Inter,sans-serif', fontWeight: 700,
                      color: isSel ? C.goldL : C.textLight,
                    }}>
                      {day.events.length}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── SELECTED DAY PANEL ── */}
      {selDay && (
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          border: `1px solid ${selDay.date === todayStr ? C.gold : C.ivoryDark}`,
          boxShadow: selDay.date === todayStr ? `0 0 0 2px ${C.gold}44, 0 8px 32px rgba(13,27,42,.10)` : '0 4px 24px rgba(13,27,42,.08)',
        }}>
          {/* Day header with prev / next */}
          <div style={{
            background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`,
            padding: '14px 18px',
            borderBottom: `1px solid rgba(255,255,255,.08)`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <button onClick={() => setSelIdx(i => Math.max(0, i - 1))} disabled={selIdx === 0}
              style={{ background: 'none', border: `1px solid ${C.white}44`, borderRadius: 8, color: selIdx === 0 ? C.white + '33' : C.white, width: 34, height: 34, fontSize: 18, cursor: selIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ‹
            </button>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Inter,sans-serif', fontSize: isMobile ? 15 : 18, color: C.white, fontWeight: 700 }}>{selDay.label}</span>
                {selDay.date === todayStr && (
                  <span style={{ background: C.terracotta, color: C.white, fontSize: 10, fontFamily: 'Inter,sans-serif', fontWeight: 700, borderRadius: 3, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: .6 }}>Today</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.goldL, fontFamily: 'Inter,sans-serif', marginTop: 3 }}>
                📍 {selDay.location} &nbsp;·&nbsp; <em>{selDay.subtitle}</em>
              </div>
            </div>

            <button onClick={() => setSelIdx(i => Math.min(days.length - 1, i + 1))} disabled={selIdx === days.length - 1}
              style={{ background: 'none', border: `1px solid ${C.white}44`, borderRadius: 8, color: selIdx === days.length - 1 ? C.white + '33' : C.white, width: 34, height: 34, fontSize: 18, cursor: selIdx === days.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ›
            </button>
          </div>

          {/* Event list */}
          <div style={{ background: C.ivory, padding: '12px 12px 6px' }}>
            {selDay.events.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0 20px', color: C.textLight, fontFamily: 'Inter,sans-serif', fontSize: 14, fontStyle: 'italic' }}>
                No events yet — add one below
              </div>
            )}
            {selDay.events.map((evt, evtIdx) => (
              <EventCard
                key={evt.id} evt={evt}
                isFirst={evtIdx === 0}
                isLast={evtIdx === selDay.events.length - 1}
                isDragging={dragSrc?.dayIdx === selIdx && dragSrc?.evtIdx === evtIdx}
                isOver={dragOver?.dayIdx === selIdx && dragOver?.evtIdx === evtIdx}
                onDragStart={() => setDragSrc({ dayIdx: selIdx, evtIdx })}
                onDragOver={() => setDragOver({ dayIdx: selIdx, evtIdx })}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => onDrop(selIdx, evtIdx)}
                onEdit={() => setEditEvt({ dayIdx: selIdx, event: evt })}
                onDelete={() => delEvt(selIdx, evt.id, evt.title)}
                onCycle={() => cycleEvt(selIdx, evt.id)}
                onMoveUp={() => moveEvt(selIdx, evtIdx, -1)}
                onMoveDown={() => moveEvt(selIdx, evtIdx, 1)}
              />
            ))}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver({ dayIdx: selIdx, evtIdx: selDay.events.length }); }}
              onDrop={e => { e.preventDefault(); onDrop(selIdx, selDay.events.length); }}
              onDragLeave={() => setDragOver(null)}
              style={{ height: 8, borderRadius: 4, transition: 'background .15s', marginBottom: 4, background: dragOver?.dayIdx === selIdx && dragOver?.evtIdx === selDay.events.length ? C.terracottaL + '66' : 'transparent' }}
            />
            <button onClick={() => setEditEvt({ dayIdx: selIdx, event: blankEvt })} style={{
              width: '100%', boxSizing: 'border-box',
              border: `2px dashed ${C.gold}66`, borderRadius: 12,
              padding: '12px 16px', background: 'transparent', cursor: 'pointer',
              color: C.gold, fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: 6, marginBottom: 8, transition: 'all .2s',
            }}>
              ＋ Add Event
            </button>
          </div>
        </div>
      )}

      {editEvt && (
        <EvtForm
          initial={editEvt.event}
          title={`${editEvt.event.id ? 'Edit' : 'Add'} — ${days[editEvt.dayIdx]?.label}`}
          onSave={(evt) => saveEvt({ dayIdx: editEvt.dayIdx, event: evt })}
          onClose={() => setEditEvt(null)}
        />
      )}
      {confirmModal}
    </div>
  );
}

function EventCard({ evt, isFirst, isLast, isDragging, isOver, onDragStart, onDragOver, onDragLeave, onDrop, onEdit, onDelete, onCycle, onMoveUp, onMoveDown }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isDragging ? C.ivoryMid : C.white,
        border: `1px solid ${isOver ? C.gold : C.ivoryDark}`,
        borderLeft: `4px solid ${C.gold}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 8,
        cursor: 'grab', opacity: isDragging ? 0.45 : 1,
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .15s',
        boxShadow: hovered ? `0 8px 28px rgba(13,27,42,.13)` : '0 2px 12px rgba(13,27,42,.06)',
        transform: hovered && !isDragging ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: C.textLight, fontFamily: 'Inter,sans-serif', fontWeight: 600, minWidth: 62, paddingTop: 2, flexShrink: 0 }}>{evt.time}</span>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{(TYPE[evt.type] || TYPE.other).icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 15, color: C.navy, fontWeight: 600 }}>{evt.title}</div>
            {evt.description && <div style={{ fontSize: 12, color: C.textMid, fontFamily: 'Inter,sans-serif', marginTop: 2 }}>{evt.description}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
              {evt.location && <Pill icon="📍" label={evt.location} small />}
            </div>
            {evt.notes && <div style={{ marginTop: 6, padding: '5px 9px', background: C.gold + '1A', borderLeft: `3px solid ${C.gold}`, borderRadius: '0 6px 6px 0', fontSize: 12, color: C.textMid, fontFamily: 'Inter,sans-serif', lineHeight: 1.5 }}>📝 {evt.notes}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={evt.status} onClick={onCycle} />
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={onMoveUp} disabled={isFirst} title="Move up" style={{
              background: isFirst ? C.ivoryDark : C.ivoryMid, border: 'none',
              borderRadius: 6, width: 28, height: 28, cursor: isFirst ? 'default' : 'pointer',
              fontSize: 14, color: isFirst ? C.textLight : C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>↑</button>
            <button onClick={onMoveDown} disabled={isLast} title="Move down" style={{
              background: isLast ? C.ivoryDark : C.ivoryMid, border: 'none',
              borderRadius: 6, width: 28, height: 28, cursor: isLast ? 'default' : 'pointer',
              fontSize: 14, color: isLast ? C.textLight : C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>↓</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onEdit} title="Edit" style={{ background: C.ivoryMid, border: `1px solid ${C.ivoryDark}`, borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
            <button onClick={onDelete} title="Delete" style={{ background: C.red + '14', border: `1px solid ${C.red}33`, borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvtForm({ initial, title, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const ch = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  return (
    <Modal title={title} onClose={onClose}>
      <Field label="Time" name="time" value={form.time} onChange={ch} />
      <Field label="Title" name="title" value={form.title} onChange={ch} />
      <Field label="Description" name="description" value={form.description} onChange={ch} rows={2} />
      <Field label="Location" name="location" value={form.location} onChange={ch} />
      <Field label="Type" name="type" value={form.type} onChange={ch} options={Object.keys(TYPE).map(k => ({ value: k, label: `${TYPE[k].icon} ${TYPE[k].label}` }))} />
      <Field label="Status" name="status" value={form.status} onChange={ch} options={STATUSES.map(s => ({ value: s, label: STATUS[s].label }))} />
      <Field label="Notes" name="notes" value={form.notes} onChange={ch} rows={2} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(form)}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ─── RESTAURANTS VIEW ──────────────────────────────────── */
function RestaurantsView({ data, onUpdate }) {
  const [editItem, setEditItem] = useState(null);
  const [confirm, confirmModal] = useConfirm();
  const blank = { name: '', cuisine: '', city: '', date: '', time: '', status: 'confirmed', notes: '' };

  const save = (item) => {
    onUpdate(d => {
      const list = item.id ? d.restaurants.map(r => r.id === item.id ? item : r) : [...d.restaurants, { ...item, id: uid() }];
      return { ...d, restaurants: list, lastUpdated: new Date().toISOString() };
    });
    setEditItem(null);
  };
  const del = async (id, name) => {
    if (await confirm(`Remove "${name}" from the list?`))
      onUpdate(d => ({ ...d, restaurants: d.restaurants.filter(r => r.id !== id), lastUpdated: new Date().toISOString() }));
  };
  const cycle = (id) => onUpdate(d => ({ ...d, lastUpdated: new Date().toISOString(), restaurants: d.restaurants.map(r => r.id === id ? { ...r, status: nextStatus(r.status) } : r) }));

  return (
    <div>
      <SectionHead title="Swamp Grub & Adventures" icon="🍽️" action={<Btn variant="primary" small onClick={() => setEditItem(blank)}>+ Add</Btn>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.restaurants.map(r => (
          <Card key={r.id} style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 16, color: C.navy, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: C.textLight, background: C.ivoryMid, borderRadius: 3, padding: '1px 8px', fontFamily: 'Inter,sans-serif' }}>{r.cuisine}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Pill icon="📍" label={r.city} small />
                  <Pill icon="📅" label={r.date} small />
                  <Pill icon="🕐" label={r.time} small />
                </div>
                {r.notes && <div style={{ marginTop: 6, fontSize: 12, color: C.textMid, fontFamily: 'Inter,sans-serif', fontStyle: 'italic' }}>{r.notes}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <StatusBadge status={r.status} onClick={() => cycle(r.id)} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn small variant="ghost" onClick={() => setEditItem(r)}>Edit</Btn>
                  <Btn small variant="danger" onClick={() => del(r.id, r.name)}>Del</Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {editItem && <RestForm initial={editItem} onSave={save} onClose={() => setEditItem(null)} />}
      {confirmModal}
    </div>
  );
}

function RestForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const ch = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  return (
    <Modal title={initial.id ? 'Edit Entry' : 'Add Entry'} onClose={onClose}>
      <Field label="Name" name="name" value={form.name} onChange={ch} />
      <Field label="Cuisine / Type" name="cuisine" value={form.cuisine} onChange={ch} />
      <Field label="City / Venue" name="city" value={form.city} onChange={ch} />
      <Field label="Date" name="date" value={form.date} onChange={ch} />
      <Field label="Time" name="time" value={form.time} onChange={ch} />
      <Field label="Status" name="status" value={form.status} onChange={ch} options={STATUSES.map(s => ({ value: s, label: STATUS[s].label }))} />
      <Field label="Notes" name="notes" value={form.notes} onChange={ch} rows={2} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(form)}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ─── TODO VIEW ─────────────────────────────────────────── */
function TodoView({ data, onUpdate }) {
  const [newTask, setNewTask] = useState('');
  const [newCat, setNewCat] = useState('General');
  const [catDraft, setCatDraft] = useState({});
  const [confirm, confirmModal] = useConfirm();

  const allCats = [...new Set([...(data.todos || []).map(t => t.cat), 'Documents', 'Money', 'Cruise', 'Activities', 'Packing', 'General'])].filter(Boolean);

  const toggle = (id) => onUpdate(d => ({ ...d, lastUpdated: new Date().toISOString(), todos: d.todos.map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  const del = async (id, task) => {
    if (await confirm(`Delete "${task}"?`))
      onUpdate(d => ({ ...d, todos: d.todos.filter(t => t.id !== id), lastUpdated: new Date().toISOString() }));
  };
  const add = () => {
    if (!newTask.trim()) return;
    onUpdate(d => ({ ...d, lastUpdated: new Date().toISOString(), todos: [...d.todos, { id: uid(), cat: newCat, task: newTask.trim(), done: false }] }));
    setNewTask('');
  };
  const addToCat = (cat) => {
    const text = (catDraft[cat] || '').trim();
    if (!text) return;
    onUpdate(d => ({ ...d, lastUpdated: new Date().toISOString(), todos: [...d.todos, { id: uid(), cat, task: text, done: false }] }));
    setCatDraft(d => ({ ...d, [cat]: '' }));
  };

  const done = (data.todos || []).filter(t => t.done).length;
  const total = (data.todos || []).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <SectionHead title="Ogre To-Do's" icon="📋" />
      <Card style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: C.textMid, marginBottom: 8 }}>{done} of {total} tasks complete</div>
            <div style={{ height: 10, background: C.ivoryDark, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.terracotta}, ${C.gold})`, borderRadius: 5, transition: 'width .4s ease' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 32, color: C.terracotta, fontWeight: 700 }}>{pct}%</div>
        </div>
      </Card>

      {allCats.filter(cat => (data.todos || []).some(t => t.cat === cat)).map(cat => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.terracotta, fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>{cat}</div>
          {(data.todos || []).filter(t => t.cat === cat).map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: t.done ? C.ivoryMid : C.white,
              borderRadius: 4, marginBottom: 6, border: `1px solid ${C.ivoryDark}`, transition: 'background .2s',
            }}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.terracotta, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: 'Inter,sans-serif', fontSize: 14, color: t.done ? C.textLight : C.text, textDecoration: t.done ? 'line-through' : 'none' }}>{t.task}</span>
              <button onClick={() => del(t.id, t.task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, fontSize: 18, flexShrink: 0 }}>×</button>
            </div>
          ))}
          {/* Inline add for this category */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input
              value={catDraft[cat] || ''}
              onChange={e => setCatDraft(d => ({ ...d, [cat]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addToCat(cat)}
              placeholder="Add task…"
              style={{ flex: 1, border: `1px solid ${C.ivoryDark}`, borderRadius: 7, padding: '6px 11px', fontFamily: 'Inter,sans-serif', fontSize: 12, color: C.text, outline: 'none', background: C.white }}
            />
            <button onClick={() => addToCat(cat)} style={{ background: C.terracotta, color: C.white, border: 'none', borderRadius: 7, padding: '6px 14px', fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
          </div>
        </div>
      ))}

      <Card style={{ marginTop: 8 }}>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: C.navy, fontWeight: 600, marginBottom: 10 }}>Add to a different category</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={newCat} onChange={e => setNewCat(e.target.value)}
            style={{ border: `1px solid ${C.ivoryDark}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'Inter,sans-serif', fontSize: 12, background: C.white, color: C.text }}>
            {allCats.map(c => <option key={c}>{c}</option>)}
          </select>
          <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add a task... (press Enter)"
            style={{ flex: 1, minWidth: 160, border: `1px solid ${C.ivoryDark}`, borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter,sans-serif', fontSize: 13, color: C.text, outline: 'none' }} />
          <Btn variant="primary" onClick={add}>Add</Btn>
        </div>
      </Card>
      {confirmModal}
    </div>
  );
}

/* ─── PACKING VIEW ──────────────────────────────────────── */
function PackingView({ data, onUpdate }) {
  const [person, setPerson] = useState('alicyn');
  const [newItem, setNewItem] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newCat, setNewCat] = useState(PACK_CATS[0]);
  const [catDraft, setCatDraft] = useState({});
  const [catNoteDraft, setCatNoteDraft] = useState({});
  const [filter, setFilter] = useState('all');
  const [confirm, confirmModal] = useConfirm();

  // Auto-migrate: Firebase serializes arrays as {0:{},1:{},...} so Array.isArray is unreliable.
  // Treat any packing data that lacks the 'alicyn' person key as old format and reset.
  const isOldFormat = !data.packing || !('alicyn' in data.packing);
  useEffect(() => {
    if (isOldFormat) {
      onUpdate(d => ({
        ...d,
        packing: { alicyn: makePackingList('pka'), felicia: makePackingList('pkf'), sabrina: makePackingList('pks') },
        lastUpdated: new Date().toISOString(),
      }));
    }
  }, []); // eslint-disable-line

  const packing = data.packing;
  if (isOldFormat) {
    return <div style={{ textAlign: 'center', padding: 60, color: C.textMid, fontFamily: 'Inter,sans-serif' }}>Donkey is fetching your packing list… 🫏</div>;
  }

  const PEOPLE = [
    { key: 'alicyn',  label: 'Alicyn',  emoji: '👩🏻' },
    { key: 'felicia', label: 'Felicia', emoji: '👩🏽' },
    { key: 'sabrina', label: 'Sabrina', emoji: '👩🏻‍🦱' },
  ];

  const items = packing[person] || [];
  const visible = filter === 'unpacked' ? items.filter(p => !p.packed) : items;
  const packedCount = items.filter(p => p.packed).length;
  const total = items.length;
  const pct = total ? Math.round((packedCount / total) * 100) : 0;

  const toggle = (id) => onUpdate(d => ({
    ...d, lastUpdated: new Date().toISOString(),
    packing: { ...d.packing, [person]: (d.packing[person] || []).map(p => p.id === id ? { ...p, packed: !p.packed } : p) },
  }));
  const del = async (id, item) => {
    if (await confirm(`Remove "${item}" from ${PEOPLE.find(p => p.key === person)?.label}'s list?`))
      onUpdate(d => ({
        ...d, lastUpdated: new Date().toISOString(),
        packing: { ...d.packing, [person]: (d.packing[person] || []).filter(p => p.id !== id) },
      }));
  };
  const add = () => {
    if (!newItem.trim()) return;
    onUpdate(d => ({
      ...d, lastUpdated: new Date().toISOString(),
      packing: { ...d.packing, [person]: [...(d.packing[person] || []), { id: uid(), cat: newCat, item: newItem.trim(), packed: false, notes: newNote.trim() }] },
    }));
    setNewItem(''); setNewNote('');
  };
  const addToCat = (cat) => {
    const text = (catDraft[cat] || '').trim();
    if (!text) return;
    onUpdate(d => ({
      ...d, lastUpdated: new Date().toISOString(),
      packing: { ...d.packing, [person]: [...(d.packing[person] || []), { id: uid(), cat, item: text, packed: false, notes: (catNoteDraft[cat] || '').trim() }] },
    }));
    setCatDraft(d => ({ ...d, [cat]: '' }));
    setCatNoteDraft(d => ({ ...d, [cat]: '' }));
  };

  const activeCats = [
    ...PACK_CATS.filter(c => visible.some(p => p.cat === c)),
    ...[...new Set(visible.map(p => p.cat))].filter(c => !PACK_CATS.includes(c)),
  ];

  return (
    <div>
      <SectionHead title="Donkey's Packing List" icon="🧳" action={
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn small variant={filter === 'all' ? 'primary' : 'ghost'} onClick={() => setFilter('all')}>All</Btn>
          <Btn small variant={filter === 'unpacked' ? 'primary' : 'ghost'} onClick={() => setFilter('unpacked')}>Unpacked</Btn>
        </div>
      } />

      {/* Trip duration banner */}
      <div style={{ background: C.navyMid, borderRadius: 12, padding: '12px 18px', marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <span style={{ fontFamily: 'Playfair Display,serif', fontSize: 15, color: C.white, fontWeight: 700 }}>🌿 June 16 – June 28, 2026</span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '13 days · 12 nights', icon: '🌙' },
            { label: '7 cruise nights', icon: '🚢' },
            { label: '4 hotel nights', icon: '🏨' },
            { label: '1 flight night', icon: '✈️' },
          ].map(({ label, icon }) => (
            <span key={label} style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: C.goldL, fontWeight: 600 }}>{icon} {label}</span>
          ))}
        </div>
      </div>

      {/* Person selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {PEOPLE.map(p => {
          const arr = packing[p.key] || [];
          const done = arr.filter(x => x.packed).length;
          const tot = arr.length;
          const ppct = tot ? Math.round((done / tot) * 100) : 0;
          const active = person === p.key;
          return (
            <button key={p.key} onClick={() => setPerson(p.key)} style={{
              flex: 1, padding: '14px 8px', cursor: 'pointer', transition: 'all .18s',
              background: active ? C.navy : C.white,
              border: `1px solid ${active ? C.navy : C.ivoryDark}`,
              borderRadius: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            }}>
              <span style={{ fontSize: 24 }}>{p.emoji}</span>
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 700, color: active ? C.white : C.navy }}>{p.label}</span>
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: active ? C.goldL : C.textLight, fontWeight: 500 }}>{done}/{tot} · {ppct}%</span>
              <div style={{ width: '70%', height: 3, borderRadius: 99, background: active ? 'rgba(255,255,255,.2)' : C.ivoryDark, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${ppct}%`, background: ppct === 100 ? C.green : C.gold, transition: 'width .4s' }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Overall progress */}
      <Card style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: C.textMid, marginBottom: 8 }}>
              {packedCount} of {total} items packed
            </div>
            <div style={{ height: 8, background: C.ivoryDark, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? `linear-gradient(90deg, ${C.green}, #4CAF7D)` : `linear-gradient(90deg, ${C.terracotta}, ${C.gold})`, borderRadius: 5, transition: 'width .4s ease' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 32, color: pct === 100 ? C.green : C.terracotta, fontWeight: 700 }}>{pct}%</div>
        </div>
        {pct === 100 && <div style={{ marginTop: 10, fontSize: 13, color: C.green, fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>🐉 All packed — time to leave the swamp!</div>}
      </Card>

      {/* Items by category */}
      {activeCats.map(cat => {
        const catItems = visible.filter(p => p.cat === cat);
        const catPacked = items.filter(p => p.cat === cat && p.packed).length;
        const catTotal = items.filter(p => p.cat === cat).length;
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.terracotta, fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: 1.2 }}>{cat}</span>
              <span style={{ fontSize: 11, fontFamily: 'Inter,sans-serif', fontWeight: 600, color: catPacked === catTotal ? C.green : C.textLight }}>{catPacked}/{catTotal}</span>
            </div>
            {catItems.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 14px', marginBottom: 6,
                background: p.packed ? C.ivoryMid : C.white,
                border: `1px solid ${C.ivoryDark}`,
                borderLeft: `4px solid ${p.packed ? C.green : C.ivoryDark}`,
                borderRadius: 10, transition: 'all .2s',
              }}>
                <input type="checkbox" checked={p.packed} onChange={() => toggle(p.id)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.terracotta, flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 14, color: p.packed ? C.textLight : C.text, textDecoration: p.packed ? 'line-through' : 'none' }}>{p.item}</div>
                  {p.notes && <div style={{ fontSize: 11, color: C.textLight, fontFamily: 'Inter,sans-serif', marginTop: 2, fontStyle: 'italic' }}>{p.notes}</div>}
                </div>
                <button onClick={() => del(p.id, p.item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, fontSize: 18, flexShrink: 0, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ))}
            {/* Inline add for this category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={catDraft[cat] || ''}
                  onChange={e => setCatDraft(d => ({ ...d, [cat]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addToCat(cat)}
                  placeholder="Add item…"
                  style={{ flex: 1, border: `1px solid ${C.ivoryDark}`, borderRadius: 7, padding: '6px 11px', fontFamily: 'Inter,sans-serif', fontSize: 12, color: C.text, outline: 'none', background: C.white }}
                />
                <button onClick={() => addToCat(cat)} style={{ background: C.terracotta, color: C.white, border: 'none', borderRadius: 7, padding: '6px 14px', fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
              </div>
              <input
                value={catNoteDraft[cat] || ''}
                onChange={e => setCatNoteDraft(d => ({ ...d, [cat]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addToCat(cat)}
                placeholder="Caption / note (optional)"
                style={{ border: `1px solid ${C.ivoryDark}`, borderRadius: 7, padding: '5px 11px', fontFamily: 'Inter,sans-serif', fontSize: 11, color: C.textMid, outline: 'none', background: C.white, fontStyle: 'italic' }}
              />
            </div>
          </div>
        );
      })}

      {/* Add to a new custom category */}
      <Card style={{ marginTop: 8 }}>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: C.navy, fontWeight: 600, marginBottom: 10 }}>
          Add to a different category
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={newCat} onChange={e => setNewCat(e.target.value)}
            style={{ border: `1px solid ${C.ivoryDark}`, borderRadius: 4, padding: '8px 10px', fontFamily: 'Inter,sans-serif', fontSize: 12, background: C.white, color: C.text }}>
            {PACK_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add an item… (press Enter)"
            style={{ flex: 1, minWidth: 160, border: `1px solid ${C.ivoryDark}`, borderRadius: 4, padding: '8px 12px', fontFamily: 'Inter,sans-serif', fontSize: 13, color: C.text, outline: 'none' }} />
          <Btn variant="primary" onClick={add}>Add</Btn>
        </div>
        <div style={{ marginTop: 6 }}>
          <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Caption / note (optional)"
            style={{ width: '100%', border: `1px solid ${C.ivoryDark}`, borderRadius: 4, padding: '6px 12px', fontFamily: 'Inter,sans-serif', fontSize: 12, color: C.textMid, outline: 'none', fontStyle: 'italic', boxSizing: 'border-box' }} />
        </div>
      </Card>
      {confirmModal}
    </div>
  );
}

/* ─── BUDGET VIEW ───────────────────────────────────────── */
const BUDGET_CATS = ['Flights', 'Accommodation', 'Cruise', 'Activities', 'Food & Dining', 'Transfers', 'Insurance', 'Other'];

function BudgetView({ data, onUpdate }) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem('budget_unlocked') === '1'; } catch { return false; }
  });
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirm, confirmModal] = useConfirm();

  const tryUnlock = () => {
    if (pw === 'Sabrina26') {
      try { sessionStorage.setItem('budget_unlocked', '1'); } catch {}
      setUnlocked(true);
    } else {
      setPwErr(true);
      setPw('');
      setTimeout(() => setPwErr(false), 2500);
    }
  };

  if (!unlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 18, padding: '40px 16px' }}>
        <div style={{ fontSize: 52 }}>🔒</div>
        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 26, color: C.navy, fontWeight: 700 }}>Financial Details</div>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 14, color: C.textMid, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          This treasury is PRIVATE PROPERTY! 🏰 Enter the royal password or face the tournament.
        </div>
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwErr(false); }}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            placeholder="Speak, friend, and enter…"
            autoFocus
            style={{
              border: `1px solid ${pwErr ? C.red : C.ivoryDark}`,
              borderRadius: 8, padding: '12px 16px',
              fontFamily: 'Inter,sans-serif', fontSize: 14,
              background: C.white, color: C.text, outline: 'none',
              width: '100%', boxSizing: 'border-box', transition: 'border-color .2s',
            }}
          />
          {pwErr && (
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: C.red, textAlign: 'center' }}>
              Wrong password! Do you know the Muffin Man?!
            </div>
          )}
          <Btn variant="primary" onClick={tryUnlock} style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}>
            🔓 Open Sesame
          </Btn>
        </div>
      </div>
    );
  }

  const blank = { description: '', category: 'Other', paidBy: 'Split', felicia: '', alicyn: '', notes: '' };

  const save = (item) => {
    onUpdate(d => {
      const items = item.id ? d.budget.items.map(b => b.id === item.id ? item : b) : [...d.budget.items, { ...item, id: uid() }];
      return { ...d, budget: { ...d.budget, items }, lastUpdated: new Date().toISOString() };
    });
    setEditItem(null);
  };
  const del = async (id, desc) => {
    if (await confirm(`Delete "${desc}"?`))
      onUpdate(d => ({ ...d, budget: { ...d.budget, items: d.budget.items.filter(b => b.id !== id) }, lastUpdated: new Date().toISOString() }));
  };
  const setTotal = (field, val) => onUpdate(d => ({ ...d, budget: { ...d.budget, totals: { ...d.budget.totals, [field]: parseFloat(val) || 0 } }, lastUpdated: new Date().toISOString() }));

  const { totals, items } = data.budget;
  const grandTotal = (totals.felicia || 0) + (totals.alicyn || 0);
  const equalShare = grandTotal / 2;
  const diff = (totals.alicyn || 0) - equalShare;
  const settlement = diff > 0.005
    ? `Felicia owes Alicyn $${diff.toFixed(2)}`
    : diff < -0.005
    ? `Alicyn owes Felicia $${Math.abs(diff).toFixed(2)}`
    : 'All square! ✓';
  const feliciaPct = grandTotal ? ((totals.felicia || 0) / grandTotal * 100) : 50;

  // per-category subtotals from items that have dollar amounts
  const catTotals = BUDGET_CATS.map(cat => {
    const catItems = items.filter(it => (it.category || 'Other') === cat);
    const f = catItems.reduce((s, it) => s + (parseFloat(it.felicia) || 0), 0);
    const a = catItems.reduce((s, it) => s + (parseFloat(it.alicyn) || 0), 0);
    return { cat, f, a, total: f + a, count: catItems.length };
  }).filter(x => x.count > 0);

  return (
    <div>
      <SectionHead title="Royal Treasury" icon="💰" action={<Btn variant="primary" small onClick={() => setEditItem(blank)}>+ Add Item</Btn>} />

      {/* Totals cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 18 }}>
        {[{ label: 'Felicia Paid', key: 'felicia', color: C.terracotta }, { label: 'Alicyn Paid', key: 'alicyn', color: C.navy }].map(({ label, key, color }) => (
          <Card key={key} style={{ textAlign: 'center', padding: '18px 14px', borderTop: `4px solid ${color}` }}>
            <div style={{ fontSize: 11, color: C.textLight, fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 18, color, alignSelf: 'flex-start', marginTop: 3 }}>$</span>
              <input type="number" step="0.01" value={totals[key]} onChange={e => setTotal(key, e.target.value)}
                style={{ fontFamily: 'Inter,sans-serif', fontSize: 26, color, fontWeight: 700, border: 'none', background: 'transparent', width: 120, textAlign: 'center', outline: 'none' }} />
            </div>
          </Card>
        ))}
        <Card style={{ textAlign: 'center', padding: '18px 14px', borderTop: `4px solid ${C.gold}`, background: C.navy }}>
          <div style={{ fontSize: 11, color: C.goldL + 'AA', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Trip</div>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 26, color: C.goldL, fontWeight: 700 }}>${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </Card>
      </div>

      {/* Visual split + settlement */}
      <Card style={{ marginBottom: 22, padding: '16px 20px' }}>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.textLight, marginBottom: 8 }}>Who Paid What</div>
        <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${feliciaPct}%`, background: C.terracotta, transition: 'width .4s' }} />
          <div style={{ flex: 1, background: C.navy }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'Inter,sans-serif', color: C.textMid, marginBottom: 10 }}>
          <span style={{ color: C.terracotta, fontWeight: 600 }}>Felicia {feliciaPct.toFixed(1)}%</span>
          <span style={{ color: C.navy, fontWeight: 600 }}>Alicyn {(100 - feliciaPct).toFixed(1)}%</span>
        </div>
        <div style={{ borderTop: `1px solid ${C.ivoryDark}`, paddingTop: 10, fontFamily: 'Inter,sans-serif', fontSize: 13 }}>
          <span style={{ color: C.textMid }}>Equal split = ${equalShare.toFixed(2)} each — </span>
          <span style={{ color: diff > 0 ? C.terracotta : diff < 0 ? C.navy : C.green, fontWeight: 700 }}>{settlement}</span>
        </div>
      </Card>

      {/* Per-category subtotals */}
      {catTotals.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SubHead>By Category</SubHead>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 8 }}>
            {catTotals.map(({ cat, f, a, total }) => (
              <div key={cat} style={{ background: C.white, borderRadius: 4, padding: '10px 14px', border: `1px solid ${C.ivoryDark}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>{cat}</div>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 16, color: C.navy, fontWeight: 700 }}>${total.toFixed(2)}</div>
                {(f > 0 || a > 0) && (
                  <div style={{ fontSize: 11, color: C.textLight, fontFamily: 'Inter,sans-serif', marginTop: 2 }}>
                    {f > 0 && <span style={{ color: C.terracotta }}>F ${f.toFixed(0)} </span>}
                    {a > 0 && <span style={{ color: C.navyMid }}>A ${a.toFixed(0)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.ivoryDark}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter,sans-serif', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.navy }}>
              {['Description', 'Category', 'Paid By', 'Felicia $', 'Alicyn $', 'Notes', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: C.white, textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: .6, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? C.white : C.ivory }}>
                <td style={{ padding: '10px 14px', color: C.text }}>{item.description}</td>
                <td style={{ padding: '10px 14px', color: C.textMid, fontSize: 11, whiteSpace: 'nowrap' }}>{item.category || '—'}</td>
                <td style={{ padding: '10px 14px', color: C.textMid, whiteSpace: 'nowrap' }}>{item.paidBy}</td>
                <td style={{ padding: '10px 14px', color: C.terracotta, fontWeight: 600 }}>{item.felicia ? `$${parseFloat(item.felicia).toFixed(2)}` : '—'}</td>
                <td style={{ padding: '10px 14px', color: C.navy, fontWeight: 600 }}>{item.alicyn ? `$${parseFloat(item.alicyn).toFixed(2)}` : '—'}</td>
                <td style={{ padding: '10px 14px', color: C.textLight, fontStyle: 'italic', fontSize: 12 }}>{item.notes}</td>
                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                  <Btn small variant="ghost" onClick={() => setEditItem(item)} style={{ marginRight: 4 }}>Edit</Btn>
                  <Btn small variant="danger" onClick={() => del(item.id, item.description)}>Del</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editItem && <BudgetForm initial={editItem} onSave={save} onClose={() => setEditItem(null)} />}
      {confirmModal}
    </div>
  );
}

function BudgetForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const ch = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  return (
    <Modal title={initial.id ? 'Edit Budget Item' : 'Add Budget Item'} onClose={onClose}>
      <Field label="Description" name="description" value={form.description} onChange={ch} />
      <Field label="Category" name="category" value={form.category || 'Other'} onChange={ch} options={BUDGET_CATS} />
      <Field label="Paid By" name="paidBy" value={form.paidBy} onChange={ch} options={['Split', 'Felicia', 'Alicyn', 'Pay at location']} />
      <Field label="Felicia Amount ($)" name="felicia" value={form.felicia} onChange={ch} type="number" />
      <Field label="Alicyn Amount ($)" name="alicyn" value={form.alicyn} onChange={ch} type="number" />
      <Field label="Notes" name="notes" value={form.notes} onChange={ch} rows={2} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(form)}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ─── EMERGENCY VIEW ────────────────────────────────────── */
function EmergencyView({ data, onUpdate }) {
  const { numbers, consulates, travelers, allergyTranslations } = data.emergency;

  const updTraveler = (id, field, val) => onUpdate(d => ({
    ...d, lastUpdated: new Date().toISOString(),
    emergency: { ...d.emergency, travelers: d.emergency.travelers.map(t => t.id === id ? { ...t, [field]: val } : t) },
  }));
  const updAllergy = (id, field, val) => onUpdate(d => ({
    ...d, lastUpdated: new Date().toISOString(),
    emergency: { ...d.emergency, allergyTranslations: d.emergency.allergyTranslations.map(a => a.id === id ? { ...a, [field]: val } : a) },
  }));
  const addAllergy = () => onUpdate(d => ({
    ...d, lastUpdated: new Date().toISOString(),
    emergency: { ...d.emergency, allergyTranslations: [...d.emergency.allergyTranslations, { id: uid(), allergy: '', spanish: '', italian: '', french: '' }] },
  }));
  const delAllergy = (id) => onUpdate(d => ({
    ...d, lastUpdated: new Date().toISOString(),
    emergency: { ...d.emergency, allergyTranslations: d.emergency.allergyTranslations.filter(a => a.id !== id) },
  }));
  const updConsulate = (id, field, val) => onUpdate(d => ({
    ...d, lastUpdated: new Date().toISOString(),
    emergency: { ...d.emergency, consulates: d.emergency.consulates.map(c => c.id === id ? { ...c, [field]: val } : c) },
  }));

  const countryFlag = { Spain: '🇪🇸', Italy: '🇮🇹', France: '🇫🇷', All: '🌐' };

  return (
    <div>
      <SectionHead title="Far Far Away SOS" icon="🚨" />

      {/* Emergency Numbers */}
      <div style={{ marginBottom: 26 }}>
        <SubHead>Emergency Numbers</SubHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
          {numbers.map(n => (
            <div key={n.id} style={{
              background: n.country === 'All' ? C.navy : C.white,
              borderRadius: 4, padding: '12px 14px',
              border: `1px solid ${n.country === 'All' ? C.navy : C.ivoryDark}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>{countryFlag[n.country] || '🌐'}</span>
              <div>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 22, fontWeight: 700, color: n.country === 'All' ? C.goldL : C.red }}>{n.number}</div>
                <div style={{ fontSize: 11, fontFamily: 'Inter,sans-serif', color: n.country === 'All' ? C.ivoryMid : C.textMid }}>{n.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Traveler Info */}
      <div style={{ marginBottom: 26 }}>
        <SubHead>Ogre Profiles & Emergency Contacts</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {travelers.map(t => (
            <Card key={t.id}>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 16, color: C.navy, fontWeight: 600, marginBottom: 12 }}>🧳 {t.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                {[
                  ['Emergency Contact Name', 'contact'],
                  ['Emergency Contact Phone', 'contactPhone'],
                  ['Blood Type', 'bloodType'],
                  ['Allergies / Medical Notes', 'allergies'],
                  ['Insurance Policy #', 'insurance'],
                ].map(([label, field]) => (
                  <div key={field}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.textMid, fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</label>
                    <input value={t[field]} onChange={e => updTraveler(t.id, field, e.target.value)} placeholder="—"
                      style={{ width: '100%', boxSizing: 'border-box', marginTop: 3, border: `1px solid ${C.ivoryDark}`, borderRadius: 7, padding: '7px 10px', fontFamily: 'Inter,sans-serif', fontSize: 13, background: C.white, color: C.text, outline: 'none' }} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Consulates */}
      <div style={{ marginBottom: 26 }}>
        <SubHead>US Consulates Abroad</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {consulates.map(c => (
            <Card key={c.id} style={{ borderLeft: `4px solid ${C.gold}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{countryFlag[c.country] || '🌐'}</span>
                <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 15, color: C.navy, fontWeight: 600 }}>{c.name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Address', 'address'], ['Phone', 'phone']].map(([lbl, fld]) => (
                  <div key={fld}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.textMid, fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: .5 }}>{lbl}</label>
                    <input value={c[fld]} onChange={e => updConsulate(c.id, fld, e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', marginTop: 3, border: `1px solid ${C.ivoryDark}`, borderRadius: 7, padding: '6px 10px', fontFamily: 'Inter,sans-serif', fontSize: 12, background: C.white, color: C.text, outline: 'none' }} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Allergy Translations */}
      <div>
        <SubHead>Allergy / Medical Translations</SubHead>
        <div style={{ overflowX: 'auto', borderRadius: 6, border: `1px solid ${C.ivoryDark}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter,sans-serif', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.terracotta }}>
                {['Allergy / Condition', 'Spanish 🇪🇸', 'Italian 🇮🇹', 'French 🇫🇷', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: C.white, textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allergyTranslations.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? C.white : C.ivory }}>
                  {['allergy', 'spanish', 'italian', 'french'].map(f => (
                    <td key={f} style={{ padding: '6px 8px' }}>
                      <input value={a[f]} onChange={e => updAllergy(a.id, f, e.target.value)} placeholder="—"
                        style={{ width: '100%', border: `1px solid ${C.ivoryDark}`, borderRadius: 6, padding: '5px 8px', fontFamily: 'Inter,sans-serif', fontSize: 13, background: 'transparent', color: C.text, outline: 'none' }} />
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px' }}>
                    <button onClick={() => delAllergy(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, fontSize: 18 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Btn variant="ghost" small style={{ marginTop: 10 }} onClick={addAllergy}>+ Add Row</Btn>
      </div>
    </div>
  );
}

/* ─── NAVIGATION ────────────────────────────────────────── */
const TABS = [
  { id: 'itinerary',  label: 'The Quest',      icon: '🗺️' },
  { id: 'flights',    label: "Dragon's Wings",  icon: '🐉' },
  { id: 'hotels',     label: 'Swamp Stays',     icon: '🌿' },
  { id: 'dining',     label: 'Swamp Grub',      icon: '🍽️' },
  { id: 'packing',    label: "Donkey's Packing List", icon: '🧳' },
  { id: 'todos',      label: "Ogre To-Do's",      icon: '📋' },
  { id: 'budget',     label: 'Royal Treasury',  icon: '💰' },
  { id: 'emergency',  label: 'Far Far Away SOS',icon: '🚨' },
];

/* ─── ROOT APP ──────────────────────────────────────────── */
const BOTTOM_TABS = [
  { id: 'itinerary', label: 'Quest',   icon: '🗺️' },
  { id: 'flights',   label: 'Dragon',  icon: '🐉' },
  { id: 'hotels',    label: 'Swamp',   icon: '🌿' },
  { id: 'packing',   label: 'Donkey',  icon: '🧳' },
  { id: 'budget',    label: 'Gold',    icon: '💰' },
];

export default function App() {
  const [data, setData] = useSharedStorage('girlstrip2026_v1', INIT);
  const [tab, setTab] = useState('itinerary');
  const isMobile = useIsMobile();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = FONT_URL;
    document.head.appendChild(link);

    const meta = document.createElement('meta');
    meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1';
    document.head.appendChild(meta);

    document.body.style.margin = '0';
    document.body.style.background = C.ivory;
    document.body.style.fontFamily = 'Inter,sans-serif';

    const printStyle = document.createElement('style');
    printStyle.id = 'print-css';
    printStyle.textContent = `@media print { [data-noprint] { display:none !important; } body { background:#fff !important; } * { box-shadow:none !important; } }`;
    document.head.appendChild(printStyle);

    return () => {
      try { document.head.removeChild(link); } catch {}
      try { document.head.removeChild(printStyle); } catch {}
    };
  }, []);

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: C.ivory, gap: 16 }}>
        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 28, color: C.navy, fontWeight: 700, letterSpacing: '0.3px' }}>Far Far Away Girls Trip 🌿</div>
        <div style={{ fontFamily: 'Inter,sans-serif', color: C.textLight, fontSize: 14 }}>Waking up the Donkey…</div>
        <div style={{ width: 48, height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${C.terracotta}, ${C.gold})`, animation: 'pulse 1.2s ease-in-out infinite' }} />
        <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
      </div>
    );
  }

  const lu = data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;

  // Countdown
  const now = new Date();
  const departure  = new Date('2026-06-15T00:00:00');
  const tripEnd    = new Date('2026-06-28T23:59:59');
  const msDay      = 86400000;
  const daysUntil  = Math.ceil((departure - now) / msDay);
  const dayInTrip  = now >= departure && now <= tripEnd ? Math.floor((now - departure) / msDay) + 1 : null;
  const todayStr   = now.toISOString().split('T')[0];
  const todayDay   = data.days?.find(d => d.date === todayStr);
  let countdownBg  = C.terracottaD + 'CC';
  let countdownMsg = null;
  if (daysUntil > 0) {
    countdownMsg = `🌿  T-${daysUntil} day${daysUntil !== 1 ? 's' : ''} until we're FAR FAR AWAY — better start packing, Donkey!`;
  } else if (dayInTrip) {
    countdownMsg = `🐉  Day ${dayInTrip} of 14 — ${todayDay ? todayDay.location : 'somewhere over the rainbow'}`;
    countdownBg  = C.green + 'CC';
  } else if (now > tripEnd) {
    countdownMsg = `🏠  Back in the swamp! What a fairytale adventure.`;
    countdownBg  = C.navyMid + 'CC';
  }

  return (
    <div style={{ minHeight: '100vh', background: C.ivory }}>
      {!configured && (
        <div data-noprint style={{ background: C.gold, color: C.navy, padding: '8px 20px', fontFamily: 'Inter,sans-serif', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>
          ⚠️ Running in swamp mode — changes are only saved on this device. This is the part where you add Firebase.
        </div>
      )}

      {/* ── HEADER ── */}
      <header data-noprint style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, #1A3C08 60%, ${C.navyMid} 100%)`,
        position: 'sticky', top: 0, zIndex: 200,
        borderBottom: `1px solid rgba(255,255,255,.06)`,
        boxShadow: '0 4px 32px rgba(13,27,42,.35)',
      }}>
        <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 24, color: C.white, fontWeight: 700, letterSpacing: '0.3px', lineHeight: 1.15 }}>
              Far Far Away Girls Trip 🌿
            </div>
            <div style={{ fontSize: 12, color: C.goldL, fontFamily: 'Inter,sans-serif', marginTop: 4, letterSpacing: '0.5px' }}>
              Ogres have layers. So do our travel plans. &nbsp;—&nbsp; {data.meta.dates}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 3 }}>
              {data.meta.travelers.map(t => (
                <span key={t} style={{ fontSize: 10, background: C.gold + '28', color: C.goldL, borderRadius: 3, padding: '2px 8px', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
                  {t.split(' ')[0]}
                </span>
              ))}
            </div>
            {lu && <div style={{ fontSize: 10, color: C.white + '66', fontFamily: 'Inter,sans-serif' }}>{configured ? '🌿 synced' : '💾 saved'} {lu}</div>}
          </div>
        </div>

        {/* Tab bar — hidden on mobile (use bottom nav instead) */}
        {!isMobile && (
          <div style={{ display: 'flex', overflowX: 'auto', padding: '8px 10px 6px', scrollbarWidth: 'none', gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? `rgba(107,154,42,.22)` : 'transparent',
                border: `1px solid ${tab === t.id ? `rgba(107,154,42,.5)` : 'transparent'}`,
                borderRadius: 999, cursor: 'pointer',
                padding: '6px 14px', fontSize: 12, fontFamily: 'Inter,sans-serif', fontWeight: 600,
                color: tab === t.id ? C.goldL : C.white + 'AA',
                whiteSpace: 'nowrap', transition: 'all .2s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: `28px 16px ${isMobile ? '90px' : '80px'}` }}>
        {tab === 'itinerary' && <DailyView        data={data} onUpdate={setData} />}
        {tab === 'flights'   && <FlightsView      data={data} onUpdate={setData} />}
        {tab === 'hotels'    && <HotelsView        data={data} onUpdate={setData} />}
        {tab === 'dining'    && <RestaurantsView   data={data} onUpdate={setData} />}
        {tab === 'packing'   && <PackingView       data={data} onUpdate={setData} />}
        {tab === 'todos'     && <TodoView          data={data} onUpdate={setData} />}
        {tab === 'budget'    && <BudgetView        data={data} onUpdate={setData} />}
        {tab === 'emergency' && <EmergencyView     data={data} onUpdate={setData} />}
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile ? (
        <nav data-noprint style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
          background: C.white, borderTop: `1px solid ${C.ivoryDark}`,
          boxShadow: '0 -4px 20px rgba(28,45,80,.12)',
          display: 'flex', justifyContent: 'space-around', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {BOTTOM_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 4px 6px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2, transition: 'all .15s',
            }}>
              <div style={{
                width: 44, height: 32, borderRadius: 999,
                background: tab === t.id ? C.terracotta + '20' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s',
              }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
              </div>
              <span style={{ fontSize: 9, fontFamily: 'Inter,sans-serif', fontWeight: 700, color: tab === t.id ? C.terracotta : C.textLight, textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.label}</span>
            </button>
          ))}
          {/* More button cycles: dining → todos → emergency */}
          {(() => {
            const moreActive = tab === 'dining' || tab === 'todos' || tab === 'emergency';
            const moreIcon  = tab === 'emergency' ? '🚨' : tab === 'todos' ? '✅' : '🍽️';
            const moreLabel = tab === 'emergency' ? 'SOS' : tab === 'todos' ? 'Orders' : 'Grub';
            const nextTab   = tab === 'dining' ? 'todos' : tab === 'todos' ? 'emergency' : 'dining';
            return (
              <button onClick={() => setTab(nextTab)} style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 4px 6px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, transition: 'all .15s',
              }}>
                <div style={{
                  width: 44, height: 32, borderRadius: 999,
                  background: moreActive ? C.terracotta + '20' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s',
                }}>
                  <span style={{ fontSize: 20 }}>{moreIcon}</span>
                </div>
                <span style={{ fontSize: 9, fontFamily: 'Inter,sans-serif', fontWeight: 700, color: moreActive ? C.terracotta : C.textLight, textTransform: 'uppercase', letterSpacing: '.5px' }}>{moreLabel}</span>
              </button>
            );
          })()}
        </nav>
      ) : (
        <div data-noprint style={{ height: 4, background: `linear-gradient(90deg, ${C.terracotta}, ${C.gold}, ${C.navyMid})`, position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }} />
      )}
    </div>
  );
}
