#!/bin/bash
source /Users/buildy/.openclaw/workspace/jawwing/.env.local

API="https://www.jawwing.com/api/v1/admin/posts"
NOW=$(date +%s)
POSTED=0

post() {
  local content="$1"
  local lat="$2"
  local lng="$3"
  local offset=$((RANDOM % 86400))
  local ts=$((NOW - offset))
  
  BODY=$(printf '{"content":%s,"lat":%s,"lng":%s,"created_at":%d}' \
    "$(echo "$content" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
    "$lat" "$lng" "$ts")
  
  RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API" \
    -H "x-admin-key: $ADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  
  if [ "$RESP" = "200" ] || [ "$RESP" = "201" ]; then
    POSTED=$((POSTED + 1))
    echo "OK [$RESP]"
  else
    echo "FAIL [$RESP]"
  fi
}

s() { echo "$1 + ($RANDOM / 32767.0 - 0.5) * 0.06" | bc -l; }

echo "=== PITTSBURGH ==="
B1=40.4406; B2=-79.9959
post "St. Patrick's Day Parade down Grant Street March 14 - 150+ year tradition. Punxsutawney Phil makes an appearance. only Pittsburgh things" "$(s $B1)" "$(s $B2)"
post "Peppa Pig live concert at the convention center March 22 and yes there will be adults crying in the audience. myself included potentially" "$(s $B1)" "$(s $B2)"
post "the bridges in Pittsburgh are actually wild. you cross like 3 in a 10-minute commute. no other city does this" "$(s $B1)" "$(s $B2)"
post "Primanti Brothers at midnight is a Pittsburgh rite of passage. coleslaw on the sandwich. not negotiable. don't argue with me." "$(s $B1)" "$(s $B2)"
post "Spring feels like it might actually stick this time. 50 degrees for the next week. the North Shore is gonna come alive" "$(s $B1)" "$(s $B2)"
post "The Strip District on a Saturday morning is the best way to experience Pittsburgh. pierogies, espresso, the farmer's market. perfect" "$(s $B1)" "$(s $B2)"
post "PAT bus wasn't showing up in the app again. classic. just showed up 20 minutes late with no notice. the Pittsburgh transit experience" "$(s $B1)" "$(s $B2)"

echo "=== NEW ORLEANS ==="
B1=29.9511; B2=-90.0715
post "New Orleans Book Festival at Tulane this week - Salman Rushdie, Michael Lewis, Stacey Abrams. the lineup is legitimately insane" "$(s $B1)" "$(s $B2)"
post "79th Annual Irish Channel St. Patrick's Day Parade - people throw CABBAGE at you and you LOVE it. only New Orleans" "$(s $B1)" "$(s $B2)"
post "Phantom of the Opera is at the Saenger through March 15 and it's the best production I've seen in years. go if you can" "$(s $B1)" "$(s $B2)"
post "The Great Gatsby musical at Saenger March 24-29 and I have thoughts. the Jazz Age setting was made for this city" "$(s $B1)" "$(s $B2)"
post "beignets at Cafe Du Monde at 7am is a non-negotiable ritual. the powdered sugar on black clothes is the price you pay" "$(s $B1)" "$(s $B2)"
post "Frenchmen Street on a Tuesday beats Bourbon Street on a Saturday every single time. locals know. tourists figure it out eventually" "$(s $B1)" "$(s $B2)"
post "Jazz Fest lineup drops soon and the whole city is holding its breath. April can't come fast enough" "$(s $B1)" "$(s $B2)"

echo "=== ATLANTA ==="
B1=33.7490; B2=-84.3880
post "Atlanta Science Festival in Piedmont Park March 7-21. free science expo at the end. bring the kids, genuinely good stuff" "$(s $B1)" "$(s $B2)"
post "Mental Awakening Fest March 27-28 at Westside Motor Lounge - 2 days of live music and local art. the Westside scene right now is fire" "$(s $B1)" "$(s $B2)"
post "Grant Park Conservancy fundraiser at Zoo Atlanta March 27 - open bar + heavy apps supporting the oldest public park in ATL. yes please" "$(s $B1)" "$(s $B2)"
post "Bubbles & Brews month continues through March - Cobb County breweries doing events all month. this region has way more craft beer than you think" "$(s $B1)" "$(s $B2)"
post "285 West at rush hour is a slow-motion nightmare. Atlanta traffic is something you have to experience to truly understand the suffering" "$(s $B1)" "$(s $B2)"
post "Ponce City Market on a weekend is 50% locals, 50% tourists and I've made peace with this. the food hall is worth it regardless" "$(s $B1)" "$(s $B2)"
post "best fried chicken in Atlanta hot take: Busy Bee Cafe. 70 years old and it still goes harder than anywhere new. respect your elders." "$(s $B1)" "$(s $B2)"

