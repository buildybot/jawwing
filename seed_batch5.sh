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

echo "=== COLUMBUS ==="
B1=39.9612; B2=-82.9988
post "Ohio State Spring Game coming up and the Horseshoe is gonna be packed even for a scrimmage. Columbus football culture is its own thing" "$(s $B1)" "$(s $B2)"
post "Short North gallery hop is back in full spring mode. the neighborhood on a Saturday evening is peak Columbus vibes" "$(s $B1)" "$(s $B2)"
post "Crew SC 2026 season preview looks exciting. Lower.com Field is such a good stadium, the atmosphere punches above its weight" "$(s $B1)" "$(s $B2)"
post "Jeni's ice cream in Columbus is legitimately world-class and I'll argue this anywhere. the quality control is insane for an ice cream chain" "$(s $B1)" "$(s $B2)"
post "Columbus tech scene has been hiring quietly all winter. the city's startup ecosystem keeps growing and nobody outside Ohio talks about it" "$(s $B1)" "$(s $B2)"

echo "=== MILWAUKEE ==="
B1=43.0389; B2=-87.9065
post "Bucks season is coming down to the wire and Fiserv Forum has been unreal. Milwaukee basketball energy is back" "$(s $B1)" "$(s $B2)"
post "Milwaukee Art Museum on the lakefront in March is stunning. free Thursday nights and the Calatrava wing literally moves. actual wings." "$(s $B1)" "$(s $B2)"
post "Summerfest planning already underway and the rumored headliners this year are big. June can't come fast enough" "$(s $B1)" "$(s $B2)"
post "best Friday night fish fry in Milwaukee: Lakefront Brewery. 500 people, live music, the best perch in the state. Wisconsin tradition." "$(s $B1)" "$(s $B2)"
post "Third Ward in spring is the best Milwaukee neighborhood walk. the food market, the Milwaukee Public Market, the lakefront trail." "$(s $B1)" "$(s $B2)"

echo "=== OKLAHOMA CITY ==="
B1=35.4676; B2=-97.5164
post "Thunder are absolutely flying this season. Paycom Center has been electric all year. Shai Gilgeous-Alexander is a problem" "$(s $B1)" "$(s $B2)"
post "Paseo Arts District First Friday is one of the best free monthly events in OKC. galleries, food trucks, live music every first Friday" "$(s $B1)" "$(s $B2)"
post "new development in Midtown OKC is wild. the cranes around 10th and Walker have been going for 2 years straight" "$(s $B1)" "$(s $B2)"
post "best chicken fried steak in Oklahoma City is still a passionate local debate. Cattlemen's Steakhouse wins for atmosphere and history." "$(s $B1)" "$(s $B2)"
post "Bricktown canal walk in March is perfect. mild weather, fewer tourists than summer, the canal looks great with spring coming" "$(s $B1)" "$(s $B2)"

echo "=== TUCSON ==="
B1=32.2226; B2=-110.9747
post "spring training wrapping up at Kino Sports Complex and the Cubs/White Sox traffic finally calming down. great for the economy weird for residents" "$(s $B1)" "$(s $B2)"
post "Sonoran Desert in March is genuinely the most beautiful it gets. the saguaros against blue sky. you can't get this anywhere else." "$(s $B1)" "$(s $B2)"
post "4th Avenue Street Fair was last week and it's the best street fair in the southwest no debate. Tucson knows how to do community events" "$(s $B1)" "$(s $B2)"
post "best Sonoran hot dog in Tucson: BK Tacos on 12th Ave. the bacon-wrapped hot dog with pinto beans and green salsa is a religious experience" "$(s $B1)" "$(s $B2)"
post "Tucson weather in March is peak. 75 degrees, low humidity, still green from winter rains. this is why people move here." "$(s $B1)" "$(s $B2)"

