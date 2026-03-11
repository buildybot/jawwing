// seed-images.mjs — upload city images to Vercel Blob and create posts

const ADMIN_KEY = "jaw_admin_s3cr3t_k3y_2026";
const BASE = "https://www.jawwing.com/api/v1/admin";

const cities = [
  {
    name: "NYC",
    lat: 40.7128, lng: -74.0060,
    images: [
      { id: "photo-1534430480872-3498386e7856", label: "nyc-skyline" },
      { id: "photo-1496442226666-8d4d0e62e6e9", label: "nyc-street" },
      { id: "photo-1522083165195-3424ed129620", label: "nyc-subway" },
      { id: "photo-1485871981521-5b1fd3805eee", label: "nyc-times-square" },
      { id: "photo-1546436836-07a91091f160", label: "nyc-central-park" },
      { id: "photo-1551782450-a2132b4ba21d", label: "nyc-pizza" },
    ],
    captions: [
      "this city man 🗽",
      "caught this on my walk home",
      "no filter needed",
      "NYC never sleeps and neither do i",
      "🌿",
      "dollar slice szn",
    ],
  },
  {
    name: "LA",
    lat: 34.0522, lng: -118.2437,
    images: [
      { id: "photo-1534430480872-3498386e7856", label: "la-sunset" },  // reuse good sunset
      { id: "photo-1507525428034-b723cf961d3e", label: "la-beach" },
      { id: "photo-1495562569060-2eec283d3618", label: "la-palm-trees" },
      { id: "photo-1598300042247-d088f8ab3a91", label: "la-highway" },
      { id: "photo-1580655653885-65763b2597d0", label: "la-hollywood" },
    ],
    captions: [
      "another day in paradise ☀️",
      "pain. (traffic at 2pm)",
      "tell me this isnt the best view",
      "beach check ✅",
      "🌴🌴🌴",
    ],
  },
  {
    name: "Chicago",
    lat: 41.8781, lng: -87.6298,
    images: [
      { id: "photo-1477959858617-67f85cf4f1df", label: "chi-skyline" },
      { id: "photo-1486325212027-8081e485255e", label: "chi-bean" },
      { id: "photo-1541963463532-d68292c34b19", label: "chi-pizza" },
      { id: "photo-1480714378408-67cf0d13bc1b", label: "chi-street" },
      { id: "photo-1507003211169-0a1dd7228f2d", label: "chi-lakefront" },
    ],
    captions: [
      "the bean said hi 🫘",
      "lakefront views hitting different rn",
      "deep dish > thin crust change my mind",
      "windy city living up to its name",
      "💙",
    ],
  },
  {
    name: "Houston",
    lat: 29.7604, lng: -95.3698,
    images: [
      { id: "photo-1501785888041-af3ef285b470", label: "hou-downtown" },
      { id: "photo-1565299624946-b28f40a0ae38", label: "hou-bbq" },
      { id: "photo-1517732306149-e8f829eb588a", label: "hou-highway" },
      { id: "photo-1519046904884-53103b34b206", label: "hou-area" },
    ],
    captions: [
      "H-Town doing what it does 🤘",
      "brisket szn never ends",
      "pain. (flood edition)",
      "yall seeing this rn??",
    ],
  },
  {
    name: "Phoenix",
    lat: 33.4484, lng: -112.0740,
    images: [
      { id: "photo-1558618666-fcd25c85cd64", label: "phx-desert" },
      { id: "photo-1542401886-65d6c61db217", label: "phx-cactus" },
      { id: "photo-1506905925346-21bda4d32df4", label: "phx-sunset" },
      { id: "photo-1544551763-46a013bb70d5", label: "phx-pool" },
    ],
    captions: [
      "115°F and we're thriving 🌵",
      "desert sunset goes hard ngl",
      "pool time all year round 💦",
      "no filter needed (ever)",
    ],
  },
  {
    name: "Philly",
    lat: 39.9526, lng: -75.1652,
    images: [
      { id: "photo-1569982175971-d92b01cf7694", label: "phi-streets" },
      { id: "photo-1565958011703-44f9829ba187", label: "phi-cheesesteak" },
      { id: "photo-1517732306149-e8f829eb588a", label: "phi-downtown" },
      { id: "photo-1480714378408-67cf0d13bc1b", label: "phi-oldcity" },
    ],
    captions: [
      "Rocky steps energy 💪",
      "Wit whiz, always",
      "old city vibes tonight",
      "SEPTA said no",
    ],
  },
  {
    name: "SF",
    lat: 37.7749, lng: -122.4194,
    images: [
      { id: "photo-1449034446853-66c86144b0ad", label: "sf-goldengate" },
      { id: "photo-1501594907352-04cda38ebc29", label: "sf-hills" },
      { id: "photo-1506146332389-18140dc7b2fb", label: "sf-fog" },
      { id: "photo-1534430480872-3498386e7856", label: "sf-bay" },
      { id: "photo-1558618666-fcd25c85cd64", label: "sf-cable" },
    ],
    captions: [
      "Karl the fog said gm",
      "60° in July and I'm okay with it",
      "the hills are NOT a vibe at 7am",
      "golden gate different at sunrise",
      "🌁",
    ],
  },
  {
    name: "Atlanta",
    lat: 33.7490, lng: -84.3880,
    images: [
      { id: "photo-1575917649705-5b59aaa12e6b", label: "atl-skyline" },
      { id: "photo-1565299624946-b28f40a0ae38", label: "atl-wafflehouse" },
      { id: "photo-1517732306149-e8f829eb588a", label: "atl-peachtree" },
      { id: "photo-1496442226666-8d4d0e62e6e9", label: "atl-streets" },
    ],
    captions: [
      "Waffle House at 3am hits different",
      "ATL traffic is just the vibe now",
      "Peachtree St looking clean rn",
      "🍑",
    ],
  },
  {
    name: "Boston",
    lat: 42.3601, lng: -71.0589,
    images: [
      { id: "photo-1534430480872-3498386e7856", label: "bos-skyline" },
      { id: "photo-1480714378408-67cf0d13bc1b", label: "bos-harbor" },
      { id: "photo-1517732306149-e8f829eb588a", label: "bos-brownstone" },
      { id: "photo-1551782450-a2132b4ba21d", label: "bos-fenway" },
    ],
    captions: [
      "Dunkin run number 3 today",
      "harbor walk > everything",
      "brownstone szn 🍂",
      "Fenway energy ⚾",
    ],
  },
  {
    name: "Miami",
    lat: 25.7617, lng: -80.1918,
    images: [
      { id: "photo-1507525428034-b723cf961d3e", label: "mia-beach" },
      { id: "photo-1519046904884-53103b34b206", label: "mia-ocean" },
      { id: "photo-1558618666-fcd25c85cd64", label: "mia-artdeco" },
      { id: "photo-1534430480872-3498386e7856", label: "mia-sunset" },
      { id: "photo-1551782450-a2132b4ba21d", label: "mia-coffee" },
    ],
    captions: [
      "South Beach never misses",
      "colada from the ventanita 🇨🇺",
      "Art Deco buildings slap",
      "this sunset is unreal",
      "🌊",
    ],
  },
];

