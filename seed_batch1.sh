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
  local video_url="$4"
  
  if [ -n "$video_url" ]; then
    BODY=$(printf '{"content":%s,"lat":%s,"lng":%s,"created_at":%d,"video_url":%s}' \
      "$(echo "$content" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
      "$lat" "$lng" "$ts" \
      "$(echo "$video_url" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")
  else
    BODY=$(printf '{"content":%s,"lat":%s,"lng":%s,"created_at":%d}' \
      "$(echo "$content" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
      "$lat" "$lng" "$ts")
  fi
  
  RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API" \
    -H "x-admin-key: $ADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  
  if [ "$RESP" = "200" ] || [ "$RESP" = "201" ]; then
    POSTED=$((POSTED + 1))
    echo "OK [$RESP] $lat,$lng"
  else
    echo "FAIL [$RESP] $(echo $BODY | head -c 80)"
  fi
}

scatter_lat() { echo "$1 + ($RANDOM / 32767.0 - 0.5) * 0.06" | bc -l; }
scatter_lng() { echo "$1 + ($RANDOM / 32767.0 - 0.5) * 0.06" | bc -l; }

echo "=== SAN DIEGO ==="
BASE_LAT=32.7157; BASE_LNG=-117.1611
post "Padres Opening Day is March 26 vs the Tigers!! who's going to Petco?? tickets went fast but still some nosebleeds left ngl" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "the Carlsbad Flower Fields are PEAK rn. went this morning and it was absolutely worth the drive, 50 acres of giant ranunculus" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "bruh the Leprechaun Run in PB on March 14 is gonna be a mess in the best way. last year the costume game was unreal" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "ok why is Little Italy always popping in March. the restaurants on India St have been packed every single weekend" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "SD hosting the NCAA basketball tournament this year is huge for the city. Petco Park area is gonna be insane with fans" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "hot take: Hillcrest has better brunch options than North Park now. fight me. that new spot on University Ave is elite" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "anyone else notice the 7 line is always backed up past Old Town now? been like this for weeks, no announcement from MTS" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "the weather this week is genuinely perfect. 72 and sunny in March. this is why we live here lol never moving" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"

echo "=== HOUSTON ==="
BASE_LAT=29.7604; BASE_LNG=-95.3698
post "World Baseball Classic Pool B games at Daikin Park this week were ELECTRIC. saw Japan vs DR last night and the crowd was 🔥" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "65th Annual St. Patrick's Day Parade downtown on Saturday! Montrose after the parade is gonna be absolutely packed. plan accordingly" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Brewhaha at Moon Tower Inn on the 14th - local breweries + bbq + live music. honestly one of the best free events of the year" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "CERAWeek bringing all the energy folks to Houston this month. oil & gas conference takes over downtown every March. love/hate it" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "the brisket at that new spot on Washington Ave is legitimately the best I've had in Houston. and ive been here 11 years saying this" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Heights is so different from 5 years ago. used to be chill. now every weekend feels like a festival. not complaining just saying" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "i-10 westbound at rush hour is a special kind of suffering. 45 minutes to go 4 miles today. someone explain this to me" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "who else is going to WBC quarterfinals at Daikin? the energy this week has been unreal for Houston baseball fans" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"

echo "=== PHOENIX ==="
BASE_LAT=33.4484; BASE_LNG=-112.0740
post "NCAA Women's Final Four is coming to Phoenix!! this is going to be massive. already seeing fans booking hotels downtown" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Heard Museum Guild Indian Fair this weekend is genuinely one of the best cultural events in the Valley. the artwork is incredible" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "M3F Music Festival lineup dropped and it's actually solid this year. Margaret T. Hance Park is a perfect venue for it" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Arizona Renaissance Festival in Gold Canyon runs through March 30. went last weekend, jousting is still as ridiculous as ever lol" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Tempe Festival of the Arts is always packed but worth it. the food vendors alone make it a win" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "ok March in Phoenix weather is actually perfect. 78 degrees today. this is the two months that justify everything else lol" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "anyone tried that new Sonoran fusion place in Arcadia? people keep posting about it. need honest reviews not yelp fluff" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "the 101 construction near Scottsdale Road has been going on for YEARS. when does this end. it never ends." "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"