echo "=== RICHMOND ==="
B1=37.5407; B2=-77.4360
post "Richmond is the sleeper city for craft beer and I've been saying this for 5 years. the brewery scene per capita rivals anyone" "$(s $B1)" "$(s $B2)"
post "Monument Avenue debates are still ongoing but the street itself is genuinely beautiful in spring. the bike lanes help." "$(s $B1)" "$(s $B2)"
post "Carytown is having a moment. new restaurants opening every month, the foot traffic on a spring weekend is impressive for this size city" "$(s $B1)" "$(s $B2)"
post "VCU basketball is still the heart of this city. the Siegel Center gets LOUD and the walk-on culture at VCU is legendary" "$(s $B1)" "$(s $B2)"
post "best crab cakes in Richmond: Rappahannock. the Chesapeake connection is real and they don't cut corners with the crab." "$(s $B1)" "$(s $B2)"

echo "=== MADISON ==="
B1=43.0731; B2=-89.4012
post "Madison in March means you're in the last stretch before real spring. 40 degrees feels warm now. this is what living here does to you" "$(s $B1)" "$(s $B2)"
post "State Street on a Saturday is still the best free urban experience in Wisconsin. students, farmers market, bookstores, coffee. perfect." "$(s $B1)" "$(s $B2)"
post "Dane County Farmers Market is back starting April and the countdown is REAL. the market wraps the Capitol Square and it's perfect" "$(s $B1)" "$(s $B2)"
post "Madison lakes are still frozen at the edges but the ice is going. the isthmus sunsets have been incredible this month" "$(s $B1)" "$(s $B2)"
post "best Friday night fish fry in Madison: Smoky Jon's BBQ. yes I know that's a BBQ place but they do fish fry right. trust me." "$(s $B1)" "$(s $B2)"

echo "=== BUFFALO ==="
B1=42.8864; B2=-78.8784
post "Bills offseason moves have the city buzzing. another deep run? maybe. Buffalo believes. we always believe." "$(s $B1)" "$(s $B2)"
post "Elmwood Village in spring is the best walkable neighborhood in upstate New York. the cafes, indie shops, the people are genuinely warm" "$(s $B1)" "$(s $B2)"
post "wings debate for real: Anchor Bar vs Bar-Bill vs Gabriel's Gate. they're all different. they're all correct. don't let anyone tell you otherwise." "$(s $B1)" "$(s $B2)"
post "Niagara Falls in March before the crowds is actually incredible. you can stand next to the falls and actually hear yourself think" "$(s $B1)" "$(s $B2)"
post "the snow is finally mostly gone and Buffalo is emerging from hibernation. the next 6 weeks are peak livability here. enjoy every day." "$(s $B1)" "$(s $B2)"

echo "=== PROVIDENCE ==="
B1=41.8240; B2=-71.4128
post "WaterFire is back in season soon and Providence in spring at night with the fires going on the river is genuinely magical" "$(s $B1)" "$(s $B2)"
post "Providence Restaurant Weeks are the best deal in RI. the food scene here punches way above its weight for the city size" "$(s $B1)" "$(s $B2)"
post "Brown/RISD energy on College Hill in spring is a whole thing. the galleries opening, the public art, the pop-up markets" "$(s $B1)" "$(s $B2)"
post "Federal Hill Italian restaurants in March before the tourists is peak dining in Providence. Camille's is still undefeated." "$(s $B1)" "$(s $B2)"
post "the Providence Performing Arts Center consistently gets Broadway shows that Boston doesn't. city is small but culturally overperforms" "$(s $B1)" "$(s $B2)"

echo "=== SAN JOSE ==="
B1=37.3382; B2=-121.8863
post "Sharks are in a transition year but the Tank is still a fun building. the die-hards show up regardless. San Jose hockey fans are loyal" "$(s $B1)" "$(s $B2)"
post "SAP Center area development is finally moving. the downtown San Jose transformation has been slow but things are actually happening" "$(s $B1)" "$(s $B2)"
post "Santana Row in spring is the move if you want to feel like you're in a different city. the outdoor dining is genuinely lovely" "$(s $B1)" "$(s $B2)"
post "San Pedro Square Market is one of the best food halls in the Bay Area and it gets slept on because it's not SF. underrated." "$(s $B1)" "$(s $B2)"
post "tech layoff waves didn't slow San Jose down much. the engineering talent density in this city is unlike anywhere in the world." "$(s $B1)" "$(s $B2)"

echo ""
echo "Total posted: $POSTED"
