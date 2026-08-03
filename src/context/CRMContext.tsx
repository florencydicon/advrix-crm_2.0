import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Client,
  Project,
  Task,
  Notification,
  ActivityLog,
  LeaveRequest,
  AttendanceRecord,
  TaskType,
  ContentStatus,
  DesignStatus,
  VideoStatus,
  PublishingStatus,
  WhatsAppShareRecord,
  ClientFeedbackRecord,
  SocialPlatform,
  WrittenContent,
} from '../types/crm';

const API_BASE_URL = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env?.VITE_API_URL || 'http://127.0.0.1:3000';
const fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' && input.startsWith('/api/')
    ? `${API_BASE_URL}${input}`
    : input;
  return globalThis.fetch(url as RequestInfo | URL, init);
}) as typeof globalThis.fetch;

interface SystemModalConfig {
  isOpen: boolean;
  type: 'SUCCESS' | 'WARNING' | 'CONFIRMATION' | 'PAYMENT_GATE';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  pendingAmount?: number;
  clientName?: string;
  taskId?: string;
}

interface CRMContextType {
  currentUser: User;
  currentRole: UserRole;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  addUser: (userData: Omit<User, 'id'>) => void;
  updateUser: (userId: string, data: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  updateUserPassword: (userId: string, newPass: string) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  switchRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  
  users: User[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];

  // Modal alert system
  systemModal: SystemModalConfig | null;
  showModal: (config: Omit<SystemModalConfig, 'isOpen'>) => void;
  closeModal: () => void;

  // Workload Helper
  getUserActiveTaskCount: (userId: string) => number;
  getUserWorkloadColor: (userId: string) => 'green' | 'orange' | 'red';
  isUserOnLeave: (userId: string, dateStr?: string) => boolean;

  // Actions
  addClient: (clientData: Omit<Client, 'id' | 'createdAt' | 'status'>) => Client;
  editClient: (clientId: string, data: Partial<Client>) => void;
  requestDeleteClient: (clientId: string, reason: string, note?: string) => void;
  approveDeleteClient: (clientId: string, actionType: 'ARCHIVE' | 'PERMANENT') => void;
  rejectDeleteClient: (clientId: string) => void;

  addProjectAndTasks: (
    projectData: Omit<Project, 'id' | 'createdAt' | 'status'>
  ) => { project: Project; generatedTasks: Task[] };

  assignProjectTeam: (
    projectId: string,
    assignments: {
      writerId?: string;
      designerId?: string;
      editorId?: string;
      smmId?: string;
    }
  ) => void;

  reassignTask: (
    taskId: string,
    role: 'WRITER' | 'DESIGNER' | 'EDITOR' | 'SMM',
    newUserId: string
  ) => void;

  // Content Writer Actions
  startContentWriting: (taskId: string) => void;
  saveContentDraft: (taskId: string, content: WrittenContent) => void;
  sendContentForApproval: (taskId: string, content: WrittenContent) => void;

  // Approvals (PM / SMM / Super Admin)
  approveContent: (taskId: string) => void;
  requestContentChanges: (taskId: string, instructions: string) => void;

  // Designer & Video Editor Actions
  startDesignOrEditing: (taskId: string) => void;
  recordWhatsAppShare: (
    taskId: string,
    shareData: Omit<WhatsAppShareRecord, 'id' | 'isConfirmed'>
  ) => void;
  sendCreativeForApproval: (taskId: string) => void;

  // Review & Client Changes
  approveCreativeInternal: (taskId: string) => void;
  sendToClientReview: (
    taskId: string,
    shareData: Omit<WhatsAppShareRecord, 'id' | 'isConfirmed'>
  ) => void;
  addClientFeedback: (
    taskId: string,
    feedback: Omit<ClientFeedbackRecord, 'id' | 'receivedBy'>
  ) => void;
  approveCreativeFinal: (taskId: string) => void;

  // SMM Upload Actions
  schedulePost: (
    taskId: string,
    platform: SocialPlatform,
    scheduledDate: string,
    scheduledTime: string
  ) => void;
  markAsUploaded: (
    taskId: string,
    platform: SocialPlatform,
    postUrl: string,
    uploadDate: string,
    uploadTime: string
  ) => void;
  markTaskDone: (taskId: string, overridePaymentCheck?: boolean) => void;
  updateTaskStatus: (taskId: string, newStage: string) => void;

  // Financial Actions
  recordPaymentCollected: (projectId: string, amount: number) => void;
  grantPaymentOverride: (taskId: string) => void;

  // Monthly Retainer
  generateMonthlyRetainerTasks: (projectId: string) => void;

  // HR & Attendance
  adminWhatsappNumber: string;
  updateAdminWhatsappNumber: (num: string) => void;
  todaysAttendance?: AttendanceRecord;
  checkIn: () => void;
  checkOut: () => void;
  toggleCheckIn: (userId?: string) => void;
  applyLeave: (leaveData: Omit<LeaveRequest, 'id' | 'userId' | 'userName' | 'userRole' | 'status' | 'createdAt'>) => void;
  approveLeave: (leaveId: string, comment?: string) => void;
  rejectLeave: (leaveId: string, comment?: string) => void;

  // Notifications
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;

  // Reset demo
  resetDemoData: () => void;
  flushStoredData: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('advrix_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('advrix_auth') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUserId = localStorage.getItem('advrix_current_user_id');
    const found = users.find((u) => u.id === savedUserId);
    return found || users[0];
  });

  const currentRole = currentUser.role;

  const [adminWhatsappNumber, setAdminWhatsappNumber] = useState<string>(() => {
    return localStorage.getItem('advrix_admin_whatsapp') || '+91 97731 24598';
  });

