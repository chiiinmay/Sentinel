# Raksha AI Plan

## Objective
- Build a browser-based zero-trust agent
- Continuously verify user identity using keystroke dynamics
- Detect phishing links in real time
- Combine both signals into a trust score

## Phase 1: Enrollment
- Capture typing data from user
- Collect dwell time and flight time
- Store baseline typing pattern
- Train lightweight model

## Phase 2: Continuous Authentication
- Capture keystrokes during browsing
- Compute confidence score every few seconds
- Classify confidence into high, medium, low

## Phase 3: Link Interception
- Intercept all link clicks and typed URLs
- Send URL to phishing detection API
- Apply local heuristic checks if offline

## Phase 4: Decision Engine
- Combine typing confidence and link risk
- Allow safe actions
- Block risky links
- Lock session on low confidence
- Trigger re-authentication

## Phase 5: Dashboard
- Show live confidence score
- Display scanned links
- Maintain threat log

## Phase 6: Extension Development
- Build Chrome extension using Manifest V3
- Implement background script
- Handle event listeners for typing and links

## Phase 7: Model Integration
- Train model using Python and scikit-learn
- Convert model to JavaScript or TensorFlow.js
- Run inference on client side

## Phase 8: Risk Scoring Integration
- Integrate Google Safe Browsing API
- Add optional APIs like VirusTotal
- Implement local regex-based checks

## Phase 9: UI Development
- Build dashboard using React
- Add charts for visualization
- Connect extension events to UI

## Phase 10: Storage
- Store data locally or use Firebase
- Handle logs and user data securely

## Phase 11: Testing
- Test typing accuracy
- Test phishing detection
- Validate decision engine logic

## Phase 12: Deployment
- Package extension
- Test in Chrome browser
- Prepare demo flow 