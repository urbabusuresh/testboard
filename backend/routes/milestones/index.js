/**
 * Milestones Management API Routes
 * Manages project milestones with automatic status updates
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticateToken } = require('../../middleware/prismaAuth');

// Get all milestones
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, status, type } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (type) where.type = type;
    
    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { targetDate: 'asc' }
    });
    
    res.json(milestones);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// Get a single milestone
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const milestone = await prisma.milestone.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true
      }
    });
    
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    res.json(milestone);
  } catch (error) {
    console.error('Error fetching milestone:', error);
    res.status(500).json({ error: 'Failed to fetch milestone' });
  }
});

// Create a new milestone
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      projectId,
      name,
      description,
      type,
      targetDate,
      linkedArtifacts
    } = req.body;
    
    if (!projectId || !name || !targetDate) {
      return res.status(400).json({ error: 'ProjectId, name, and targetDate are required' });
    }
    
    const milestone = await prisma.milestone.create({
      data: {
        projectId: parseInt(projectId),
        name,
        description,
        type,
        targetDate: new Date(targetDate),
        status: 'planned',
        linkedArtifacts: linkedArtifacts || {}
      },
      include: {
        project: true
      }
    });
    
    res.status(201).json(milestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

// Update a milestone
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      targetDate,
      actualDate,
      status,
      linkedArtifacts
    } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (targetDate) updateData.targetDate = new Date(targetDate);
    if (actualDate) updateData.actualDate = new Date(actualDate);
    if (status) updateData.status = status;
    if (linkedArtifacts) updateData.linkedArtifacts = linkedArtifacts;
    
    const milestone = await prisma.milestone.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        project: true
      }
    });
    
    res.json(milestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// Mark milestone as completed
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const milestone = await prisma.milestone.update({
      where: { id: parseInt(id) },
      data: {
        status: 'completed',
        actualDate: new Date()
      }
    });
    
    res.json(milestone);
  } catch (error) {
    console.error('Error completing milestone:', error);
    res.status(500).json({ error: 'Failed to complete milestone' });
  }
});

// Delete a milestone
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.milestone.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

module.exports = router;