echo "=== MIAMI ==="
B1=25.7617; B2=-80.1918
post "Ultra Music Festival March 27-29 at Bayfront Park. 170,000 people and the entire city vibrates for a week. 26th year and still nuts" "$(s $B1)" "$(s $B2)"
post "305 Day celebration at La Tropical Brewery was electric. sports figures + music + the WBC energy. Miami has its own holidays and I love it" "$(s $B1)" "$(s $B2)"
post "Carnaval on the Mile in Coral Gables March 7-8 was absolutely packed. 27 years in and the energy never drops" "$(s $B1)" "$(s $B2)"
post "Jazz in the Gardens at Hard Rock Stadium is such a good concept. outdoor jazz festival in March in Miami is a perfect vibe" "$(s $B1)" "$(s $B2)"
post "Cirque du Soleil LUZIA is running through April 25 and if you haven't gone yet what are you waiting for. the acrobatics alone" "$(s $B1)" "$(s $B2)"
post "Wynwood on a Saturday is a whole cultural experience. the murals change every month, the galleries are packed, the people watching is elite" "$(s $B1)" "$(s $B2)"
post "best Cuban coffee in Miami is still a block-by-block argument and I refuse to settle this. ventanita culture is unmatched anywhere" "$(s $B1)" "$(s $B2)"

echo "=== NYC ==="
B1=40.7128; B2=-74.0060
post "March in NYC means the tourist crowds are back and all 20 of us who live here are gritting our teeth through it. Times Square is unlivable" "$(s $B1)" "$(s $B2)"
post "the L train was down this morning for an hour with no explanation and somehow this is still surprising to people. it is not surprising" "$(s $B1)" "$(s $B2)"
post "St. Patrick's Day Parade on 5th Ave is the one time of year midtown is actually electric. even jaded New Yorkers come out for this one" "$(s $B1)" "$(s $B2)"
post "new ramen spot in the East Village has a 45-minute wait on a Tuesday. NYC restaurant culture is genuinely unhinged and I love it" "$(s $B1)" "$(s $B2)"
post "World Baseball Classic vibes are still everywhere in Flushing. the Queens diaspora came out in force for the Caribbean matchups" "$(s $B1)" "$(s $B2)"
post "rent just went up again. shocked. truly shocked. never could have seen this coming. $3800 for a studio is not a deal" "$(s $B1)" "$(s $B2)"
post "Spring in Central Park is genuinely one of the best things on earth. the Reservoir path on a 55-degree morning. I'd pay extra for this." "$(s $B1)" "$(s $B2)"
post "dollar pizza on 8th Ave vs the fancy slice shops in Brooklyn: the dollar pizza wins. don't overthink it." "$(s $B1)" "$(s $B2)"

echo "=== LOS ANGELES ==="
B1=34.0522; B2=-118.2437
post "March in LA is perfect weather and everyone knows it. 72 degrees, no humidity, light breeze. this is what we pay rent for" "$(s $B1)" "$(s $B2)"
post "the 405 construction near Sepulveda Pass is apparently never going to end. I've accepted this as a fact of my existence" "$(s $B1)" "$(s $B2)"
post "Grand Central Market on a weekend hits different in spring. all the new stalls are open and the crowds are manageable before noon" "$(s $B1)" "$(s $B2)"
post "Dodger Stadium opening day is coming and the energy in LA is already building. the 2026 season better deliver" "$(s $B1)" "$(s $B2)"
post "Ktown late night food is one of LA's best-kept secrets even though everyone knows about it. army stew at 1am just hits different" "$(s $B1)" "$(s $B2)"
post "Silver Lake Reservoir farmers market is elite. the people watching alone is worth the drive. very LA in the best way possible" "$(s $B1)" "$(s $B2)"
post "Metro K Line finally connecting more of South LA and honestly the ridership numbers have been solid. give LA transit a chance" "$(s $B1)" "$(s $B2)"
post "LA weather gets a reputation but March fog in Santa Monica is its own vibe. the beach at 9am before the crowds is actually gorgeous" "$(s $B1)" "$(s $B2)"

