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

echo "=== AUSTIN ==="
B1=30.2672; B2=-97.7431
post "SXSW 2026 is taking over Austin right now and if you can navigate the badge lines there's genuinely free stuff everywhere through March 18" "$(s $B1)" "$(s $B2)"
post "Jane Fonda is a keynote at SXSW and somehow that's perfect? the lineup this year has big energy. Brene Brown, Adam Grant, Keith Lee" "$(s $B1)" "$(s $B2)"
post "Armadillo World HQ showcase running nightly March 13+ at Continental Club, Saxon Pub, Valhalla. free music every night during SXSW" "$(s $B1)" "$(s $B2)"
post "6th Street at 11pm during SXSW is genuinely not for the faint of heart. the energy is incredible and terrifying simultaneously" "$(s $B1)" "$(s $B2)"
post "Franklin BBQ line at 7am during SXSW and honestly respect to the commitment. I'm going to La Barbecue, shorter wait, same tier" "$(s $B1)" "$(s $B2)"
post "Austin rent during SXSW week is somehow even more absurd. $400/night Airbnb in Mueller. yes we know. we hate it too." "$(s $B1)" "$(s $B2)"
post "Barton Springs is still the best thing in Austin. one ticket, swim in natural spring water, pretend the city hasn't changed that much" "$(s $B1)" "$(s $B2)"

echo "=== BOSTON ==="
B1=42.3601; B2=-71.0589
post "Boston Legacy FC plays its first EVER game March 14 at Gillette!! White Stadium not ready yet but this is still huge for Boston soccer" "$(s $B1)" "$(s $B2)"
post "St. Patrick's Day Parade Sunday March 15 in South Boston. the route runs down East Sixth this year. Southie is gonna be electric" "$(s $B1)" "$(s $B2)"
post "Dropkick Murphys doing shows this month and in Boston that's basically a religious event. the energy in that room is unlike anything" "$(s $B1)" "$(s $B2)"
post "Dine Out Boston is on and restaurants are doing $29 lunches and $49 dinners. best time to try places you've been putting off" "$(s $B1)" "$(s $B2)"
post "Celtics are absolutely rolling right now and Garden energy has been electric all month. championship window is real this year" "$(s $B1)" "$(s $B2)"
post "the Green Line extension finally working properly is legitimately life-changing for Somerville. took a decade but we're here" "$(s $B1)" "$(s $B2)"
post "clam chowder in a bread bowl at the harbor. March weather. I don't care that I can't feel my face. this is the Boston experience." "$(s $B1)" "$(s $B2)"

echo "=== HONOLULU ==="
B1=21.3069; B2=-157.8583
post "Honolulu Festival turns 30 this year!! cultural performances all across Waikiki this weekend. 30 years of Pacific cultural exchange" "$(s $B1)" "$(s $B2)"
post "BrunchFest with a K-pop theme this year and Honolulu is just built different. Japanese pop culture + incredible food. paradise" "$(s $B1)" "$(s $B2)"
post "shark deterrents research in Hawaii is apparently at using magnetic fields and chemical repellants. science to protect the fishers" "$(s $B1)" "$(s $B2)"
post "North Shore in March is for the surfers. the swells are still going on the big wave spots. I watch from shore. no shame." "$(s $B1)" "$(s $B2)"
post "plate lunch at Rainbow Drive-In is the ultimate Honolulu reset meal. $9 and it fixes everything. never changing my order." "$(s $B1)" "$(s $B2)"
post "TheBus route 2 is always packed during tourist season. locals and tourists sharing the same bus in paradise. very grounding experience" "$(s $B1)" "$(s $B2)"

echo "=== KANSAS CITY ==="
B1=39.0997; B2=-94.5786
post "KC Current opens 2026 season vs Utah Royals with new coach Chris Armas. the women's soccer buzz in this city is REAL" "$(s $B1)" "$(s $B2)"
post "Big 12 Women's Basketball Championship was in KC and the arena was absolutely packed. this city shows up for sports" "$(s $B1)" "$(s $B2)"
post "best BBQ in KC is still Gates vs Arthur Bryant's and I will not be settling this today. both are correct depending on the day." "$(s $B1)" "$(s $B2)"
post "18th & Vine jazz district on a weekend night is everything. Kansas City invented this music and it still sounds best here" "$(s $B1)" "$(s $B2)"
post "Crossroads arts district keeps leveling up. new galleries opening, the murals keep getting better. KC arts scene is for real" "$(s $B1)" "$(s $B2)"
post "Chiefs parade was months ago and people still have the gear on every day. KC sports culture is unmatched. dynasty behavior." "$(s $B1)" "$(s $B2)"

echo "=== RALEIGH ==="
B1=35.7796; B2=-78.6382
post "NC State basketball this month has been intense. PNC Arena is loud and the Final Four talk is getting real loud in this city" "$(s $B1)" "$(s $B2)"
post "Raleigh has been growing so fast that I genuinely don't recognize parts of downtown from 3 years ago. it never stops" "$(s $B1)" "$(s $B2)"
post "Glenwood South on a Thursday night is the new weekend in Raleigh. the bar density on that stretch is something else" "$(s $B1)" "$(s $B2)"
post "food truck Friday at Moore Square is a March staple in Raleigh. 20+ trucks and the weather is finally cooperating" "$(s $B1)" "$(s $B2)"
post "best biscuit in the Triangle: Beasley's. this is not a debate. it's a fact." "$(s $B1)" "$(s $B2)"

