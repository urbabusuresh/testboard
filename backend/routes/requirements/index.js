/**
 * Requirements Management API Routes
 * Supports BRD/FRD with versioning, approval workflows, and traceability
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticateToken } = require('../../middleware/prismaAuth');

// Get all requirements (with filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, releaseId, type, status, hierarchyNodeId } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (releaseId) where.releaseId = parseInt(releaseId);
    if (type) where.type = type;
    if (status) where.status = status;
    if (hierarchyNodeId) where.hierarchyNodeId = parseInt(hierarchyNodeId);
    
    const requirements = await prisma.requirement.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        },
        release: {
          select: { id: true, version: true, name: true }
        },
        hierarchyNode: {
          select: { id: true, title: true, type: true }
        },
        previousVersion: {
          select: { id: true, version: true }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });
    
    res.json(requirements);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

// Get a single requirement
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const requirement = await prisma.requirement.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true,
        release: true,
        hierarchyNode: true,
        previousVersion: true,
        versions: {
          orderBy: { version: 'desc' }
        },
        artifactLinks: {
          include: {
            toTestCase: {
              select: { id: true, title: true, status: true }
            }
          }
        }
      }
    });
    
    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    
    res.json(requirement);
  } catch (error) {
    console.error('Error fetching requirement:', error);
    res.status(500).json({ error: 'Failed to fetch requirement' });
  }
});

// Create a new requirement
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      projectId,
      releaseId,
      hierarchyNodeId,
      title,
      description,
      type,
      priority,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!projectId || !title || !type) {
      return res.status(400).json({ error: 'ProjectId, title, and type are required' });
    }
    
    // Validate type
    const validTypes = ['BRD', 'FRD', 'UserStory', 'Epic'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid requirement type' });
    }
    
    const requirement = await prisma.requirement.create({
      data: {
        projectId: parseInt(projectId),
        releaseId: releaseId ? parseInt(releaseId) : null,
        hierarchyNodeId: hierarchyNodeId ? parseInt(hierarchyNodeId) : null,
        title,
        description,
        type,
        priority: priority || 'medium',
        status: 'draft',
        version: 1,
        createdBy: req.user.id,
        metadata: metadata || {}
      },
      include: {
        project: true,
        release: true,
        hierarchyNode: true
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'requirement',
        entityId: requirement.id,
        operation: 'CREATE',
        changedBy: req.user.id,
        changeSummary: `Created requirement: ${title}`,
        newValue: requirement
      }
    });
    
    res.status(201).json(requirement);
  } catch (error) {
    console.error('Error creating requirement:', error);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
});

// Update a requirement
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      type,
      priority,
      status,
      releaseId,
      hierarchyNodeId,
      metadata
    } = req.body;
    
    // Fetch old requirement for audit
    const oldRequirement = await prisma.requirement.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!oldRequirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;
    if (releaseId !== undefined) updateData.releaseId = releaseId ? parseInt(releaseId) : null;
    if (hierarchyNodeId !== undefined) updateData.hierarchyNodeId = hierarchyNodeId ? parseInt(hierarchyNodeId) : null;
    if (metadata) updateData.metadata = metadata;
    
    const requirement = await prisma.requirement.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        project: true,
        release: true,
        hierarchyNode: true
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'requirement',
        entityId: requirement.id,
        operation: 'UPDATE',
        changedBy: req.user.id,
        changeSummary: `Updated requirement: ${requirement.title}`,
        previousValue: oldRequirement,
        newValue: requirement
      }
    });
    
    res.json(requirement);
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

// Approve a requirement
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    // Check if user has permission (manager role)
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can approve requirements' });
    }
    
    const requirement = await prisma.requirement.update({
      where: { id: parseInt(id) },
      data: {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        project: true
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'requirement',
        entityId: requirement.id,
        operation: 'UPDATE',
        changedBy: req.user.id,
        changeSummary: `Approved requirement: ${requirement.title}${notes ? '. Notes: ' + notes : ''}`,
        newValue: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
      }
    });
    
    res.json(requirement);
  } catch (error) {
    console.error('Error approving requirement:', error);
    res.status(500).json({ error: 'Failed to approve requirement' });
  }
});

// Reject a requirement
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check if user has permission (manager role)
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can reject requirements' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const requirement = await prisma.requirement.update({
      where: { id: parseInt(id) },
      data: {
        status: 'rejected'
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'requirement',
        entityId: requirement.id,
        operation: 'UPDATE',
        changedBy: req.user.id,
        changeSummary: `Rejected requirement: ${requirement.title}. Reason: ${reason}`,
        newValue: { status: 'rejected', reason }
      }
    });
    
    res.json(requirement);
  } catch (error) {
    console.error('Error rejecting requirement:', error);
    res.status(500).json({ error: 'Failed to reject requirement' });
  }
});

// Create a new version of a requirement
router.post('/:id/version', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, changeNote, metadata } = req.body;
    
    const oldRequirement = await prisma.requirement.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!oldRequirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    
    // Mark old requirement as retired
    await prisma.requirement.update({
      where: { id: parseInt(id) },
      data: { status: 'retired' }
    });
    
    // Create new version
    const newRequirement = await prisma.requirement.create({
      data: {
        projectId: oldRequirement.projectId,
        releaseId: oldRequirement.releaseId,
        hierarchyNodeId: oldRequirement.hierarchyNodeId,
        title: title || oldRequirement.title,
        description: description || oldRequirement.description,
        type: oldRequirement.type,
        priority: oldRequirement.priority,
        status: 'draft',
        version: oldRequirement.version + 1,
        previousVersionId: oldRequirement.id,
        changeNote,
        createdBy: req.user.id,
        metadata: metadata || oldRequirement.metadata
      },
      include: {
        project: true,
        release: true,
        hierarchyNode: true,
        previousVersion: true
      }
    });
    
    // Find and mark impacted test cases
    const linkedTestCases = await prisma.artifactLink.findMany({
      where: {
        fromType: 'requirement',
        fromId: parseInt(id),
        toType: 'testcase'
      }
    });
    
    // Mark each linked test case as impacted
    for (const link of linkedTestCases) {
      await prisma.testCaseVersion.update({
        where: { id: link.toId },
        data: {
          metadata: {
            impacted: true,
            impactReason: `Requirement ${oldRequirement.title} updated to version ${newRequirement.version}`
          }
        }
      });
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'requirement',
        entityId: newRequirement.id,
        operation: 'CREATE',
        changedBy: req.user.id,
        changeSummary: `Created version ${newRequirement.version} of requirement (from v${oldRequirement.version})${changeNote ? ': ' + changeNote : ''}. Marked ${linkedTestCases.length} test cases as impacted.`,
        previousValue: oldRequirement,
        newValue: newRequirement
      }
    });
    
    res.status(201).json({
      requirement: newRequirement,
      impactedTestCases: linkedTestCases.length
    });
  } catch (error) {
    console.error('Error creating requirement version:', error);
    res.status(500).json({ error: 'Failed to create requirement version' });
  }
});

// Get version history for a requirement
router.get('/:id/versions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Build version chain
    const versions = [];
    let currentId = parseInt(id);
    
    while (currentId) {
      const req = await prisma.requirement.findUnique({
        where: { id: currentId },
        include: {
          previousVersion: {
            select: { id: true, version: true, status: true }
          }
        }
      });
      
      if (!req) break;
      
      versions.push(req);
      currentId = req.previousVersionId;
    }
    
    res.json(versions.reverse()); // Oldest to newest
  } catch (error) {
    console.error('Error fetching requirement versions:', error);
    res.status(500).json({ error: 'Failed to fetch requirement versions' });
  }
});

// Delete a requirement
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const requirement = await prisma.requirement.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    
    await prisma.requirement.delete({
      where: { id: parseInt(id) }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'requirement',
        entityId: parseInt(id),
        operation: 'DELETE',
        changedBy: req.user.id,
        changeSummary: `Deleted requirement: ${requirement.title}`,
        previousValue: requirement
      }
    });
    
    res.json({ message: 'Requirement deleted successfully' });
  } catch (error) {
    console.error('Error deleting requirement:', error);
    res.status(500).json({ error: 'Failed to delete requirement' });
  }
});

module.exports = router;
