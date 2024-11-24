- toast notifications for succesful meal submission
- Meal History page
    - Average calories consumed per cat/pet per day over last 7 days compared to target calories for the cat/pet
    - Last 7 days summary detailed

Authentication & Household Management
Based on your requirements, I recommend:
Authentication: Start with email/password + magic links
Data Structure: Household-centric with future expansion capability
// prisma/schema.prisma
model Household {
  id        String   @id @default(cuid())
  name      String
  members   HouseholdMember[]
  cats      Cat[]
  settings  Settings?
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  households HouseholdMember[]
}

model HouseholdMember {
  id          String   @id @default(cuid())
  household   Household @relation(fields: [householdId], references: [id])
  householdId String
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  role        Role     @default(MEMBER)
}

enum Role {
  OWNER
  ADMIN
  MEMBER
  READONLY
}

Implementation Steps:
// src/lib/auth.ts
export async function inviteToHousehold(email: string, householdId: string) {
  // 1. Check if user exists
  // 2. If not, create placeholder user
  // 3. Send invitation email
  // 4. Create HouseholdMember when accepted
}

// src/app/api/households/[id]/members/route.ts
export async function POST(req: Request) {
  const { email, role } = await req.json()
  const householdId = req.params.id
  
  // Verify current user has permission
  // Create invitation
  // Send email
}
This approach:
Scales well with multiple users
Handles household sharing cleanly
Provides clear permission structure
Easy to extend with new features
Maintains data integrity
Key considerations:
Start with simple roles, expand to permissions if needed
Implement invitation system for new members
Consider household limits per user
Plan for data migration if structure needs to change
Add audit logging for important actions
Implement proper error handling for edge cases

1. Household Management page
