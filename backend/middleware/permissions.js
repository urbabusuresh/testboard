/**
 * Permission Management Middleware
 * Handles granular module-level and hierarchy-level permissions
 */

const prisma = require('../lib/prisma');

/**
 * Permission cache to reduce database queries
 * Cache structure: { userId_entityType_entityId: permission }
 */
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear permission cache for a user
 */
function clearUserPermissionCache(userId) {
  const keysToDelete = [];
  for (const [key] of permissionCache) {
    if (key.startsWith(`${userId}_`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => permissionCache.delete(key));
}

/**
 * Get effective permissions for a user on an entity
 * Considers inheritance from parent hierarchy nodes
 */
async function getEffectivePermissions(userId, entityType, entityId) {
  const cacheKey = `${userId}_${entityType}_${entityId}`;
  
  // Check cache
  const cached = permissionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.permissions;
  }

  let permissions = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canExecuteTests: false,
    canApprove: false,
    canManageMembers: false
  };

  // Check direct permission
  if (entityType === 'hierarchy_node') {
    const directPermission = await prisma.hierarchyPermission.findUnique({
      where: {
        hierarchyNodeId_userId: {
          hierarchyNodeId: entityId,
          userId: userId
        }
      }
    });

    if (directPermission) {
      permissions = {
        canView: directPermission.canView,
        canEdit: directPermission.canEdit,
        canDelete: directPermission.canDelete,
        canExecuteTests: directPermission.canExecuteTests,
        canApprove: directPermission.canApprove,
        canManageMembers: directPermission.canManageMembers
      };

      // If not inheriting from parent, return direct permissions
      if (!directPermission.inheritFromParent) {
        permissionCache.set(cacheKey, { permissions, timestamp: Date.now() });
        return permissions;
      }
    }

    // Check inherited permissions from parent nodes
    const node = await prisma.hierarchyNode.findUnique({
      where: { id: entityId },
      select: { parentId: true }
    });

    if (node && node.parentId) {
      const parentPermissions = await getEffectivePermissions(userId, entityType, node.parentId);
      
      // Merge with parent permissions (direct takes precedence)
      permissions = {
        canView: permissions.canView || parentPermissions.canView,
        canEdit: permissions.canEdit || parentPermissions.canEdit,
        canDelete: permissions.canDelete || parentPermissions.canDelete,
        canExecuteTests: permissions.canExecuteTests || parentPermissions.canExecuteTests,
        canApprove: permissions.canApprove || parentPermissions.canApprove,
        canManageMembers: permissions.canManageMembers || parentPermissions.canManageMembers
      };
    }
  } else {
    // For other entity types, check generic permission table
    const directPermission = await prisma.permission.findUnique({
      where: {
        entityType_entityId_userId: {
          entityType: entityType,
          entityId: entityId,
          userId: userId
        }
      }
    });

    if (directPermission && directPermission.actions) {
      permissions = {
        canView: directPermission.actions.view || false,
        canEdit: directPermission.actions.edit || false,
        canDelete: directPermission.actions.delete || false,
        canExecuteTests: directPermission.actions.execute || false,
        canApprove: directPermission.actions.approve || false,
        canManageMembers: directPermission.actions.manageMembers || false
      };
    }
  }

  // Cache the result
  permissionCache.set(cacheKey, { permissions, timestamp: Date.now() });

  return permissions;
}

/**
 * Check if user has specific permission on an entity
 */
async function hasPermission(userId, entityType, entityId, action) {
  // Admin users have all permissions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (user && (user.role === 'admin' || user.role === 'administrator')) {
    return true;
  }

  const permissions = await getEffectivePermissions(userId, entityType, entityId);

  switch (action) {
    case 'view':
      return permissions.canView;
    case 'edit':
      return permissions.canEdit;
    case 'delete':
      return permissions.canDelete;
    case 'execute':
      return permissions.canExecuteTests;
    case 'approve':
      return permissions.canApprove;
    case 'manage_members':
      return permissions.canManageMembers;
    default:
      return false;
  }
}

/**
 * Middleware: Require hierarchy node access
 * Usage: requireHierarchyAccess('view'), requireHierarchyAccess('edit')
 */
function requireHierarchyAccess(action) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hierarchyNodeId = req.params.id || req.body.hierarchyNodeId || req.query.hierarchyNodeId;
    
    if (!hierarchyNodeId) {
      return res.status(400).json({ error: 'Hierarchy node ID required' });
    }

    const allowed = await hasPermission(req.user.id, 'hierarchy_node', parseInt(hierarchyNodeId), action);

    if (!allowed) {
      return res.status(403).json({ 
        error: `You do not have permission to ${action} this hierarchy node` 
      });
    }

    next();
  };
}

/**
 * Middleware: Require module-level role
 * Usage: requireModuleRole('module-owner'), requireModuleRole('tester')
 */
function requireModuleRole(requiredRole) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hierarchyNodeId = req.params.id || req.body.hierarchyNodeId || req.query.hierarchyNodeId;
    
    if (!hierarchyNodeId) {
      return res.status(400).json({ error: 'Hierarchy node ID required' });
    }

    // Check if user has the required role
    const permission = await prisma.hierarchyPermission.findUnique({
      where: {
        hierarchyNodeId_userId: {
          hierarchyNodeId: parseInt(hierarchyNodeId),
          userId: req.user.id
        }
      }
    });

    if (!permission) {
      return res.status(403).json({ 
        error: `You do not have ${requiredRole} role for this module` 
      });
    }

    const roleHierarchy = {
      'module-owner': 6,
      'module-manager': 5,
      'feature-lead': 4,
      'contributor': 3,
      'tester': 2,
      'viewer': 1
    };

    const userRoleLevel = roleHierarchy[permission.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({ 
        error: `Insufficient permissions. Required: ${requiredRole}, Current: ${permission.role}` 
      });
    }

    next();
  };
}

