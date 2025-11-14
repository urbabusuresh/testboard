# New Prisma Model Analysis - Module-Level Role Access & Granular Permissions

## Analysis Summary

After reviewing the design document and existing Prisma schema, the following features need to be implemented for granular role-based access control:

## Missing Features Identified

### 1. Module-Level Role Access
**Requirement**: Users should have specific roles at module, sub-module, and feature levels, not just at project level.

**Current State**: 
- Only `ProjectMember` table exists with project-level roles
- No granular permissions at module/feature level

**Needed**:
- ModulePermission model for module-level access control
- Support for different roles per module/sub-module/feature
- Hierarchy-based permission inheritance

### 2. Expanded Role System
**Requirement**: Support roles mentioned in design document:
- Admin (system-wide)
- OrgAdmin (organization-level)
- ProjectManager
- TestManager
- Developer
- Tester
- Auditor
- Guest
- AutomationAdmin (for automation features)

**Current State**:
- Basic roles in User model: admin, manager, tester, developer, viewer, reporter
- ProjectMember has generic role field

**Needed**:
- Enum for all role types
- Role hierarchy and permission matrix
- Module-specific role assignments

### 3. Granular Permission Model
**Requirement**: Fine-grained permissions for:
- View access at module/feature level
- Edit access at module/feature level
- Execute access (for test execution)
- Approve access (for requirements/workflows)
- Automation access

**Current State**:
- No granular permission model
- Permissions implicit based on user role

**Needed**:
- Permission model with action-based access control
- Permission inheritance from parent hierarchy nodes
- Role-permission mapping

### 4. Automation-Specific Roles
**Requirement**: "Project role: AutomationAdmin" for managing automation features

**Current State**:
- No automation-specific roles

**Needed**:
- AutomationAdmin role
- Permissions to manage automation suites, cases, and runs
- Separate permissions for executing vs managing automation

## Implementation Plan

### Phase 1: Extend Prisma Schema

1. **Add Permission Model**
```prisma
model Permission {
  id              Int      @id @default(autoincrement())
  entityType      String   // hierarchy_node, module, product, testcase, etc.
  entityId        Int
  userId          Int
  role            String   // module-manager, feature-lead, tester, viewer
  actions         Json     // { view: true, edit: true, execute: false, approve: false }
  inheritFromParent Boolean @default(true)
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

2. **Add HierarchyPermission Model**
```prisma
model HierarchyPermission {
  id                Int           @id @default(autoincrement())
  hierarchyNodeId   Int
  userId            Int
  role              String        // module-owner, feature-lead, contributor, viewer
  canView           Boolean       @default(true)
  canEdit           Boolean       @default(false)
  canDelete         Boolean       @default(false)
  canManageMembers  Boolean       @default(false)
  createdAt         DateTime      @default(now())
  
  hierarchyNode     HierarchyNode @relation(fields: [hierarchyNodeId], references: [id], onDelete: Cascade)
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([hierarchyNodeId, userId])
}
```

3. **Add Role Enum**
```prisma
enum UserRole {
  ADMIN
  ORG_ADMIN
  PROJECT_MANAGER
  TEST_MANAGER
  DEVELOPER
  TESTER
  AUTOMATION_ADMIN
  AUDITOR
  GUEST
}

