#!/usr/bin/env node
/**
 * Scout seeding script — creates posts via admin API
 * Usage: node seed-posts.mjs <metro> <count>
 * Example: node seed-posts.mjs dc 10
 */

const ADMIN_KEY = "***REDACTED_ADMIN_KEY***";
const BASE = "https://www.jawwing.com";

const METROS = {
  dc: { lat: 38.9072, lng: -77.0369, name: "DC Metro" },
  nyc: { lat: 40.7128, lng: -74.0060, name: "New York" },
  boston: { lat: 42.3601, lng: -71.0589, name: "Boston" },
  chicago: { lat: 41.8781, lng: -87.6298, name: "Chicago" },
  la: { lat: 34.0522, lng: -118.2437, name: "Los Angeles" },
  austin: { lat: 30.2672, lng: -97.7431, name: "Austin" },
  nashville: { lat: 36.1627, lng: -86.7816, name: "Nashville" },
  miami: { lat: 25.7617, lng: -80.1918, name: "Miami" },
  atlanta: { lat: 33.7490, lng: -84.3880, name: "Atlanta" },
  denver: { lat: 39.7392, lng: -104.9903, name: "Denver" },
  seattle: { lat: 47.6062, lng: -122.3321, name: "Seattle" },
  sf: { lat: 37.7749, lng: -122.4194, name: "San Francisco" },
};

function jitter(val, range = 0.05) {
  return val + (Math.random() - 0.5) * range * 2;
}

async function seedPost(metro, content) {
  const m = METROS[metro];
  if (!m) throw new Error(`Unknown metro: ${metro}`);
  
  const res = await fetch(`${BASE}/api/v1/admin/posts`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY 
    },
    body: JSON.stringify({
      content,
      lat: jitter(m.lat),
      lng: jitter(m.lng),
    }),
  });
  
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${content.slice(0, 50)}... — ${data.error}`);
    return null;
  }
  console.log(`  ✓ [${m.name}] ${content.slice(0, 60)}...`);
  return data.post;
}

// If run directly with args
const metro = process.argv[2];
const content = process.argv.slice(3).join(" ");
if (metro && content) {
  seedPost(metro, content).then(() => process.exit(0));
}

export { seedPost, METROS, jitter };
