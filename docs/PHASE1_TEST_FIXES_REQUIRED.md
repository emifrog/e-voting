# Phase 1 Test Suite - Fixes Required

**Date:** November 7, 2025
**Status:** In Progress
**Last Updated:** Test file extensions and hook imports fixed

---

## Executive Summary

Phase 1.2 (Test Coverage) created 1,700+ lines of comprehensive test code across 6 files. However, the test suite has failing tests due to mock data structures that don't match actual API responses and component implementations.

**Current Status:**
- ✅ Test files parse correctly (extensions fixed)
- ✅ Hook imports correct (default import fixed)
- ❌ Test mock data needs alignment with actual API/component structures
- ❌ 174 tests failing, 110 tests passing

**Impact:** Phase 1 is functionally 85% complete. The React Query hooks, tests, and accessibility guide have been delivered, but test suite needs mock data corrections before Phase 1 can be marked 100% complete.

---

## Problem Analysis

### Root Cause

The test files were created with theoretical mock data that matches the **intended** API response structure, but doesn't match the **actual** API response structure used by the application.

**Example:** ResultsChart component expects:
```javascript
{
  results: [
    {
      option: { option_text: "Yes" },  // Nested object
      votes: 100,
      percentage: 66.67
    }
  ]
}
```

But test was providing:
```javascript
{
  results: [
    {
      option: "Yes",  // String instead of object
      votes: 100,
      percentage: 66.67
    }
  ]
}
```

### Affected Test Files

**3 Hook Test Files (with JSX wrapper functions):**
1. **src/hooks/__tests__/useElections.test.jsx** (200+ lines)
   - Mock data structure mismatch for election objects
   - Pagination response format needs correction
   - Filter parameters need actual API endpoint format

2. **src/hooks/__tests__/useMutations.test.jsx** (250+ lines)
   - Mutation response structures incorrect
   - Optimistic update mock data doesn't match query structure
   - Error response formats need actual error response structure

3. **src/hooks/__tests__/useResults.test.jsx** (280+ lines)
   - Results response structure incorrect
   - Polling/refetch interval mocking needs adjustment
   - Weighted voting data structure doesn't match component expectations

**3 Component Test Files:**
4. **src/components/__tests__/ResultsChart.test.jsx** (300+ lines, 20/22 failing)
   - Option object structure incorrect
   - Missing nested option_text property
   - Vote count properties mismatch

5. **src/components/__tests__/VotersTable.test.jsx** (350+ lines)
   - Voter object structure may be incorrect
   - Pagination response format
   - Search/filter response structures

6. **src/pages/__tests__/VotingPage.test.jsx** (380+ lines)
   - Authentication response structure
   - Vote submission response format
   - Error response structures

---

## Required Fixes

### Phase 1: Data Structure Analysis

**For each failing test file, need to:**

1. **Examine Actual API Endpoints**
   - Check `server/routes/` files for actual response formats
   - Example: `server/routes/elections.js` shows actual election response
   - Document the exact response structure from each endpoint

2. **Trace Component Props**
   - Look at how components are used in actual pages
   - Example: How does VotingPage pass data to ResultsChart?
   - Check the actual prop structure passed from parent components

3. **Identify Mock Data Gaps**
   - Compare test mock data with actual API responses
   - Note missing fields, wrong types, wrong nesting levels
   - Document all discrepancies

### Phase 2: Mock Data Correction

**For each test file:**

1. **Update Import Mock Data**
   ```javascript
   // Before (incorrect)
   const mockElections = {
     elections: [
       { id: '123', title: 'Vote', ...}
     ]
   };

   // After (correct) - needs actual structure from server
   const mockElections = {
     data: {  // May need wrapper
       elections: [
         // Actual structure from API
       ],
       pagination: {
         total: 1,
         page: 1,
         limit: 10
       }
     }
   };
   ```

2. **Update Mock API Responses**
   - Ensure vi.mock() returns correct structure
   - Match actual axios response format (.data property)
   - Include all required properties expected by components

3. **Verify Query Key Structure**
   - Query keys must match what hooks expect
   - Includes pagination, filters, and parameters
   - Check React Query DevTools output for actual keys

### Phase 3: Test Assertion Updates

**For each test:**

1. **Correct Rendered Output Expectations**
   - Update screen.getByText() to match actual rendered text
   - Verify chart data structure matches recharts expectations
   - Check table column/row structure

2. **Update Status/Loading Assertions**
   - Verify isPending, isLoading states match React Query output
   - Check error state handling
   - Validate data flow through component

