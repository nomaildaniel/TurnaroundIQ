# TurnaroundIQ ✈️

**Every minute matters. Every decision needs proof.**

TurnaroundIQ is a simulated airport ground-operations decision-support application that models aircraft turnaround disruptions, compares recovery plans, validates schedule constraints, and records decision evidence.

**[Launch Live Demo](https://turnaroundiq-core-ap-ujde.bolt.host)**

> **Important:** This is a simulation using fictional data. It is not connected to live airport systems and is not certified for operational aviation use.

## Features

- **Operations Overview:** Monitor simulated aircraft turnarounds, task progress, and disruptions.
- **Turnaround Workspace:** Inspect task dependencies, schedules, critical paths, and resource conflicts.
- **Disruption Simulator:** Explore five repeatable disruption scenarios.
- **Deterministic Scheduling Engine:** Calculate task timings, detect resource conflicts, and validate schedule feasibility.
- **Recovery Planner:** Compare four strategies using actual calculated schedules and constraint checks.
- **Evidence Ledger:** Inspect saved simulation decisions, compare before-and-after results, and export JSON reports.

## How It Works

1. Select a fictional aircraft turnaround.
2. Trigger a disruption.
3. Calculate the disrupted schedule and departure delay.
4. Compare recovery alternatives.
5. Validate proposed plans against hard constraints.
6. Save the resulting decision evidence and export a report.

The application separates candidate recovery strategies from deterministic schedule validation. An infeasible candidate should not be treated as a valid plan merely because it has an attractive estimated delay.

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase and server-side Edge Functions
- Vitest

## Verification

The submitted implementation reports **53 passing automated tests**, successful TypeScript checks, and a successful production build.

Tests cover task dependencies, resource conflicts, disruption handling, recovery plans, infeasible-plan detection, deterministic replay, evidence records, and JSON exports.

These are software-level test results, not evidence of real-airport validation.

## Current Limitations

- Scenario records use fictional data.
- The Evidence Ledger uses in-memory demo-mode storage.
- Live airport integrations and operational validation have not been completed.
- The Jev integration adapter is present but unconfigured. No live Jev recommendation is claimed.

## Potential Next Steps

- Validate scheduling rules with aviation operations experts.
- Test against approved, anonymized historical turnaround data.
- Add durable audit persistence.
- Evaluate a controlled pilot with an airport or ground-handling partner.
- Integrate approved operational data sources after security and feasibility reviews.

## Project

Built for the HTCJ × PROOF Aviation Futures Challenge.

**The objective:** make operational decisions more transparent, testable, and evidence-driven before attempting real-world deployment.