/**
 * Middleware: Require automation admin role
 */
function requireAutomationAdmin(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user is admin or has automation admin role in project
  if (req.user.role === 'admin' || req.user.role === 'administrator') {
    return next();
  }

  // Check project member permissions
  const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
  
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID required' });
  }

  prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: parseInt(projectId),
        userId: req.user.id
      }
    }
  }).then(member => {
    if (!member) {
      return res.status(403).json({ error: 'Not a project member' });
    }

    // Check if has automation admin in permissions JSON
    if (member.permissions && member.permissions.automationAdmin === true) {
      return next();
    }

    // Check if role includes automation privileges
    if (member.role === 'AutomationAdmin' || member.role === 'ProjectManager') {
      return next();
    }

    return res.status(403).json({ error: 'Automation admin privileges required' });
  }).catch(err => {
    console.error('Error checking automation admin:', err);
    return res.status(500).json({ error: 'Failed to verify permissions' });
  });
}

/**
 * Get all hierarchy nodes user has access to
 */
async function getUserAccessibleNodes(userId, action = 'view') {
  // Get all nodes where user has direct permission
  const permissions = await prisma.hierarchyPermission.findMany({
    where: { userId: userId },
    include: {
      hierarchyNode: {
        select: {
          id: true,
          title: true,
          type: true,
          parentId: true
        }
      }
    }
  });

  const accessibleNodes = [];

  for (const perm of permissions) {
    const allowed = await hasPermission(userId, 'hierarchy_node', perm.hierarchyNodeId, action);
    if (allowed) {
      accessibleNodes.push(perm.hierarchyNode);
    }
  }

  return accessibleNodes;
}

/**
 * Grant permission to a user on a hierarchy node
 */
async function grantHierarchyPermission(hierarchyNodeId, userId, role, grantedBy, options = {}) {
  const permission = await prisma.hierarchyPermission.upsert({
    where: {
      hierarchyNodeId_userId: {
        hierarchyNodeId: hierarchyNodeId,
        userId: userId
      }
    },
    update: {
      role: role,
      canView: options.canView !== undefined ? options.canView : getRoleDefaultPermissions(role).canView,
      canEdit: options.canEdit !== undefined ? options.canEdit : getRoleDefaultPermissions(role).canEdit,
      canDelete: options.canDelete !== undefined ? options.canDelete : getRoleDefaultPermissions(role).canDelete,
      canManageMembers: options.canManageMembers !== undefined ? options.canManageMembers : getRoleDefaultPermissions(role).canManageMembers,
      canExecuteTests: options.canExecuteTests !== undefined ? options.canExecuteTests : getRoleDefaultPermissions(role).canExecuteTests,
      canApprove: options.canApprove !== undefined ? options.canApprove : getRoleDefaultPermissions(role).canApprove,
      inheritFromParent: options.inheritFromParent !== undefined ? options.inheritFromParent : true,
      grantedBy: grantedBy
    },
    create: {
      hierarchyNodeId: hierarchyNodeId,
      userId: userId,
      role: role,
      canView: options.canView !== undefined ? options.canView : getRoleDefaultPermissions(role).canView,
      canEdit: options.canEdit !== undefined ? options.canEdit : getRoleDefaultPermissions(role).canEdit,
      canDelete: options.canDelete !== undefined ? options.canDelete : getRoleDefaultPermissions(role).canDelete,
      canManageMembers: options.canManageMembers !== undefined ? options.canManageMembers : getRoleDefaultPermissions(role).canManageMembers,
      canExecuteTests: options.canExecuteTests !== undefined ? options.canExecuteTests : getRoleDefaultPermissions(role).canExecuteTests,
      canApprove: options.canApprove !== undefined ? options.canApprove : getRoleDefaultPermissions(role).canApprove,
      inheritFromParent: options.inheritFromParent !== undefined ? options.inheritFromParent : true,
      grantedBy: grantedBy
    }
  });

  // Clear cache for this user
  clearUserPermissionCache(userId);

  return permission;
}

/**
 * Get default permissions for a role
 */
function getRoleDefaultPermissions(role) {
  const defaults = {
    'module-owner': {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManageMembers: true,
      canExecuteTests: true,
      canApprove: true
    },
    'module-manager': {
      canView: true,
      canEdit: true,
      canDelete: false,
      canManageMembers: true,
      canExecuteTests: true,
      canApprove: true
    },
    'feature-lead': {
      canView: true,
      canEdit: true,
      canDelete: false,
      canManageMembers: false,
      canExecuteTests: true,
      canApprove: false
    },
    'contributor': {
      canView: true,
      canEdit: true,
      canDelete: false,
      canManageMembers: false,
      canExecuteTests: true,
      canApprove: false
    },
    'tester': {
      canView: true,
      canEdit: false,
      canDelete: false,
      canManageMembers: false,
      canExecuteTests: true,
      canApprove: false
    },
    'viewer': {
      canView: true,
      canEdit: false,
      canDelete: false,
      canManageMembers: false,
      canExecuteTests: false,
      canApprove: false
    }
  };

  return defaults[role] || defaults['viewer'];
}

module.exports = {
  getEffectivePermissions,
  hasPermission,
  requireHierarchyAccess,
  requireModuleRole,
  requireAutomationAdmin,
  getUserAccessibleNodes,
  grantHierarchyPermission,
  clearUserPermissionCache,
  getRoleDefaultPermissions
};
