# Esha Cognitive Disruption Grid

Esha is a counter intelligence honeypot system designed to identify and disrupt fraudulent scam attempts through active cognitive intervention. The platform provides a full stack simulation dashboard that hosts real time telemetry streams, threat intelligence metrics, and an automated case clearinghouse.

## System Architecture

The application is built as a monorepo consisting of two primary services:

* The backend server handles honeypot execution, interactive AI agent chat sessions, simulated event streaming, and automated case management.
* The frontend client renders a responsive web console to view and interact with running honeypots, watch real time stream events, analyze threats, and audit clearinghouse alerts.

## Repository Layout

* client: Frontend interface built with React and Vite.
* server: Express and WebSocket application handling the simulation logic.
* package.json: Shared configuration defining development and installation scripts.
* .env.example: Example configuration template for environment variables.

## Getting Started

Follow these instructions to set up the repository and run the services on your local machine.

### Prerequisites

Ensure Node JS is installed on your local environment.

### Installation

Install all required dependencies for the root folder, client, and server:

```bash
npm run install:all
```

### Running the Application

To start the frontend client and the backend server concurrently in development mode, run:

```bash
npm run dev
```

The web interface runs at http://localhost:5173 while the server operates on port 3001 and listens for WebSocket connections on port 3002.
