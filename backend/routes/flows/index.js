/**
 * Flow Engine API Routes
 * Manages E2E flows (FlowMaster, FlowStep, FlowExecution)
 * Supports conditional branching, parallel execution, and orchestration
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticateToken } = require('../../middleware/auth');

// Get all flow masters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, status } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    
    const flows = await prisma.flowMaster.findMany({
      where,
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
          include: {
            linkedTestCase: {
              select: { id: true, title: true, status: true }
            }
          }
        },
        _count: {
          select: { executions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(flows);
  } catch (error) {
    console.error('Error fetching flows:', error);
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
});

// Get a single flow master with all steps
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const flow = await prisma.flowMaster.findUnique({
      where: { id: parseInt(id) },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
          include: {
            linkedTestCase: true
          }
        },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: {
            executor: {
              select: { id: true, username: true, email: true }
            },
            stepExecutions: {
              include: {
                flowStep: true
              }
            }
          }
        }
      }
    });
    
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    
    res.json(flow);
  } catch (error) {
    console.error('Error fetching flow:', error);
    res.status(500).json({ error: 'Failed to fetch flow' });
  }
});

// Create a new flow master
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, type, metadata, steps } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Flow name is required' });
    }
    
    const flow = await prisma.flowMaster.create({
      data: {
        name,
        description,
        type,
        metadata: metadata || {},
        status: 'active'
      }
    });
    
    // Create steps if provided
    if (steps && Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await prisma.flowStep.create({
          data: {
            flowId: flow.id,
            orderIndex: step.orderIndex !== undefined ? step.orderIndex : i,
            linkedEntityType: step.linkedEntityType,
            linkedEntityId: parseInt(step.linkedEntityId),
            mandatory: step.mandatory !== false, // default true
            condition: step.condition || null,
            retryPolicy: step.retryPolicy || null,
            timeout: step.timeout || null
          }
        });
      }
    }
    
    // Fetch created flow with steps
    const createdFlow = await prisma.flowMaster.findUnique({
      where: { id: flow.id },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
    
    res.status(201).json(createdFlow);
  } catch (error) {
    console.error('Error creating flow:', error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
});

// Update a flow master
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, status, metadata } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (status) updateData.status = status;
    if (metadata) updateData.metadata = metadata;
    
    const flow = await prisma.flowMaster.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
    
    res.json(flow);
  } catch (error) {
    console.error('Error updating flow:', error);
    res.status(500).json({ error: 'Failed to update flow' });
  }
});

// Add a step to a flow
router.post('/:id/steps', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      linkedEntityType,
      linkedEntityId,
      orderIndex,
      mandatory,
      condition,
      retryPolicy,
      timeout
    } = req.body;
    
    if (!linkedEntityType || !linkedEntityId) {
      return res.status(400).json({ error: 'linkedEntityType and linkedEntityId are required' });
    }
    
    const step = await prisma.flowStep.create({
      data: {
        flowId: parseInt(id),
        linkedEntityType,
        linkedEntityId: parseInt(linkedEntityId),
        orderIndex: orderIndex || 0,
        mandatory: mandatory !== false,
        condition: condition || null,
        retryPolicy: retryPolicy || null,
        timeout: timeout || null
      },
      include: {
        linkedTestCase: {
          select: { id: true, title: true, status: true }
        }
      }
    });
    
    res.status(201).json(step);
  } catch (error) {
    console.error('Error adding flow step:', error);
    res.status(500).json({ error: 'Failed to add flow step' });
  }
});

// Update a flow step
router.put('/:id/steps/:stepId', authenticateToken, async (req, res) => {
  try {
    const { stepId } = req.params;
    const {
      linkedEntityType,
      linkedEntityId,
      orderIndex,
      mandatory,
      condition,
      retryPolicy,
      timeout
    } = req.body;
    
    const updateData = {};
    if (linkedEntityType) updateData.linkedEntityType = linkedEntityType;
    if (linkedEntityId) updateData.linkedEntityId = parseInt(linkedEntityId);
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (mandatory !== undefined) updateData.mandatory = mandatory;
    if (condition !== undefined) updateData.condition = condition;
    if (retryPolicy !== undefined) updateData.retryPolicy = retryPolicy;
    if (timeout !== undefined) updateData.timeout = timeout;
    
    const step = await prisma.flowStep.update({
      where: { id: parseInt(stepId) },
      data: updateData,
      include: {
        linkedTestCase: {
          select: { id: true, title: true, status: true }
        }
      }
    });
    
    res.json(step);
  } catch (error) {
    console.error('Error updating flow step:', error);
    res.status(500).json({ error: 'Failed to update flow step' });
  }
});

// Delete a flow step
router.delete('/:id/steps/:stepId', authenticateToken, async (req, res) => {
  try {
    const { stepId } = req.params;
    
    await prisma.flowStep.delete({
      where: { id: parseInt(stepId) }
    });
    
    res.json({ message: 'Flow step deleted successfully' });
  } catch (error) {
    console.error('Error deleting flow step:', error);
    res.status(500).json({ error: 'Failed to delete flow step' });
  }
});

// Execute a flow
router.post('/:id/execute', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { environment, strategy } = req.body;
    
    const flow = await prisma.flowMaster.findUnique({
      where: { id: parseInt(id) },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
          include: {
            linkedTestCase: true
          }
        }
      }
    });
    
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    
    // Create flow execution record
    const execution = await prisma.flowExecution.create({
      data: {
        flowId: flow.id,
        executedBy: req.user.id,
        status: 'running',
        environment: environment || 'default'
      },
      include: {
        flow: {
          select: { id: true, name: true }
        }
      }
    });
    
    // Create step execution records
    for (const step of flow.steps) {
      await prisma.flowStepExecution.create({
        data: {
          flowExecutionId: execution.id,
          flowStepId: step.id,
          status: 'pending'
        }
      });
    }
    
    // Start async execution (in real implementation, this would be a background job)
    // For now, return execution ID for client to poll
    res.status(202).json({
      message: 'Flow execution started',
      execution: {
        id: execution.id,
        flowId: flow.id,
        status: 'running',
        startedAt: execution.startedAt
      }
    });
    
    // Background execution logic would go here
    // This is a simplified synchronous version for demonstration
    executeFlowAsync(execution.id, flow, strategy).catch(err => {
      console.error('Flow execution error:', err);
    });
    
  } catch (error) {
    console.error('Error executing flow:', error);
    res.status(500).json({ error: 'Failed to execute flow' });
  }
});

// Get flow execution status
router.get('/:id/executions/:executionId', authenticateToken, async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const execution = await prisma.flowExecution.findUnique({
      where: { id: parseInt(executionId) },
      include: {
        flow: {
          select: { id: true, name: true }
        },
        executor: {
          select: { id: true, username: true, email: true }
        },
        stepExecutions: {
          include: {
            flowStep: {
              include: {
                linkedTestCase: {
                  select: { id: true, title: true }
                }
              }
            }
          },
          orderBy: { id: 'asc' }
        }
      }
    });
    
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    res.json(execution);
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

// Get all executions for a flow
router.get('/:id/executions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const executions = await prisma.flowExecution.findMany({
      where: { flowId: parseInt(id) },
      include: {
        executor: {
          select: { id: true, username: true, email: true }
        },
        _count: {
          select: { stepExecutions: true }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });
    
    res.json(executions);
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// Delete a flow
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.flowMaster.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Flow deleted successfully' });
  } catch (error) {
    console.error('Error deleting flow:', error);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
});

// Helper function for async flow execution
async function executeFlowAsync(executionId, flow, strategy = 'abort-on-fail') {
  try {
    const steps = flow.steps.sort((a, b) => a.orderIndex - b.orderIndex);
    let allPassed = true;
    
    for (const step of steps) {
      // Update step status to running
      await prisma.flowStepExecution.updateMany({
        where: {
          flowExecutionId: executionId,
          flowStepId: step.id
        },
        data: {
          status: 'running',
          startedAt: new Date()
        }
      });
      
      // Evaluate condition if present
      if (step.condition) {
        // Simplified condition evaluation
        // In real implementation, this would evaluate JSON logic
        const shouldRun = evaluateCondition(step.condition, {});
        if (!shouldRun) {
          await prisma.flowStepExecution.updateMany({
            where: {
              flowExecutionId: executionId,
              flowStepId: step.id
            },
            data: {
              status: 'skipped',
              completedAt: new Date()
            }
          });
          continue;
        }
      }
      
      // Simulate test case execution
      // In real implementation, this would execute the actual test
      const passed = Math.random() > 0.2; // 80% pass rate simulation
      
      await prisma.flowStepExecution.updateMany({
        where: {
          flowExecutionId: executionId,
          flowStepId: step.id
        },
        data: {
          status: passed ? 'passed' : 'failed',
          result: passed ? 'pass' : 'fail',
          completedAt: new Date()
        }
      });
      
      if (!passed && step.mandatory) {
        allPassed = false;
        if (strategy === 'abort-on-fail') {
          break;
        }
      }
    }
    
    // Update flow execution status
    await prisma.flowExecution.update({
      where: { id: executionId },
      data: {
        status: 'completed',
        result: allPassed ? 'pass' : 'fail',
        completedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error in async flow execution:', error);
    await prisma.flowExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        result: 'fail',
        logs: error.message,
        completedAt: new Date()
      }
    });
  }
}

function evaluateCondition(condition, context) {
  // Simplified condition evaluation
  // Real implementation would use a proper JSON logic evaluator
  return true;
}

module.exports = router;
