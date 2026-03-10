import { createClient } from '/Users/buildy/.openclaw/workspace/jawwing/node_modules/@libsql/client/lib-cjs/node.js';
import { latLngToCell } from '/Users/buildy/.openclaw/workspace/jawwing/node_modules/h3-js/dist/h3-js.es.js';
import { randomUUID, randomBytes } from 'crypto';

const client = createClient({
  url: 'libsql://jawwing-buildybot.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzMxNjc1MDYsImlkIjoiMDE5Y2Q5MDQtNzMwMS03NWRhLWFlMDktYjhjYzQ0NDJiNTE1IiwicmlkIjoiYzQ1YWYwZTEtMTYzMC00NmJlLThmZTUtN2NjNzE1OTc1OThjIn0.5qm4jqRaBSMAk5VOmFiMtGIsZjQwBpbujihN_YGSauj5R6NvzQoC9obaNPxHxPVXlg2Acm3p6ltH05ez1q7eAg',
});

const now = Math.floor(Date.now() / 1000);
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));

const cities = [
  {
    name: 'NEW YORK',
    lat: 40.7128, lng: -74.0060,
    posts: [
      "the L train is just a social experiment at this point",
      "someone is eating a full shawarma wrap on the subway car rn. like a full one. respect.",
      "why does every bodega in bushwick have a cat but the cats never wanna be petted",
      "the 6 train smell today was a 10/10 would not recommend",
      "nah the halal cart on 53rd and 6th just saved my life again",
      "williamsburg gentrification update: they replaced the laundromat with a $22 smoothie place",
      "if you walk slowly on the sidewalk in midtown you deserve everything that happens to you",
      "the hudson yards vessel is genuinely one of the ugliest things ive ever seen and i live here",
      "no bc why is a studio in astoria 3200 a month now. ASTORIA.",
      "some guy on the A train just started doing pushups between the seats. valid.",
      "the rats by canal street are getting bolder. one looked me in the eye today.",
      "central park joggers at 6am have a different energy. unhinged. love it.",
      "just waited 25 minutes for the Q and then two came at the same time. classic.",
      "the bagel situation at h&h on broadway is still elite. everything bagel w scallion cream cheese no notes",
      "why is there a film crew on my block AGAIN i cannot leave my apartment",
      "inwood feels like a different city and i mean that as a compliment",
      "the PATH train to hoboken costs more than my dignity at this point",
      "someone left a full couch on the corner of graham and metropolitan. moving day szn.",
      "the line outside katz's deli is genuinely longer than my will to live on a sunday",
      "doing the brooklyn bridge walk is a rite of passage but tourists stop every 3 feet i am going insane",
    ]
  },
  {
    name: 'LOS ANGELES',
    lat: 34.0522, lng: -118.2437,
    posts: [
      "IF ONE MORE PERSON CUTS ME OFF ON THE 405 I AM MOVING TO OREGON",
      "the coffee at alfred on melrose is good but is it $9 good. no. absolutely not.",
      "traffic on the 10 east at 2pm on a tuesday. why. WHY.",
      "venice beach drum circle is still going. it never stopped. it never will.",
      "just saw someone doing a photoshoot in front of the pink wall on melrose. its 8am.",
      "the farmers market at the grove is a trap for tourists and i love it for that",
      "no bc why does it cost $40 to park in dtla. i will walk 17 blocks i do not care",
      "the In-N-Out on sunset is spiritual. animal style is not optional it is mandatory.",
      "silver lake reservoir walk hits different when the smog clears. rare event.",
      "someone in my building is learning guitar. we're on month 4 of wonderwall.",
      "koreatown for late night food is the correct answer always has been",
      "the metro purple line extension is not done yet. it will never be done. its a myth.",
      "highland park is unrecognizable from 5 years ago and not in a good way rent-wise",
      "coyote on my street in los feliz again. third one this week. they own this city.",
      "why is everyone in larchmont wearing the same exact outfit. hive mind.",
      "the 101 freeway is a parking lot with extra steps at this hour",
      "grand central market downtown is still the move. the egg slut line is not worth it tho",
      "malibu fires smoke smell is back again lowkey",
      "nah the taco truck on figueroa is undefeated. been going since 2019.",
      "doing pilates in los angeles is basically a personality now. i am a victim of this.",
    ]
  },
  {
    name: 'CHICAGO',
    lat: 41.8781, lng: -87.6298,
    posts: [
      "the wind off lake michigan today actually moved me sideways. sideways.",
      "deep dish is for tourists. tavern style. i will die on this hill.",
      "red line at addison after a cubs game is genuinely hell on earth and i respect it",
      "why is it 70 degrees on monday and snowing thursday. this city is chaos.",
      "giordano's vs lou malnati's discourse is tired. portillo's hot dog or go home.",
      "the bean is called cloud gate and i will not be taking questions",
      "pilsen murals are the best public art in the city fight me",
      "wicker park lost its edge but the hot dog stands are eternal",
      "lake shore drive at golden hour literally makes you forget the city has problems",
      "someone on the blue line to o'hare just clipped their nails. full nail clipping.",
      "the chicago style pizza debate is keeping me up at night and i dont even live here",
      "no bc why is a two flat in logan square 800k now. LOGAN SQUARE.",
      "absolutely ripping winds on michigan avenue today. lost my hat near millennium park.",
      "the chicago riverwalk in spring is undefeated. one of those facts.",
      "whole foods on kingsbury is where wicker park people go to feel things",
      "browns line going north is always just vibes. nobody's in a rush.",
      "the garfield park conservatory is free and gorgeous and nobody talks about it enough",
      "bucktown brunch wait time is 2 hours minimum. we do this to ourselves.",
      "navy pier is a trap but the fireworks on friday night still slap lowkey",
      "the el rattling past my wicker park apartment at 2am is actually comforting at this point",
    ]
  },
  {
    name: 'HOUSTON',
    lat: 29.7604, lng: -95.3698,
    posts: [
      "the humidity today is personal. it attacked me.",
      "montrose bbq debate: truth bbq vs killen's. both correct. that's the answer.",
      "why is everyone in houston driving a lifted truck. where are yall going.",
      "the galleria traffic on a saturday is a spiritual test i keep failing",
      "just saw an alligator in the bayou off memorial drive. tuesday.",
      "no bc why does houston have no zoning laws but also the best food city in america. chaos works.",
      "flooding on 610 again. it rained for 20 minutes. this is fine.",
      "the museum district on a weekday is genuinely peaceful. best kept secret.",
      "someone is grilling outside at 10am in the heights. the smell is making me lose it.",
      "the houston rodeo is the one week a year everyone becomes a cowboy and i support it",
      "central market on westheimer is where you go when you have money and feelings",
      "the beltway 8 will humble you every single day without fail",
      "discovered a new taqueria on richmond ave. life is good.",
      "houston weather forecast: 95 and humid with a 40% chance of existential flooding",
      "midtown on a friday night is unhinged in the best way. save yourselves.",
      "nobody in houston jaywalks because the roads are designed to kill pedestrians specifically",
      "the nasa space center tour lowkey went hard. did not expect that.",
      "whole foods river oaks is a different socioeconomic universe and i was not prepared",
      "the trees in memorial park after rain smell incredible. one good thing.",
      "H-E-B on shepherd is a religious experience and i will hear no arguments",
    ]
  },
  {
    name: 'PHOENIX',
    lat: 33.4484, lng: -112.0740,
    posts: [
      "115 degrees and someone is out here mowing their lawn. legend.",
      "the car door handle this morning genuinely burned me. BURNED me.",
      "scottsdale old town on a saturday is a different species of human",
      "why does everyone move here from california and then complain about the heat",
      "the sunsets in arizona are the only reason i havent left tbh",
      "tempe town lake kayaking sounds cute until you remember it's 108 outside",
      "the I-10 construction has been going for 7 years. it will never end.",
      "found a scorpion in my shoe this morning. totally normal tuesday.",
      "the saguaros along south mountain are genuinely majestic and i forget that living here",
      "downtown phoenix food scene has exploded in the last 3 years. finally.",
      "camelback mountain hikers at 6am are either disciplined or insane. no in between.",
      "no bc why does arizona have the best mexican food outside of mexico. blessed.",
      "the light rail on central is slow but it exists and that's something i guess",
      "gilbert has more chain restaurants per capita than anywhere on earth probably",
      "someone in my scottsdale neighborhood just bought a fourth lifted truck. four.",
      "the desert in bloom right now is actually making me emotional. the poppies.",
      "phoenix in december is the best kept secret. perfect weather and nobody knows.",
      "the arizona cardinals deserve better. anyway.",
      "sprinkles cupcakes in old town scottsdale has a line at 9am. people love cupcakes.",
      "nah the tacos at el pollo supremo on 35th ave are genuinely elite. $2 each.",
    ]
  },
  {
    name: 'PHILADELPHIA',
    lat: 39.9526, lng: -75.1652,
    posts: [
      "the pat's vs geno's debate is kept alive purely by tourists. john's roast pork. end of discussion.",
      "SEPTA is running on vibes and prayer today. no further questions.",
      "someone boo'd a pigeon at love park. this is the city we are.",
      "south philly parking is a contact sport and i have the dents to prove it",
      "no bc why is fishtown renting for nyc prices now. we had ONE good coffee shop.",
      "the reading terminal market at noon is sensory overload and i live for it",
      "boathouse row lights at night are genuinely beautiful. philly stays underrated.",
      "got yelled at in italian by a grandmother in south philly. earned it.",
      "the art museum steps will always go hard. you know why.",
      "manayunk on a weekend is chaos. love it. hate it. live there.",
      "the italian market on 9th is one of the few places left that feels real",
      "wawa is not just a convenience store it is a cultural institution. moving on.",
      "eagles fans are a different kind of people and i mean that with full love",
      "why does it smell like a pretzel near rittenhouse sometimes. not complaining.",
      "the ben franklin bridge at sunrise is a free thing that hits hard",
      "passyunk ave restaurant row on a tuesday night has more energy than most cities on saturday",
      "found parking in center city first try. going to buy a lottery ticket.",
      "the schuylkill river trail bikers are unhinged speed demons and i respect it",
      "old city cobblestones are beautiful and also eat my ankles in heels every time",
      "nah the hoagies from primo's on south street are elite. no debate.",
    ]
  },
  {
    name: 'SAN FRANCISCO',
    lat: 37.7749, lng: -122.4194,
    posts: [
      "the fog rolled in at 2pm in the mission and now its 55 degrees. july.",
      "no bc why is a one bedroom in the sunset 3800 a month. THE SUNSET.",
      "the 38 geary is always late and always packed and yet we ride",
      "someone is doing a tech startup pitch at four barrel. the bar is not open yet.",
      "dolores park on a sunny day is a microcosm of everything right and wrong with this city",
      "the castro street fair energy is unmatched. just walked through. incredible.",
      "bart smells like a decision i regret every morning and yet",
      "the sourdough bread at tartine is genuinely worth the line. 8/10 worth it.",
      "another startup shut down in soma. we watched it happen in real time.",
      "golden gate park on a weekend is beautiful chaos. avoid if you value personal space.",
      "why does every restaurant in hayes valley cost $28 for pasta. why.",
      "the painted ladies in alamo square are more beautiful in person than every postcard",
      "coit tower hike in the morning mist is free and underrated. tell nobody.",
      "the ferry building farmers market has $14 goat cheese and i bought it. twice.",
      "mission burritos vs anywhere else in the country is not even a comparison. we win.",
      "tenderloin to union square is 4 blocks and a different dimension entirely",
      "the tech shuttle blocking the muni stop on market is still happening. still annoying.",
      "outer sunset fog is a lifestyle and the people who love it are built different",
      "someone at the duboce park dog area just brought a cat. on a leash. sf moment.",
      "noe valley on a saturday with a stroller is an olympic obstacle course",
    ]
  },
  {
    name: 'ATLANTA',
    lat: 33.7490, lng: -84.3880,
    posts: [
      "285 at 5pm is not a road it is a parking lot with delusions",
      "the beltline on a sunday is the best thing this city ever did. no notes.",
      "why does it take 45 minutes to go 8 miles in atlanta. why.",
      "someone just honked at me for going the speed limit on peachtree. which peachtree.",
      "no bc there are like 80 streets named peachtree and nobody thinks this is a problem",
      "ponce city market rooftop on a clear night hits. bring layers.",
      "little five points energy is forever undefeated. been saying it.",
      "the varsity chili dog has questionable ingredients and maximum flavor and that is the deal",
      "the marta gold line is actually useful if you live near it. rare transit W.",
      "it was 75 yesterday and 40 today. atlanta weather is a chaos agent.",
      "inman park cherry blossoms are out and everyone forgot how to drive near them",
      "why does every atl restaurant have a two hour wait on friday. plan accordingly.",
      "decatur has a different energy than atlanta proper. slower. good.",
      "edgewood ave at night is unhinged and i love this city for that",
      "buford highway is the best food street in the south and it's not even close",
      "grant park is underrated. the zoo is right there. they have pandas again.",
      "krog street tunnel mural just got updated. walked 20 minutes to see it. worth.",
      "centennial olympic park still gives off weird vibes in the best way",
      "the college football hall of fame is genuinely cool even if you're not a football person",
      "whole foods in virginia highland is where atlanta yuppies commune. i am one of them.",
    ]
  },
  {
    name: 'BOSTON',
    lat: 42.3601, lng: -71.0589,
    posts: [
      "the green line b branch is an insult to trains everywhere and i will not be told otherwise",
      "someone in allston is moving out. 15 mattresses on the curb. it is not september 1st.",
      "no bc why do drivers in boston treat a yellow light as an invitation to speed up",
      "the charles river esplanade on a spring evening is genuinely perfect. free therapy.",
      "dunkin on every corner and yet the line is always 12 people deep. boston math.",
      "fenway park is ancient and cramped and i would not trade it for anything",
      "harvard square has become a ghost town of banks and banks and one more bank",
      "south end brunch wait is 90 minutes minimum. we accept this. we are fools.",
      "the red line delays today brought me closer to god",
      "newbury street parking is fake. it does not exist. myth.",
      "jamaica plain on a weekend morning is peak boston without the noise",
      "quincy market is for tourists but the clam chowder in a bread bowl is not a joke",
      "allston rock city is undefeated. if you know you know.",
      "the city of boston closes everything at 2am and we suffer together",
      "someone is shoveling their parking spot even though it hasn't snowed in 3 weeks. honor system.",
      "north end cannolis from mike's vs modern. this argument will outlive us all.",
      "the arboretum in jamaica plain during lilac season is free and beautiful. go.",
      "getting on the T at downtown crossing at rush hour is a full contact sport",
      "cambridge porter square neighborhood is slept on. good food good vibes low hype.",
      "back bay brownstones are the best architecture in new england and i'll fight about it",
    ]
  },
  {
    name: 'MIAMI',
    lat: 25.7617, lng: -80.1918,
    posts: [
      "it is raining in brickell and sunny in wynwood simultaneously. miami.",
      "someone is playing reggaeton at full volume at 8am on calle ocho. this is my home.",
      "the 836 dollarway to the airport costs more than the flight at this point",
      "south beach traffic on a friday night is a different dimension of bad",
      "nah the cuban coffee from versailles is still the best $1.50 you will spend in this city",
      "the wynwood walls are still cool but the neighborhood around them is unaffordable now",
      "biscayne bay at sunset from the venetian causeway goes hard. free.",
      "no bc why is humidity at 95% at 9am in october. when does it end.",
      "the coconut grove farmers market is peaceful and i forget miami is a city when im there",
      "bayside marketplace is a tourist trap but the water taxi across to miami beach is valid",
      "little havana walk of fame outside ball and chain is an underrated thing to see",
      "the design district is beautiful and also 0% of it is for actual miami people",
      "overtown is having a moment and i hope it stays for the people who've always been there",
      "key biscayne bike ride is the best thing you can do in miami for free on a sunday",
      "someone doing a photoshoot at the wynwood murals every 4 feet. just walking through. hello.",
      "the whole foods in coral gables is a therapy session for people with money",
      "I-95 through downtown is just vibes and lane markings that don't mean anything",
      "afternoon thunderstorm came out of nowhere near midtown and now a car is partially flooded",
      "the lincoln road mall on a tuesday night has more energy than most cities' fridays",
      "luckily miami people are immune to heat or else we could not function from march to november",
    ]
  },
];

async function seedPosts() {
  const results = {};
  
  for (const city of cities) {
    let count = 0;
    for (const content of city.posts) {
      const latOffset = rand(-0.03, 0.03);
      const lngOffset = rand(-0.03, 0.03);
      const lat = city.lat + latOffset;
      const lng = city.lng + lngOffset;
      const h3_index = latLngToCell(lat, lng, 7);
      const created_at = now - randInt(0, 43200); // last 12 hours
      const expires_at = created_at + 86400;
      const id = randomUUID();
      const user_id = randomUUID();
      const ip_hash = randomBytes(16).toString('hex');

      await client.execute({
        sql: `INSERT INTO posts (id, user_id, content, lat, lng, h3_index, score, reply_count, created_at, expires_at, status, ip_hash)
              VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 'active', ?)`,
        args: [id, user_id, content, lat, lng, h3_index, created_at, expires_at, ip_hash],
      });
      count++;
    }
    results[city.name] = count;
    console.log(`${city.name}: ${count} posts inserted`);
  }
  
  console.log('\nTotal:', Object.values(results).reduce((a, b) => a + b, 0));
  return results;
}

seedPosts().catch(console.error);