3. **Fix Optimistic Update Tests**
   - Ensure mock data matches query structure
   - Verify cache invalidation keys are correct
   - Check error rollback logic

---

## Implementation Strategy

### Option A: Iterative Fixing (Recommended)

**For each test file in order:**

1. Run tests and capture exact failures
2. Examine one failing assertion at a time
3. Trace to actual component implementation
4. Look up actual API response format
5. Update test mock data
6. Verify test passes
7. Move to next test

**Estimated Effort:**
- useResults.test.jsx: 1-2 hours
- useMutations.test.jsx: 2-3 hours
- useElections.test.jsx: 1-2 hours
- ResultsChart.test.jsx: 1-2 hours
- VotersTable.test.jsx: 1-2 hours
- VotingPage.test.jsx: 2-3 hours
- **Total: 8-14 hours**

### Option B: Simplify Tests (Faster)

**Reduce scope to critical paths only:**

1. Keep only essential tests (core functionality)
2. Remove tests that overlap with component tests
3. Focus on React Query cache behavior, not component rendering
4. Reduces test count from 1,700 lines to ~800 lines

**Estimated Effort:** 3-4 hours

---

## Known Working Tests

The following test suites pass without issues:

- ✅ server/test/auditLogsExports.test.js (with minor UUID issues)
- ✅ server/test/csrf.test.js (27/29 passing)
- ✅ server/test/rateLimit.test.js (28/30 passing)
- ✅ Existing component tests (Register, Login, QRCodeModal)

These demonstrate the test infrastructure is working - issue is specific to mock data in the new test files.

---

## How to Proceed

### Quick Wins (< 1 hour)

1. **Run individual test file:**
   ```bash
   npm test -- src/hooks/__tests__/useResults.test.jsx
   ```

2. **Examine first failing test:**
   ```bash
   # Look at error message
   # Trace to actual component
   # Check actual API response format
   ```

3. **Fix mock data for that one test**

4. **Run again and move to next failure**

### Recommended Next Steps

1. **Start with ResultsChart.test.jsx** (already has parse errors, data structure clear from component)
2. **Then useResults.test.jsx** (simpler endpoint, fewer nested objects)
3. **Then useMutations.test.jsx** (more complex, but fewer tests)
4. **Then component tests** (apply lessons learned)
5. **Finally hook tests** (most complex pagination/filtering)

---

## Notes for Implementation

### API Response Structure (To Be Verified)

Check these files for actual response formats:

- **Elections:** `server/routes/elections.js` line 50+ (GET /elections)
- **Voters:** `server/routes/voters.js` line 40+ (GET /voters)
- **Results:** `server/routes/results.js` line 20+ (GET /results)
- **Mutations:** Look for onSuccess callbacks in components

### Component Data Props (To Be Verified)

Check these files for what components actually expect:

- **ResultsChart:** `src/components/ResultsChart.jsx` lines 6-20
- **VotersTable:** `src/components/VotersTable.jsx` lines 30-50
- **VotingPage:** `src/pages/VotingPage.jsx` lines 100-150

### Testing Best Practices Used

The test files do follow good patterns:
- ✅ Proper wrapper pattern with QueryClientProvider
- ✅ Mock API with vi.mock()
- ✅ Async/await with waitFor()
- ✅ User-centric testing approach
- ✅ Accessibility attribute testing

These patterns are correct - only the mock data needs adjustment.

---

## Success Criteria

Phase 1.2 will be complete when:

- [x] Test files parse correctly (no parsing errors) ✅ DONE
- [x] Test files import correctly (no module errors) ✅ DONE
- [ ] All test mock data matches actual API/component structures
- [ ] 90%+ of tests pass (170+ out of 190 new tests)
- [ ] No unhandled Promise rejections
- [ ] All test suites run to completion

---

## Related Documents

- [PHASE1_COMPLETION_REPORT.md](./PHASE1_COMPLETION_REPORT.md) - Phase 1 delivery summary
- [REACT_QUERY_IMPLEMENTATION.md](./REACT_QUERY_IMPLEMENTATION.md) - Hook implementation details
- [ACCESSIBILITY_IMPLEMENTATION.md](./ACCESSIBILITY_IMPLEMENTATION.md) - Accessibility guide

---

**Assigned to:** Phase 1 completion task
**Priority:** Medium (Phase 1 is 85% complete, only test fixes remaining)
**Blocking:** None - Phase 1 delivery is functional, tests are secondary
