/**
 * Hierarchy Node API Routes
 * Manages the hierarchical structure: Product → Module → Feature → UseCase → Scenario
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticateToken } = require('../../middleware/auth');

// Get all hierarchy nodes (with optional filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, parentId, projectId } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (parentId) where.parentId = parseInt(parentId);
    
    const nodes = await prisma.hierarchyNode.findMany({
      where,
      include: {
        parent: {
          select: { id: true, title: true, type: true }
        },
        children: {
          select: { id: true, title: true, type: true }
        }
      },
      orderBy: [
        { orderIndex: 'asc' },
        { title: 'asc' }
      ]
    });
    
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching hierarchy nodes:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy nodes' });
  }
});

// Get hierarchy tree starting from a node
router.get('/:id/tree', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const buildTree = async (nodeId) => {
      const node = await prisma.hierarchyNode.findUnique({
        where: { id: parseInt(nodeId) },
        include: {
          children: true,
          requirements: {
            select: { id: true, title: true, status: true }
          },
          testCases: {
            where: { status: 'active' },
            select: { id: true, title: true, workflowStatus: true }
          }
        }
      });
      
      if (!node) return null;
      
      if (node.children && node.children.length > 0) {
        node.children = await Promise.all(
          node.children.map(child => buildTree(child.id))
        );
      }
      
      return node;
    };
    
    const tree = await buildTree(id);
    
    if (!tree) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(tree);
  } catch (error) {
    console.error('Error fetching hierarchy tree:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy tree' });
  }
});

// Get a single hierarchy node
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const node = await prisma.hierarchyNode.findUnique({
      where: { id: parseInt(id) },
      include: {
        parent: true,
        children: true,
        requirements: true,
        testCases: {
          where: { status: 'active' }
        }
      }
    });
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(node);
  } catch (error) {
    console.error('Error fetching hierarchy node:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy node' });
  }
});

// Create a new hierarchy node
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      parentId,
      type,
      title,
      description,
      orderIndex,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' });
    }
    
    // Validate type
    const validTypes = ['product', 'module', 'submodule', 'feature', 'usecase', 'scenario'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid node type' });
    }
    
    const node = await prisma.hierarchyNode.create({
      data: {
        parentId: parentId ? parseInt(parentId) : null,
        type,
        title,
        description,
        orderIndex: orderIndex || 0,
        metadata: metadata || {},
        createdBy: req.user.id,
        version: 1
      },
      include: {
        parent: true
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'hierarchy_node',
        entityId: node.id,
        operation: 'CREATE',
        changedBy: req.user.id,
        changeSummary: `Created hierarchy node: ${title}`,
        newValue: node
      }
    });
    
    res.status(201).json(node);
  } catch (error) {
    console.error('Error creating hierarchy node:', error);
    res.status(500).json({ error: 'Failed to create hierarchy node' });
  }
});

// Update a hierarchy node
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      parentId,
      title,
      description,
      orderIndex,
      status,
      metadata
    } = req.body;
    
    // Fetch old node for audit
    const oldNode = await prisma.hierarchyNode.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!oldNode) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const updateData = {};
    if (parentId !== undefined) updateData.parentId = parentId ? parseInt(parentId) : null;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (status) updateData.status = status;
    if (metadata) updateData.metadata = metadata;
    
    const node = await prisma.hierarchyNode.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        parent: true,
        children: true
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'hierarchy_node',
        entityId: node.id,
        operation: 'UPDATE',
        changedBy: req.user.id,
        changeSummary: `Updated hierarchy node: ${node.title}`,
        previousValue: oldNode,
        newValue: node
      }
    });
    
    res.json(node);
  } catch (error) {
    console.error('Error updating hierarchy node:', error);
    res.status(500).json({ error: 'Failed to update hierarchy node' });
  }
});

// Create a new version of a hierarchy node
router.post('/:id/version', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, changeNote, metadata } = req.body;
    
    const oldNode = await prisma.hierarchyNode.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!oldNode) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Mark old node as retired
    await prisma.hierarchyNode.update({
      where: { id: parseInt(id) },
      data: { status: 'retired' }
    });
    
    // Create new version
    const newNode = await prisma.hierarchyNode.create({
      data: {
        parentId: oldNode.parentId,
        type: oldNode.type,
        title: title || oldNode.title,
        description: description || oldNode.description,
        orderIndex: oldNode.orderIndex,
        metadata: metadata || oldNode.metadata,
        version: oldNode.version + 1,
        previousVersionId: oldNode.id,
        createdBy: req.user.id,
        status: 'active'
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'hierarchy_node',
        entityId: newNode.id,
        operation: 'CREATE',
        changedBy: req.user.id,
        changeSummary: `Created version ${newNode.version} of hierarchy node (from v${oldNode.version})${changeNote ? ': ' + changeNote : ''}`,
        previousValue: oldNode,
        newValue: newNode
      }
    });
    
    res.status(201).json(newNode);
  } catch (error) {
    console.error('Error creating hierarchy node version:', error);
    res.status(500).json({ error: 'Failed to create hierarchy node version' });
  }
});

// Clone a hierarchy node and its children
router.post('/:id/clone', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newParentId, includeChildren, newReleaseId } = req.body;
    
    const cloneNode = async (nodeId, parentId) => {
      const originalNode = await prisma.hierarchyNode.findUnique({
        where: { id: nodeId },
        include: {
          children: includeChildren === true,
          requirements: true,
          testCases: {
            where: { status: 'active' }
          }
        }
      });
      
      if (!originalNode) return null;
      
      const clonedNode = await prisma.hierarchyNode.create({
        data: {
          parentId: parentId || null,
          type: originalNode.type,
          title: `${originalNode.title} (Copy)`,
          description: originalNode.description,
          orderIndex: originalNode.orderIndex,
          metadata: originalNode.metadata,
          version: 1,
          createdBy: req.user.id
        }
      });
      
      // Clone children recursively
      if (includeChildren && originalNode.children) {
        for (const child of originalNode.children) {
          await cloneNode(child.id, clonedNode.id);
        }
      }
      
      return clonedNode;
    };
    
    const cloned = await cloneNode(parseInt(id), newParentId ? parseInt(newParentId) : null);
    
    if (!cloned) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.status(201).json(cloned);
  } catch (error) {
    console.error('Error cloning hierarchy node:', error);
    res.status(500).json({ error: 'Failed to clone hierarchy node' });
  }
});

// Delete a hierarchy node
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const node = await prisma.hierarchyNode.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    await prisma.hierarchyNode.delete({
      where: { id: parseInt(id) }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'hierarchy_node',
        entityId: parseInt(id),
        operation: 'DELETE',
        changedBy: req.user.id,
        changeSummary: `Deleted hierarchy node: ${node.title}`,
        previousValue: node
      }
    });
    
    res.json({ message: 'Node deleted successfully' });
  } catch (error) {
    console.error('Error deleting hierarchy node:', error);
    res.status(500).json({ error: 'Failed to delete hierarchy node' });
  }
});

module.exports = router;
