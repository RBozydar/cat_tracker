# Migration Plan: date-utils.ts to date-fns v4

## Overview
Moving from custom date-utils wrapper to direct date-fns usage with proper timezone handling.
Key principle: Store/pass dates in UTC, render in user's timezone.

## Required Changes

### 1. Dependencies
- Remove @date-fns/tz
- Update date-fns to v4
- Add date-fns/tz

### 2. Core Date Utils Removal
Remove date-utils.ts entirely and replace with direct date-fns imports.

### 3. Component Updates

#### EditMealDialog
typescript:src/components/tests/edit-meal-dialog.test.tsx
startLine: 160
endLine: 210

- Replace formatDateTime with date-fns format
- Add timezone context for date rendering
- Update date handling in form submission

#### MealSummary
- Replace date grouping logic with date-fns groupBy
- Update date formatting to use format with timezone context
- Move groupMealsByDate function here since it's meal-specific

#### CalorieSummary 
- Update date range calculations to use date-fns with timezone context
- Replace date formatting with direct date-fns calls

### 4. Test Updates

#### date-utils.test.ts
- Remove file entirely
- Move meal grouping tests to meal-calculations.test.ts
- Create new timezone-specific test utilities

#### edit-meal-dialog.test.ts
- Update timezone mocking approach
- Use date-fns test utilities

### 5. API Layer
- Ensure all dates are stored/transmitted in UTC
- Add timezone handling for query parameters
- Update date range query creation to use date-fns

### 6. Type Updates
- Remove TZDate type usage
- Add proper date-fns v4 types where needed

## Migration Steps

1. Create new timezone context provider
2. Update component imports
3. Replace date-utils functions one at a time
4. Update tests
5. Remove date-utils.ts
6. Add timezone-aware formatting utilities where needed

## Testing Strategy

1. Add timezone simulation in jest setup
2. Create test cases for DST edge cases
3. Test date formatting in different locales
4. Verify UTC storage/transmission in API tests

## Rollout Plan

1. Add new dependencies
2. Create timezone context
3. Migrate components in this order:
   - EditMealDialog
   - MealSummary
   - CalorieSummary
4. Update tests
5. Remove date-utils.ts
6. Final verification

## Validation

- Check DST handling
- Verify timezone conversions
- Test in multiple browsers
- Verify date persistence format

Overview
Modernize date handling across the Cat Meal Tracker application by migrating from custom date utilities to date-fns v4, ensuring consistent timezone handling and improved maintainability.

The application currently uses a mix of custom date utilities and @date-fns/tz, leading to:
Inconsistent timezone handling
Duplicate date formatting logic
Complex test maintenance
Potential DST-related bugs
Goals
Standardize date handling across the application
Improve timezone support for international users
Reduce code complexity
Enhance test reliability
Maintain backward compatibility for existing features
User Stories
Core Functionality
As a user, I want all dates to display in my local timezone
As a user, I want consistent date formatting across the application
As a user, I want meal times to be correctly grouped by my local day
As a user, I want DST changes to be handled correctly
Admin/Developer Experience
As a developer, I want simplified date handling utilities
As a developer, I want reliable test environments for date-dependent features
As a developer, I want clear patterns for handling timezone-aware dates
Technical Requirements
Date Storage
Store all dates in UTC format in the database
Use ISO 8601 format for API communications
Maintain timezone information in user preferences

Frontend components
Implement timezone context provider
Update all date displays to use timezone-aware formatting
Migrate date input components to use date-fns v4
Add timezone indicators where appropriate
API Layer
Add timezone handling for query parameters
Standardize date format in API responses
Add validation for date-related inputs


Testing
Add timezone simulation capabilities
Create test utilities for date assertions
Add DST transition test cases
Implement timezone-aware test helpers
Success Metrics
Reduced code complexity (measured by cyclomatic complexity)
Improved test coverage for date-related functionality
Zero timezone-related bugs in production
Reduced bundle size from removed date utilities
Improved developer velocity in date-related features
Migration Strategy
Phase 1: Infrastructure
Add new dependencies
Create timezone context
Add test utilities
Phase 2: Component Migration
EditMealDialog
MealSummary
CalorieSummary
Phase 3: API Updates
Update query parameter handling
Standardize date formats
Add validation
Phase 4: Testing & Validation
Update existing tests
Add new test cases
Verify timezone handling