Here's a prioritized list of proposed improvements based on the codebase analysis:
1. Date Handling Consolidation
Create a unified date handling service in date-utils.ts
Currently scattered across components (MealSummary, CalorieSummary, EditMealDialog)
Reference: meal-summary.tsx lines 86-94 and calorie-summary.tsx lines 57-67
2. API Error Handling Standardization
Create consistent error response structure across all API routes
Implement shared error handling middleware
Reference: Compare inconsistencies between meals/route.ts lines 98-102 and cats/[id]/route.ts lines 33-36
3. Meal Calculations Optimization
Move date filtering logic from components to meal-calculations.ts
Add caching for expensive calculations
Reference: meal-calculations.ts lines 14-40
4. Component State Management
Abstract common meal filtering logic into a custom hook
Currently duplicated in MealHistory and MealSummary
Reference: meal-history.tsx lines 27-33
5. Test Coverage Improvements
Add tests for date handling edge cases
Add integration tests for meal filtering
Reference: meal-summary.test.tsx lines 96-116
6. Type Safety Enhancements
Create stricter types for API responses
Add zod schemas for API responses
Reference: All API route files
7. Loading State Management
Implement consistent loading state handling
Create reusable loading components
Reference: Compare meal-summary.tsx line 70 and calorie-summary.tsx line 81
8. Dialog Component Abstraction
Create a reusable dialog HOC for edit/delete operations
Reference: edit-meal-dialog.tsx and delete-meal-dialog.tsx
9. API Route Organization
Implement proper middleware for common operations
Add request validation middleware
Reference: All API route files
10. Logging Enhancement
Implement structured logging
Add request ID tracking
Reference: Current scattered console.log calls throughout components
Performance Optimization
Implement proper data fetching patterns
Add SWR or React Query for data caching
Reference: calorie-summary.tsx lines 22-48
12. Code Duplication Removal
Abstract common fetch logic
Create shared validation schemas
Reference: Compare similar patterns in all API routes

- toast notifications for succesful meal submission
- Meal History page
    - Average calories consumed per cat/pet per day over last 7 days compared to target calories for the cat/pet
    - Last 7 days summary detailed
    - add charts from shacdn charts