enum ModuleRole {
  MODULE_OWNER
  MODULE_MANAGER
  FEATURE_LEAD
  CONTRIBUTOR
  TESTER
  VIEWER
}
```

4. **Extend ProjectMember with specific roles**
```prisma
model ProjectMember {
  id                    Int          @id @default(autoincrement())
  projectId             Int
  userId                Int
  role                  UserRole     // Use enum instead of string
  permissions           Json?        // Additional custom permissions
  joinedAt              DateTime     @default(now())
  
  project               Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
}
```

### Phase 2: Permission Checking Middleware

Create middleware for checking module-level permissions:
- `requireModuleAccess(action)` - Check if user has permission for a module
- `requireFeatureAccess(action)` - Check if user has permission for a feature
- `requireHierarchyAccess(nodeId, action)` - Check hierarchy node access
- `checkInheritedPermission(nodeId, userId, action)` - Check with inheritance

### Phase 3: Permission APIs

Create routes for managing permissions:
- `POST /api/permissions/hierarchy/:nodeId/users` - Grant user access to a node
- `GET /api/permissions/hierarchy/:nodeId/users` - List users with access
- `DELETE /api/permissions/hierarchy/:nodeId/users/:userId` - Revoke access
- `GET /api/permissions/user/:userId/hierarchy` - Get all nodes user has access to

### Phase 4: Permission Inheritance

Implement logic for permission inheritance:
- If user has access to a parent node, they inherit access to children
- If explicitly denied at child level, override parent permission
- Module Owner automatically gets access to all sub-modules and features

## Code Changes Required

### 1. Update Prisma Schema
File: `backend/prisma/schema.prisma`
- Add Permission model
- Add HierarchyPermission model
- Add role enums
- Update User model to add permission relations
- Update HierarchyNode model to add permission relations

### 2. Create Permission Middleware
File: `backend/middleware/permissions.js`
- Implement permission checking functions
- Implement inheritance logic
- Cache permission checks for performance

### 3. Create Permission Routes
File: `backend/routes/permissions/index.js`
- CRUD operations for permissions
- Bulk permission assignment
- Permission inheritance queries

### 4. Update Existing Routes
Update routes to check permissions:
- Hierarchy routes: Check if user can view/edit node
- Requirements routes: Check if user can create/edit requirements for a module
- Test case routes: Check if user can execute tests for a module
- Flow routes: Check if user can execute flows across modules

### 5. Update Auth Middleware
File: `backend/middleware/prismaAuth.js`
- Add `requireModuleRole(role)` middleware
- Add `requireHierarchyAccess(nodeId, action)` middleware

## Benefits

1. **Fine-grained Security**: Control access at module, sub-module, and feature level
2. **Flexibility**: Different users can have different roles in different modules
3. **Scalability**: Large teams can work on different modules independently
4. **Audit Trail**: All permission changes tracked
5. **CMMI Compliance**: Proper access control and separation of duties

## Example Use Cases

### Use Case 1: Module-Specific Access
```
User A: Module Owner of "Billing Module"
  - Can view/edit/delete anything in Billing Module
  - Can manage team members for Billing Module
  - Inherits to all sub-modules and features

User B: Feature Lead of "Invoice Generation" (under Billing)
  - Can view/edit "Invoice Generation" feature
  - Can manage test cases for this feature
  - Cannot access other features in Billing Module
```

### Use Case 2: Cross-Module Tester
```
User C: Tester role in multiple modules
  - Assigned as tester to "Billing Module", "Payment Module", "User Management"
  - Can execute tests in all three modules
  - Cannot edit requirements or manage team
```

### Use Case 3: Automation Admin
```
User D: Automation Admin role
  - Can manage automation suites across all projects
  - Can configure automation bindings
  - Can view test results but not modify test cases
```

## Migration Strategy

1. **Create new permission models** in Prisma schema
2. **Migrate existing ProjectMember roles** to new system
3. **Default permissions**: All existing project members get view access to all modules
4. **Gradual rollout**: Enable module permissions per project as needed
5. **Backward compatibility**: Keep existing role checks working until migration complete

## Implementation Priority

### High Priority (Must Have)
1. HierarchyPermission model and API
2. Permission checking middleware
3. Update hierarchy routes with permission checks

### Medium Priority (Should Have)
4. Role enums and standardization
5. Permission inheritance logic
6. Bulk permission management

### Low Priority (Nice to Have)
7. Permission delegation (Module Owner can grant access)
8. Permission templates (role templates for quick assignment)
9. Permission analytics (who has access to what)

## Testing Considerations

1. Test permission inheritance across hierarchy levels
2. Test permission overrides
3. Test bulk permission operations
4. Test performance with large permission sets
5. Test concurrent permission modifications

---

## Conclusion

Implementing granular module-level role access will transform the platform into a truly enterprise-grade system where large teams can collaborate on complex multi-module products with proper access control and security.

The implementation follows the principle of least privilege while providing flexibility for different organizational structures and team compositions.
