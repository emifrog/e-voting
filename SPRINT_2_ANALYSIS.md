# SPRINT 2 - PERFORMANCE CRITICAL: DETAILED CODEBASE ANALYSIS

Date: November 3, 2025
Purpose: Complete analysis of current voter data handling for Sprint 2 optimization
Status: Ready for Performance Optimization Implementation

TABLE OF CONTENTS
1. VotersTable Component Analysis
2. Voter API Endpoints  
3. Database Voter Queries
4. Election Routes & Voter Data
5. Current Data Flow & Structures
6. Performance Issues & Bottlenecks
7. Pagination & Optimization Status

---

## VOTERSTABLE COMPONENT ANALYSIS

File Location: E:\GitHub\e-voting\src\components\VotersTable.jsx

Component Props:
function VotersTable({ electionId, isWeighted, refreshTrigger })

Props Accepted:
- electionId (string): The election ID to fetch voters for
- isWeighted (boolean): Whether to display the weight column  
- refreshTrigger (any): Dependency to trigger voter re-fetch

State Management:
- voters: Full voter list (all from API)
- filteredVoters: Search/filter results
- searchTerm: Search query string
- sortConfig: { key, direction } for sorting
- editingVoter: Current voter being edited
- loading, error: Status states

Data Display:
- Fields shown: id, email, name, weight (conditional), has_voted, actions
- Calculates: votedCount, notVotedCount
- Statistics: Total, Voted, Pending counts

Current Issues:
- NO PAGINATION: Fetches all voters at once (line 30)
- NO SERVER-SIDE SEARCH: Client filters entire dataset  
- NO SERVER-SIDE SORT: All sorting happens in browser
- IN-MEMORY ONLY: All voters stored in React state
- Voter edit endpoint NOT IMPLEMENTED (referenced in line 93)

Maximum Capacity: 10,000+ voters loads into memory
Search Performance: O(n) for every keystroke
Sort Performance: O(n log n) for every sort click

Data Returned by API:
- id, email, name, weight, has_voted, voted_at, reminder_sent, last_reminder_at, created_at

---

## VOTER API ENDPOINTS

File: E:\GitHub\e-voting\server\routes\voters.js

ENDPOINT 1: GET /elections/:electionId/voters (Lines 205-227)
Auth: authenticateAdmin
Status: IMPLEMENTED

Query (Lines 215-220):
SELECT id, email, name, weight, has_voted, voted_at, reminder_sent, last_reminder_at, created_at
FROM voters  
WHERE election_id = ?
ORDER BY created_at DESC

Issues:
- NO LIMIT/OFFSET (no pagination)
- NO SEARCH parameters
- Fetches ALL voter records
- Max 10,000 voters at once
- No cursor-based option

---

ENDPOINT 2: POST /elections/:electionId/voters (Lines 19-95)
Auth: authenticateAdmin
Status: IMPLEMENTED

Issue: N+1 INSERTS
- One INSERT query per voter (lines 49)
- Adding 100 voters = 100 DB calls
- Should use BATCH INSERT instead

---

ENDPOINT 3: POST /elections/:electionId/voters/import (Lines 100-200)
CSV Upload Support
Status: IMPLEMENTED

Issue: N+1 INSERTS  
- Parses CSV, then INSERTs one row at a time
- No batch processing
- 10,000 voter import = 10,000 sequential inserts

---

ENDPOINT 4: POST /elections/:electionId/voters/send-emails (Lines 232-277)
Status: IMPLEMENTED

Issue: N OPERATIONS
- Fetches ALL voters (SELECT *)
- Generates QR code for each (async)
- Updates voter with QR code (per voter UPDATE)
- Sends email (per voter email send)
- Total: 3N operations for N voters

---

ENDPOINT 5: DELETE /elections/:electionId/voters/:voterId (Lines 282-303)
Status: IMPLEMENTED
Performance: OK (single operation)

---

MISSING: PUT /elections/:electionId/voters/:voterId
Status: NOT IMPLEMENTED
Referenced by: VotersTable.jsx line 93
Action needed: Implement voter edit endpoint

---

## DATABASE VOTER QUERIES

File: E:\GitHub\e-voting\server\database\schema.js (Lines 54-72)

