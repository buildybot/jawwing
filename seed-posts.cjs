const { createClient } = require('/Users/buildy/.openclaw/workspace/jawwing/node_modules/@libsql/client/lib-cjs/node.js');
const h3 = require('/Users/buildy/.openclaw/workspace/jawwing/node_modules/h3-js/dist/h3-js.js');
const { randomUUID, randomBytes } = require('crypto');

const client = createClient({
  url: 'libsql://jawwing-buildybot.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzMxNjc1MDYsImlkIjoiMDE5Y2Q5MDQtNzMwMS03NWRhLWFlMDktYjhjYzQ0NDJiNTE1IiwicmlkIjoiYzQ1YWYwZTEtMTYzMC00NmJlLThmZTUtN2NjNzE1OTc1OThjIn0.5qm4jqRaBSMAk5VOmFiMtGIsZjQwBpbujihN_YGSauj5R6NvzQoC9obaNPxHxPVXlg2Acm3p6ltH05ez1q7eAg',
});

const now = Math.floor(Date.now() / 1000);
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));

// Unsplash photo IDs keyed by category
// Format: https://images.unsplash.com/photo-{id}?w=800&q=80
const images = {
  nyc: [
    { id: '1499092346589-b9b6be3e94b2', w: 800, h: 533, desc: 'NYC skyline at night' },
    { id: '1496442226666-8d4d0e62e6e9', w: 800, h: 600, desc: 'NYC subway' },
    { id: '1541336032412-2048a678540d', w: 800, h: 533, desc: 'Manhattan street scene' },
    { id: '1534430480872-3498386e7856', w: 800, h: 600, desc: 'Central Park' },
    { id: '1478860409255-f46ed686c8e3', w: 800, h: 533, desc: 'Brooklyn Bridge' },
    { id: '1485871078569-27d5e62c9c82', w: 800, h: 600, desc: 'Times Square' },
  ],
  la: [
    { id: '1580655653885-65763b2597d0', w: 800, h: 533, desc: 'LA skyline' },
    { id: '1523464862212-d6f6689f6d4f', w: 800, h: 600, desc: 'LA freeway traffic' },
    { id: '1617503752587-97d2103a96ea', w: 800, h: 533, desc: 'Venice Beach' },
    { id: '1469474968028-56623f02e42e', w: 800, h: 600, desc: 'Griffith Observatory sunset' },
    { id: '1504711434969-e33886168f5c', w: 800, h: 533, desc: 'palm trees LA' },
  ],
  chicago: [
    { id: '1494522855154-9297ac9a08e5', w: 800, h: 533, desc: 'Chicago skyline' },
    { id: '1477959858617-67f85cf4f1df', w: 800, h: 600, desc: 'Chicago Bean' },
    { id: '1507842217343-583bb7270b66', w: 800, h: 533, desc: 'Chicago architecture' },
    { id: '1581373449483-37449f962b6c', w: 800, h: 600, desc: 'deep dish pizza' },
    { id: '1534430480872-3498386e7856', w: 800, h: 533, desc: 'Chicago river' },
  ],
  houston: [
    { id: '1582560475093-ba66accbc424', w: 800, h: 533, desc: 'Houston skyline' },
    { id: '1565299624946-b28f40a0ae38', w: 800, h: 600, desc: 'BBQ brisket' },
    { id: '1524230572899-a752b3835840', w: 800, h: 533, desc: 'Texas sky' },
    { id: '1551504734-5da7e163a7e5', w: 800, h: 600, desc: 'tacos street food' },
  ],
  phoenix: [
    { id: '1558618666-fcd25c85cd64', w: 800, h: 533, desc: 'desert sunset' },
    { id: '1506905925346-21bda4d32df4', w: 800, h: 600, desc: 'saguaro cactus' },
    { id: '1575407863099-f0ef9f7c7a56', w: 800, h: 533, desc: 'Phoenix skyline' },
    { id: '1508739773434-c26b3d09e071', w: 800, h: 600, desc: 'Camelback Mountain' },
    { id: '1504701954957-2010ec3bcec1', w: 800, h: 533, desc: 'Arizona desert bloom' },
  ],
  philly: [
    { id: '1569761316261-9a8696fa2ca3', w: 800, h: 533, desc: 'Philadelphia skyline' },
    { id: '1565299585323-38d6b0865b47', w: 800, h: 600, desc: 'cheesesteak sandwich' },
    { id: '1569416302843-b31c4a5f9978', w: 800, h: 533, desc: 'Philadelphia street' },
    { id: '1572973025511-e4f5d2264600', w: 800, h: 600, desc: 'art museum steps' },
  ],
  sf: [
    { id: '1501594907352-04cda38ebc29', w: 800, h: 533, desc: 'Golden Gate Bridge fog' },
    { id: '1534430480872-3498386e7856', w: 800, h: 600, desc: 'SF cable car' },
    { id: '1469474968028-56623f02e42e', w: 800, h: 533, desc: 'SF bay sunset' },
    { id: '1449034446853-66c86144b0ad', w: 800, h: 600, desc: 'SF street fog' },
    { id: '1558522850-b2acd7a64cf5', w: 800, h: 533, desc: 'painted ladies SF' },
  ],
  atlanta: [
    { id: '1575517111839-3a3843ee7f5d', w: 800, h: 533, desc: 'Atlanta skyline' },
    { id: '1534430480872-3498386e7856', w: 800, h: 600, desc: 'Atlanta Beltline' },
    { id: '1547036967-23d09703ec59', w: 800, h: 533, desc: 'Southern food' },
    { id: '1584486354851-30f6d6d82ff5', w: 800, h: 600, desc: 'Atlanta street art' },
  ],
  boston: [
    { id: '1569954991531-5248ab602ff7', w: 800, h: 533, desc: 'Boston skyline' },
    { id: '1563201515-adbe35477c3a', w: 800, h: 600, desc: 'Boston brownstones' },
    { id: '1534430480872-3498386e7856', w: 800, h: 533, desc: 'Charles River' },
    { id: '1571850978639-b649e5d063a9', w: 800, h: 600, desc: 'Boston clam chowder' },
    { id: '1509600292-7c8a54d79e2f', w: 800, h: 533, desc: 'Fenway Park' },
  ],
  miami: [
    { id: '1506905925346-21bda4d32df4', w: 800, h: 533, desc: 'Miami beach' },
    { id: '1535498730771-e735b998cd64', w: 800, h: 600, desc: 'Miami skyline night' },
    { id: '1514214246423-7ce61cf0f1ac', w: 800, h: 533, desc: 'South Beach art deco' },
    { id: '1551504734-5da7e163a7e5', w: 800, h: 600, desc: 'Cuban food Miami' },
    { id: '1548438294-1ad5d5f4f063', w: 800, h: 533, desc: 'Wynwood murals' },
    { id: '1507525428034-b723cf961d3e', w: 800, h: 600, desc: 'Miami sunset beach' },
  ],
};

