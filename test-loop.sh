#!/bin/bash

# Loop Until Fixed - Playwright Test Runner
# Runs E2E tests repeatedly until all pass

echo "🔄 Starting Loop-Until-Fixed Test Runner"
echo "=========================================="
echo ""

MAX_ATTEMPTS=100
ATTEMPT=1
WAIT_BETWEEN_RUNS=5

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "📊 Attempt #$ATTEMPT of $MAX_ATTEMPTS"
  echo "Time: $(date '+%H:%M:%S')"
  echo ""

  # Run Playwright tests
  npx playwright test --reporter=list

  # Check exit code
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! All tests passed on attempt #$ATTEMPT"
    echo "=========================================="
    exit 0
  else
    echo ""
    echo "❌ Tests failed on attempt #$ATTEMPT"

    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
      echo "⏳ Waiting $WAIT_BETWEEN_RUNS seconds before retry..."
      echo "=========================================="
      echo ""
      sleep $WAIT_BETWEEN_RUNS
    fi

    ((ATTEMPT++))
  fi
done

echo ""
echo "💥 FAILED: Tests did not pass after $MAX_ATTEMPTS attempts"
echo "=========================================="
exit 1