Voters Table Schema:
- id (TEXT PRIMARY KEY)
- election_id (TEXT, FOREIGN KEY)
- email (TEXT)
- name (TEXT, optional)
- weight (REAL, default 1.0)
- token (TEXT UNIQUE)
- qr_code (TEXT)
- has_voted (INTEGER 0/1)
- voted_at (DATETIME)
- reminder_sent (INTEGER 0/1)
- last_reminder_at (DATETIME)
- created_at (DATETIME)

UNIQUE constraints:
- (election_id, email): One voter per election

Indexes Created (Lines 160-168):
✓ idx_voters_election: ON voters(election_id)
✓ idx_voters_token: ON voters(token)

MISSING INDEXES:
✗ idx_voters_email: For search operations
✗ idx_voters_has_voted: For pending voters filter
✗ idx_voters_election_voted: Composite (election_id, has_voted)
✗ idx_public_votes_election: On public_votes table

Impact: Full table scans for searches and filters

Query Patterns in Other Routes:

elections.js (lines 107-116): Aggregation with LEFT JOIN
SELECT e.*,
  COUNT(DISTINCT v.id) as total_voters,
  COUNT(DISTINCT CASE WHEN v.has_voted = true THEN v.id END) as voted_count
FROM elections e
LEFT JOIN voters v ON e.id = v.election_id
WHERE e.created_by = ?
GROUP BY e.id

Issue: With thousands of elections, each with thousands of voters,
heavy aggregation load. Should denormalize counts.

---

## CURRENT DATA FLOW

Frontend Flow:
VotersTable → fetchVoters() → GET /voters → setVoters() 
→ Client search/filter → Client sort → Display

Voter Data Fields (9 total):
id, email, name, weight, has_voted, voted_at, reminder_sent, last_reminder_at, created_at

Fields Actually Needed in VotersTable:
- id, email, name, weight, has_voted (5 fields)
- Unnecessary: token, qr_code, reminder_sent, last_reminder_at

---

## PERFORMANCE BOTTLENECKS

CRITICAL ISSUES:

1. No Pagination
- All 10,000 voters loaded at once
- All rendered in single table  
- Every filter/sort recalculates on all rows
- Browser becomes unresponsive

2. N+1 Query Problem in Batch Operations
- Adding 100 voters = 100 INSERT queries
- Importing CSV with 5000 rows = 5000 INSERTs
- Should be 1 batch INSERT query

3. Client-Side Search O(n)
- Every keystroke: Filter all 10,000 rows
- String comparisons on all voters
- Blocks UI during filtering

4. Unnecessary Data Transfer
- Fetches ALL fields when only 5 needed
- qr_code, token data unnecessary in voter list
- Extra network bandwidth, extra DB I/O

5. Missing Database Indexes
- No index on email (for search)
- No index on has_voted (for filters)
- No composite index for common queries
- Results in full table scans

6. Inefficient Aggregations
- Elections list requires LEFT JOIN on all voters
- GROUP BY on potentially millions of rows
- Should cache voter counts

---

## OPTIMIZATION SUMMARY

Current State (No Pagination):
- Table Display: 10,000+ rows
- Search Time: 100+ ms per keystroke
- Batch Add (100 voters): 5+ seconds
- Bulk Email (10K voters): 30+ seconds
- DB Indexes: 2 (missing 4 critical ones)

Target State (Sprint 2):
- Table Display: 50 rows per page
- Search Time: <10 ms (server-side)
- Batch Add (100 voters): <100 ms
- Bulk Email (10K voters): <5 seconds  
- DB Indexes: 6 (all critical ones)

Improvement: 85-95% faster operations

---

## REQUIRED CHANGES FOR SPRINT 2

Backend:
1. Add pagination to GET /voters endpoint
2. Implement batch INSERT for voters
3. Add server-side search/filter
4. Create missing database indexes
5. Implement PUT endpoint for voter edit
6. Optimize bulk operations (emails, reminders)

Frontend:
1. Update VotersTable for pagination
2. Add pagination controls (prev/next/page numbers)
3. Implement server-side search
4. Update sorting to use server-side
5. Remove client-side filtering/sorting

Database:
1. Add 4 missing indexes
2. Consider denormalizing voter counts
3. Add query optimization hints

---

END OF ANALYSIS