echo "=== CHICAGO ==="
B1=41.8781; B2=-87.6298
post "Chicago in March means you're on day 4 of 50 degree weather and everyone is acting like it's officially summer. wearing shorts was a choice" "$(s $B1)" "$(s $B2)"
post "St. Patrick's Day in Chicago is the real deal - they dye the river GREEN. actual emerald green. been doing it since 1962. iconic." "$(s $B1)" "$(s $B2)"
post "Red Line was completely packed this morning. CTA delays on the north side are becoming a daily ritual at this point. just budget 20 extra minutes" "$(s $B1)" "$(s $B2)"
post "deep dish at Lou Malnati's vs Giordano's is the eternal debate. Lou's wins on butter crust. Giordano's wins on stuffed. depends on the day." "$(s $B1)" "$(s $B2)"
post "the riverwalk is starting to come alive again. first warm weekends bring everyone out. best free thing to do in this city" "$(s $B1)" "$(s $B2)"
post "Blues, Jazz, and Soul fest season is coming. Chicago music summer is genuinely unbeatable and I will die on this hill" "$(s $B1)" "$(s $B2)"
post "new restaurant opening in Logan Square every two weeks it feels like. the neighborhood keeps leveling up even as rents climb" "$(s $B1)" "$(s $B2)"

echo "=== DC ==="
B1=38.9072; B2=-77.0369
post "Cherry blossom peak bloom forecast is looking like late March this year. the Mall is going to be absolutely packed. plan your weekdays" "$(s $B1)" "$(s $B2)"
post "Metro Silver Line delay this morning added 30 minutes to my commute. WMATA truly has no off season for disappointment" "$(s $B1)" "$(s $B2)"
post "the Shaw neighborhood right now is the best food corridor in DC and I will not take questions. just walk down 7th on a Friday" "$(s $B1)" "$(s $B2)"
post "Nationals spring training is wrapping up and the vibes are cautiously optimistic? I've been burned before. we'll see." "$(s $B1)" "$(s $B2)"
post "Georgetown waterfront in March when it starts warming up is the move. overpriced but the views are earned" "$(s $B1)" "$(s $B2)"
post "the political energy in DC this year is something else. every coffee shop conversation is about policy. this city never stops" "$(s $B1)" "$(s $B2)"
post "half smoke from Ben's Chili Bowl is a DC institution and I don't care if it's a tourist spot. some things earn their reputation" "$(s $B1)" "$(s $B2)"

echo "=== SAN FRANCISCO ==="
B1=37.7749; B2=-122.4194
post "March in SF means you need a jacket AND sunscreen on the same day. the microclimate chaos is a feature not a bug" "$(s $B1)" "$(s $B2)"
post "BART was so packed at rush hour I let two trains go by. the downtown stations are genuinely not built for current ridership" "$(s $B1)" "$(s $B2)"
post "Dolores Park is already packed on weekends. the warm days bring everyone out. the vibe is unmatchable even if the hills nearly kill you" "$(s $B1)" "$(s $B2)"
post "new dim sum spot opening in the Richmond and the line on opening day was around the block. SF knows good dim sum" "$(s $B1)" "$(s $B2)"
post "tech layoffs wave 3 or is it 4? the Mission feels different than it did in 2023. the coffee shops are still full but the energy shifted" "$(s $B1)" "$(s $B2)"
post "Giants Opening Day coming up and AT&T Park in March with the bay behind it is genuinely one of the prettiest baseball settings" "$(s $B1)" "$(s $B2)"
post "sourdough bread culture in SF is a real thing and yes it does taste different here. the starter matters. don't argue with me." "$(s $B1)" "$(s $B2)"

echo ""
echo "Total posted: $POSTED"