  const loadLiveData = async () => {
    try {
      const [usersRes, clientsRes, projectsRes, tasksRes] = await Promise.all([
        fetch('/api/users').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/projects').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/tasks').then((r) => (r.ok ? r.json() : null)),
      ]);

      const nextUsers = Array.isArray(usersRes) ? usersRes : [];
      setUsers(nextUsers);
      localStorage.setItem('advrix_users', JSON.stringify(nextUsers));
      if (nextUsers.length > 0) {
        const savedUserId = localStorage.getItem('advrix_current_user_id');
        const found = nextUsers.find(
          (u: User) => u.id === savedUserId || (u.email || '').toLowerCase() === 'admin@advrix.com'
        );
        if (found) {
          setCurrentUser(found);
        }
      } else {
        setCurrentUser({
          id: '',
          name: '',
          email: '',
          role: 'SUPER_ADMIN',
          capacityLimit: 0,
        });
      }

      const nextClients = Array.isArray(clientsRes) ? clientsRes : [];
      setClients(nextClients);
      localStorage.setItem('advrix_clients', JSON.stringify(nextClients));

      const nextProjects = Array.isArray(projectsRes) ? projectsRes : [];
      setProjects(nextProjects);
      localStorage.setItem('advrix_projects', JSON.stringify(nextProjects));

      const nextTasks = Array.isArray(tasksRes) ? tasksRes : [];
      setTasks(nextTasks);
      localStorage.setItem('advrix_tasks', JSON.stringify(nextTasks));
    } catch (err) {
      console.warn('Neon Live Database sync:', err);
    }
  };

  // Fetch live database state on mount
  useEffect(() => {
    void loadLiveData();
  }, []);

  const updateAdminWhatsappNumber = (num: string) => {
    setAdminWhatsappNumber(num);
    localStorage.setItem('advrix_admin_whatsapp', num);
  };

  const flushStoredData = async () => {
    const keys = [
      'advrix_users',
      'advrix_clients',
      'advrix_projects',
      'advrix_tasks',
      'advrix_notifications',
      'advrix_activity_logs',
      'advrix_leave_requests',
      'advrix_attendance',
      'advrix_auth',
      'advrix_current_user_id',
    ];

    keys.forEach((key) => localStorage.removeItem(key));

    setUsers([]);
    setClients([]);
    setProjects([]);
    setTasks([]);
    setNotifications([]);
    setActivityLogs([]);
    setLeaveRequests([]);
    setAttendanceRecords([]);
    setIsAuthenticated(false);
    setCurrentUser({
      id: '',
      name: '',
      email: '',
      role: 'SUPER_ADMIN',
      capacityLimit: 0,
    });

    try {
      const response = await fetch('/api/flush', { method: 'DELETE' });
      if (response.ok) {
        await loadLiveData();
        showModal({
          type: 'SUCCESS',
          title: 'Data Flushed',
          message: 'All stored CRM data was removed from the live database and the UI was refreshed.',
        });
      } else {
        throw new Error('Flush failed');
      }
    } catch (err) {
      console.error('Flush error:', err);
      showModal({
        type: 'WARNING',
        title: 'Flush Failed',
        message: 'The app cleared local state, but the live database flush did not complete.',
      });
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: pass }),
      });
      const data = await response.json();

      if (data.success && data.user) {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('advrix_auth', 'true');
        localStorage.setItem('advrix_current_user_id', data.user.id);
        void loadLiveData();
        return { success: true };
      }

      return { success: false, message: data.message || 'Authentication failed.' };
    } catch (err) {
      return { success: false, message: 'Unable to reach the live server.' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('advrix_auth');
    localStorage.removeItem('advrix_current_user_id');
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `u-${Date.now().toString(36)}`,
      capacityLimit: userData.capacityLimit || 25,
      password: userData.password || 'advrix123',
    };
    setUsers((prev) => [...prev, newUser]);
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch((err) => console.error('Error syncing new user to Neon:', err));
  };

  const updateUser = (userId: string, data: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, ...data };
          if (currentUser.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((err) => console.error('Error updating user in Neon:', err));
  };

  const deleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      showModal({
        type: 'WARNING',
        title: 'Action Restricted',
        message: 'You cannot delete your own active account while logged in.',
      });
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    fetch(`/api/users/${userId}`, { method: 'DELETE' }).catch((err) =>
      console.error('Error deleting user from Neon:', err)
    );
  };

  const updateUserPassword = (userId: string, newPass: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, password: newPass }));
    }
    fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    }).catch((err) => console.error('Error updating password in Neon:', err));
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, role: newRole }));
    }
    fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    }).catch((err) => console.error('Error updating role in Neon:', err));
  };

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('advrix_clients');
    return saved ? JSON.parse(saved) : [];
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('advrix_projects');
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('advrix_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('advrix_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('advrix_activity_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('advrix_leave_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('advrix_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  const [systemModal, setSystemModal] = useState<SystemModalConfig | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('advrix_users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem('advrix_clients', JSON.stringify(clients));
  }, [clients]);
  useEffect(() => {
    localStorage.setItem('advrix_projects', JSON.stringify(projects));
  }, [projects]);
  useEffect(() => {
    localStorage.setItem('advrix_tasks', JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem('advrix_notifications', JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem('advrix_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);
  useEffect(() => {
    localStorage.setItem('advrix_leave_requests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);
  useEffect(() => {
    localStorage.setItem('advrix_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  // Modal Alert Handler
  const showModal = (config: Omit<SystemModalConfig, 'isOpen'>) => {
    setSystemModal({ ...config, isOpen: true });
  };
  const closeModal = () => {
    setSystemModal(null);
  };

  // Role & User Switching
  const switchRole = (role: UserRole) => {
    const userForRole = users.find((u) => u.role === role);
    if (userForRole) {
      setCurrentUser(userForRole);
    } else {
      setCurrentUser({
        ...currentUser,
        role,
      });
    }
  };

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  // Helper: Active Task Count & Workload Colors
  const getUserActiveTaskCount = (userId: string): number => {
    return tasks.filter(
      (t) =>
        t.generalStatus !== 'Completed' &&
        t.generalStatus !== 'Cancelled' &&
        t.generalStatus !== 'Archived' &&
        (t.assignedWriterId === userId ||
          t.assignedDesignerId === userId ||
          t.assignedEditorId === userId ||
          t.assignedSmmId === userId)
    ).length;
  };

  const getUserWorkloadColor = (userId: string): 'green' | 'orange' | 'red' => {
    const count = getUserActiveTaskCount(userId);
    if (count >= 25) return 'red';
    if (count >= 20) return 'orange';
    return 'green';
  };

  const isUserOnLeave = (userId: string, dateStr?: string): boolean => {
    const checkDate = dateStr || new Date().toISOString().split('T')[0];
    return leaveRequests.some(
      (l) =>
        l.userId === userId &&
        l.status === 'APPROVED' &&
        l.startDate <= checkDate &&
        l.endDate >= checkDate
    );
  };

  // Activity Log Helper
  const logAction = (
    action: string,
    details?: string,
    taskId?: string,
    taskName?: string,
    projectId?: string,
    projectName?: string,
    clientName?: string
  ) => {
    const newLog: ActivityLog = {
      id: `al-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      taskId,
      taskName,
      projectId,
      projectName,
      clientName,
      action,
      performedBy: currentUser.id,
      performedByName: currentUser.name,
      performedByRole: currentRole,
      details,
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  // Notification Helper
  const sendNotification = (
    recipientId: string,
    title: string,
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ACTION_REQUIRED',
    relatedTaskId?: string,
    relatedProjectId?: string,
    clientName?: string
  ) => {
    const newNotif: Notification = {
      id: `n-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      recipientId,
      title,
      message,
      type,
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      isRead: false,
      relatedTaskId,
      relatedProjectId,
      clientName,
      performedBy: currentUser.name,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Clients
  const addClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'status'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `c-${Date.now()}`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    setClients((prev) => [newClient, ...prev]);
    fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient),
    }).catch((err) => console.error('Error syncing client to Neon:', err));

    logAction('Client Created', `Created client ${newClient.companyName}`, undefined, undefined, undefined, undefined, newClient.companyName);
    showModal({
      type: 'SUCCESS',
      title: 'Client Added',
      message: `Client "${newClient.companyName}" has been created successfully.`,
    });
    return newClient;
  };

  const editClient = (clientId: string, data: Partial<Client>) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, ...data } : c))
    );
    logAction('Client Updated', `Updated details for client ID ${clientId}`);
  };

  const requestDeleteClient = (clientId: string, reason: string, note?: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              status: 'PENDING_DELETE',
              deleteReason: `${reason}${note ? ` - ${note}` : ''}`,
              deleteRequestedBy: currentUser.name,
            }
          : c
      )
    );

    logAction('Delete Requested', `Requested delete/archive for client ${client.companyName}. Reason: ${reason}`, undefined, undefined, undefined, undefined, client.companyName);

    // Notify Super Admin
    const admin = users.find((u) => u.role === 'SUPER_ADMIN');
    if (admin) {
      sendNotification(
        admin.id,
        'Delete Request',
        `${currentUser.name} requested to archive/delete client "${client.companyName}". Reason: ${reason}`,
        'ACTION_REQUIRED',
        undefined,
        undefined,
        client.companyName
      );
    }

    showModal({
      type: 'SUCCESS',
      title: 'Delete Request Sent',
      message: `Request to delete/archive "${client.companyName}" sent to Super Admin for approval.`,
    });
  };

  const approveDeleteClient = (clientId: string, actionType: 'ARCHIVE' | 'PERMANENT') => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    if (actionType === 'PERMANENT') {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      logAction('Client Deleted Permanently', `Super Admin approved permanent deletion of ${client.companyName}`);
    } else {
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: 'ARCHIVED' } : c))
      );
      logAction('Client Archived', `Super Admin approved archiving of ${client.companyName}`);
    }

    showModal({
      type: 'SUCCESS',
      title: 'Request Approved',
      message: `Client "${client.companyName}" has been ${actionType === 'PERMANENT' ? 'permanently deleted' : 'archived'}.`,
    });
  };

  const rejectDeleteClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, status: 'ACTIVE', deleteReason: undefined } : c))
    );
    logAction('Delete Request Rejected', `Super Admin rejected deletion request for ${client.companyName}`);
    showModal({
      type: 'CONFIRMATION',
      title: 'Request Rejected',
      message: `Deletion request for "${client.companyName}" has been rejected. Client remains active.`,
    });
  };

  // Add Work Flow & Automatic Task Generation
  const addProjectAndTasks = (
    projectData: Omit<Project, 'id' | 'createdAt' | 'status'>
  ) => {
    const projectId = `p-${Date.now()}`;
    const newProject: Project = {
      ...projectData,
      id: projectId,
      status: 'Awaiting Team Assignment',
      createdAt: new Date().toISOString(),
    };

    const generatedTasks: Task[] = [];

    // Auto generate deliverable tasks
    projectData.deliverables.forEach((item) => {
      const count = item.quantity || 1;
      for (let i = 1; i <= count; i++) {
        const indexStr = i < 10 ? `0${i}` : `${i}`;
        let taskName = '';

        if (item.type === 'Custom Design') {
          taskName = `${item.customDesignName || 'Custom Design'} ${indexStr}`;
        } else {
          taskName = `${item.type} ${indexStr}`;
        }

        const task: Task = {
          id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          projectId,
          clientId: projectData.clientId,
          clientName: projectData.clientName,
          campaignName: projectData.campaignName,
          taskName,
          taskType: item.type,
          shortBrief: item.customShortBrief || projectData.shortNote,
          dueDate: projectData.dueDate,
          priority: projectData.priority,
          generalStatus: 'Awaiting Team Assignment',
          contentStatus: 'Content Pending',
          designStatus: item.type === 'Video Shoot' || item.type === 'Video Editing' ? undefined : 'Ready for Design',
          videoStatus: item.type === 'Video Shoot' || item.type === 'Video Editing' ? 'Ready for Editing' : undefined,
          whatsappShares: [],
          clientFeedbacks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        generatedTasks.push(task);
      }
    });

    setProjects((prev) => [newProject, ...prev]);
    setTasks((prev) => [...generatedTasks, ...prev]);

    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: newProject, tasks: generatedTasks }),
    }).catch((err) => console.error('Error syncing project to Neon:', err));

    logAction(
      'Project Created & Send to PM',
      `Created project "${newProject.campaignName}" with ${generatedTasks.length} deliverable tasks. Total payment: ₹${newProject.financials.totalPayment}, Pending: ₹${newProject.financials.pendingAmount}.`,
      undefined,
      undefined,
      projectId,
      newProject.campaignName,
      newProject.clientName
    );

    // Notify PM & Super Admin
    const pmUsers = users.filter((u) => u.role === 'PROJECT_MANAGER' || u.role === 'SUPER_ADMIN');
    pmUsers.forEach((pm) => {
      sendNotification(
        pm.id,
        'Project Awaiting Team Assignment',
        `${currentUser.name} created "${newProject.campaignName}" for ${newProject.clientName} with ${generatedTasks.length} deliverables awaiting team assignment.`,
        'ACTION_REQUIRED',
        undefined,
        projectId,
        newProject.clientName
      );
    });

    // Success Popup
    showModal({
      type: 'SUCCESS',
      title: 'Project Created Successfully',
      message: `"${newProject.clientName}" project has been created with ${generatedTasks.length} deliverable tasks and sent for team assignment.`,
    });

    return { project: newProject, generatedTasks };
  };

  // Team Assignment
  const assignProjectTeam = (
    projectId: string,
    assignments: {
      writerId?: string;
      designerId?: string;
      editorId?: string;
      smmId?: string;
    }
  ) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // Check leaves warning
    const assignedUserIds = [
      assignments.writerId,
      assignments.designerId,
      assignments.editorId,
      assignments.smmId,
    ].filter(Boolean) as string[];

    const onLeaveUsers = assignedUserIds
      .map((id) => users.find((u) => u.id === id))
      .filter((u) => u && isUserOnLeave(u.id));

    if (onLeaveUsers.length > 0) {
      const names = onLeaveUsers.map((u) => u?.name).join(', ');
      showModal({
        type: 'WARNING',
        title: 'Employee on Leave Warning',
        message: `${names} is currently on approved leave. Do you still want to assign tasks to them?`,
        confirmLabel: 'Assign Anyway',
        cancelLabel: 'Cancel',
        onConfirm: () => executeTeamAssignment(projectId, assignments),
      });
      return;
    }

    executeTeamAssignment(projectId, assignments);
  };

  const executeTeamAssignment = (
    projectId: string,
    assignments: {
      writerId?: string;
      designerId?: string;
      editorId?: string;
      smmId?: string;
    }
  ) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              assignedWriterId: assignments.writerId || p.assignedWriterId,
              assignedDesignerId: assignments.designerId || p.assignedDesignerId,
              assignedEditorId: assignments.editorId || p.assignedEditorId,
              assignedSmmId: assignments.smmId || p.assignedSmmId,
              status: 'In Progress',
            }
          : p
      )
    );

    // Update tasks for this project
    setTasks((prev) =>
      prev.map((t) => {
        if (t.projectId === projectId) {
          return {
            ...t,
            generalStatus: 'In Progress',
            assignedWriterId: assignments.writerId || t.assignedWriterId,
            assignedDesignerId: assignments.designerId || t.assignedDesignerId,
            assignedEditorId: assignments.editorId || t.assignedEditorId,
            assignedSmmId: assignments.smmId || t.assignedSmmId,
          };
        }
        return t;
      })
    );

    logAction(
      'Team Assigned Successfully',
      `Assigned project team for ${project.clientName}. Writer: ${
        users.find((u) => u.id === assignments.writerId)?.name || 'N/A'
      }, Designer: ${
        users.find((u) => u.id === assignments.designerId)?.name || 'N/A'
      }, SMM: ${users.find((u) => u.id === assignments.smmId)?.name || 'N/A'}`,
      undefined,
      undefined,
      projectId,
      project.campaignName,
      project.clientName
    );

    // Send notifications to assigned members
    if (assignments.writerId) {
      sendNotification(
        assignments.writerId,
        'Team Assigned',
        `You have been assigned as Content Writer for ${project.clientName} (${project.campaignName}).`,
        'INFO',
        undefined,
        projectId,
        project.clientName
      );
    }

    showModal({
      type: 'SUCCESS',
      title: 'Team Assigned Successfully',
      message: 'Selected team members can now view their assigned tasks.',
    });
  };

  // Reassign Task
  const reassignTask = (
    taskId: string,
    role: 'WRITER' | 'DESIGNER' | 'EDITOR' | 'SMM',
    newUserId: string
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let oldUserId: string | undefined;
    if (role === 'WRITER') oldUserId = task.assignedWriterId;
    if (role === 'DESIGNER') oldUserId = task.assignedDesignerId;
    if (role === 'EDITOR') oldUserId = task.assignedEditorId;
    if (role === 'SMM') oldUserId = task.assignedSmmId;

    const oldUser = users.find((u) => u.id === oldUserId);
    const newUser = users.find((u) => u.id === newUserId);

    showModal({
      type: 'CONFIRMATION',
      title: 'Reassign Task?',
      message: `This task is currently assigned to ${oldUser?.name || 'Unassigned'}. Do you want to assign it to ${newUser?.name}?`,
      confirmLabel: 'Confirm Reassignment',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === taskId) {
              return {
                ...t,
                assignedWriterId: role === 'WRITER' ? newUserId : t.assignedWriterId,
                assignedDesignerId: role === 'DESIGNER' ? newUserId : t.assignedDesignerId,
                assignedEditorId: role === 'EDITOR' ? newUserId : t.assignedEditorId,
                assignedSmmId: role === 'SMM' ? newUserId : t.assignedSmmId,
              };
            }
            return t;
          })
        );

        logAction(
          'Task Reassigned',
          `Reassigned ${task.taskName} from ${oldUser?.name || 'Unassigned'} to ${newUser?.name}`,
          taskId,
          task.taskName,
          task.projectId,
          task.campaignName,
          task.clientName
        );

        if (oldUserId) {
          sendNotification(
            oldUserId,
            'Task Unassigned',
            `Task "${task.taskName}" for ${task.clientName} has been reassigned to ${newUser?.name}.`,
            'INFO',
            taskId,
            task.projectId,
            task.clientName
          );
        }

        if (newUserId) {
          sendNotification(
            newUserId,
            'New Task Reassigned To You',
            `You have been assigned to task "${task.taskName}" for ${task.clientName}.`,
            'ACTION_REQUIRED',
            taskId,
            task.projectId,
            task.clientName
          );
        }

        showModal({
          type: 'SUCCESS',
          title: 'Task Reassigned',
          message: `Task has been reassigned to ${newUser?.name}.`,
        });
      },
    });
  };

  // Content Writer Actions
  const startContentWriting = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              contentStatus: 'Content Writing',
              generalStatus: 'In Progress',
            }
          : t
      )
    );

    logAction('Start Content Writing', `Content Writer ${currentUser.name} started writing text for ${task.taskName}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    showModal({
      type: 'SUCCESS',
      title: 'Content Task Started',
      message: 'This task is now marked as Content Writing.',
    });
  };

  const saveContentDraft = (taskId: string, content: WrittenContent) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              content: { ...content, updatedAt: new Date().toISOString() },
            }
          : t
      )
    );

    logAction('Saved Draft Content', `Saved draft text for ${task.taskName}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    showModal({
      type: 'SUCCESS',
      title: 'Draft Saved',
      message: 'Your latest content changes have been saved.',
    });
  };

  const sendContentForApproval = (taskId: string, content: WrittenContent) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              content: { ...content, updatedAt: new Date().toISOString() },
              contentStatus: 'Content Sent for Approval',
            }
          : t
      )
    );

    logAction('Content Sent for Approval', `Submitted text content for ${task.taskName} to SMM / PM approval queue`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    // Notify SMM, PM, Super Admin
    const notifyUsers = users.filter(
      (u) =>
        u.id === task.assignedSmmId ||
        u.role === 'PROJECT_MANAGER' ||
        u.role === 'SUPER_ADMIN'
    );

    notifyUsers.forEach((u) => {
      sendNotification(
        u.id,
        'Content Approval Pending',
        `Written content for "${task.taskName}" (${task.clientName}) has been submitted for approval by ${currentUser.name}.`,
        'ACTION_REQUIRED',
        taskId,
        task.projectId,
        task.clientName
      );
    });

    showModal({
      type: 'SUCCESS',
      title: 'Content Sent for Approval',
      message: 'The content has been sent to the approval team.',
    });
  };

  // Approvals
  const approveContent = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isVideo = task.taskType === 'Video Shoot' || task.taskType === 'Video Editing';
    const nextDesignStatus: DesignStatus | undefined = isVideo ? undefined : 'Ready for Design';
    const nextVideoStatus: VideoStatus | undefined = isVideo ? 'Ready for Editing' : undefined;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              contentStatus: 'Content Approved',
              designStatus: nextDesignStatus || t.designStatus,
              videoStatus: nextVideoStatus || t.videoStatus,
            }
          : t
      )
    );

    logAction('Content Approved', `Approved written content for ${task.taskName}. Moved task to ${isVideo ? 'Video Editor' : 'Graphic Designer'}.`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    // Notify Writer & Creator (Designer/Editor)
    if (task.assignedWriterId) {
      sendNotification(
        task.assignedWriterId,
        'Content Approved',
        `Your written content for "${task.taskName}" (${task.clientName}) has been approved.`,
        'SUCCESS',
        taskId,
        task.projectId,
        task.clientName
      );
    }

    const creatorId = isVideo ? task.assignedEditorId : task.assignedDesignerId;
    if (creatorId) {
      sendNotification(
        creatorId,
        'Task Ready for Design / Editing',
        `Content for "${task.taskName}" (${task.clientName}) is approved! You can now start creating visual assets.`,
        'ACTION_REQUIRED',
        taskId,
        task.projectId,
        task.clientName
      );
    }

    showModal({
      type: 'SUCCESS',
      title: 'Content Approved',
      message: `The approved content has been moved to the assigned ${isVideo ? 'Video Editor' : 'Graphic Designer'}.`,
    });
  };

  const requestContentChanges = (taskId: string, instructions: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              contentStatus: 'Content Changes Required',
              contentChangesInstructions: instructions,
            }
          : t
      )
    );

    logAction('Content Changes Requested', `Requested content changes for ${task.taskName}: ${instructions}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    if (task.assignedWriterId) {
      sendNotification(
        task.assignedWriterId,
        'Content Changes Required',
        `Changes requested for "${task.taskName}" (${task.clientName}): ${instructions}`,
        'WARNING',
        taskId,
        task.projectId,
        task.clientName
      );
    }

    showModal({
      type: 'WARNING',
      title: 'Content Changes Requested',
      message: 'The task has been returned to the Content Writer with your instructions.',
    });
  };

  // Designer / Video Editor Actions
  const startDesignOrEditing = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isVideo = task.taskType === 'Video Shoot' || task.taskType === 'Video Editing';

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              designStatus: isVideo ? t.designStatus : 'In Design',
              videoStatus: isVideo ? 'Editing in Progress' : t.videoStatus,
              generalStatus: 'In Progress',
            }
          : t
      )
    );

    logAction('Started Design / Editing', `Started work on ${task.taskName}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    showModal({
      type: 'SUCCESS',
      title: isVideo ? 'Editing Started' : 'Design Started',
      message: `This creative is now marked as ${isVideo ? 'Editing in Progress' : 'In Design'}.`,
    });
  };

  const recordWhatsAppShare = (
    taskId: string,
    shareData: Omit<WhatsAppShareRecord, 'id' | 'isConfirmed'>
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const shareRecord: WhatsAppShareRecord = {
      ...shareData,
      id: `ws-${Date.now()}`,
      isConfirmed: true,
    };

    const isVideo = task.taskType === 'Video Shoot' || task.taskType === 'Video Editing';

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              designStatus: isVideo ? t.designStatus : 'Shared on WhatsApp',
              videoStatus: isVideo ? 'First Cut Shared' : t.videoStatus,
              whatsappShares: [shareRecord, ...t.whatsappShares],
            }
          : t
      )
    );

    logAction(
      'WhatsApp Share Confirmed',
      `Confirmed creative ${shareData.version} shared on WhatsApp with ${shareData.sharedWith} (${shareData.whatsappNumberOrGroup}).`,
      taskId,
      task.taskName,
      task.projectId,
      task.campaignName,
      task.clientName
    );

    showModal({
      type: 'SUCCESS',
      title: 'WhatsApp Share Confirmed',
      message: `Creative ${shareData.version} has been marked as shared with ${shareData.sharedWith} at ${shareData.sharedTime}.`,
    });
  };

  const sendCreativeForApproval = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isVideo = task.taskType === 'Video Shoot' || task.taskType === 'Video Editing';

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              designStatus: isVideo ? t.designStatus : 'Creative Sent for Approval',
              videoStatus: isVideo ? 'First Cut Review' : t.videoStatus,
            }
          : t
      )
    );

    logAction('Creative Sent for Approval', `Creative submitted for approval after WhatsApp sharing`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    // Notify SMM, PM, Super Admin
    const notifyUsers = users.filter(
      (u) =>
        u.id === task.assignedSmmId ||
        u.role === 'PROJECT_MANAGER' ||
        u.role === 'SUPER_ADMIN'
    );

    notifyUsers.forEach((u) => {
      sendNotification(
        u.id,
        'Creative Approval Pending',
        `Creative for "${task.taskName}" (${task.clientName}) is shared on WhatsApp and waiting for approval.`,
        'ACTION_REQUIRED',
        taskId,
        task.projectId,
        task.clientName
      );
    });

    showModal({
      type: 'SUCCESS',
      title: 'Creative Sent for Approval',
      message: 'The creative shared on WhatsApp is now waiting for review.',
    });
  };

  // Review & Client Changes
  const approveCreativeInternal = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              designStatus: 'Internal Approved',
            }
          : t
      )
    );

    logAction('Creative Internally Approved', `Internal team approved creative for ${task.taskName}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    showModal({
      type: 'SUCCESS',
      title: 'Creative Internally Approved',
      message: 'The creative can now be shared with the client.',
    });
  };

  const sendToClientReview = (
    taskId: string,
    shareData: Omit<WhatsAppShareRecord, 'id' | 'isConfirmed'>
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const shareRecord: WhatsAppShareRecord = {
      ...shareData,
      id: `ws-${Date.now()}`,
      isConfirmed: true,
    };

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              designStatus: 'Client Review',
              whatsappShares: [shareRecord, ...t.whatsappShares],
            }
          : t
      )
    );

    logAction('Sent to Client Review', `Shared creative on client WhatsApp (${shareData.sharedWith})`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    showModal({
      type: 'SUCCESS',
      title: 'Sent for Client Review',
      message: 'The creative has been marked as shared with the client.',
    });
  };

  const addClientFeedback = (
    taskId: string,
    feedback: Omit<ClientFeedbackRecord, 'id' | 'receivedBy'>
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const feedbackRecord: ClientFeedbackRecord = {
      ...feedback,
      id: `fb-${Date.now()}`,
      receivedBy: currentUser.id,
    };

    const isVideo = task.taskType === 'Video Shoot' || task.taskType === 'Video Editing';

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              designStatus: isVideo ? t.designStatus : 'Changes from Client',
              videoStatus: isVideo ? 'Video Changes Required' : t.videoStatus,
              clientFeedbacks: [feedbackRecord, ...t.clientFeedbacks],
            }
          : t
      )
    );

    logAction('Client Feedback Added', `Pasted WhatsApp feedback for ${task.taskName}: ${feedback.requiredChanges}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    // Notify creator
    const creatorId = isVideo ? task.assignedEditorId : task.assignedDesignerId;
    if (creatorId) {
      sendNotification(
        creatorId,
        'Client Feedback Received',
        `Client requested changes for "${task.taskName}" (${task.clientName}): ${feedback.requiredChanges}`,
        'WARNING',
        taskId,
        task.projectId,
        task.clientName
      );
    }

    showModal({
      type: 'WARNING',
      title: 'Client Changes Sent',
      message: `The client's feedback has been sent to the assigned ${isVideo ? 'Video Editor' : 'Graphic Designer'}.`,
    });
  };

  const approveCreativeFinal = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isVideo = task.taskType === 'Video Shoot' || task.taskType === 'Video Editing';

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              designStatus: isVideo ? t.designStatus : 'Creative Approved',
              videoStatus: isVideo ? 'Final Approved' : t.videoStatus,
              publishingStatus: 'Ready to Upload',
            }
          : t
      )
    );

    logAction('Final Creative Approved', `Final creative approved for ${task.taskName}. Task moved to Ready to Upload queue.`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    // Notify SMM & Creator
    if (task.assignedSmmId) {
      sendNotification(
        task.assignedSmmId,
        'Creative Ready to Upload',
        `Creative for "${task.taskName}" (${task.clientName}) is approved and ready for social media posting!`,
        'ACTION_REQUIRED',
        taskId,
        task.projectId,
        task.clientName
      );
    }

    const creatorId = isVideo ? task.assignedEditorId : task.assignedDesignerId;
    if (creatorId) {
      sendNotification(
        creatorId,
        'Design Approved',
        `Your creative for "${task.taskName}" (${task.clientName}) has been approved!`,
        'SUCCESS',
        taskId,
        task.projectId,
        task.clientName
      );
    }

    showModal({
      type: 'SUCCESS',
      title: 'Creative Approved',
      message: 'The final creative has been moved to the Social Media Manager\'s upload queue.',
    });
  };

  // SMM Actions
  const schedulePost = (
    taskId: string,
    platform: SocialPlatform,
    scheduledDate: string,
    scheduledTime: string
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              publishingStatus: 'Scheduled',
              smmUpload: {
                ...t.smmUpload,
                platform,
                scheduledDate,
                scheduledTime,
              },
            }
          : t
      )
    );

    logAction('Post Scheduled', `Scheduled ${task.taskName} for ${platform} on ${scheduledDate} at ${scheduledTime}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    showModal({
      type: 'SUCCESS',
      title: 'Post Scheduled',
      message: `This post has been scheduled for ${platform} on ${scheduledDate} at ${scheduledTime}.`,
    });
  };

  const markAsUploaded = (
    taskId: string,
    platform: SocialPlatform,
    postUrl: string,
    uploadDate: string,
    uploadTime: string
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              publishingStatus: 'Uploaded / Posted',
              smmUpload: {
                ...t.smmUpload,
                platform,
                postUrl,
                postedBy: currentUser.name,
                uploadedAt: `${uploadDate} ${uploadTime}`,
                isUploadConfirmed: true,
              },
            }
          : t
      )
    );

    logAction('Marked as Uploaded', `Uploaded ${task.taskName} to ${platform}. URL: ${postUrl}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    showModal({
      type: 'SUCCESS',
      title: 'Post Uploaded',
      message: 'The post has been marked as uploaded successfully.',
    });
  };

  const markTaskDone = (taskId: string, overridePaymentCheck = false) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const project = projects.find((p) => p.id === task.projectId);

    // Section 21: Payment Gate Check
    if (
      project &&
      (project.financials?.pendingAmount ?? 0) > 0 &&
      !overridePaymentCheck &&
      !task.paymentOverrideGranted
    ) {
      showModal({
        type: 'PAYMENT_GATE',
        title: 'Pending Payment Alert',
        message: `₹${(project.financials?.pendingAmount ?? 0).toLocaleString('en-IN')} is still pending for ${project.clientName}. Confirm permission before final delivery.`,
        pendingAmount: project.financials?.pendingAmount ?? 0,
        clientName: project.clientName,
        taskId: task.id,
        onConfirm: () => markTaskDone(taskId, true),
      });
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              generalStatus: 'Completed',
              publishingStatus: 'Done',
            }
          : t
      )
    );

    logAction('Task Marked as Done', `Completed task ${task.taskName}`, taskId, task.taskName, task.projectId, task.campaignName, task.clientName);

    showModal({
      type: 'SUCCESS',
      title: 'Task Completed',
      message: 'This deliverable is now completed.',
    });
  };

  const updateTaskStatus = (taskId: string, newStage: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isVideo = task.taskType === 'Video Shoot' || task.taskType === 'Video Editing';

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        if (newStage === 'AWAITING') {
          return {
            ...t,
            generalStatus: 'Assigned',
            contentStatus: 'Content Pending',
            designStatus: isVideo ? undefined : 'Ready for Design',
            videoStatus: isVideo ? 'Ready for Editing' : undefined,
          };
        } else if (newStage === 'WRITING') {
          return {
            ...t,
            generalStatus: 'In Progress',
            contentStatus: 'Content Writing',
          };
        } else if (newStage === 'DESIGN_EDITING') {
          return {
            ...t,
            generalStatus: 'In Progress',
            contentStatus: 'Content Approved',
            designStatus: isVideo ? undefined : 'In Design',
            videoStatus: isVideo ? 'Editing in Progress' : undefined,
          };
        } else if (newStage === 'APPROVAL') {
          return {
            ...t,
            generalStatus: 'In Progress',
            contentStatus: 'Content Sent for Approval',
            designStatus: isVideo ? undefined : 'Creative Sent for Approval',
            videoStatus: isVideo ? 'First Cut Review' : undefined,
          };
        } else if (newStage === 'READY_UPLOAD') {
          return {
            ...t,
            generalStatus: 'In Progress',
            publishingStatus: 'Ready to Upload',
          };
        } else if (newStage === 'COMPLETED') {
          return {
            ...t,
            generalStatus: 'Completed',
            publishingStatus: 'Uploaded / Posted',
          };
        }
        return t;
      })
    );

    logAction(
      'Task Stage Updated',
      `Moved task "${task.taskName}" to ${newStage}`,
      taskId,
      task.taskName,
      task.projectId,
      task.campaignName,
      task.clientName
    );

    // Sync to backend API if task has DB entry
    fetch(`/api/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStage: newStage, generalStatus: newStage === 'COMPLETED' ? 'Completed' : 'In Progress' }),
    }).catch(() => {});
  };

  // Financial Actions
  const recordPaymentCollected = (projectId: string, amount: number) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const newAdvance = p.financials.advanceReceived + amount;
          const newPending = Math.max(0, p.financials.totalPayment - newAdvance);
          return {
            ...p,
            financials: {
              ...p.financials,
              advanceReceived: newAdvance,
              pendingAmount: newPending,
              isFullyPaid: newPending === 0,
            },
          };
        }
        return p;
      })
    );

    const project = projects.find((p) => p.id === projectId);
    logAction('Payment Recorded', `Collected ₹${(amount ?? 0).toLocaleString('en-IN')} for project ${project?.campaignName}`, undefined, undefined, projectId, project?.campaignName, project?.clientName);

    showModal({
      type: 'SUCCESS',
      title: 'Payment Recorded',
      message: `Recorded payment of ₹${(amount ?? 0).toLocaleString('en-IN')}.`,
    });
  };

  const grantPaymentOverride = (taskId: string) => {
    if (currentRole !== 'SUPER_ADMIN' && currentRole !== 'PROJECT_MANAGER') {
      showModal({
        type: 'WARNING',
        title: 'Permission Denied',
        message: 'Only Super Admin or Project Manager can override pending payment checks.',
      });
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, paymentOverrideGranted: true } : t))
    );

    logAction('Payment Gate Overridden', `Granted payment override for task ID ${taskId}`);
    markTaskDone(taskId, true);
  };

  // Monthly Retainer Workflow
  const generateMonthlyRetainerTasks = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const newTasks: Task[] = [];
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

    project.deliverables.forEach((item) => {
      const count = item.quantity || 1;
      for (let i = 1; i <= count; i++) {
        const indexStr = i < 10 ? `0${i}` : `${i}`;
        const taskName = `${item.type} ${indexStr} (${currentMonth})`;

        newTasks.push({
          id: `t-ret-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          projectId: project.id,
          clientId: project.clientId,
          clientName: project.clientName,
          campaignName: project.campaignName,
          taskName,
          taskType: item.type,
          shortBrief: `Monthly retainer task for ${currentMonth}`,
          dueDate: project.dueDate,
          priority: project.priority,
          generalStatus: 'Awaiting Team Assignment',
          contentStatus: 'Content Pending',
          designStatus: 'Ready for Design',
          whatsappShares: [],
          clientFeedbacks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    setTasks((prev) => [...newTasks, ...prev]);

    logAction(
      'Monthly Tasks Generated',
      `Generated ${newTasks.length} retainer tasks for ${project.clientName} for ${currentMonth}`,
      undefined,
      undefined,
      projectId,
      project.campaignName,
      project.clientName
    );

    showModal({
      type: 'SUCCESS',
      title: 'Monthly Tasks Generated',
      message: `${newTasks.length} deliverable tasks have been created for ${project.clientName} for ${currentMonth}.`,
    });
  };

  // HR & Attendance
  const todayISO = new Date().toISOString().split('T')[0];
  const todaysAttendance = attendanceRecords.find(
    (a) => a.userId === currentUser?.id && a.date === todayISO
  );

  const toggleCheckIn = (userId?: string) => {
    const targetUserId = userId || currentUser.id;
    const user = users.find((u) => u.id === targetUserId);
    if (!user) return;

    const nextState = !user.isCheckedIn;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateISO = now.toISOString().split('T')[0];

    // Update user state
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUserId
          ? {
              ...u,
              isCheckedIn: nextState,
              checkInTime: nextState ? timeStr : u.checkInTime,
            }
          : u
      )
    );

    // Create or update AttendanceRecord
    setAttendanceRecords((prev) => {
      const existingIdx = prev.findIndex(
        (a) => a.userId === targetUserId && a.date === dateISO
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          checkInTime: nextState ? timeStr : updated[existingIdx].checkInTime,
          checkOutTime: nextState ? undefined : timeStr,
          status: 'PRESENT',
        };
        return updated;
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          userId: user.id,
          userName: user.name,
          date: dateISO,
          checkInTime: timeStr,
          checkOutTime: nextState ? undefined : timeStr,
          status: 'PRESENT',
        };
        return [newRecord, ...prev];
      }
    });

    logAction(
      nextState ? 'Checked In' : 'Checked Out',
      `${user.name} (${user.role}) ${nextState ? 'checked in' : 'checked out'} at ${timeStr}`
    );

    showModal({
      type: 'SUCCESS',
      title: nextState ? 'Checked In Successfully' : 'Clocked Out Successfully',
      message: `${user.name} was marked as ${nextState ? 'Checked In' : 'Clocked Out'} at ${timeStr}. Attendance data is updated in Super Admin Dashboard.`,
    });
  };

  const checkIn = () => {
    if (!currentUser.isCheckedIn) {
      toggleCheckIn(currentUser.id);
    }
  };

  const checkOut = () => {
    if (currentUser.isCheckedIn) {
      toggleCheckIn(currentUser.id);
    }
  };

  const applyLeave = (
    leaveData: Omit<LeaveRequest, 'id' | 'userId' | 'userName' | 'userRole' | 'status' | 'createdAt'>
  ) => {
    const newLeave: LeaveRequest = {
      ...leaveData,
      id: `lr-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    setLeaveRequests((prev) => [newLeave, ...prev]);

    logAction(
      'Leave Requested',
      `${currentUser.name} requested ${leaveData.leaveType} from ${leaveData.startDate} to ${leaveData.endDate}.`
    );

    // Notify PM & Admin
    const admins = users.filter((u) => u.role === 'PROJECT_MANAGER' || u.role === 'SUPER_ADMIN');
    admins.forEach((admin) => {
      sendNotification(
        admin.id,
        'Leave Request Pending',
        `${currentUser.name} applied for ${leaveData.leaveType} (${leaveData.startDate} to ${leaveData.endDate}).`,
        'ACTION_REQUIRED'
      );
    });

    showModal({
      type: 'SUCCESS',
      title: 'Leave Request Submitted',
      message: 'Your leave application has been sent for manager approval.',
    });
  };

  const approveLeave = (leaveId: string, comment?: string) => {
    const leave = leaveRequests.find((l) => l.id === leaveId);
    if (!leave) return;

    setLeaveRequests((prev) =>
      prev.map((l) =>
        l.id === leaveId
          ? { ...l, status: 'APPROVED', adminComment: comment }
          : l
      )
    );

    logAction('Leave Approved', `Approved leave for ${leave.userName}`, undefined, undefined, undefined, undefined);

    sendNotification(
      leave.userId,
      'Leave Request Approved',
      `Your leave request from ${leave.startDate} to ${leave.endDate} has been approved.${comment ? ` Comment: ${comment}` : ''}`,
      'SUCCESS'
    );

    showModal({
      type: 'SUCCESS',
      title: 'Leave Approved',
      message: `Leave for ${leave.userName} has been approved.`,
    });
  };

  const rejectLeave = (leaveId: string, comment?: string) => {
    const leave = leaveRequests.find((l) => l.id === leaveId);
    if (!leave) return;

    setLeaveRequests((prev) =>
      prev.map((l) =>
        l.id === leaveId
          ? { ...l, status: 'REJECTED', adminComment: comment }
          : l
      )
    );

    logAction('Leave Rejected', `Rejected leave for ${leave.userName}`);

    sendNotification(
      leave.userId,
      'Leave Request Rejected',
      `Your leave request from ${leave.startDate} to ${leave.endDate} was rejected.${comment ? ` Reason: ${comment}` : ''}`,
      'WARNING'
    );

    showModal({
      type: 'WARNING',
      title: 'Leave Rejected',
      message: `Leave request for ${leave.userName} has been rejected.`,
    });
  };

  // Notifications
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Reset demo
  const resetDemoData = () => {
    localStorage.removeItem('advrix_users');
    localStorage.removeItem('advrix_clients');
    localStorage.removeItem('advrix_projects');
    localStorage.removeItem('advrix_tasks');
    localStorage.removeItem('advrix_notifications');
    localStorage.removeItem('advrix_activity_logs');
    localStorage.removeItem('advrix_leave_requests');
    localStorage.removeItem('advrix_attendance');

    setUsers([]);
    setCurrentUser({
      id: '',
      name: '',
      email: '',
      role: 'SUPER_ADMIN',
      capacityLimit: 0,
    });
    setClients([]);
    setProjects([]);
    setTasks([]);
    setNotifications([]);
    setActivityLogs([]);
    setLeaveRequests([]);
    setAttendanceRecords([]);

    showModal({
      type: 'SUCCESS',
      title: 'Live Data Reset',
      message: 'Local fallback data was cleared. The app will show live database data only.',
    });
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        currentRole,
        isAuthenticated,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        updateUserPassword,
        updateUserRole,
        switchRole,
        switchUser,

        users,
        clients,
        projects,
        tasks,
        notifications,
        activityLogs,
        leaveRequests,
        attendanceRecords,

        systemModal,
        showModal,
        closeModal,

        getUserActiveTaskCount,
        getUserWorkloadColor,
        isUserOnLeave,

        addClient,
        editClient,
        requestDeleteClient,
        approveDeleteClient,
        rejectDeleteClient,

        addProjectAndTasks,
        assignProjectTeam,
        reassignTask,

        startContentWriting,
        saveContentDraft,
        sendContentForApproval,

        approveContent,
        requestContentChanges,

        startDesignOrEditing,
        recordWhatsAppShare,
        sendCreativeForApproval,

        approveCreativeInternal,
        sendToClientReview,
        addClientFeedback,
        approveCreativeFinal,

        schedulePost,
        markAsUploaded,
        markTaskDone,
        updateTaskStatus,

        recordPaymentCollected,
        grantPaymentOverride,

        generateMonthlyRetainerTasks,

        adminWhatsappNumber,
        updateAdminWhatsappNumber,
        todaysAttendance,
        checkIn,
        checkOut,
        toggleCheckIn,
        applyLeave,
        approveLeave,
        rejectLeave,

        markNotificationAsRead,
        markAllNotificationsAsRead,

        resetDemoData,
        flushStoredData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
