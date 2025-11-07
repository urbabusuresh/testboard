# Test Management Dashboard - User Guide

## Overview
This test management system has been enhanced with enterprise-level features following international standards and CMMI best practices.

## New Features

### 1. Enhanced Dashboard
**Access**: Navigate to `Dashboard` from the project sidebar

**Features**:
- **Key Metrics Cards**: Quick view of total test cases, completed cases, in-progress cases, and team size
- **Assignment Progress**: Visual progress bar showing how many test cases are assigned vs unassigned
- **Workflow Distribution**: See how test cases are distributed across workflow stages
- **Priority Distribution**: View test cases categorized by priority (Critical, High, Medium, Low)
- **Automation Coverage**: Track the percentage of test cases that have automated tests
- **Test Run Statistics**: Overview of total, active, and completed test runs

**Use Cases**:
- Project managers can quickly assess project health
- Team leads can monitor team workload
- Stakeholders get instant visibility into testing progress

### 2. Kanban Board
**Access**: Navigate to `Kanban Board` from the project sidebar

**Features**:
- **Drag-and-Drop**: Move test cases between workflow stages by dragging cards
- **Five Workflow Stages**:
  - **Draft**: Newly created test cases
  - **Ready**: Test cases ready for execution
  - **In Progress**: Currently being worked on
  - **Review**: Awaiting review or verification
  - **Completed**: Finished test cases
- **Visual Information**: Each card shows:
  - Test case title
  - Priority (color-coded)
  - Assigned team member
  - Folder/module name
  - Estimated hours

**How to Use**:
1. View all test cases organized by status
2. Drag a test case card to a different column to update its status
3. The status is automatically saved to the database
4. Cards are color-coded by priority for quick identification

**Best Practices**:
- Keep cards moving from left to right (draft → completed)
- Assign test cases before moving to "In Progress"
- Use "Review" stage for quality checks
- Limit work-in-progress items for better focus

### 3. Form Validations
All forms now include comprehensive validation:

**Project Forms**:
- Project name: 1-255 characters (required)
- Description: Maximum 1000 characters
- Public visibility: Must be specified

**Test Case Forms**:
- Title: 1-255 characters (required)
- Description: Maximum 5000 characters
- Priority, Type, State: Must be selected
- All required fields validated before submission

**Test Run Forms**:
- Name: 1-255 characters (required)
- Description: Maximum 1000 characters
- Configuration: Validated for format

**User Forms**:
- Email: Valid format required
- Username: 1-50 characters
- Password: Minimum 8 characters
- Role: Must be selected

**Benefits**:
- Prevents invalid data entry
- Clear error messages guide users
- Consistent validation on frontend and backend
- Data integrity maintained

### 4. Test Case Assignment

**Manual Assignment**:
1. Open a test case
2. Select an assignee from the dropdown
3. Optionally set estimated hours
4. Save the test case

**Auto-Assignment** (Manager/Admin only):
Available via API endpoint for bulk assignment:
```bash
POST /api/assignments/auto
{
  "projectId": 1,
  "caseIds": [1, 2, 3, 4],
  "strategy": "least-loaded"
}
```

**Assignment Strategies**:
- **Least-Loaded**: Assigns test cases to the team member with the fewest active assignments
- **Round-Robin**: Distributes test cases evenly across all team members in rotation

**Benefits**:
- Fair workload distribution
- Clear accountability
- Performance tracking per team member
- Automatic balancing prevents overload

## Role-Based Access

Different roles have different permissions:

| Role | Dashboard | Kanban | Assign Cases | Auto-Assign | View Reports |
|------|-----------|--------|--------------|-------------|--------------|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tester | ✓ | ✓ | ✓ | ✗ | ✓ |
| Developer | ✓ | ✓ | ✓ | ✗ | ✓ |
| Viewer | ✓ | ✓ | ✗ | ✗ | ✓ |
| Reporter | ✓ | ✓ | ✗ | ✗ | ✓ |

## Workflow Best Practices

### Test Case Lifecycle
1. **Create** test case in "Draft" status
2. **Review** and mark as "Ready" when complete
3. **Assign** to team member
4. Team member moves to "In Progress" when starting
5. Move to "Review" for verification
6. Mark as "Completed" when done

### Daily Workflow
1. Check Dashboard for overview
2. Use Kanban board to manage daily tasks
3. Update test case status as work progresses
4. Review assignment distribution
5. Check automation coverage metrics

### Weekly Reviews
1. Review dashboard metrics
2. Check team performance
3. Ensure balanced workload
4. Track completion rates
5. Monitor automation coverage

## Tips and Tricks

### Dashboard
- Refresh regularly for latest metrics
- Use metrics to identify bottlenecks
- Monitor unassigned test cases
- Track automation coverage goals

### Kanban Board
- Use filters to focus on specific priorities
- Drag multiple cards in one session
- Update status as soon as work changes
- Keep "In Progress" column lean

### Assignment
- Assign based on expertise
- Consider current workload
- Set realistic estimated hours
- Use auto-assignment for bulk operations

## Troubleshooting

### Dashboard not loading
- Check network connection
- Verify you have project access
- Try refreshing the page

### Cannot drag test cases
- Ensure you have edit permissions
- Check if the test case is locked
- Try refreshing the browser

### Validation errors
- Read error messages carefully
- Check all required fields
- Verify data format (email, length)
- Contact admin if persistent

## API Integration

All features are accessible via REST API:

**Dashboard Metrics**:
```
GET /api/dashboard/metrics?projectId=1
GET /api/dashboard/team-performance?projectId=1
```

**Kanban Operations**:
```
GET /api/kanban?projectId=1
PUT /api/kanban/:caseId/status
PUT /api/kanban/:caseId/assign
```

**Auto-Assignment**:
```
POST /api/assignments/auto
```

For complete API documentation, visit: `http://localhost:3000/api-docs`

## Support

For questions or issues:
1. Check this documentation
2. Review ENHANCEMENTS.md for technical details
3. Contact your project administrator
4. Check API documentation at `/api-docs`

## Future Enhancements

Planned features:
- Email notifications for assignments
- Burndown charts
- Velocity tracking
- Test case templates
- Advanced filtering on Kanban board
- Export reports to PDF/Excel
- Integration with CI/CD pipelines