echo "=== SACRAMENTO ==="
B1=38.5816; B2=-121.4944
post "Sacramento Kings are in full playoff push mode. Golden 1 Center has been LOUD this month. Domantas making his case for All-NBA" "$(s $B1)" "$(s $B2)"
post "the farm-to-fork scene in Sacramento is genuinely one of the best in the country and gets slept on because it's not SF or LA" "$(s $B1)" "$(s $B2)"
post "Midtown First Fridays is back in full swing. the galleries and bars on R Street were packed last Friday. spring is here" "$(s $B1)" "$(s $B2)"
post "Tower Bridge area is beautiful in March when it warms up. the river walk at sunset is very underrated for a capital city" "$(s $B1)" "$(s $B2)"
post "Freeport Bakery for Saturday morning is the move. the line is worth it. this is not negotiable in Sacramento." "$(s $B1)" "$(s $B2)"

echo "=== MEMPHIS ==="
B1=35.1495; B2=-90.0490
post "Beale Street Music Festival lineup announcement coming soon and the whole city is waiting. Memorial Day weekend can't come fast enough" "$(s $B1)" "$(s $B2)"
post "Grizzlies are playing inspired basketball right now. FedExForum has been electric. the young core is for real" "$(s $B1)" "$(s $B2)"
post "best BBQ in Memphis: Charlie Vergos Rendezvous for ribs. Cozy Corner for anything. Central BBQ for when you want both. you're welcome." "$(s $B1)" "$(s $B2)"
post "South Main Arts District is getting so much love right now. the galleries and breweries make it the best neighborhood walk in the city" "$(s $B1)" "$(s $B2)"
post "Sun Studio tour is still worth it even if you've done it. the energy in that room where Elvis and Cash recorded. no replacement." "$(s $B1)" "$(s $B2)"

echo "=== LOUISVILLE ==="
B1=38.2527; B2=-85.7585
post "Kentucky Derby prep races starting soon and Louisville is already buzzing. Churchill Downs in spring is everything this city is" "$(s $B1)" "$(s $B2)"
post "Louisville March Madness watch parties are serious business. this city bleeds blue AND red depending on the neighborhood" "$(s $B1)" "$(s $B2)"
post "NuLu neighborhood keeps getting better. the restaurant density per block is legitimately competing with bigger cities now" "$(s $B1)" "$(s $B2)"
post "bourbon trail is year-round but March is peak touring weather. still 60 degrees, no humidity, most distilleries uncrowded." "$(s $B1)" "$(s $B2)"
post "Hot Brown at Brown Hotel is still the move. an open-faced turkey sandwich smothered in mornay sauce. sounds crazy, tastes perfect." "$(s $B1)" "$(s $B2)"

echo "=== ST LOUIS ==="
B1=38.6270; B2=-90.1994
post "Cardinals opening day is coming and St. Louis is ready. Busch Stadium in April is one of the best baseball experiences anywhere" "$(s $B1)" "$(s $B2)"
post "The Gateway Arch at sunset in March is something you have to see in person. no photo does the scale justice" "$(s $B1)" "$(s $B2)"
post "Soulard neighborhood is always popping but post-Mardi Gras March Soulard is a vibe. the hangover energy is still there somehow" "$(s $B1)" "$(s $B2)"
post "best toasted ravioli in St. Louis: Charlie Gitto's. the dish was invented here and it's still the best here. no debate." "$(s $B1)" "$(s $B2)"
post "Forest Park in March when it starts warming up is genuinely free and amazing. the art museum, the zoo, the history museum - all free." "$(s $B1)" "$(s $B2)"

echo "=== CINCINNATI ==="
B1=39.1031; B2=-84.5120
post "Reds Opening Day is the biggest holiday in Cincinnati and I will die defending this. the whole city shuts down for the parade" "$(s $B1)" "$(s $B2)"
post "Bengal offseason moves have been interesting. the city is cautiously optimistic going into 2026. we've been here before tho" "$(s $B1)" "$(s $B2)"
post "OTR (Over-the-Rhine) is one of the best neighborhoods in the midwest for food and bars. people sleep on Cincinnati hard" "$(s $B1)" "$(s $B2)"
post "Cincinnati chili is either your thing or it isn't and there is no middle ground. Skyline Chili 3-way is the meal." "$(s $B1)" "$(s $B2)"
post "Eden Park in March with the early spring flowers is gorgeous. the Art Museum is free and has better collections than you'd expect" "$(s $B1)" "$(s $B2)"

echo "=== CLEVELAND ==="
B1=41.4993; B2=-81.6944
post "Cavaliers are in a playoff race and the energy at Rocket Mortgage Fieldhouse is back. Cleveland sports years are real this time" "$(s $B1)" "$(s $B2)"
post "East 4th Street dining scene is underrated nationally but locals know. the restaurant row is legitimately elite" "$(s $B1)" "$(s $B2)"
post "Rock and Roll Hall of Fame in spring is perfect. uncrowded, great exhibits, and the lakefront view is genuinely stunning" "$(s $B1)" "$(s $B2)"
post "Browns offseason is the annual Cleveland ritual of hope and anxiety. we've been conditioned to feel both simultaneously." "$(s $B1)" "$(s $B2)"
post "West Side Market on a Saturday morning is the best thing Cleveland does. been going since 1912 and somehow keeps getting better." "$(s $B1)" "$(s $B2)"

echo ""
echo "Total posted: $POSTED"
