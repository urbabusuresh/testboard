/**
 * Permission Management API Routes
 * Manages granular module-level and feature-level permissions
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticateToken } = require('../../middleware/prismaAuth');
const {
  getEffectivePermissions,
  hasPermission,
  grantHierarchyPermission,
  clearUserPermissionCache,
  getUserAccessibleNodes,
  getRoleDefaultPermissions
} = require('../../middleware/permissions');

// Get all users with access to a hierarchy node
router.get('/hierarchy/:nodeId/users', authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;

    // Check if requester has permission to view members
    const canManage = await hasPermission(req.user.id, 'hierarchy_node', parseInt(nodeId), 'manage_members');
    
    if (!canManage) {
      return res.status(403).json({ error: 'You do not have permission to view members' });
    }

    const permissions = await prisma.hierarchyPermission.findMany({
      where: { hierarchyNodeId: parseInt(nodeId) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        hierarchyNode: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(permissions);
  } catch (error) {
    console.error('Error fetching hierarchy permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Grant permission to a user on a hierarchy node
router.post('/hierarchy/:nodeId/users', authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const {
      userId,
      role,
      canView,
      canEdit,
      canDelete,
      canManageMembers,
      canExecuteTests,
      canApprove,
      inheritFromParent
    } = req.body;

    // Check if requester has permission to manage members
    const canManage = await hasPermission(req.user.id, 'hierarchy_node', parseInt(nodeId), 'manage_members');
    
    if (!canManage) {
      return res.status(403).json({ error: 'You do not have permission to manage members' });
    }

    // Validate role
    const validRoles = ['module-owner', 'module-manager', 'feature-lead', 'contributor', 'tester', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify hierarchy node exists
    const node = await prisma.hierarchyNode.findUnique({
      where: { id: parseInt(nodeId) }
    });

    if (!node) {
      return res.status(404).json({ error: 'Hierarchy node not found' });
    }

    // Grant permission
    const permission = await grantHierarchyPermission(
      parseInt(nodeId),
      parseInt(userId),
      role,
      req.user.id,
      {
        canView,
        canEdit,
        canDelete,
        canManageMembers,
        canExecuteTests,
        canApprove,
        inheritFromParent
      }
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'hierarchy_permission',
        entityId: permission.id,
        operation: 'CREATE',
        changedBy: req.user.id,
        changeSummary: `Granted ${role} role to user ${user.username} on ${node.type} "${node.title}"`,
        newValue: permission
      }
    });

    res.status(201).json(permission);
  } catch (error) {
    console.error('Error granting hierarchy permission:', error);
    res.status(500).json({ error: 'Failed to grant permission' });
  }
});

// Update permission for a user on a hierarchy node
router.put('/hierarchy/:nodeId/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { nodeId, userId } = req.params;
    const {
      role,
      canView,
      canEdit,
      canDelete,
      canManageMembers,
      canExecuteTests,
      canApprove,
      inheritFromParent
    } = req.body;

    // Check if requester has permission to manage members
    const canManage = await hasPermission(req.user.id, 'hierarchy_node', parseInt(nodeId), 'manage_members');
    
    if (!canManage) {
      return res.status(403).json({ error: 'You do not have permission to manage members' });
    }

    const updateData = {};
    if (role) updateData.role = role;
    if (canView !== undefined) updateData.canView = canView;
    if (canEdit !== undefined) updateData.canEdit = canEdit;
    if (canDelete !== undefined) updateData.canDelete = canDelete;
    if (canManageMembers !== undefined) updateData.canManageMembers = canManageMembers;
    if (canExecuteTests !== undefined) updateData.canExecuteTests = canExecuteTests;
    if (canApprove !== undefined) updateData.canApprove = canApprove;
    if (inheritFromParent !== undefined) updateData.inheritFromParent = inheritFromParent;

    const permission = await prisma.hierarchyPermission.update({
      where: {
        hierarchyNodeId_userId: {
          hierarchyNodeId: parseInt(nodeId),
          userId: parseInt(userId)
        }
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        hierarchyNode: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      }
    });

    // Clear cache for this user
    clearUserPermissionCache(parseInt(userId));

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'hierarchy_permission',
        entityId: permission.id,
        operation: 'UPDATE',
        changedBy: req.user.id,
        changeSummary: `Updated permission for user ${permission.user.username} on ${permission.hierarchyNode.type} "${permission.hierarchyNode.title}"`,
        newValue: permission
      }
    });

    res.json(permission);
  } catch (error) {
    console.error('Error updating hierarchy permission:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// Revoke permission from a user on a hierarchy node
router.delete('/hierarchy/:nodeId/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { nodeId, userId } = req.params;

    // Check if requester has permission to manage members
    const canManage = await hasPermission(req.user.id, 'hierarchy_node', parseInt(nodeId), 'manage_members');
    
    if (!canManage) {
      return res.status(403).json({ error: 'You do not have permission to manage members' });
    }

    const permission = await prisma.hierarchyPermission.findUnique({
      where: {
        hierarchyNodeId_userId: {
          hierarchyNodeId: parseInt(nodeId),
          userId: parseInt(userId)
        }
      },
      include: {
        user: {
          select: { username: true }
        },
        hierarchyNode: {
          select: { title: true, type: true }
        }
      }
    });

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    await prisma.hierarchyPermission.delete({
      where: {
        hierarchyNodeId_userId: {
          hierarchyNodeId: parseInt(nodeId),
          userId: parseInt(userId)
        }
      }
    });

    // Clear cache for this user
    clearUserPermissionCache(parseInt(userId));

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'hierarchy_permission',
        entityId: permission.id,
        operation: 'DELETE',
        changedBy: req.user.id,
        changeSummary: `Revoked permission from user ${permission.user.username} on ${permission.hierarchyNode.type} "${permission.hierarchyNode.title}"`,
        previousValue: permission
      }
    });

    res.json({ message: 'Permission revoked successfully' });
  } catch (error) {
    console.error('Error revoking hierarchy permission:', error);
    res.status(500).json({ error: 'Failed to revoke permission' });
  }
});

// Get all hierarchy nodes a user has access to
router.get('/user/:userId/hierarchy', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.query;

    // Check if requester is viewing their own permissions or is admin
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'administrator') {
      return res.status(403).json({ error: 'You can only view your own permissions' });
    }

    const nodes = await getUserAccessibleNodes(parseInt(userId), action || 'view');

    res.json(nodes);
  } catch (error) {
    console.error('Error fetching user accessible nodes:', error);
    res.status(500).json({ error: 'Failed to fetch accessible nodes' });
  }
});

// Check if user has specific permission on a node
router.get('/check', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId, action } = req.query;

    if (!entityType || !entityId || !action) {
      return res.status(400).json({ error: 'entityType, entityId, and action are required' });
    }

    const allowed = await hasPermission(req.user.id, entityType, parseInt(entityId), action);

    res.json({
      userId: req.user.id,
      entityType,
      entityId: parseInt(entityId),
      action,
      allowed
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

// Get effective permissions for a user on an entity
router.get('/effective', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId, userId } = req.query;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    const targetUserId = userId ? parseInt(userId) : req.user.id;

    // Check if requester can view this info
    if (targetUserId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'administrator') {
      return res.status(403).json({ error: 'You can only view your own permissions' });
    }

    const permissions = await getEffectivePermissions(targetUserId, entityType, parseInt(entityId));

    res.json({
      userId: targetUserId,
      entityType,
      entityId: parseInt(entityId),
      permissions
    });
  } catch (error) {
    console.error('Error getting effective permissions:', error);
    res.status(500).json({ error: 'Failed to get effective permissions' });
  }
});

// Bulk grant permissions to multiple users
router.post('/hierarchy/:nodeId/users/bulk', authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { users } = req.body; // Array of { userId, role }

    // Check if requester has permission to manage members
    const canManage = await hasPermission(req.user.id, 'hierarchy_node', parseInt(nodeId), 'manage_members');
    
    if (!canManage) {
      return res.status(403).json({ error: 'You do not have permission to manage members' });
    }

    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'users must be an array' });
    }

    const results = [];
    
    for (const userDef of users) {
      try {
        const permission = await grantHierarchyPermission(
          parseInt(nodeId),
          parseInt(userDef.userId),
          userDef.role,
          req.user.id
        );
        results.push({ success: true, permission });
      } catch (err) {
        results.push({ 
          success: false, 
          userId: userDef.userId, 
          error: err.message 
        });
      }
    }

    res.json({
      message: 'Bulk permission grant completed',
      results
    });
  } catch (error) {
    console.error('Error bulk granting permissions:', error);
    res.status(500).json({ error: 'Failed to bulk grant permissions' });
  }
});

// Get role templates
router.get('/role-templates', authenticateToken, async (req, res) => {
  try {
    const templates = await prisma.roleTemplate.findMany({
      orderBy: { name: 'asc' }
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching role templates:', error);
    res.status(500).json({ error: 'Failed to fetch role templates' });
  }
});

// Create role template
router.post('/role-templates', authenticateToken, async (req, res) => {
  try {
    // Only admins can create role templates
    if (req.user.role !== 'admin' && req.user.role !== 'administrator') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, scope, permissions } = req.body;

    if (!name || !scope || !permissions) {
      return res.status(400).json({ error: 'name, scope, and permissions are required' });
    }

    const template = await prisma.roleTemplate.create({
      data: {
        name,
        description,
        scope,
        permissions
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating role template:', error);
    res.status(500).json({ error: 'Failed to create role template' });
  }
});

// Get default permissions for a role
router.get('/role-defaults/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    
    const defaults = getRoleDefaultPermissions(role);

    res.json({
      role,
      defaults
    });
  } catch (error) {
    console.error('Error getting role defaults:', error);
    res.status(500).json({ error: 'Failed to get role defaults' });
  }
});

module.exports = router;
