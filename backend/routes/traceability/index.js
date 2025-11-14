/**
 * Traceability & Reporting API Routes
 * Requirements Traceability Matrix (RTM), Coverage Reports, Release Readiness
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticateToken } = require('../../middleware/auth');

// Get Requirements Traceability Matrix (RTM)
router.get('/rtm', authenticateToken, async (req, res) => {
  try {
    const { projectId, releaseId, moduleId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'ProjectId is required' });
    }
    
    // Get all requirements for the project/release
    const requirementWhere = { projectId: parseInt(projectId) };
    if (releaseId) requirementWhere.releaseId = parseInt(releaseId);
    
    const requirements = await prisma.requirement.findMany({
      where: requirementWhere,
      include: {
        hierarchyNode: {
          select: { id: true, title: true, type: true }
        }
      }
    });
    
    // Build traceability map
    const rtmData = await Promise.all(
      requirements.map(async (req) => {
        // Get linked test cases
        const testCaseLinks = await prisma.artifactLink.findMany({
          where: {
            fromType: 'requirement',
            fromId: req.id,
            toType: 'testcase'
          }
        });
        
        const testCaseIds = testCaseLinks.map(link => link.toId);
        
        const testCases = await prisma.testCaseVersion.findMany({
          where: {
            id: { in: testCaseIds },
            status: 'active'
          },
          select: {
            id: true,
            title: true,
            status: true,
            workflowStatus: true
          }
        });
        
        // Get execution runs for these test cases
        const executionRuns = await prisma.executionRun.findMany({
          where: {
            testCaseVersionId: { in: testCaseIds }
          },
          select: {
            id: true,
            result: true,
            executedOn: true,
            testCaseVersionId: true
          },
          orderBy: {
            executedOn: 'desc'
          }
        });
        
        // Get defects linked to executions
        const defects = await prisma.defect.findMany({
          where: {
            executionRunId: { in: executionRuns.map(er => er.id) }
          },
          select: {
            id: true,
            title: true,
            severity: true,
            state: true,
            executionRunId: true
          }
        });
        
        return {
          requirement: {
            id: req.id,
            title: req.title,
            type: req.type,
            status: req.status,
            priority: req.priority,
            hierarchyNode: req.hierarchyNode
          },
          testCases: testCases.map(tc => {
            const tcExecutions = executionRuns.filter(er => er.testCaseVersionId === tc.id);
            const lastExecution = tcExecutions[0];
            const tcDefects = defects.filter(d => 
              tcExecutions.some(er => er.id === d.executionRunId)
            );
            
            return {
              ...tc,
              executionCount: tcExecutions.length,
              lastExecution: lastExecution ? {
                result: lastExecution.result,
                date: lastExecution.executedOn
              } : null,
              defectCount: tcDefects.length,
              openDefects: tcDefects.filter(d => d.state !== 'closed').length
            };
          }),
          coverage: testCases.length > 0 ? 'covered' : 'not-covered',
          testCount: testCases.length
        };
      })
    );
    
    // Calculate summary statistics
    const summary = {
      totalRequirements: requirements.length,
      coveredRequirements: rtmData.filter(r => r.coverage === 'covered').length,
      uncoveredRequirements: rtmData.filter(r => r.coverage === 'not-covered').length,
      totalTestCases: rtmData.reduce((sum, r) => sum + r.testCount, 0),
      coveragePercentage: requirements.length > 0 
        ? ((rtmData.filter(r => r.coverage === 'covered').length / requirements.length) * 100).toFixed(2)
        : 0
    };
    
    res.json({
      summary,
      traceabilityMatrix: rtmData
    });
  } catch (error) {
    console.error('Error generating RTM:', error);
    res.status(500).json({ error: 'Failed to generate RTM' });
  }
});

// Get test coverage report
router.get('/coverage', authenticateToken, async (req, res) => {
  try {
    const { projectId, releaseId, hierarchyNodeId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'ProjectId is required' });
    }
    
    // Get test cases
    const testCaseWhere = {};
    if (releaseId) testCaseWhere.releaseId = parseInt(releaseId);
    if (hierarchyNodeId) testCaseWhere.hierarchyNodeId = parseInt(hierarchyNodeId);
    testCaseWhere.status = 'active';
    
    const testCases = await prisma.testCaseVersion.findMany({
      where: testCaseWhere,
      include: {
        executionRuns: {
          orderBy: { executedOn: 'desc' },
          take: 1
        },
        automationBindings: true,
        hierarchyNode: {
          select: { id: true, title: true, type: true }
        }
      }
    });
    
    // Categorize test cases
    const coverage = {
      total: testCases.length,
      executed: testCases.filter(tc => tc.executionRuns.length > 0).length,
      notExecuted: testCases.filter(tc => tc.executionRuns.length === 0).length,
      automated: testCases.filter(tc => tc.automationBindings.length > 0).length,
      manual: testCases.filter(tc => tc.automationBindings.length === 0).length,
      byPriority: {
        critical: testCases.filter(tc => tc.priority === 'critical').length,
        high: testCases.filter(tc => tc.priority === 'high').length,
        medium: testCases.filter(tc => tc.priority === 'medium').length,
        low: testCases.filter(tc => tc.priority === 'low').length
      },
      byStatus: {
        passed: testCases.filter(tc => tc.executionRuns[0]?.result === 'pass').length,
        failed: testCases.filter(tc => tc.executionRuns[0]?.result === 'fail').length,
        blocked: testCases.filter(tc => tc.executionRuns[0]?.result === 'blocked').length,
        skipped: testCases.filter(tc => tc.executionRuns[0]?.result === 'skipped').length
      }
    };
    
    coverage.executionPercentage = coverage.total > 0 
      ? ((coverage.executed / coverage.total) * 100).toFixed(2)
      : 0;
    
    coverage.automationPercentage = coverage.total > 0 
      ? ((coverage.automated / coverage.total) * 100).toFixed(2)
      : 0;
    
    res.json(coverage);
  } catch (error) {
    console.error('Error generating coverage report:', error);
    res.status(500).json({ error: 'Failed to generate coverage report' });
  }
});

// Get release readiness report
router.get('/release-readiness', authenticateToken, async (req, res) => {
  try {
    const { projectId, releaseId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'ProjectId is required' });
    }
    
    // Get requirements
    const requirementWhere = { projectId: parseInt(projectId) };
    if (releaseId) requirementWhere.releaseId = parseInt(releaseId);
    
    const requirements = await prisma.requirement.findMany({
      where: requirementWhere
    });
    
    const requirementsApproved = requirements.filter(r => r.status === 'approved').length;
    
    // Get test cases
    const testCaseWhere = { status: 'active' };
    if (releaseId) testCaseWhere.releaseId = parseInt(releaseId);
    
    const testCases = await prisma.testCaseVersion.findMany({
      where: testCaseWhere,
      include: {
        executionRuns: {
          orderBy: { executedOn: 'desc' },
          take: 1
        }
      }
    });
    
    const testCasesExecuted = testCases.filter(tc => tc.executionRuns.length > 0).length;
    const testCasesPassed = testCases.filter(tc => tc.executionRuns[0]?.result === 'pass').length;
    
    // Get defects
    const defectWhere = { projectId: parseInt(projectId) };
    const defects = await prisma.defect.findMany({
      where: defectWhere
    });
    
    const openDefects = defects.filter(d => d.state !== 'closed').length;
    const criticalDefects = defects.filter(d => d.severity === 'critical' && d.state !== 'closed').length;
    const highDefects = defects.filter(d => d.severity === 'high' && d.state !== 'closed').length;
    
    // Get milestones
    const milestoneWhere = { projectId: parseInt(projectId) };
    const milestones = await prisma.milestone.findMany({
      where: milestoneWhere
    });
    
    const milestonesCompleted = milestones.filter(m => m.status === 'completed').length;
    
    // Get risks
    const riskWhere = { projectId: parseInt(projectId) };
    const risks = await prisma.risk.findMany({
      where: riskWhere
    });
    
    const openHighRisks = risks.filter(r => r.status === 'open' && r.riskScore >= 6).length;
    
    // Calculate readiness scores
    const scores = {
      requirements: requirements.length > 0 
        ? ((requirementsApproved / requirements.length) * 100).toFixed(2)
        : 100,
      testExecution: testCases.length > 0
        ? ((testCasesExecuted / testCases.length) * 100).toFixed(2)
        : 0,
      testPass: testCasesExecuted > 0
        ? ((testCasesPassed / testCasesExecuted) * 100).toFixed(2)
        : 0,
      defects: defects.length > 0
        ? (((defects.length - openDefects) / defects.length) * 100).toFixed(2)
        : 100,
      milestones: milestones.length > 0
        ? ((milestonesCompleted / milestones.length) * 100).toFixed(2)
        : 100
    };
    
    // Calculate overall readiness (weighted average)
    const weights = {
      requirements: 0.25,
      testExecution: 0.20,
      testPass: 0.25,
      defects: 0.20,
      milestones: 0.10
    };
    
    const overallReadiness = (
      (parseFloat(scores.requirements) * weights.requirements) +
      (parseFloat(scores.testExecution) * weights.testExecution) +
      (parseFloat(scores.testPass) * weights.testPass) +
      (parseFloat(scores.defects) * weights.defects) +
      (parseFloat(scores.milestones) * weights.milestones)
    ).toFixed(2);
    
    // Determine readiness status
    let readinessStatus = 'not-ready';
    if (overallReadiness >= 90) readinessStatus = 'ready';
    else if (overallReadiness >= 75) readinessStatus = 'almost-ready';
    else if (overallReadiness >= 50) readinessStatus = 'in-progress';
    
    // Determine blockers
    const blockers = [];
    if (criticalDefects > 0) blockers.push(`${criticalDefects} critical defects open`);
    if (highDefects > 3) blockers.push(`${highDefects} high severity defects open`);
    if (openHighRisks > 0) blockers.push(`${openHighRisks} high-priority risks open`);
    if (parseFloat(scores.testPass) < 90) blockers.push('Test pass rate below 90%');
    if (parseFloat(scores.requirements) < 100) blockers.push('Not all requirements approved');
    
    res.json({
      overallReadiness: parseFloat(overallReadiness),
      readinessStatus,
      scores,
      metrics: {
        requirements: {
          total: requirements.length,
          approved: requirementsApproved,
          pending: requirements.length - requirementsApproved
        },
        testCases: {
          total: testCases.length,
          executed: testCasesExecuted,
          passed: testCasesPassed,
          notExecuted: testCases.length - testCasesExecuted
        },
        defects: {
          total: defects.length,
          open: openDefects,
          closed: defects.length - openDefects,
          critical: criticalDefects,
          high: highDefects
        },
        milestones: {
          total: milestones.length,
          completed: milestonesCompleted,
          pending: milestones.length - milestonesCompleted
        },
        risks: {
          total: risks.length,
          open: risks.filter(r => r.status === 'open').length,
          highPriority: openHighRisks
        }
      },
      blockers
    });
  } catch (error) {
    console.error('Error generating release readiness report:', error);
    res.status(500).json({ error: 'Failed to generate release readiness report' });
  }
});

// Get defect trends
router.get('/defect-trends', authenticateToken, async (req, res) => {
  try {
    const { projectId, days = 30 } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'ProjectId is required' });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const defects = await prisma.defect.findMany({
      where: {
        projectId: parseInt(projectId),
        reportedAt: {
          gte: startDate
        }
      },
      orderBy: {
        reportedAt: 'asc'
      }
    });
    
    // Group by date
    const trendsByDate = {};
    defects.forEach(defect => {
      const date = defect.reportedAt.toISOString().split('T')[0];
      if (!trendsByDate[date]) {
        trendsByDate[date] = {
          date,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          open: 0,
          closed: 0
        };
      }
      trendsByDate[date].total++;
      trendsByDate[date][defect.severity]++;
      trendsByDate[date][defect.state === 'closed' ? 'closed' : 'open']++;
    });
    
    res.json({
      trends: Object.values(trendsByDate),
      summary: {
        totalDefects: defects.length,
        openDefects: defects.filter(d => d.state !== 'closed').length,
        closedDefects: defects.filter(d => d.state === 'closed').length
      }
    });
  } catch (error) {
    console.error('Error generating defect trends:', error);
    res.status(500).json({ error: 'Failed to generate defect trends' });
  }
});

module.exports = router;