function pickImage(pool) {
  return pool[randInt(0, pool.length)];
}

const cities = [
  {
    name: 'NEW YORK', key: 'nyc',
    lat: 40.7128, lng: -74.0060,
    posts: [
      { text: "the L train is just a social experiment at this point", img: true },
      { text: "someone is eating a full shawarma wrap on the subway car rn. like a full one. respect.", img: false },
      { text: "why does every bodega in bushwick have a cat but the cats never wanna be petted", img: false },
      { text: "the 6 train smell today was a 10/10 would not recommend", img: false },
      { text: "nah the halal cart on 53rd and 6th just saved my life again", img: false },
      { text: "williamsburg gentrification update: they replaced the laundromat with a $22 smoothie place", img: false },
      { text: "if you walk slowly on the sidewalk in midtown you deserve everything that happens to you", img: false },
      { text: "the hudson yards vessel is genuinely one of the ugliest things ive ever seen and i live here", img: true },
      { text: "no bc why is a studio in astoria 3200 a month now. ASTORIA.", img: false },
      { text: "some guy on the A train just started doing pushups between the seats. valid.", img: true },
      { text: "the rats by canal street are getting bolder. one looked me in the eye today.", img: false },
      { text: "central park joggers at 6am have a different energy. unhinged. love it.", img: true },
      { text: "just waited 25 minutes for the Q and then two came at the same time. classic.", img: false },
      { text: "the bagel situation at h&h on broadway is still elite. everything bagel w scallion cream cheese no notes", img: true },
      { text: "why is there a film crew on my block AGAIN i cannot leave my apartment", img: false },
      { text: "inwood feels like a different city and i mean that as a compliment", img: false },
      { text: "the PATH train to hoboken costs more than my dignity at this point", img: false },
      { text: "someone left a full couch on the corner of graham and metropolitan. moving day szn.", img: false },
      { text: "the line outside katz's deli is genuinely longer than my will to live on a sunday", img: true },
      { text: "doing the brooklyn bridge walk is a rite of passage but tourists stop every 3 feet i am going insane", img: true },
    ]
  },
  {
    name: 'LOS ANGELES', key: 'la',
    lat: 34.0522, lng: -118.2437,
    posts: [
      { text: "IF ONE MORE PERSON CUTS ME OFF ON THE 405 I AM MOVING TO OREGON", img: false },
      { text: "the coffee at alfred on melrose is good but is it $9 good. no. absolutely not.", img: false },
      { text: "traffic on the 10 east at 2pm on a tuesday. why. WHY.", img: true },
      { text: "venice beach drum circle is still going. it never stopped. it never will.", img: true },
      { text: "just saw someone doing a photoshoot in front of the pink wall on melrose. its 8am.", img: false },
      { text: "the farmers market at the grove is a trap for tourists and i love it for that", img: false },
      { text: "no bc why does it cost $40 to park in dtla. i will walk 17 blocks i do not care", img: false },
      { text: "the In-N-Out on sunset is spiritual. animal style is not optional it is mandatory.", img: false },
      { text: "silver lake reservoir walk hits different when the smog clears. rare event.", img: true },
      { text: "someone in my building is learning guitar. we're on month 4 of wonderwall.", img: false },
      { text: "koreatown for late night food is the correct answer always has been", img: false },
      { text: "the metro purple line extension is not done yet. it will never be done. its a myth.", img: false },
      { text: "highland park is unrecognizable from 5 years ago and not in a good way rent-wise", img: false },
      { text: "coyote on my street in los feliz again. third one this week. they own this city.", img: false },
      { text: "why is everyone in larchmont wearing the same exact outfit. hive mind.", img: false },
      { text: "the 101 freeway is a parking lot with extra steps at this hour", img: true },
      { text: "grand central market downtown is still the move. the egg slut line is not worth it tho", img: false },
      { text: "malibu fires smoke smell is back again lowkey", img: false },
      { text: "nah the taco truck on figueroa is undefeated. been going since 2019.", img: true },
      { text: "doing pilates in los angeles is basically a personality now. i am a victim of this.", img: false },
    ]
  },
  {
    name: 'CHICAGO', key: 'chicago',
    lat: 41.8781, lng: -87.6298,
    posts: [
      { text: "the wind off lake michigan today actually moved me sideways. sideways.", img: false },
      { text: "deep dish is for tourists. tavern style. i will die on this hill.", img: true },
      { text: "red line at addison after a cubs game is genuinely hell on earth and i respect it", img: false },
      { text: "why is it 70 degrees on monday and snowing thursday. this city is chaos.", img: false },
      { text: "giordano's vs lou malnati's discourse is tired. portillo's hot dog or go home.", img: true },
      { text: "the bean is called cloud gate and i will not be taking questions", img: true },
      { text: "pilsen murals are the best public art in the city fight me", img: false },
      { text: "wicker park lost its edge but the hot dog stands are eternal", img: false },
      { text: "lake shore drive at golden hour literally makes you forget the city has problems", img: true },
      { text: "someone on the blue line to o'hare just clipped their nails. full nail clipping.", img: false },
      { text: "the chicago style pizza debate is keeping me up at night and i dont even live here", img: false },
      { text: "no bc why is a two flat in logan square 800k now. LOGAN SQUARE.", img: false },
      { text: "absolutely ripping winds on michigan avenue today. lost my hat near millennium park.", img: false },
      { text: "the chicago riverwalk in spring is undefeated. one of those facts.", img: true },
      { text: "whole foods on kingsbury is where wicker park people go to feel things", img: false },
      { text: "browns line going north is always just vibes. nobody's in a rush.", img: false },
      { text: "the garfield park conservatory is free and gorgeous and nobody talks about it enough", img: false },
      { text: "bucktown brunch wait time is 2 hours minimum. we do this to ourselves.", img: false },
      { text: "navy pier is a trap but the fireworks on friday night still slap lowkey", img: true },
      { text: "the el rattling past my wicker park apartment at 2am is actually comforting at this point", img: false },
    ]
  },
  {
    name: 'HOUSTON', key: 'houston',
    lat: 29.7604, lng: -95.3698,
    posts: [
      { text: "the humidity today is personal. it attacked me.", img: false },
      { text: "montrose bbq debate: truth bbq vs killen's. both correct. that's the answer.", img: true },
      { text: "why is everyone in houston driving a lifted truck. where are yall going.", img: false },
      { text: "the galleria traffic on a saturday is a spiritual test i keep failing", img: false },
      { text: "just saw an alligator in the bayou off memorial drive. tuesday.", img: false },
      { text: "no bc why does houston have no zoning laws but also the best food city in america. chaos works.", img: false },
      { text: "flooding on 610 again. it rained for 20 minutes. this is fine.", img: false },
      { text: "the museum district on a weekday is genuinely peaceful. best kept secret.", img: false },
      { text: "someone is grilling outside at 10am in the heights. the smell is making me lose it.", img: true },
      { text: "the houston rodeo is the one week a year everyone becomes a cowboy and i support it", img: false },
      { text: "central market on westheimer is where you go when you have money and feelings", img: false },
      { text: "the beltway 8 will humble you every single day without fail", img: false },
      { text: "discovered a new taqueria on richmond ave. life is good.", img: true },
      { text: "houston weather forecast: 95 and humid with a 40% chance of existential flooding", img: false },
      { text: "midtown on a friday night is unhinged in the best way. save yourselves.", img: true },
      { text: "nobody in houston jaywalks because the roads are designed to kill pedestrians specifically", img: false },
      { text: "the nasa space center tour lowkey went hard. did not expect that.", img: false },
      { text: "whole foods river oaks is a different socioeconomic universe and i was not prepared", img: false },
      { text: "the trees in memorial park after rain smell incredible. one good thing.", img: false },
      { text: "H-E-B on shepherd is a religious experience and i will hear no arguments", img: false },
    ]
  },
  {
    name: 'PHOENIX', key: 'phoenix',
    lat: 33.4484, lng: -112.0740,
    posts: [
      { text: "115 degrees and someone is out here mowing their lawn. legend.", img: false },
      { text: "the car door handle this morning genuinely burned me. BURNED me.", img: false },
      { text: "scottsdale old town on a saturday is a different species of human", img: false },
      { text: "why does everyone move here from california and then complain about the heat", img: false },
      { text: "the sunsets in arizona are the only reason i havent left tbh", img: true },
      { text: "tempe town lake kayaking sounds cute until you remember it's 108 outside", img: false },
      { text: "the I-10 construction has been going for 7 years. it will never end.", img: false },
      { text: "found a scorpion in my shoe this morning. totally normal tuesday.", img: false },
      { text: "the saguaros along south mountain are genuinely majestic and i forget that living here", img: true },
      { text: "downtown phoenix food scene has exploded in the last 3 years. finally.", img: false },
      { text: "camelback mountain hikers at 6am are either disciplined or insane. no in between.", img: true },
      { text: "no bc why does arizona have the best mexican food outside of mexico. blessed.", img: true },
      { text: "the light rail on central is slow but it exists and that's something i guess", img: false },
      { text: "gilbert has more chain restaurants per capita than anywhere on earth probably", img: false },
      { text: "someone in my scottsdale neighborhood just bought a fourth lifted truck. four.", img: false },
      { text: "the desert in bloom right now is actually making me emotional. the poppies.", img: true },
      { text: "phoenix in december is the best kept secret. perfect weather and nobody knows.", img: false },
      { text: "the arizona cardinals deserve better. anyway.", img: false },
      { text: "sprinkles cupcakes in old town scottsdale has a line at 9am. people love cupcakes.", img: false },
      { text: "nah the tacos at el pollo supremo on 35th ave are genuinely elite. $2 each.", img: false },
    ]
  },
  {
    name: 'PHILADELPHIA', key: 'philly',
    lat: 39.9526, lng: -75.1652,
    posts: [
      { text: "the pat's vs geno's debate is kept alive purely by tourists. john's roast pork. end of discussion.", img: false },
      { text: "SEPTA is running on vibes and prayer today. no further questions.", img: false },
      { text: "someone boo'd a pigeon at love park. this is the city we are.", img: false },
      { text: "south philly parking is a contact sport and i have the dents to prove it", img: false },
      { text: "no bc why is fishtown renting for nyc prices now. we had ONE good coffee shop.", img: false },
      { text: "the reading terminal market at noon is sensory overload and i live for it", img: true },
      { text: "boathouse row lights at night are genuinely beautiful. philly stays underrated.", img: true },
      { text: "got yelled at in italian by a grandmother in south philly. earned it.", img: false },
      { text: "the art museum steps will always go hard. you know why.", img: true },
      { text: "manayunk on a weekend is chaos. love it. hate it. live there.", img: false },
      { text: "the italian market on 9th is one of the few places left that feels real", img: false },
      { text: "wawa is not just a convenience store it is a cultural institution. moving on.", img: false },
      { text: "eagles fans are a different kind of people and i mean that with full love", img: false },
      { text: "why does it smell like a pretzel near rittenhouse sometimes. not complaining.", img: false },
      { text: "the ben franklin bridge at sunrise is a free thing that hits hard", img: true },
      { text: "passyunk ave restaurant row on a tuesday night has more energy than most cities on saturday", img: false },
      { text: "found parking in center city first try. going to buy a lottery ticket.", img: false },
      { text: "the schuylkill river trail bikers are unhinged speed demons and i respect it", img: false },
      { text: "old city cobblestones are beautiful and also eat my ankles in heels every time", img: true },
      { text: "nah the hoagies from primo's on south street are elite. no debate.", img: false },
    ]
  },
  {
    name: 'SAN FRANCISCO', key: 'sf',
    lat: 37.7749, lng: -122.4194,
    posts: [
      { text: "the fog rolled in at 2pm in the mission and now its 55 degrees. july.", img: true },
      { text: "no bc why is a one bedroom in the sunset 3800 a month. THE SUNSET.", img: false },
      { text: "the 38 geary is always late and always packed and yet we ride", img: false },
      { text: "someone is doing a tech startup pitch at four barrel. the bar is not open yet.", img: false },
      { text: "dolores park on a sunny day is a microcosm of everything right and wrong with this city", img: true },
      { text: "the castro street fair energy is unmatched. just walked through. incredible.", img: false },
      { text: "bart smells like a decision i regret every morning and yet", img: false },
      { text: "the sourdough bread at tartine is genuinely worth the line. 8/10 worth it.", img: true },
      { text: "another startup shut down in soma. we watched it happen in real time.", img: false },
      { text: "golden gate park on a weekend is beautiful chaos. avoid if you value personal space.", img: true },
      { text: "why does every restaurant in hayes valley cost $28 for pasta. why.", img: false },
      { text: "the painted ladies in alamo square are more beautiful in person than every postcard", img: true },
      { text: "coit tower hike in the morning mist is free and underrated. tell nobody.", img: false },
      { text: "the ferry building farmers market has $14 goat cheese and i bought it. twice.", img: false },
      { text: "mission burritos vs anywhere else in the country is not even a comparison. we win.", img: false },
      { text: "tenderloin to union square is 4 blocks and a different dimension entirely", img: false },
      { text: "the tech shuttle blocking the muni stop on market is still happening. still annoying.", img: false },
      { text: "outer sunset fog is a lifestyle and the people who love it are built different", img: true },
      { text: "someone at the duboce park dog area just brought a cat. on a leash. sf moment.", img: false },
      { text: "noe valley on a saturday with a stroller is an olympic obstacle course", img: false },
    ]
  },
  {
    name: 'ATLANTA', key: 'atlanta',
    lat: 33.7490, lng: -84.3880,
    posts: [
      { text: "285 at 5pm is not a road it is a parking lot with delusions", img: false },
      { text: "the beltline on a sunday is the best thing this city ever did. no notes.", img: true },
      { text: "why does it take 45 minutes to go 8 miles in atlanta. why.", img: false },
      { text: "someone just honked at me for going the speed limit on peachtree. which peachtree.", img: false },
      { text: "no bc there are like 80 streets named peachtree and nobody thinks this is a problem", img: false },
      { text: "ponce city market rooftop on a clear night hits. bring layers.", img: true },
      { text: "little five points energy is forever undefeated. been saying it.", img: false },
      { text: "the varsity chili dog has questionable ingredients and maximum flavor and that is the deal", img: true },
      { text: "the marta gold line is actually useful if you live near it. rare transit W.", img: false },
      { text: "it was 75 yesterday and 40 today. atlanta weather is a chaos agent.", img: false },
      { text: "inman park cherry blossoms are out and everyone forgot how to drive near them", img: true },
      { text: "why does every atl restaurant have a two hour wait on friday. plan accordingly.", img: false },
      { text: "decatur has a different energy than atlanta proper. slower. good.", img: false },
      { text: "edgewood ave at night is unhinged and i love this city for that", img: false },
      { text: "buford highway is the best food street in the south and it's not even close", img: false },
      { text: "grant park is underrated. the zoo is right there. they have pandas again.", img: false },
      { text: "krog street tunnel mural just got updated. walked 20 minutes to see it. worth.", img: true },
      { text: "centennial olympic park still gives off weird vibes in the best way", img: false },
      { text: "the college football hall of fame is genuinely cool even if you're not a football person", img: false },
      { text: "whole foods in virginia highland is where atlanta yuppies commune. i am one of them.", img: false },
    ]
  },
  {
    name: 'BOSTON', key: 'boston',
    lat: 42.3601, lng: -71.0589,
    posts: [
      { text: "the green line b branch is an insult to trains everywhere and i will not be told otherwise", img: false },
      { text: "someone in allston is moving out. 15 mattresses on the curb. it is not september 1st.", img: false },
      { text: "no bc why do drivers in boston treat a yellow light as an invitation to speed up", img: false },
      { text: "the charles river esplanade on a spring evening is genuinely perfect. free therapy.", img: true },
      { text: "dunkin on every corner and yet the line is always 12 people deep. boston math.", img: false },
      { text: "fenway park is ancient and cramped and i would not trade it for anything", img: true },
      { text: "harvard square has become a ghost town of banks and banks and one more bank", img: false },
      { text: "south end brunch wait is 90 minutes minimum. we accept this. we are fools.", img: false },
      { text: "the red line delays today brought me closer to god", img: false },
      { text: "newbury street parking is fake. it does not exist. myth.", img: false },
      { text: "jamaica plain on a weekend morning is peak boston without the noise", img: true },
      { text: "quincy market is for tourists but the clam chowder in a bread bowl is not a joke", img: true },
      { text: "allston rock city is undefeated. if you know you know.", img: false },
      { text: "the city of boston closes everything at 2am and we suffer together", img: false },
      { text: "someone is shoveling their parking spot even though it hasn't snowed in 3 weeks. honor system.", img: false },
      { text: "north end cannolis from mike's vs modern. this argument will outlive us all.", img: true },
      { text: "the arboretum in jamaica plain during lilac season is free and beautiful. go.", img: false },
      { text: "getting on the T at downtown crossing at rush hour is a full contact sport", img: false },
      { text: "cambridge porter square neighborhood is slept on. good food good vibes low hype.", img: false },
      { text: "back bay brownstones are the best architecture in new england and i'll fight about it", img: true },
    ]
  },
  {
    name: 'MIAMI', key: 'miami',
    lat: 25.7617, lng: -80.1918,
    posts: [
      { text: "it is raining in brickell and sunny in wynwood simultaneously. miami.", img: false },
      { text: "someone is playing reggaeton at full volume at 8am on calle ocho. this is my home.", img: false },
      { text: "the 836 dollarway to the airport costs more than the flight at this point", img: false },
      { text: "south beach traffic on a friday night is a different dimension of bad", img: false },
      { text: "nah the cuban coffee from versailles is still the best $1.50 you will spend in this city", img: true },
      { text: "the wynwood walls are still cool but the neighborhood around them is unaffordable now", img: true },
      { text: "biscayne bay at sunset from the venetian causeway goes hard. free.", img: true },
      { text: "no bc why is humidity at 95% at 9am in october. when does it end.", img: false },
      { text: "the coconut grove farmers market is peaceful and i forget miami is a city when im there", img: false },
      { text: "bayside marketplace is a tourist trap but the water taxi across to miami beach is valid", img: false },
      { text: "little havana walk of fame outside ball and chain is an underrated thing to see", img: false },
      { text: "the design district is beautiful and also 0% of it is for actual miami people", img: false },
      { text: "overtown is having a moment and i hope it stays for the people who've always been there", img: false },
      { text: "key biscayne bike ride is the best thing you can do in miami for free on a sunday", img: true },
      { text: "someone doing a photoshoot at the wynwood murals every 4 feet. just walking through. hello.", img: true },
      { text: "the whole foods in coral gables is a therapy session for people with money", img: false },
      { text: "I-95 through downtown is just vibes and lane markings that don't mean anything", img: false },
      { text: "afternoon thunderstorm came out of nowhere near midtown and now a car is partially flooded", img: false },
      { text: "the lincoln road mall on a tuesday night has more energy than most cities' fridays", img: true },
      { text: "luckily miami people are immune to heat or else we could not function from march to november", img: false },
    ]
  },
];