async function uploadImage(url, filename) {
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY,
    },
    body: JSON.stringify({ url, filename }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.status);
  return data.url;
}

async function createPost({ content, lat, lng, image_url, image_width = 800, image_height = 533 }) {
  const res = await fetch(`${BASE}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY,
    },
    body: JSON.stringify({ content, lat, lng, image_url, image_width, image_height }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.status);
  return data;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let blobCount = 0;
let directCount = 0;
let postCount = 0;
const errors = [];

for (const city of cities) {
  console.log(`\n--- ${city.name} ---`);
  
  for (let i = 0; i < city.images.length; i++) {
    const img = city.images[i];
    const unsplashUrl = `https://images.unsplash.com/${img.id}?w=800&q=80`;
    const caption = city.captions[i] ?? "📍";
    
    let imageUrl;
    try {
      imageUrl = await uploadImage(unsplashUrl, `${img.label}.jpg`);
      blobCount++;
      console.log(`  ✅ Blob: ${img.label}`);
    } catch (e) {
      imageUrl = unsplashUrl;
      directCount++;
      console.log(`  ⚠️  Direct (upload failed: ${e.message}): ${img.label}`);
    }
    
    try {
      await createPost({
        content: caption,
        lat: city.lat + (Math.random() - 0.5) * 0.05,
        lng: city.lng + (Math.random() - 0.5) * 0.05,
        image_url: imageUrl,
        image_width: 800,
        image_height: 533,
      });
      postCount++;
      console.log(`  📝 Post created: "${caption}"`);
    } catch (e) {
      errors.push(`${city.name}/${img.label}: ${e.message}`);
      console.log(`  ❌ Post failed: ${e.message}`);
    }
    
    await sleep(500); // be nice to the API
  }
}

console.log(`\n========= SUMMARY =========`);
console.log(`Images → Vercel Blob: ${blobCount}`);
console.log(`Images → Unsplash direct: ${directCount}`);
console.log(`Posts created: ${postCount}`);
if (errors.length) {
  console.log(`Errors (${errors.length}):`);
  errors.forEach(e => console.log(`  - ${e}`));
}