echo "=== DALLAS ==="
BASE_LAT=32.7767; BASE_LNG=-96.7970
post "Cardi B at American Airlines Center this month and tickets are already reselling for insane prices. Dallas always goes crazy for concerts" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Dallas Opera National Vocal Competition at Winspear is so underrated. free to watch the finals and the talent is genuinely elite" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Deep Ellum on a Friday night has been wild lately. every block has something going on. the revival is real" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "ngl the tulip fields in the DFW area this spring are going crazy. the pics everyone is posting look fake they're so nice" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Dallas Morning News doing a pop-up newsroom at RedBird Mall this week. interesting move. showing up in underserved neighborhoods" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "best breakfast taco in Dallas hot take: La Banqueta on Henderson. not open everywhere but when you find a table it's worth it" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "35E through downtown is basically a parking lot now after that lane closure. beg you to take the DART for once" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"

echo "=== PHILADELPHIA ==="
BASE_LAT=39.9526; BASE_LNG=-75.1652
post "Philadelphia Flower Show is HERE (started March 7)! this year's theme is wild, the PPA Convention Center is genuinely stunning rn" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Philly is hosting FIFA World Cup games this summer and I can already feel the city losing its mind in the best possible way" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "America 250 celebrations in Philly this year are going to be unlike anything else in the country. birthplace of the nation and all that" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Alarm Will Sound at Zellerbach March 13 looks genuinely interesting - 20 performers, music meets poetry meets theater. very Philly energy" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Reading Terminal Market on a Saturday is a full contact sport and I will not be taking questions about this" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "the SEPTA 9 bus has been wild lately. packed, late, and the AC doesn't work even though it's March. timeless" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "someone explain to me why Fishtown rents went up again. it's not even that nice?? I grew up here and it was fine before" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Wawa hoagie at 2am is an undefeated choice. this is not up for debate." "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"

echo "=== SEATTLE ==="
BASE_LAT=47.6062; BASE_LNG=-122.3321
post "Emerald City Comic Con is back and the cosplay this year is INSANE. saw three different Deadpools in the first hour" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Taste Washington this weekend is the wine event of the year. Washington State wines are criminally underrated nationwide" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Emerald City Hoedown March 26-29 at the Renaissance? wasn't expecting to be intrigued by a country dance event but here we are" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "it's been sunny for 4 days straight and everyone in Seattle is acting like we won the Super Bowl. we are not ok as a city lol" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "who has the best pho in the ID right now? asking for a Monday. my usual spot raised prices again" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "the Link Light Rail downtown was completely packed this morning. happy people are using transit but come on Sound Transit give us more cars" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Capitol Hill rents are genuinely unlivable now. my neighbor just got a renewal notice for $400 more per month. this city is cooked" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"

echo "=== NASHVILLE ==="
BASE_LAT=36.1627; BASE_LNG=-86.7816
post "USWNT is playing at GEODIS Park for the SheBelieves Cup!! Nashville getting big soccer events is so good for this city. tickets start at $25" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Vandy baseball hosting LSU this weekend at Hawkins Field. SEC series at home?? this is gonna be loud" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "St. Paddy's Day parade in Five Points was unreal. the Irish Village had the whole neighborhood smelling like corned beef and beer" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "3rd & Lindsley turning 35 this year is insane. some of the best shows I've ever seen have been in that venue. Nashville institution" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "The Gulch is officially too expensive to even walk through without your heart rate going up. $28 cocktail I will not" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "hot chicken ranking for newcomers: Prince's > Hattie B's > Party Fowl. the line at Princes is worth it. the gift shop is not." "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "I-65 northbound after 4pm is physically painful. Nashville traffic was always bad but something broke in 2024 and we never recovered" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"

echo "=== DENVER ==="
BASE_LAT=39.7392; BASE_LNG=-104.9903
post "Denver March Powwow March 20-22 is one of the largest events of its kind in the country. 40+ years strong. genuinely worth going" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Keggs & Eggs at Union Station for St Paddy's is a Denver tradition at this point. KTCL always brings it. get there early" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "Maggie Lindemann at Gothic Theatre tomorrow night. Gothic is honestly the perfect mid-size venue. love that room" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "the snow last week and then 65 degrees yesterday. Colorado spring is genuinely unhinged. I dressed for both in the same day" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "RiNo on a weekend is starting to feel like LoDo used to feel. in a bad way. where did all the galleries go" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "best green chile in Denver right now? my go-to closed and I'm still not over it. need recommendations ASAP" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "RTD is supposedly adding frequency on the W line finally. I'll believe it when the train shows up. been waiting 20 minutes" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"
post "303 Day is a whole thing here and honestly I love that Denver just makes up its own holidays. very on brand" "$(scatter_lat $BASE_LAT)" "$(scatter_lng $BASE_LNG)"

echo ""
echo "Total posted: $POSTED"
