# Goals Management System

## Overview

The Goals Management System is a comprehensive feature that allows admin and top management users to create, manage, and track organizational goals with associated KPIs and projects. The system follows a three-layer architecture similar to the Projects page.

## Features

### 1. Goal Management
- **Create Goals**: Admin/top management can create organizational goals with detailed information
- **Edit Goals**: Full editing capabilities for goal details, KPIs, and assignments
- **Delete Goals**: Secure goal deletion with confirmation
- **View Goals**: Comprehensive goal details with progress tracking

### 2. Three-Layer Architecture
```
Layer 1: Goals Overview Page
└── Layer 2: Individual Goal Details/Management
    └── Layer 3: Project Creation/Assignment within Goals
```

### 3. Key Components

#### Goals Page (`/dashboard/goals`)
- Similar UI to Projects page with cards, filters, and search
- Stats overview (Total, Completed, Active, Planning, On Hold)
- Quick goal creation and full modal creation
- Permission-based access (only admin/top management can create)

#### Goal Display Cards
- Progress bars showing completion percentage
- Management badge for goals created by top management
- KPI, project, and employee counts
- Status and priority indicators

#### Individual Goal View (`/dashboard/goals/[id]`)
- Comprehensive goal details with editing capabilities
- Tabbed interface for Projects and KPIs
- Employee assignments and viewer management
- Real-time project assignment and creation

#### Goal Edit Page (`/dashboard/goals/[id]/edit`)
- Full editing form with validation
- KPI management (add, edit, remove)
- Employee search and assignment
- Viewer management for access control

### 4. Project Integration

#### Creating Projects within Goals
- Simplified project creation from goal context
- Automatic assignment to parent goal
- Employee search and assignment
- Projects appear in employee dashboards automatically

#### Assigning Existing Projects
- Browse and assign existing projects to goals
- Prevent duplicate assignments
- Project removal from goals (doesn't delete project)

### 5. Key Performance Indicators (KPIs)
- Add multiple KPIs per goal
- Track target vs current values
- Progress visualization
- Due date management
- Units and descriptions

### 6. Access Control & Permissions

#### Creation Permissions
- Only admin and top management (tier 1, 2, 3) can create goals
- Permission validation on both frontend and backend

#### Visibility Management
- **visibleToAll**: Public goals visible to all company members
- **Private Goals**: Only visible to assigned employees, viewers, and management
- **Assigned Employees**: Users with edit/contribute access
- **Viewers**: Users with view-only access

### 7. Database Schema

#### Goals Collection (`goals`)
```javascript
{
  goalId: string,
  title: string,
  description: string,
  organizationId: ObjectId,
  companyCode: string,
  createdBy: ObjectId,
  createdByRole: string,
  visibleToAll: boolean,
  startDate: Date,
  endDate: Date,
  status: 'planning' | 'active' | 'completed' | 'canceled' | 'on-hold',
  priority: 'low' | 'medium' | 'high' | 'critical',
  department: string,
  assignedProjects: [{
    projectId: ObjectId,
    assignedAt: Date,
    assignedBy: ObjectId
  }],
  kpis: [{
    name: string,
    description: string,
    target: number,
    current: number,
    unit: string,
    dueDate: Date
  }],
  assignedEmployees: [{
    employeeId: string,
    email: string,
    name: string,
    role: string,
    assignedAt: Date
  }],
  viewers: [{
    employeeId: string,
    email: string,
    name: string
  }],
  progress: number, // 0-100, calculated from KPIs
  isManagementGoal: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 8. API Endpoints

#### Goals Management
- `GET /api/goals` - Fetch goals with permission filtering
- `POST /api/goals` - Create new goal (admin/management only)
- `PUT /api/goals?goalId=x` - Update existing goal
- `DELETE /api/goals?goalId=x` - Delete goal

#### Goal Projects Management
- `GET /api/goals/[goalId]/projects` - Get projects assigned to goal
- `POST /api/goals/[goalId]/projects` - Create new project or assign existing
- `DELETE /api/goals/[goalId]/projects?projectId=x` - Remove project from goal

### 9. File Structure
```
src/app/dashboard/goals/
├── page.tsx                 # Main goals overview page
├── api.ts                   # Client-side API functions
├── GoalDisplayCard.tsx      # Individual goal card component
├── AddGoalModal.tsx         # Goal creation modal
├── [id]/
│   ├── page.tsx            # Individual goal details page
│   └── edit/
│       └── page.tsx        # Goal editing page
```

```
src/app/api/goals/
├── route.ts                 # Goals CRUD operations
└── [goalId]/
    └── projects/
        └── route.ts        # Goal-project relationship management
```

```
src/models/
└── Goal.ts                 # Mongoose goal model
```

### 10. Integration with Existing System

#### Projects Integration
- Projects created within goals are marked with `createdFromGoal`
- Projects show up in employee project dashboards
- Project assignments from goals are automatically handled
- No conflicts with existing project management

#### Employee Dashboard Integration
- Employees see projects assigned through goals
- Goals visibility based on permissions
- Seamless integration with existing project workflows

### 11. Usage Flow

#### For Admin/Top Management:
1. Navigate to `/dashboard/goals`
2. Create new goal using "Create Goal" button
3. Fill in goal details, KPIs, assign employees
4. In goal details, create or assign projects
5. Assign employees to projects with automatic search
6. Track progress through KPIs and project completion

#### For Employees:
1. View goals they're assigned to or public goals
2. See projects in their dashboard that are part of goals
3. Work on projects normally - goal context is maintained
4. View-only access to goals they're viewers of

### 12. Key Benefits

- **Unified Goal Management**: Centralized place for organizational objectives
- **KPI Tracking**: Built-in progress measurement
- **Project Alignment**: Clear connection between projects and goals
- **Permission Control**: Secure access based on roles
- **Employee Visibility**: Employees understand how their work connects to goals
- **Management Oversight**: Top management can track goal progress and project alignment

### 13. Future Enhancements

- Goal templates for common objectives
- Automated progress reporting
- Goal dependencies and hierarchies
- Integration with performance reviews
- Dashboard widgets for goal metrics
- Notification system for goal milestones

## Implementation Notes

- The system uses company-specific databases for multi-tenancy
- All API endpoints include proper authentication and authorization
- Progress calculation is automatic based on KPI completion
- Employee search uses existing user search infrastructure
- UI follows the same patterns as the Projects page for consistency
- Full responsive design for mobile and desktop use

## Testing

To test the system:
1. Log in as an admin or top management user
2. Navigate to `/dashboard/goals`
3. Create a goal with KPIs and employee assignments
4. Create or assign projects to the goal
5. Verify employees can see assigned projects in their dashboard
6. Test editing and deletion functionalities