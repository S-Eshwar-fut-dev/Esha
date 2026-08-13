# Esha Backend Server

The backend application for Esha manages honeypot simulation, processes intelligence telemetry, and hosts WebSocket connections.

## Key Subsystems

* Honeypot Simulator: Manages live chat sessions with cognitive disruption agents acting as simulated targets.
* Event Pipeline: Runs a simulated message broker simulating Kafka topics to process raw telemetry and candidate intelligence.
* Correlation Engine: Correlates raw signals to verify fraud threats.
* Clearinghouse: Records verified cases and makes them queryable via REST APIs.

## API Architecture

The server exposes HTTP endpoints for configuration, sessions, scenarios, and database entities:

* GET /health: Status check of the system.
* GET /api/scenarios: Lists available scam scenarios.
* GET /api/sessions: Lists active chat sessions.
* GET /api/kafka/events: Retrieves recent event telemetry.
* GET /api/clearinghouse/cases: Retrieves verified cases.

## Running the Server

To start the server independently in watch mode, run:

```bash
npm run dev
```

The server listens on port 3001 for HTTP requests and port 3002 for WebSocket connections.
