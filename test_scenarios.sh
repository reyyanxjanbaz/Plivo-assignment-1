#!/bin/bash
BASE_URL="http://localhost:3000"

echo "=== TEST 1: Level 1 XML Structure (Timeout logic) ==="
curl -s "$BASE_URL/ivr/level1"
echo -e "\n\n"

echo "=== TEST 2: Invalid Input at Level 1 (Digits=9) ==="
curl -s -X POST "$BASE_URL/ivr/level1" -d "Digits=9"
echo -e "\n\n"

echo "=== TEST 3: Max Retries (fails=3) ==="
curl -s -X POST "$BASE_URL/ivr/level1?fails=3" -d "Digits=9"
echo -e "\n\n"

echo "=== TEST 4: Breadcrumbs (Level 2 English -> Digits=0) ==="
curl -s -X POST "$BASE_URL/ivr/level2/english" -d "Digits=0"
echo -e "\n\n"

echo "=== TEST 5: Language Switch (Level 1 -> Digits=2) ==="
curl -s -X POST "$BASE_URL/ivr/level1" -d "Digits=2"
echo -e "\n\n"