async function seedPosts() {
  const results = {};
  let totalInserted = 0;

  for (const city of cities) {
    let count = 0;
    const imgPool = images[city.key];

    for (const post of city.posts) {
      const latOffset = rand(-0.03, 0.03);
      const lngOffset = rand(-0.03, 0.03);
      const lat = city.lat + latOffset;
      const lng = city.lng + lngOffset;
      const h3_index = h3.latLngToCell(lat, lng, 7);
      const created_at = now - randInt(0, 43200);
      const expires_at = created_at + 86400;
      const id = randomUUID();
      const user_id = randomUUID();
      const ip_hash = randomBytes(16).toString('hex');

      let image_url = null;
      let image_width = null;
      let image_height = null;

      if (post.img) {
        const img = pickImage(imgPool);
        image_url = `https://images.unsplash.com/photo-${img.id}?w=800&q=80`;
        image_width = img.w;
        image_height = img.h;
      }

      await client.execute({
        sql: `INSERT INTO posts (id, user_id, content, lat, lng, h3_index, score, reply_count, created_at, expires_at, status, ip_hash, image_url, image_width, image_height)
              VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 'active', ?, ?, ?, ?)`,
        args: [id, user_id, post.text, lat, lng, h3_index, created_at, expires_at, ip_hash, image_url, image_width, image_height],
      });
      count++;
    }

    results[city.name] = count;
    totalInserted += count;
    const imgCount = city.posts.filter(p => p.img).length;
    console.log(`${city.name}: ${count} posts (${imgCount} with images)`);
  }

  console.log(`\nTotal inserted: ${totalInserted}`);
  return results;
}

seedPosts().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
