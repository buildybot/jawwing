const ADMIN_KEY = process.env.ADMIN_API_KEY; // Set ADMIN_API_KEY env var
const BASE_URL = "https://www.jawwing.com/api/v1/admin/posts";

const posts = [
  // DC Metro (20 posts) - scattered coords
  { content: "genuinely cannot tell if the smell on the orange line is always this bad or if today is special", lat: 38.8975, lng: -77.0269 },
  { content: "my landlord just raised my rent $300 and had the nerve to say it comes with 'upgraded amenities'. the amenities are the same. there are no new amenities.", lat: 38.9172, lng: -77.0432 },
  { content: "whoever decided to schedule roadwork on 66 AND 395 at the same time should have to explain themselves to every DC commuter in person", lat: 38.8891, lng: -77.0734 },
  { content: "the cherry blossom tourists found my coffee shop. gonna have to find a new coffee shop", lat: 38.9052, lng: -77.0366 },
  { content: "dating in dc tip: if someone's bio says 'policy wonk' just swipe left. save yourself", lat: 38.9112, lng: -77.0198 },
  { content: "ok who left their think tank tote bag on the metro seat. it's blocking an entire bench. u and the tote bag need to move", lat: 38.8853, lng: -77.0051 },
  { content: "the line at founding farmers on a saturday is a test of character that most ppl fail including me", lat: 38.9001, lng: -77.0456 },
  { content: "just found out my coworker has worked from home for 3 years and still hasnt figured out mute. 3 years", lat: 38.9234, lng: -77.0289 },
  { content: "ngl the new trader joes parking situation in columbia heights is giving me actual anxiety. like i will drive past it 4 times before giving up", lat: 38.9278, lng: -77.0267 },
  { content: "if one more person tells me NoMa is 'up and coming' i am going to lose my entire mind. its been up and coming for 10 years", lat: 38.9089, lng: -77.0021 },
  { content: "there is a guy in my building who plays acoustic guitar every sunday morning at 8am. i have never hated anything more", lat: 38.8912, lng: -77.0589 },
  { content: "dc brunch culture is just standing in line for 45 min to wait for another 45 min to spend $80 on eggs. and i do it every weekend like a fool", lat: 38.9167, lng: -77.0612 },
  { content: "the metro app said 'good service' this morning. the metro itself said otherwise. one of them is lying", lat: 38.8993, lng: -76.9987 },
  { content: "hot take: the best government buildings in dc are definitely brutalist and nobody wants to hear it but its true", lat: 38.8934, lng: -77.0316 },
  { content: "just saw a guy in a full suit biking down pennsylvania with a briefcase strapped to his back. peak dc. iconic. salute to him", lat: 38.8950, lng: -77.0281 },
  { content: "why is every bar in adams morgan packed at 9pm on a tuesday. do none of you have 8am meetings. do you work for the government bc that tracks", lat: 38.9215, lng: -77.0432 },
  { content: "the amount of people who have told me they 'just moved here for a 2 year position' and then stayed 15 years... this city is a trap lol", lat: 38.9076, lng: -77.0551 },
  { content: "it rained for exactly 4 minutes today and someone on my team said they couldn't come in bc of 'weather'. ok bestie", lat: 38.9021, lng: -77.0122 },
  { content: "ive lived here 6 years and still have no idea what anacostia actually looks like. anyone been? is it nice?", lat: 38.8667, lng: -76.9951 },
  { content: "the entire concept of 'happy hour' in dc ends at 7pm which is before most of us leave work. truly a broken system", lat: 38.9098, lng: -77.0399 },

  // New York (10 posts)
  { content: "my bodega charged me $5 for a sparkling water and i said thank you and have a nice day. who am i", lat: 40.7282, lng: -73.9942 },
  { content: "the G train exists purely to humble us. reminder that it is not running this weekend or next weekend or probably ever again", lat: 40.7195, lng: -73.9441 },
  { content: "rent went up again. landlord said its the market. the market is broken. anyway im making rice for dinner again", lat: 40.7489, lng: -73.9680 },
  { content: "saw someone reading a physical book on the A train. stood and stared until they looked up. gave them a thumbs up. meant it", lat: 40.7527, lng: -74.0021 },
  { content: "the pizza at the spot on my block went up to $4.50 a slice. this is not a drill. this is a crisis", lat: 40.7614, lng: -73.9776 },
  { content: "hot take: times square is actually less bad than it was 5 years ago and im tired of pretending otherwise. the m&ms store rules", lat: 40.7580, lng: -73.9855 },
  { content: "some guy on the 6 just clipped his nails. full set. all ten. we all just sat there. what do you even do", lat: 40.7551, lng: -73.9707 },
  { content: "if you move to williamsburg and complain about the noise from the music venues that have been there since before you moved in i will not help you", lat: 40.7135, lng: -73.9595 },
  { content: "been here 8 years and i still tear up a little crossing the brooklyn bridge on a clear day. dont tell anyone", lat: 40.7061, lng: -73.9969 },
  { content: "question: is it weird to tip the same person at my deli every day for 2 years and still not know their name. asking for myself. its me", lat: 40.7389, lng: -74.0020 },

  // Austin (10 posts)
  { content: "been on 35 for 55 minutes. im 4 miles from my house. this is fine. everything is fine here", lat: 30.2619, lng: -97.7489 },
  { content: "another rooftop bar opened downtown. the 47th one. finally, austin has enough rooftop bars. jk we're getting 12 more this year", lat: 30.2672, lng: -97.7431 },
  { content: "the tech guy at the coffee shop next to me just said he's building 'uber for dogs' and he seemed serious. this city", lat: 30.2985, lng: -97.7391 },
  { content: "it was 82 degrees in february. not complaining just... is this normal now? do we just accept this?", lat: 30.2551, lng: -97.7562 },
  { content: "shoutout to the food trucks on south congress. i had breakfast tacos at 7am and it genuinely saved my life today", lat: 30.2493, lng: -97.7502 },
  { content: "the amount of california license plates on my street has officially surpassed texas plates. not mad just observing", lat: 30.2814, lng: -97.7601 },
  { content: "barton springs opens next week and the line is already forming. respect the dedication", lat: 30.2644, lng: -97.7718 },
  { content: "tried to go to a show at stubb's last night and the ticket was $85. for a band i had never heard of. kept it moving", lat: 30.2673, lng: -97.7377 },
  { content: "my landlord just called my apartment 'centrally located and walkable'. it is on the edge of town and there is nowhere to walk to. cool cool", lat: 30.2732, lng: -97.7289 },
  { content: "nobody prepared me for how serious austinites are about their BBQ opinions. like i just said brisket was fine and three guys turned around", lat: 30.2612, lng: -97.7445 },
];

let dcCount = 0, nyCount = 0, austinCount = 0, failed = 0;

for (const post of posts) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY,
    },
    body: JSON.stringify({ content: post.content, lat: post.lat, lng: post.lng }),
  });
  const data = await res.json();
  const snippet = post.content.slice(0, 50);
  
  if (res.ok && (data.success || data.post || data.id)) {
    const id = data.post?.id || data.id || "ok";
    if (post.lat > 38 && post.lat < 40) { dcCount++; console.log(`✅ DC [${id}] ${snippet}...`); }
    else if (post.lat > 40) { nyCount++; console.log(`✅ NY [${id}] ${snippet}...`); }
    else { austinCount++; console.log(`✅ ATX [${id}] ${snippet}...`); }
  } else {
    failed++;
    console.log(`❌ FAILED (${res.status}): ${snippet}...`);
    console.log("   Response:", JSON.stringify(data).slice(0, 200));
  }
  // small delay to be nice to the server
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n══ SEEDING COMPLETE ══`);
console.log(`DC Metro: ${dcCount}/20`);
console.log(`New York: ${nyCount}/10`);
console.log(`Austin:   ${austinCount}/10`);
console.log(`Failed:   ${failed}`);
