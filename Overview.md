Overview
A web application for tracking pet food consumption and managing feeding schedules across multiple pets.
The app helps pet owners monitor caloric intake and maintain healthy feeding habits.
Core Functionality is tracking the meals that pets eat and their calorie consumption

Tech Requirements
- React
- Typescript
- Tailwind CSS
- Shadcn UI
- Prisma with supabase database (potentialy move to another database later)
- Supabase for auth (potentialy move to another auth provider later)

Core Functionality
1. Pet Management
    - Add Pet
    - Edit Pet
        - record pet weight
    - Delete Pet
    - Assign food type
        - default food type
        - override food type for today
2. Meal Management
    - Add Meal
    - Edit Meal
    - Delete Meal
3. Food Management
    - Add Food
    - Edit Food
    - Delete Food
    - Assign Food to Pet
        - start date (default today)
        - end date (if any)
4. Meal History
    - View by date
    - View by range
4. Weight History
    - Register weight   
    - View history
5. Meal Summary
    - View summary
    - View by date
    - View by range
6. Meal Analytics
    - View analytics
7. Household Management
    - Add Household
    - Edit Household
    - Delete Household
    - Edit Members of Household
    - Add Members to Household
    - Remove Members from Household

Pages:
HomePage:
    - adding meals
    - todays summary
    - last 7 days summary
Pets:
    - Pet Management
    - Pet History
    - Pet Analytics
Food:
    - Food Management
Household:
    - Household Management
History:
    - Meal History & Analytics
    - Weight History & Analytics