/**
 * Risk Management API Routes
 * Manages project risks with mitigation tracking and RPN scoring
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticateToken } = require('../../middleware/prismaAuth');

// Risk scoring: calculate RPN (Risk Priority Number)
function calculateRiskScore(probability, impact) {
  const probabilityMap = { low: 1, medium: 2, high: 3 };
  const impactMap = { low: 1, medium: 3, high: 5 };
  
  const probValue = probabilityMap[probability] || 2;
  const impactValue = impactMap[impact] || 3;
  
  return probValue * impactValue;
}

// Get all risks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, status, category } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (category) where.category = category;
    
    const risks = await prisma.risk.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        },
        mitigations: true
      },
      orderBy: [
        { riskScore: 'desc' },
        { identifiedAt: 'desc' }
      ]
    });
    
    res.json(risks);
  } catch (error) {
    console.error('Error fetching risks:', error);
    res.status(500).json({ error: 'Failed to fetch risks' });
  }
});

// Get risk heatmap data
router.get('/heatmap', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const where = { status: 'open' };
    if (projectId) where.projectId = parseInt(projectId);
    
    const risks = await prisma.risk.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        probability: true,
        impact: true,
        riskScore: true
      }
    });
    
    // Group by probability and impact
    const heatmap = {
      low_low: [],
      low_medium: [],
      low_high: [],
      medium_low: [],
      medium_medium: [],
      medium_high: [],
      high_low: [],
      high_medium: [],
      high_high: []
    };
    
    risks.forEach(risk => {
      const key = `${risk.probability}_${risk.impact}`;
      if (heatmap[key]) {
        heatmap[key].push(risk);
      }
    });
    
    res.json(heatmap);
  } catch (error) {
    console.error('Error fetching risk heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch risk heatmap' });
  }
});

// Get a single risk
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const risk = await prisma.risk.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true,
        mitigations: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!risk) {
      return res.status(404).json({ error: 'Risk not found' });
    }
    
    res.json(risk);
  } catch (error) {
    console.error('Error fetching risk:', error);
    res.status(500).json({ error: 'Failed to fetch risk' });
  }
});

// Create a new risk
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      category,
      probability,
      impact,
      linkedArtifacts
    } = req.body;
    
    if (!projectId || !title || !category) {
      return res.status(400).json({ error: 'ProjectId, title, and category are required' });
    }
    
    const riskScore = calculateRiskScore(probability || 'medium', impact || 'medium');
    
    const risk = await prisma.risk.create({
      data: {
        projectId: parseInt(projectId),
        title,
        description,
        category,
        probability: probability || 'medium',
        impact: impact || 'medium',
        riskScore,
        status: 'open',
        linkedArtifacts: linkedArtifacts || {}
      },
      include: {
        project: true
      }
    });
    
    res.status(201).json(risk);
  } catch (error) {
    console.error('Error creating risk:', error);
    res.status(500).json({ error: 'Failed to create risk' });
  }
});

// Update a risk
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      probability,
      impact,
      status,
      linkedArtifacts
    } = req.body;
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (probability) updateData.probability = probability;
    if (impact) updateData.impact = impact;
    if (status) {
      updateData.status = status;
      if (status === 'closed') {
        updateData.closedAt = new Date();
      }
    }
    if (linkedArtifacts) updateData.linkedArtifacts = linkedArtifacts;
    
    // Recalculate risk score if probability or impact changed
    if (probability || impact) {
      const risk = await prisma.risk.findUnique({
        where: { id: parseInt(id) }
      });
      updateData.riskScore = calculateRiskScore(
        probability || risk.probability,
        impact || risk.impact
      );
    }
    
    const risk = await prisma.risk.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        project: true,
        mitigations: true
      }
    });
    
    res.json(risk);
  } catch (error) {
    console.error('Error updating risk:', error);
    res.status(500).json({ error: 'Failed to update risk' });
  }
});

// Add mitigation to a risk
router.post('/:id/mitigations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, owner, timeline, effectiveness } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Mitigation description is required' });
    }
    
    const mitigation = await prisma.mitigation.create({
      data: {
        riskId: parseInt(id),
        description,
        owner,
        timeline,
        effectiveness,
        status: 'planned'
      }
    });
    
    // Update risk status to mitigated if not already
    const risk = await prisma.risk.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (risk && risk.status === 'open') {
      await prisma.risk.update({
        where: { id: parseInt(id) },
        data: { status: 'mitigated' }
      });
    }
    
    res.status(201).json(mitigation);
  } catch (error) {
    console.error('Error creating mitigation:', error);
    res.status(500).json({ error: 'Failed to create mitigation' });
  }
});

// Update mitigation
router.put('/:id/mitigations/:mitigationId', authenticateToken, async (req, res) => {
  try {
    const { mitigationId } = req.params;
    const { description, owner, timeline, effectiveness, status } = req.body;
    
    const updateData = {};
    if (description) updateData.description = description;
    if (owner !== undefined) updateData.owner = owner;
    if (timeline !== undefined) updateData.timeline = timeline;
    if (effectiveness) updateData.effectiveness = effectiveness;
    if (status) updateData.status = status;
    
    const mitigation = await prisma.mitigation.update({
      where: { id: parseInt(mitigationId) },
      data: updateData
    });
    
    res.json(mitigation);
  } catch (error) {
    console.error('Error updating mitigation:', error);
    res.status(500).json({ error: 'Failed to update mitigation' });
  }
});

// Delete mitigation
router.delete('/:id/mitigations/:mitigationId', authenticateToken, async (req, res) => {
  try {
    const { mitigationId } = req.params;
    
    await prisma.mitigation.delete({
      where: { id: parseInt(mitigationId) }
    });
    
    res.json({ message: 'Mitigation deleted successfully' });
  } catch (error) {
    console.error('Error deleting mitigation:', error);
    res.status(500).json({ error: 'Failed to delete mitigation' });
  }
});

// Delete a risk
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.risk.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Risk deleted successfully' });
  } catch (error) {
    console.error('Error deleting risk:', error);
    res.status(500).json({ error: 'Failed to delete risk' });
  }
});

module.exports = router;
