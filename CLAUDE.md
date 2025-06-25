# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js application that automatically updates Slack profile status with Claude usage cost savings. The app runs `npx ccusage@latest monthly --json` every minute, calculates savings against Claude Max subscription ($200), and updates the user's Slack profile status text.

## Development Commands

```bash
# Install dependencies
npm install

# Run the application
npm start

# Test ccusage command manually
npx ccusage@latest monthly --json
```

## Architecture

- **index.js**: Main application with three core functions:
  - `getCCUsage()`: Executes ccusage command and parses JSON response
  - `updateSlackProfile()`: Updates Slack profile via users.profile.set API
  - `updateCostInfo()`: Orchestrates the update process
- **Scheduling**: Uses node-cron for 1-minute intervals
- **Configuration**: Environment variables via dotenv (.env file)
- **Dependencies**: axios (HTTP requests), node-cron (scheduling), dotenv (config)

## Environment Variables

- `SLACK_TOKEN`: Required Slack User OAuth Token with `users.profile:write` scope