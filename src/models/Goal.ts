import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGoal extends Document {
  goalId: string;
  title: string;
  description: string;
  organizationId: mongoose.Types.ObjectId;
  companyCode: string;
  createdBy: mongoose.Types.ObjectId;
  createdByRole?: string;
  visibleToAll?: boolean;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed' | 'canceled' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  department: string;
  assignedProjects: {
    projectId: mongoose.Types.ObjectId;
    assignedAt: Date;
    assignedBy: mongoose.Types.ObjectId;
  }[];
  kpis: {
    name: string;
    description: string;
    target: number;
    current: number;
    unit: string;
    dueDate: Date;
  }[];
  assignedEmployees: {
    employeeId: string;
    email: string;
    name: string;
    role: string;
    assignedAt: Date;
    addedBy?: {
      userId: string;
      userName: string;
      addedAt: Date;
    };
    removedBy?: {
      userId: string;
      userName: string;
      removedAt: Date;
    };
  }[];
  viewers: {
    employeeId: string;
    email: string;
    name: string;
    addedBy?: {
      userId: string;
      userName: string;
      addedAt: Date;
    };
    removedBy?: {
      userId: string;
      userName: string;
      removedAt: Date;
    };
  }[];
  progress: number; // 0-100
  isManagementGoal: boolean;
  updates?: {
    _id: mongoose.Types.ObjectId;
    message: string;
    author_id: string;
    author_name: string;
    created_at: Date;
    updated_at: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema: Schema = new Schema({
  goalId: {
    type: String,
    required: [true, 'Goal ID is required'],
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Goal description is required'],
    trim: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  companyCode: {
    type: String,
    required: true,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByRole: {
    type: String,
    index: true
  },
  visibleToAll: {
    type: Boolean,
    default: false,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'canceled', 'on-hold'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  department: {
    type: String,
    required: true,
    index: true
  },
  assignedProjects: [{
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  kpis: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    target: {
      type: Number,
      required: true
    },
    current: {
      type: Number,
      default: 0
    },
    unit: {
      type: String,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    }
  }],
  assignedEmployees: [{
    employeeId: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      userId: {
        type: String,
        required: false
      },
      userName: {
        type: String,
        required: false
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    },
    removedBy: {
      userId: {
        type: String,
        required: false
      },
      userName: {
        type: String,
        required: false
      },
      removedAt: {
        type: Date,
        required: false
      }
    }
  }],
  viewers: [{
    employeeId: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    addedBy: {
      userId: {
        type: String,
        required: false
      },
      userName: {
        type: String,
        required: false
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    },
    removedBy: {
      userId: {
        type: String,
        required: false
      },
      userName: {
        type: String,
        required: false
      },
      removedAt: {
        type: Date,
        required: false
      }
    }
  }],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isManagementGoal: {
    type: Boolean,
    default: false,
    index: true
  },
  updates: [{
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    author_id: {
      type: String,
      required: true
    },
    author_name: {
      type: String,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create indexes for querying
GoalSchema.index({ organizationId: 1, createdBy: 1 });
GoalSchema.index({ organizationId: 1, department: 1 });
GoalSchema.index({ organizationId: 1, status: 1 });
GoalSchema.index({ organizationId: 1, "assignedEmployees.email": 1 });
GoalSchema.index({ companyCode: 1 });
GoalSchema.index({ "assignedProjects.projectId": 1 });

// Pre-save hook to calculate progress based on KPIs and assigned projects
GoalSchema.pre<IGoal>('save', function(next) {
  // Calculate progress based on KPIs completion
  if (this.kpis && this.kpis.length > 0) {
    const totalKpis = this.kpis.length;
    const completedKpis = this.kpis.filter(kpi => kpi.current >= kpi.target).length;
    this.progress = Math.round((completedKpis / totalKpis) * 100);
  }
  
  // Set isManagementGoal based on creator role
  if (this.createdByRole && ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3', 'admin'].includes(this.createdByRole)) {
    this.isManagementGoal = true;
  }
  
  next();
});

// Check if model exists before compiling
const Goal = mongoose.models.Goal as Model<IGoal> || 
  mongoose.model<IGoal>('Goal', GoalSchema);

export default Goal;