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

postv() {
  local content="$1"
  local lat="$2"
  local lng="$3"
  local video_url="$4"
  local offset=$((RANDOM % 86400))
  local ts=$((NOW - offset))
  
  BODY=$(printf '{"content":%s,"lat":%s,"lng":%s,"created_at":%d,"video_url":%s}' \
    "$(echo "$content" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
    "$lat" "$lng" "$ts" \
    "$(echo "$video_url" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")
  
  RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API" \
    -H "x-admin-key: $ADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  
  if [ "$RESP" = "200" ] || [ "$RESP" = "201" ]; then
    POSTED=$((POSTED + 1))
    echo "OK [$RESP] (with video)"
  else
    echo "FAIL [$RESP]"
  fi
}

s() { echo "$1 + ($RANDOM / 32767.0 - 0.5) * 0.06" | bc -l; }

echo "=== PORTLAND ==="
B1=45.5152; B2=-122.6784
post "Portland Mercury Sandwich Week was REAL - 88 chefs making original sandwiches across the city. my life will never be the same" "$(s $B1)" "$(s $B2)"
post "85th Annual St. Patrick's Day celebration at Aquinas Hall in the Lloyd District. only in Portland is it this low-key and this good" "$(s $B1)" "$(s $B2)"
post "Portland's Renée Watson won the Newbery Medal!! All the Blues in the Sky. huge moment for Portland lit community" "$(s $B1)" "$(s $B2)"
post "citywide public art trail coming to Portland - new sculptures all over the city. this is the kind of thing that makes me love it here" "$(s $B1)" "$(s $B2)"
post "Division Street is officially back. the density of good food on that strip right now is honestly better than pre-pandemic" "$(s $B1)" "$(s $B2)"
post "100+ people gathered outside the Portland ICE facility for a sing-along protest. only in Portland is it a sing-along" "$(s $B1)" "$(s $B2)"
post "ok MAX Blue Line was down for 45 min this morning with zero announcement. TriMet please. just one text. that's all I ask" "$(s $B1)" "$(s $B2)"

echo "=== MINNEAPOLIS ==="
B1=44.9778; B2=-93.2650
post "Insights XL design lecture at Walker Art Center this month celebrating 40 years of the series. Minneapolis design scene stays underrated" "$(s $B1)" "$(s $B2)"
post "Loring Park shooting near the apartments over the weekend. the neighborhood has really changed the last few years ngl" "$(s $B1)" "$(s $B2)"
post "Republican governor race heating up - Kendall Qualls picked Brian Nicholson as his running mate. Minneapolis political energy is high rn" "$(s $B1)" "$(s $B2)"
post "the cold broke!! 42 degrees today and everyone is outside in t-shirts acting like it's summer. Minnesota has different rules" "$(s $B1)" "$(s $B2)"
post "Al's Breakfast on Dinkytown is a religious experience and if you haven't been you are missing a core Minneapolis tradition" "$(s $B1)" "$(s $B2)"
post "Green Line is supposed to be more reliable now after the infrastructure work last year. it was on time twice today. progress." "$(s $B1)" "$(s $B2)"
post "NE Minneapolis has so many good new spots rn. the bar openings alone this year - where are all these people coming from" "$(s $B1)" "$(s $B2)"

echo "=== CHARLOTTE ==="
B1=35.2271; B2=-80.8431
post "ACC Tournament at Spectrum Center this week!! the city is gonna be packed with fans. every bar uptown is doing specials" "$(s $B1)" "$(s $B2)"
post "Charlotte FC opening day at Bank of America vs Austin FC. the Crown is sold out. Charlotte is a soccer city now officially" "$(s $B1)" "$(s $B2)"
post "St. Patrick's Day bar crawl uptown this weekend is going to be absolutely unhinged. 24th annual so they know what they're doing" "$(s $B1)" "$(s $B2)"
post "Holi celebrations in Charlotte this weekend - the pictures from last year were gorgeous. bringing real color to the Queen City" "$(s $B1)" "$(s $B2)"
post "HBCU Southern Classic Battle of the Bands at Bojangles Coliseum March 15. this is one of the best events Charlotte does all year" "$(s $B1)" "$(s $B2)"
post "anyone been to the new spots opening in South End? the neighborhood never stops growing. cranes for life" "$(s $B1)" "$(s $B2)"
post "I-277 construction near the stadium has been wild this week. 45 minute commute turned into 90. please don't move here" "$(s $B1)" "$(s $B2)"

