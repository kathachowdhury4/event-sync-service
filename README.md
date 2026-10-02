# Event Sync Service

A full-stack event synchronization and reconciliation application that compares meeting/event records from **CRM** and **Calendar** systems, identifies matching records, detects conflicts, and highlights possible duplicate events for human review.

The application provides a web-based **Reconciliation Workspace** and **Duplicate Explorer** for analyzing synchronization quality between independent event sources.

---

## Table of Contents

* [Overview](#overview)
* [Key Capabilities](#key-capabilities)
* [Architecture](#architecture)
* [Technology Stack](#technology-stack)
* [Project Structure](#project-structure)
* [Backend](#backend)
* [Frontend](#frontend)
* [Data Flow](#data-flow)
* [Event Normalization](#event-normalization)
* [Reconciliation](#reconciliation)
* [Conflict Detection](#conflict-detection)
* [Duplicate Detection](#duplicate-detection)
* [Matching Algorithm](#matching-algorithm)
* [API Endpoints](#api-endpoints)
* [Local Development Setup](#local-development-setup)
* [Running the Backend](#running-the-backend)
* [Running the Frontend](#running-the-frontend)
* [Swagger API Documentation](#swagger-api-documentation)
* [Frontend Navigation](#frontend-navigation)
* [Duplicate Explorer](#duplicate-explorer)
* [Filtering](#filtering)
* [Troubleshooting](#troubleshooting)
* [Production Considerations](#production-considerations)
* [Future Enhancements](#future-enhancements)
* [Project Status](#project-status)

---

# Overview

The Event Sync Service solves a common enterprise integration problem:

> The same business meeting may exist independently in a CRM system and a calendar system, but the two systems may represent the event differently.

For example:

### CRM

text
Meeting ID: CRM-1001
Title: Q1 Portfolio Review
Company: Meridian
Client: David Park
Date: 2025-03-10
Start Time: 10:00
Location: New York Office


### Calendar

text
Event ID: CAL-A1
Title: Q1 Portfolio Review
Company: Meridian
Client: David Park
Date: 2025-03-10
Start Time: 10:00
Location: New York Office


The Event Sync Service determines whether these records likely represent the same real-world meeting.

It also identifies:

* CRM records without calendar matches
* Calendar records without CRM matches
* Matching confidence
* Data conflicts
* Possible duplicate events
* Evidence supporting each match

---

# Key Capabilities

## 1. CRM and Calendar Reconciliation

The application compares events from:

* CRM
* Calendar

and produces one of the following reconciliation states:

text
MATCHED
CRM_ONLY
CALENDAR_ONLY


---

## 2. Confidence Scoring

Each CRM ↔ Calendar candidate is assigned a confidence score between:

text
0.00 - 1.00


For example:

text
0.85 = 85%
0.75 = 75%
0.60 = 60%


The score is based on multiple event attributes.

---

## 3. Conflict Detection

For matched records, the application identifies differences such as:

* Title
* Status
* Location
* Start time
* Date

Example:

text
CRM:
Start Time = 10:00 AM

Calendar:
Start Time = 10:15 AM


The system reports:

text
Field: start_time
Severity: WARNING


---

## 4. Duplicate Detection

The Duplicate Explorer compares CRM records against Calendar records and identifies records that may represent the same real-world event.

Example:

text
CRM-1001 ↔ CAL-A1
Confidence: 85%


Possible evidence:

text
✓ Same calendar date
✓ Exact start time
✓ Same company/client
✓ Same client/person
✓ Exact meeting title


---

## 5. Human Review

The system is designed to support human review rather than automatically merging records.

A possible duplicate can be inspected using:

* CRM record
* Calendar record
* Confidence
* Matching reasons
* Conflicts
* Source data

---

# Architecture

The application follows a simple full-stack architecture.

text
                       ┌─────────────────────┐
                       │      Browser        │
                       │                     │
                       │   React + Vite      │
                       └──────────┬──────────┘
                                  │
                                  │ HTTP/REST
                                  ▼
                       ┌─────────────────────┐
                       │      FastAPI        │
                       │      Backend        │
                       └──────────┬──────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
       │ Normalizer  │     │ Reconciler  │     │ Duplicate   │
       │             │     │             │     │ Detector    │
       └─────────────┘     └─────────────┘     └─────────────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Domain Models   │
                         │                 │
                         │ CRM Events      │
                         │ Calendar Events │
                         │ Match Results   │
                         │ Duplicate Data  │
                         └─────────────────┘


---

# Technology Stack

## Backend

* Python 3.13
* FastAPI
* Uvicorn
* Pydantic
* Python dataclasses
* REST APIs

## Frontend

* React
* Vite
* JavaScript / JSX
* Fetch API
* CSS

---

# Project Structure

The project is organized approximately as follows:

text
event-sync-service/
│
├── backend/
│   │
│   ├── app/
│   │   │
│   │   ├── api/
│   │   │   └── meetings.py
│   │   │
│   │   ├── models/
│   │   │   └── domain.py
│   │   │
│   │   ├── services/
│   │   │   ├── normalization.py
│   │   │   └── reconciliation.py
│   │   │
│   │   └── main.py
│   │
│   └── ...
│
├── frontend/
│   │
│   ├── src/
│   │   │
│   │   ├── components/
│   │   │
│   │   ├── pages/
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   └── ...
│   │
│   ├── package.json
│   └── ...
│
└── README.md


---

# Backend

The backend is implemented using FastAPI.

The backend is responsible for:

1. Loading CRM events
2. Loading Calendar events
3. Normalizing event data
4. Matching CRM and Calendar records
5. Calculating confidence
6. Detecting conflicts
7. Detecting possible duplicates
8. Providing REST APIs

---

# Domain Model

The application uses domain objects including:

text
NormalizedEvent
MatchResult
DuplicateResult
ValidationIssue


## NormalizedEvent

Represents an event after source-specific normalization.

Important fields include:

text
source
source_id
title
date
raw_date
start_time
end_time
client_name
company
organizer
attendees
location
meeting_type
status
description
raw
validation_issues


---

## MatchResult

Represents a CRM ↔ Calendar matching decision.

text
crm_id
calendar_id
match_status
confidence
reasons
conflicts
validation_issues


---

## DuplicateResult

Represents a possible duplicate relationship.

text
source
record_id
duplicate_of
confidence
reasons


---

# Event Normalization

Different systems often represent the same value differently.

For example:

text
CRM:
"Meridian Capital LLC"

Calendar:
"meridian capital llc"


The normalization layer converts values into comparable forms.

The application uses helpers such as:

text
normalize_company()
normalize_name()
normalize_title()
time_to_minutes()
token_similarity()


This allows comparisons to be performed consistently.

---

# Reconciliation

The reconciliation engine is implemented in:

text
backend/app/services/reconciliation.py


The primary function is:

python
reconcile(
    crm_events,
    calendar_events
)


The reconciliation process is:

text
CRM Events
     │
     ▼
Normalize
     │
     ▼
Compare with Calendar
     │
     ▼
Calculate Confidence
     │
     ├───────────────┐
     │               │
     ▼               ▼
MATCHED          NO MATCH
                     │
              ┌──────┴──────┐
              ▼             ▼
          CRM_ONLY     Calendar checked


---

# Reconciliation States

## MATCHED

A CRM record has a sufficiently strong Calendar match.

Example:

text
CRM-1001 ↔ CAL-A1

Confidence: 85%


---

## CRM_ONLY

A CRM event does not have a sufficiently strong Calendar match.

Example:

text
CRM-1003


---

## CALENDAR_ONLY

A Calendar event does not have a sufficiently strong CRM match.

Example:

text
CAL-A3


---

# Matching Algorithm

The matching engine calculates a weighted score.

Current scoring factors include:

| Attribute           | Maximum Contribution |
| ------------------- | -------------------: |
| Same date           |                  30% |
| Exact start time    |                  30% |
| Same company/client |                  20% |
| Same client/person  |                  10% |
| Exact title         |                  20% |
| Similar title       |                  15% |
| Partial title       |                   5% |
| Similar location    |                  10% |

The final score is capped at:

text
100%


or:

text
1.00


---

# Example Scoring

Suppose:

text
Same date
Exact start time
Same company
Similar title


The score can be:

text
30%
+ 30%
+ 20%
+ 15%
------
95%


The system caps the score at 100%.

---

# Matching Threshold

The current reconciliation threshold is:

text
60%


A candidate with:

text
confidence >= 0.60


can be considered a match.

A candidate below the threshold remains unmatched.

---

# Conflict Detection

Conflicts are calculated after a CRM ↔ Calendar match has been established.

The current conflict checks include:

## Title

Example:

text
CRM:
Quarterly Business Review

Calendar:
QBR Meeting


---

## Status

Example:

text
CRM:
Planned

Calendar:
Confirmed


---

## Location

Example:

text
CRM:
New York Office

Calendar:
London Office


---

## Start Time

Example:

text
CRM:
10:00

Calendar:
10:15


---

## Date

Example:

text
CRM:
2025-03-10

Calendar:
2025-03-11


---

# Conflict Severity

The application currently uses:

text
INFO
WARNING


For example:

json
{
  "field": "start_time",
  "crm_value": "2025-03-10T10:00:00",
  "calendar_value": "2025-03-10T10:15:00",
  "severity": "WARNING"
}


---

# Duplicate Detection

Duplicate detection is separate from normal reconciliation.

The Duplicate Explorer compares:

text
CRM Events
     ↕
Calendar Events


rather than comparing records only within the same source.

This is important because the primary use case is identifying:

> CRM and Calendar records that may represent the same real-world meeting.

---

# Duplicate Detection Flow

text
              CRM EVENTS
                  │
                  │
                  ▼
        ┌───────────────────┐
        │ Compare attributes│
        │                   │
        │ Date              │
        │ Time              │
        │ Company           │
        │ Client            │
        │ Title             │
        │ Location          │
        └─────────┬─────────┘
                  │
                  ▼
           Calculate Score
                  │
          ┌───────┴───────┐
          │               │
       < 60%           >= 60%
          │               │
          ▼               ▼
       Ignore       Possible Duplicate
                          │
                          ▼
                    Human Review


---

# Duplicate Confidence

The Duplicate Explorer currently uses the same scoring framework as reconciliation.

Example:

text
CRM-1001 ↔ CAL-A1
85%


Possible reasons:

text
same calendar date
exact start time
same company/client
same client/person
exact meeting title


---

# Current Duplicate Explorer

The application currently displays:

text
Duplicate Explorer

Possible Duplicates    14
High Similarity         3
Medium Similarity      11
Records With Conflicts 14


The current data contains 14 possible CRM ↔ Calendar duplicate groups.

Examples include:

text
Q1 Portfolio Review
CRM-1001 ↔ CAL-A1
85%


text
Investor Update
CRM-1005 ↔ CAL-A5
85%


text
Pipeline Review
CRM-1006 ↔ CAL-A7
85%


text
Lunch Meeting
CRM-1008 ↔ CAL-A9
75%


text
Portfolio Walkthrough
CRM-1002 ↔ CAL-A2
60%


---

# Duplicate Explorer Filters

The UI provides confidence filters:

text
Similarity ≥ 50%
Similarity ≥ 60%
Similarity ≥ 70%
Similarity ≥ 80%


This allows reviewers to narrow the investigation list.

---

# Frontend API Service

The frontend communicates with the backend through:

text
frontend/src/services/api.js


The base URL is currently:

text
http://localhost:8000/api


Example:

javascript
const API_BASE_URL = "http://localhost:8000/api";


---

# API Endpoints

## Health

http
GET /api/health


Example:

text
http://localhost:8000/api/health


Used to verify that the backend is running.

---

# Get Meetings

http
GET /api/meetings


Returns reconciled CRM and Calendar meeting records.

---

# Get Meeting By ID

http
GET /api/meetings/{meeting_id}


Example:

text
GET /api/meetings/CRM-1001-CAL-A1


---

# Get Duplicates

http
GET /api/meetings/duplicates


This endpoint powers the Duplicate Explorer.

Example response:

json
[
  {
    "source": "crm",
    "record_id": "CRM-1001",
    "duplicate_of": "CAL-A1",
    "confidence": 0.85,
    "reasons": [
      "CRM and Calendar records may represent the same meeting",
      "same calendar date",
      "exact start time",
      "same company/client",
      "same client/person",
      "exact meeting title"
    ]
  }
]


---

# Reconciliation Summary

http
GET /api/meetings/summary/reconciliation


Returns summary information including:

text
total CRM records
total Calendar records
matched records
CRM-only records
Calendar-only records
conflicts
possible duplicates
validation issues


---

# Filter Meetings By Status

http
GET /api/meetings?match_status=MATCHED


Other supported statuses:

text
MATCHED
CRM_ONLY
CALENDAR_ONLY


---

# Get Conflict Meetings

http
GET /api/meetings?has_conflicts=true


Returns meetings containing reconciliation conflicts.

---

# API Summary

| Method | Endpoint                                   | Purpose               |
| ------ | ------------------------------------------ | --------------------- |
| GET    | `/api/health`                              | Backend health        |
| GET    | `/api/meetings`                            | All meetings          |
| GET    | `/api/meetings/{id}`                       | Meeting details       |
| GET    | `/api/meetings/duplicates`                 | Possible duplicates   |
| GET    | `/api/meetings/summary/reconciliation`     | Summary               |
| GET    | `/api/meetings?match_status=MATCHED`       | Matched records       |
| GET    | `/api/meetings?match_status=CRM_ONLY`      | CRM-only records      |
| GET    | `/api/meetings?match_status=CALENDAR_ONLY` | Calendar-only records |
| GET    | `/api/meetings?has_conflicts=true`         | Conflict records      |

---

# Local Development Setup

## Prerequisites

Install:

* Python 3.13+
* Node.js
* npm
* Git

Verify Python:

powershell
python --version


Expected:

text
Python 3.13.x


Verify Node:

powershell
node --version


Verify npm:

powershell
npm --version


---

# Backend Installation

Navigate to the backend:

powershell
cd C:\Users\Katha\Downloads\event-sync-service\backend


Create a virtual environment:

powershell
python -m venv .venv


Activate it:

powershell
.\.venv\Scripts\Activate.ps1


If PowerShell blocks script execution, use:

powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass


Then activate:

powershell
.\.venv\Scripts\Activate.ps1


Install dependencies:

powershell
python -m pip install --upgrade pip


Install project dependencies:

powershell
pip install fastapi uvicorn pydantic


---

# Running the Backend

From:

text
C:\Users\Katha\Downloads\event-sync-service\backend


run:

powershell
python -m uvicorn app.main:app --reload --port 8000


Expected output:

text
Uvicorn running on http://127.0.0.1:8000


The API is available at:

text
http://localhost:8000


---

# Swagger API Documentation

FastAPI automatically provides Swagger documentation.

Open:

text
http://localhost:8000/docs


The ReDoc documentation is also available at:

text
http://localhost:8000/redoc


Swagger can be used to test:

text
GET /api/health
GET /api/meetings
GET /api/meetings/duplicates
GET /api/meetings/summary/reconciliation


---

# Testing the Backend from PowerShell

## Health

powershell
Invoke-RestMethod http://localhost:8000/api/health


---

## Meetings

powershell
Invoke-RestMethod http://localhost:8000/api/meetings | ConvertTo-Json -Depth 10


---

## Duplicates

powershell
Invoke-RestMethod http://localhost:8000/api/meetings/duplicates | ConvertTo-Json -Depth 10


---

## Summary

powershell
Invoke-RestMethod http://localhost:8000/api/meetings/summary/reconciliation | ConvertTo-Json -Depth 10


---

# Frontend Installation

Navigate to the frontend:

powershell
cd C:\Users\Katha\Downloads\event-sync-service\frontend


Install dependencies:

powershell
npm install


---

# Running the Frontend

Run:

powershell
npm run dev


Vite will normally display an address similar to:

text
http://localhost:5173


Open that address in the browser.

---

# Running the Full Application

Two terminals are normally required.

## Terminal 1 — Backend

powershell
cd C:\Users\Katha\Downloads\event-sync-service\backend
python -m uvicorn app.main:app --reload --port 8000


## Terminal 2 — Frontend

powershell
cd C:\Users\Katha\Downloads\event-sync-service\frontend
npm run dev


Then open the Vite URL in the browser.

---

# Frontend Navigation

The application contains a workspace-style navigation structure.

Typical navigation includes:

text
Workspace
│
├── Dashboard
├── Meetings
├── Reconciliation
├── Duplicate Explorer
└── ...


The left navigation allows users to move between different UI screens.

---

# Duplicate Explorer

The Duplicate Explorer is designed for investigation of potential cross-system duplicates.

The page contains:

text
Duplicate Explorer
│
├── Analysis Ready
│
├── Summary Cards
│   ├── Possible Duplicates
│   ├── High Similarity
│   ├── Medium Similarity
│   └── Records With Conflicts
│
├── Similarity Filters
│
├── Duplicate Groups
│
└── Detail Panel


---

# Duplicate Group

Each duplicate group displays:

text
Meeting title
Company
Client
Date
Confidence
CRM ID
Calendar ID


Example:

text
Q1 Portfolio Review

Meridian

David Park
3/10/2025

85%

CRM-1001 ↔ CAL-A1


---

# Refresh

The Duplicate Explorer provides a refresh action.

The refresh operation reloads:

text
Meetings
Conflicts
Duplicates


from the backend API.

---

# Error Handling

The frontend API service checks HTTP response status.

For example:

javascript
if (!response.ok) {
    throw new Error(...)
}


Backend API errors are therefore surfaced to the UI.

---

# Troubleshooting

## `uvicorn` is not recognized

Instead of:

powershell
uvicorn app.main:app --reload --port 8000


use:

powershell
python -m uvicorn app.main:app --reload --port 8000


This ensures Python executes the installed Uvicorn module.

---

# Backend Port Already in Use

If port 8000 is already occupied:

powershell
netstat -ano | findstr :8000


Find the PID and terminate the process if appropriate:

powershell
taskkill /PID <PID> /F


Then restart:

powershell
python -m uvicorn app.main:app --reload --port 8000


---

# Frontend Cannot Connect to Backend

Verify the backend is running:

powershell
Invoke-RestMethod http://localhost:8000/api/health


Then verify the frontend API configuration:

text
frontend/src/services/api.js


The current configuration should point to:

text
http://localhost:8000/api


---

# Duplicate Explorer Shows Zero Duplicates

Check the backend directly:

powershell
Invoke-RestMethod http://localhost:8000/api/meetings/duplicates | ConvertTo-Json -Depth 10


If it returns:

text
[]


check:

text
backend/app/services/reconciliation.py


The duplicate detector must compare:

text
CRM ↔ Calendar


rather than only:

text
CRM ↔ CRM
Calendar ↔ Calendar


The current implementation performs cross-source comparison.

---

# Browser Console Debugging

The Duplicate Explorer logs API responses.

Typical logs include:

text
Duplicate Explorer - meetings:
Duplicate Explorer - conflicts:
Duplicate Explorer - duplicates:


For example:

text
Duplicate Explorer - duplicates:
Array(14)


This confirms that the frontend received 14 duplicate candidates from the backend.

---

# CORS

The FastAPI application includes CORS configuration so that the Vite frontend can communicate with the backend during local development.

The typical development architecture is:

text
Frontend
localhost:5173

        │
        │ HTTP
        ▼

Backend
localhost:8000


---

# Production Considerations

For production deployment, the following areas should be addressed.

## 1. External Configuration

The frontend API URL should be configurable through environment variables instead of hardcoded localhost URLs.

Example:

text
VITE_API_BASE_URL


---

## 2. Authentication

Production APIs should use authentication and authorization.

Possible options include:

text
OAuth 2.0
OpenID Connect
JWT
Enterprise Identity Provider


---

## 3. Persistent Storage

The current development implementation can operate with normalized in-memory event data.

A production implementation should use a persistent database.

Possible choices:

text
PostgreSQL
Cloud SQL
Azure Database
Amazon RDS


---

## 4. Event Ingestion

Production integrations can be added for:

text
CRM
Google Calendar
Microsoft Outlook
Salesforce
HubSpot
Microsoft Dynamics


---

## 5. Asynchronous Processing

For large event volumes, reconciliation should be moved to background processing.

Possible architecture:

text
CRM
 │
 ▼
Message Queue
 │
 ▼
Normalization
 │
 ▼
Matching Engine
 │
 ▼
Duplicate Detection
 │
 ▼
Database
 │
 ▼
REST API
 │
 ▼
React UI


Possible technologies:

text
Kafka
Google Pub/Sub
AWS SQS/SNS
Azure Service Bus
RabbitMQ


---

# Scalability

For large datasets, the current pairwise comparison:

text
CRM events × Calendar events


can become expensive.

For example:

text
100,000 CRM events
×
100,000 Calendar events
=
10 billion comparisons


A production implementation should introduce candidate generation.

Possible blocking keys include:

text
Date
Company
Client
Time window
Normalized title tokens
Location


For example:

text
Same date
      +
Same company
      +
Time within 30 minutes


can dramatically reduce the number of candidates requiring detailed similarity calculations.

---

# Future Enhancements

## 1. Duplicate Review Actions

Add:

text
Confirm Duplicate
Reject Duplicate
Ignore
Merge


---

## 2. Review Status

Add statuses such as:

text
PENDING_REVIEW
CONFIRMED_DUPLICATE
REJECTED
IGNORED


---

## 3. Audit History

Track:

text
Who reviewed the duplicate
When it was reviewed
What decision was made
Previous confidence
Review comments


---

## 4. Advanced Matching

Potential future matching techniques:

text
Fuzzy matching
Levenshtein similarity
TF-IDF
Embedding similarity
Semantic search
Machine-learning classification


---

## 5. Explainable Matching

Expose detailed scoring:

text
Date                +30%
Start Time          +30%
Company             +20%
Client              +10%
Title               +15%
Location            +10%
                    -----
                    115%
                    capped at 100%


This makes matching decisions easier for business users to understand.

---

## 6. Human-in-the-Loop Workflow

Recommended production workflow:

text
Possible Duplicate
        │
        ▼
Human Review
        │
   ┌────┴────┐
   │         │
   ▼         ▼
Confirm    Reject
   │         │
   ▼         ▼
Merge/     Keep
Link       Separate


---

# Security Considerations

Production deployment should consider:

* Authentication
* Authorization
* TLS/HTTPS
* Secret management
* API rate limiting
* Input validation
* Audit logging
* PII protection
* Encryption at rest
* Encryption in transit
* Secure CORS configuration

---

# Observability

A production deployment should include:

## Logging

text
API requests
Matching decisions
Duplicate detection
Validation failures
Integration failures


## Metrics

Useful metrics include:

text
Total CRM events
Total Calendar events
Matched events
CRM-only events
Calendar-only events
Possible duplicates
Confirmed duplicates
Conflict rate
Average confidence
Processing time


## Tracing

For distributed integrations:

text
OpenTelemetry


can be used to trace an event from ingestion through reconciliation and duplicate detection.

---

# Example End-to-End Flow

Consider:

text
CRM Event

CRM-1001
Q1 Portfolio Review
Meridian
David Park
2025-03-10
10:00 AM


and:

text
Calendar Event

CAL-A1
Q1 Portfolio Review
Meridian
David Park
2025-03-10
10:00 AM


The system evaluates:

text
Date               ✓
Start Time         ✓
Company            ✓
Client             ✓
Title              ✓
Location           ✓


The resulting confidence may be:

text
85%


The Duplicate Explorer then displays:

text
Q1 Portfolio Review

85%

CRM-1001 ↔ CAL-A1


The reviewer can inspect the supporting evidence before taking any further action.

---

# Current Application Status

The current implementation provides a working foundation for CRM ↔ Calendar event reconciliation.

### Working

* FastAPI backend
* React/Vite frontend
* REST API
* Event normalization
* CRM ↔ Calendar reconciliation
* Match confidence
* CRM-only detection
* Calendar-only detection
* Conflict detection
* Cross-source duplicate detection
* Duplicate confidence
* Duplicate Explorer
* Similarity filtering
* Conflict summary
* Backend Swagger documentation
* Frontend API integration
* Left-side application navigation

Current example dataset:

text
Possible Duplicates: 14
High Similarity:      3
Medium Similarity:   11
Conflicts:            14


---

# Recommended Next Development Phase

The next major feature should be a complete **Duplicate Review Workflow**.

Recommended design:

text
Duplicate Explorer
        │
        ▼
Select Candidate
        │
        ▼
CRM vs Calendar Comparison
        │
        ├── Matching Evidence
        │
        ├── Field Differences
        │
        ├── Confidence Breakdown
        │
        └── Source Details
                │
                ▼
          Human Review
                │
          ┌─────┴─────┐
          ▼           ▼
       Confirm       Reject
       Duplicate     Duplicate


This would evolve the application from a reconciliation dashboard into a more complete **event data-quality and synchronization platform**.

---

# License

Add the applicable project license here.

For example:

text
MIT License


if the project is intended to be released under MIT.

---

# Author

Event Sync Service

Built as a full-stack event reconciliation and duplicate-detection platform using:

text
Python
FastAPI
React
Vite
REST APIs






# Quick Start — Run Backend and Frontend

The application requires **two terminals**: one for the FastAPI backend and one for the React/Vite frontend.

## 1. Start the Backend

Open **PowerShell Terminal 1**:

powershell
cd C:\Users\Katha\Downloads\event-sync-service\backend


Create the virtual environment if it does not already exist:

powershell
python -m venv .venv


Activate the virtual environment:

powershell
.\.venv\Scripts\Activate.ps1


If PowerShell blocks script execution:

powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass


Then activate again:

powershell
.\.venv\Scripts\Activate.ps1


Install the required backend packages:

powershell
python -m pip install --upgrade pip
pip install fastapi uvicorn pydantic


Start the FastAPI server:

powershell
python -m uvicorn app.main:app --reload --port 8000


The backend will be available at:

text
http://localhost:8000


Health check:

text
http://localhost:8000/api/health


Swagger API documentation:

text
http://localhost:8000/docs


Keep this terminal running.

---

## 2. Start the Frontend

Open **PowerShell Terminal 2**:

powershell
cd C:\Users\Katha\Downloads\event-sync-service\frontend


Install frontend dependencies:

powershell
npm install


Start the Vite development server:

powershell
npm run dev


Vite will display the frontend URL in the terminal, normally:

text
http://localhost:5173


Open the displayed URL in your browser.

---

## 3. Run Both Applications

The final local setup should look like this:

text
┌─────────────────────────────────────────────┐
│              Browser                        │
│                                             │
│        React + Vite Frontend                │
│        http://localhost:5173                │
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API
                       ▼
┌─────────────────────────────────────────────┐
│              FastAPI Backend                │
│        http://localhost:8000                │
│                                             │
│        /api/meetings                        │
│        /api/meetings/duplicates             │
│        /api/meetings/summary/reconciliation │
└─────────────────────────────────────────────┘


### Terminal 1 — Backend

powershell
cd C:\Users\Katha\Downloads\event-sync-service\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000


### Terminal 2 — Frontend

powershell
cd C:\Users\Katha\Downloads\event-sync-service\frontend
npm run dev


---

## 4. Verify the Backend

From another PowerShell window:

powershell
Invoke-RestMethod http://localhost:8000/api/health


Check the meetings API:

powershell
Invoke-RestMethod http://localhost:8000/api/meetings | ConvertTo-Json -Depth 10


Check duplicate detection:

powershell
Invoke-RestMethod http://localhost:8000/api/meetings/duplicates | ConvertTo-Json -Depth 10


Check reconciliation summary:

powershell
Invoke-RestMethod http://localhost:8000/api/meetings/summary/reconciliation | ConvertTo-Json -Depth 10


---

## 5. Open the Application

Once both terminals are running:

1. Open the frontend URL shown by Vite.
2. Open **Workspace** from the left navigation.
3. Select **Duplicate Explorer**.
4. The page loads data from the FastAPI backend.
5. Possible CRM ↔ Calendar duplicates are displayed with confidence percentages.
6. Select a duplicate group to inspect its matching evidence.

---

## Important

Always start the **backend first** and then the **frontend**.

If the frontend shows API/network errors, verify that this is running:

powershell
python -m uvicorn app.main:app --reload --port 8000


and that:

text
http://localhost:8000/api/health


is accessible before troubleshooting the frontend.
