export type UserRole =
  | 'SUPER_ADMIN'
  | 'PROJECT_MANAGER'
  | 'SALES_REP'
  | 'CONTENT_WRITER'
  | 'GRAPHIC_DESIGNER'
  | 'VIDEO_EDITOR'
  | 'SOCIAL_MEDIA_MANAGER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  phone?: string;
  whatsappNumber?: string;
  capacityLimit: number; // default 25
  isCheckedIn?: boolean;
  checkInTime?: string;
}

export type WorkType =
  | 'Social Media Management'
  | 'Branding'
  | 'Video Production'
  | 'Print Design'
  | 'Packaging'
  | 'Custom Design'
  | 'Content Writing'
  | 'Other';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type ProjectStatus =
  | 'Awaiting Team Assignment'
  | 'In Progress'
  | 'Pending Client Approval'
  | 'Ready to Upload'
  | 'Completed'
  | 'Archived';

export type TaskType =
  | 'Static Post'
  | 'Reel'
  | 'Story'
  | 'Video Shoot'
  | 'Video Editing'
  | 'Banner'
  | 'Custom Design'
  | 'Content Writing';

export type TaskGeneralStatus =
  | 'Awaiting Team Assignment'
  | 'Assigned'
  | 'Not Started'
  | 'In Progress'
  | 'On Hold'
  | 'Overdue'
  | 'Completed'
  | 'Cancelled'
  | 'Archived';

export type ContentStatus =
  | 'Content Pending'
  | 'Content Writing'
  | 'Content Sent for Approval'
  | 'Content Changes Required'
  | 'Content Approved';

export type DesignStatus =
  | 'Ready for Design'
  | 'In Design'
  | 'Shared on WhatsApp'
  | 'Creative Sent for Approval'
  | 'Internal Approved'
  | 'Client Review'
  | 'Changes from Client'
  | 'Revision Shared'
  | 'Creative Approved';

export type VideoStatus =
  | 'Ready for Editing'
  | 'Editing in Progress'
  | 'First Cut Shared'
  | 'First Cut Review'
  | 'Video Changes Required'
  | 'Revised Cut Shared'
  | 'Final Approved';

export type PublishingStatus =
  | 'Ready to Upload'
  | 'Scheduled'
  | 'Uploaded / Posted'
  | 'Done';

export type SocialPlatform =
  | 'Instagram'
  | 'Facebook'
  | 'LinkedIn'
  | 'YouTube'
  | 'Google Business'
  | 'WhatsApp Status'
  | 'Other';

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  remarks?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'PENDING_DELETE';
  deleteReason?: string;
  deleteRequestedBy?: string;
  createdAt: string;
}

export interface DeliverableQuantity {
  type: TaskType;
  quantity: number;
  customDesignName?: string;
  customShortBrief?: string;
}

export interface FinancialDetails {
  totalPayment: number;
  advanceReceived: number;
  pendingAmount: number; // totalPayment - advanceReceived
  paymentDueDate: string;
  paymentNotes?: string;
  isFullyPaid: boolean;
  paymentOverrideApprovedBy?: string;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  campaignName: string;
  workType: WorkType;
  startDate: string;
  dueDate: string;
  priority: Priority;
  isMonthlyRetainer: boolean;
  retainerStartDate?: string;
  retainerTaskGenerationDate?: string;
  retainerRenewalDate?: string;
  isRetainerPaused?: boolean;
  shortNote?: string;
  deliverables: DeliverableQuantity[];
  financials: FinancialDetails;
  status: ProjectStatus;
  assignedWriterId?: string;
  assignedDesignerId?: string;
  assignedEditorId?: string;
  assignedSmmId?: string;
  createdBy: string;
  createdAt: string;
}

export interface WhatsAppShareRecord {
  id: string;
  version: string; // V1, V2, etc.
  sharedBy: string;
  sharedByName: string;
  sharedWith: string; // Recipient Name
  whatsappNumberOrGroup: string;
  sharedDate: string;
  sharedTime: string;
  shareType: 'Internal Team' | 'Social Media Manager' | 'Project Manager' | 'Client' | 'Client Group';
  messageOrNote?: string;
  isConfirmed: boolean;
}

export interface ClientFeedbackRecord {
  id: string;
  feedbackReceivedFrom: string;
  receivedBy: string;
  feedbackDate: string;
  feedbackTime: string;
  clientFeedbackText: string;
  requiredChanges: string;
  revisionDueDate?: string;
  priority: Priority;
}

export interface WrittenContent {
  title?: string;
  headline?: string;
  mainCaption?: string; // Gujarati & English multi-line formatting preserved
  cta?: string;
  hashtags?: string;
  visualDirection?: string;
  internalNotes?: string;
  updatedAt?: string;
}

export interface SMMUploadInfo {
  platform?: SocialPlatform;
  scheduledDate?: string;
  scheduledTime?: string;
  finalCaption?: string;
  hashtags?: string;
  postingNotes?: string;
  postedBy?: string;
  postUrl?: string;
  uploadedAt?: string;
  isUploadConfirmed?: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  clientId: string;
  clientName: string;
  campaignName: string;
  taskName: string; // e.g. "Static Post 01", "Reel 02"
  taskType: TaskType;
  shortBrief?: string;
  dueDate: string;
  priority: Priority;
  
  // Statuses
  generalStatus: TaskGeneralStatus;
  contentStatus: ContentStatus;
  designStatus?: DesignStatus;
  videoStatus?: VideoStatus;
  publishingStatus?: PublishingStatus;

  // Assignments
  assignedWriterId?: string;
  assignedDesignerId?: string;
  assignedEditorId?: string;
  assignedSmmId?: string;

  // Written content
  content?: WrittenContent;
  contentChangesInstructions?: string;

  // WhatsApp sharing records
  whatsappShares: WhatsAppShareRecord[];
  
  // Client feedback records
  clientFeedbacks: ClientFeedbackRecord[];

  // SMM Upload
  smmUpload?: SMMUploadInfo;

  // Payment check override
  paymentOverrideGranted?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ACTION_REQUIRED';
  timestamp: string;
  isRead: boolean;
  relatedTaskId?: string;
  relatedProjectId?: string;
  clientName?: string;
  performedBy?: string;
}

export interface ActivityLog {
  id: string;
  taskId?: string;
  taskName?: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  action: string;
  performedBy: string;
  performedByName: string;
  performedByRole: UserRole;
  details?: string;
  timestamp: string;
}

export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Annual Leave' | 'Emergency Leave' | 'Festival Leave' | 'Unannounced Leave';

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  whatsappProofSharedWith?: string;
  whatsappSharedDate?: string;
  note?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminComment?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE';
}