echo "=== BALTIMORE ==="
B1=39.2904; B2=-76.6122
post "BMA has THREE new Matisse exhibitions right now. the collection they built is honestly world class. free admission every day" "$(s $B1)" "$(s $B2)"
post "Ravens lost Tyler Linderbaum to the Raiders on a 3 year deal. this one stings. best center in the league ngl" "$(s $B1)" "$(s $B2)"
post "Saint Shrektrick's Rave at Baltimore Soundstage on March 13 and yes that is a real event and yes I am going" "$(s $B1)" "$(s $B2)"
post "St. Patrick's Day Parade in Baltimore is always fire. the Fells Point party after is where you really want to be" "$(s $B1)" "$(s $B2)"
post "crab cakes at LP Steamers vs Faidley's in Lexington Market - this is the debate that tears Baltimore families apart" "$(s $B1)" "$(s $B2)"
post "Charm City is genuinely having a cultural moment. gallery openings every weekend in Hampden, Station North popping off" "$(s $B1)" "$(s $B2)"
post "Purple line light rail still not open yet. when does this city get real transit. the Circulator is not the answer" "$(s $B1)" "$(s $B2)"

echo "=== LAS VEGAS ==="
B1=36.1699; B2=-115.1398
post "Jennifer Lopez residency this month and the tickets went from $200 to $600 overnight on resale. Vegas prices are not real" "$(s $B1)" "$(s $B2)"
postv "March Madness in Vegas is unreal - every sportsbook completely packed, all the screens going. this is the best city for it" "$(s $B1)" "$(s $B2)" "https://www.youtube.com/watch?v=7fMY_8xFtI0"
post "Illenium at Sphere this month and no I haven't recovered from the last Sphere show. that experience is genuinely hard to describe" "$(s $B1)" "$(s $B2)"
post "Chelsea Handler at the Colosseum doing comedy and honestly she was underrated for years. the Vegas residency era suits her" "$(s $B1)" "$(s $B2)"
post "Spring Break crowds hitting the Strip this weekend. tourists in flip flops in March like it's 90 degrees. it's 65. respect the desert" "$(s $B1)" "$(s $B2)"
post "new casino construction on the north Strip is wild. they just keep building. where does the water come from. asking for a friend" "$(s $B1)" "$(s $B2)"
post "best $10 meal in Vegas: the Wynn buffet is gone but the IP still has a solid deal if you know where to look. locals eat free mentally" "$(s $B1)" "$(s $B2)"

echo "=== SALT LAKE CITY ==="
B1=40.7608; B2=-111.8910
post "SLC hosted the Winter Paralympics and the free Watch Party at the city is packed every night. Utah knows how to host" "$(s $B1)" "$(s $B2)"
post "Illuminate festival at Library Square - interactive art installations + drone show. March is the right time for this in SLC" "$(s $B1)" "$(s $B2)"
post "49th Annual St. Patrick's Day Parade at The Gateway March 14. Hibernian Society of Utah has been doing this since 4 guys in a bar in 1977 lol" "$(s $B1)" "$(s $B2)"
post "Zara Larsson at The Union tonight and the venue is genuinely perfect for that kind of show. intimate and loud" "$(s $B1)" "$(s $B2)"
post "skiing last weekend was insane. 18 inches at Alta in the last week. March skiing in Utah is criminally underrated" "$(s $B1)" "$(s $B2)"
post "downtown SLC development is genuinely moving fast. the blocks around the temple district feel completely different from 3 years ago" "$(s $B1)" "$(s $B2)"
post "what's the best ramen in SLC now? asking because my go-to raised prices again and I need options. TRAX is taking me anywhere" "$(s $B1)" "$(s $B2)"

echo "=== TAMPA ==="
B1=27.9506; B2=-82.4572
post "Downtown River O' Green is March 14 - they literally dye the river green for St. Patrick's Day. Tampa does not do things small" "$(s $B1)" "$(s $B2)"
post "Disney on Ice at Amalie Arena this weekend. the line to park on a weekend is already something else. plan accordingly folks" "$(s $B1)" "$(s $B2)"
post "Lightning game last night was electric. the arena has been loud all season. Tampa sports culture is genuinely different" "$(s $B1)" "$(s $B2)"
post "Ybor City on a Friday night is a whole different city. the energy is unmatched in Tampa. Columbia Restaurant has been there since 1905 btw" "$(s $B1)" "$(s $B2)"
post "construction on the Selmon Expressway extension is completely wrecking my commute. Tampa Bay roads were already barely functional" "$(s $B1)" "$(s $B2)"
post "best Cuban sandwich debate: La Segunda vs Brocato's. La Segunda wins on the bread alone. this is not up for argument" "$(s $B1)" "$(s $B2)"
post "Tampa March weather is 80 and sunny and if you live anywhere cold I'm sorry. genuinely sorry. come visit" "$(s $B1)" "$(s $B2)"

echo ""
echo "Total posted: $POSTED"
