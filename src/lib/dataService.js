// Data Service layer: Seamlessly communicates with Supabase PostgreSQL,
// with interactive fallback when evaluating prior to Supabase credentials setup.

import { supabase, isSupabaseConfigured, uploadSubmissionPhoto, getSubmissionPhotoUrl } from './supabaseClient';
import { pushService } from './pushNotificationService';
// Persistent instant cache helpers for zero-delay (0ms) instantaneous rendering
const loadCache = (key, fallback = []) => {
  try {
    const val = localStorage.getItem('fy_cache_' + key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveCache = (key, val) => {
  try {
    localStorage.setItem('fy_cache_' + key, JSON.stringify(val));
  } catch (e) {}
};

// Clean in-memory caches populated immediately from persistent cache
let localSubjects = loadCache('subjects');
let localTopics = loadCache('topics');
let localStudents = loadCache('students');
let localTasks = loadCache('tasks');
let localAssignments = loadCache('assignments');
let localSubmissions = loadCache('submissions');
let localAnnouncements = loadCache('announcements');
let localNotifications = loadCache('notifications');
let localTodos = loadCache('todos');

// RFC4122 v4 UUID helpers for Supabase PostgreSQL compatibility
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

// Announcement attachment serialization & parsing helpers
export const parseAnnouncementAttachment = (text) => {
  if (!text || typeof text !== 'string') return { message: text || '', attachment: null };
  const match = text.match(/\[\[ATTACHMENT:([\s\S]*?)\]\]/);
  if (match) {
    try {
      const attachment = JSON.parse(match[1]);
      const cleanMessage = text.replace(/\[\[ATTACHMENT:[\s\S]*?\]\]/, '').trim();
      return { message: cleanMessage, attachment };
    } catch (e) {
      console.warn('Failed to parse announcement attachment JSON:', e);
    }
  }
  return { message: text.trim(), attachment: null };
};

export const formatAnnouncementWithAttachment = (message, attachment) => {
  const cleanMsg = (message || '').trim();
  if (!attachment) return cleanMsg;
  return `${cleanMsg}\n\n[[ATTACHMENT:${JSON.stringify(attachment)}]]`;
};

// Realtime sync channels and listener bus
let realtimeChannel = null;
let realtimeListeners = new Set();

export const dataService = {
  // Synchronous getters for 0ms instantaneous rendering on initial page mount
  getCachedSubjects() {
    const mem = localSubjects && localSubjects.length > 0 ? localSubjects : loadCache('subjects');
    return Array.isArray(mem) ? mem : [];
  },
  getCachedTasks() {
    const mem = localTasks && localTasks.length > 0 ? localTasks : loadCache('tasks');
    return Array.isArray(mem) ? mem : [];
  },
  getCachedStudents() {
    const mem = localStudents && localStudents.length > 0 ? localStudents : loadCache('students');
    return Array.isArray(mem) ? mem : [];
  },
  getCachedSubmissions() {
    const mem = localSubmissions && localSubmissions.length > 0 ? localSubmissions : loadCache('submissions');
    return Array.isArray(mem) ? mem : [];
  },
  getCachedAnnouncements() {
    const mem = localAnnouncements && localAnnouncements.length > 0 ? localAnnouncements : loadCache('announcements');
    return Array.isArray(mem)
      ? mem.map((item) => {
          const parsed = parseAnnouncementAttachment(item.message || item.content || '');
          return {
            ...item,
            message: parsed.message,
            content: parsed.message,
            attachment: parsed.attachment || item.attachment || null,
          };
        })
      : [];
  },
  getCachedStudentAssignments(studentId) {
    if (!studentId) return [];
    return loadCache('assignments_' + studentId, []);
  },
  getCachedTodos(userId) {
    if (!userId) return [];
    return loadCache('todos_' + userId, []);
  },
  getCachedAdmins() {
    return this.getAdmins();
  },

  // =========================================================================
  // SUBJECTS & TOPICS
  // =========================================================================
  async getSubjects() {
    if (isSupabaseConfigured()) {
      try {
        let { data, error } = await supabase
          .from('subjects')
          .select('*, topics(*)')
          .order('created_at', { ascending: true });

        if (error || !data) {
          const plain = await supabase
            .from('subjects')
            .select('*')
            .order('created_at', { ascending: true });
          if (!plain.error && Array.isArray(plain.data)) {
            data = plain.data;
          }
        }

        if (Array.isArray(data)) {
          const mapped = data.map((s) => ({
            ...s,
            topics: Array.isArray(s.topics) ? s.topics : [],
          }));
          localSubjects = mapped;
          saveCache('subjects', mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Error fetching subjects from Supabase:', err);
      }
    }
    return localSubjects.map((s) => ({
      ...s,
      topics: localTopics.filter((t) => t.subject_id === s.id),
    }));
  },

  async createSubject(subjectData) {
    const subjectId = (subjectData.id && isValidUUID(subjectData.id)) ? subjectData.id : generateUUID();
    const cleanSubject = {
      id: subjectId,
      name: subjectData.name,
      subject_code: subjectData.subject_code || 'FYS-GEN',
      description: subjectData.description || null,
      teacher_name: subjectData.teacher_name || null,
      is_active: subjectData.is_active !== undefined ? subjectData.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localSubjects.push(cleanSubject);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .insert([cleanSubject])
          .select()
          .single();
        if (!error && data) {
          this.notifyLocalChange('SUBJECT_CREATED', data);
          return data;
        } else if (error) {
          console.error('Supabase createSubject error:', error.message);
        }
      } catch (err) {
        console.error('Supabase createSubject notice:', err);
      }
    }
    this.notifyLocalChange('SUBJECT_CREATED', cleanSubject);
    return cleanSubject;
  },

  async updateSubject(id, updates) {
    const { topics, ...cleanUpdates } = updates;
    localSubjects = localSubjects.map((s) => (s.id === id ? { ...s, ...updates } : s));
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .update(cleanUpdates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          this.notifyLocalChange('SUBJECT_UPDATED', data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase updateSubject notice:', err);
      }
    }
    const updated = localSubjects.find((s) => s.id === id);
    this.notifyLocalChange('SUBJECT_UPDATED', updated);
    return updated;
  },

  async deleteSubject(id) {
    if (isSupabaseConfigured()) {
      try {
        // 1. Find all tasks linked to this subject
        const { data: relatedTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('subject_id', id);

        const taskIds = (relatedTasks || []).map((t) => t.id);

        if (taskIds.length > 0) {
          // Find submissions for these tasks
          const { data: subs } = await supabase
            .from('submissions')
            .select('id')
            .in('task_id', taskIds);

          const subIds = (subs || []).map((s) => s.id);
          if (subIds.length > 0) {
            try {
              await supabase.from('submission_files').delete().in('submission_id', subIds);
            } catch (e) {}
            try {
              await supabase.from('submissions').delete().in('id', subIds);
            } catch (e) {}
          }

          try {
            await supabase.from('task_assignments').delete().in('task_id', taskIds);
          } catch (e) {}

          // Delete the tasks
          const { error: tErr } = await supabase.from('tasks').delete().in('id', taskIds);
          if (tErr) console.warn('Delete tasks error:', tErr.message);
        }

        // 2. Delete all topics for this subject
        try {
          await supabase.from('topics').delete().eq('subject_id', id);
        } catch (e) {}

        // 3. Delete the subject itself
        const { error: sErr } = await supabase.from('subjects').delete().eq('id', id);
        if (sErr) {
          console.error('Supabase deleteSubject error:', sErr.message);
          throw new Error(sErr.message || 'Failed to delete subject from database');
        }
      } catch (err) {
        console.error('Supabase deleteSubject notice:', err);
        throw err;
      }
    }

    localSubjects = localSubjects.filter((s) => s.id !== id);
    localTopics = localTopics.filter((t) => t.subject_id !== id);
    localTasks = localTasks.filter((t) => t.subject_id !== id);
    this.notifyLocalChange('SUBJECT_DELETED', { id });
    return true;
  },

  async getTopicsBySubject(subjectId) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('topics')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getTopicsBySubject notice:', err);
      }
    }
    return localTopics.filter((t) => t.subject_id === subjectId);
  },

  async createTopic(topicData) {
    const topicId = (topicData.id && isValidUUID(topicData.id)) ? topicData.id : generateUUID();
    const newTopic = {
      ...topicData,
      id: topicId,
      created_at: new Date().toISOString(),
    };
    localTopics.push(newTopic);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('topics')
          .insert([newTopic])
          .select()
          .single();
        if (!error && data) {
          this.notifyLocalChange('TOPIC_CREATED', data);
          return data;
        } else if (error) {
          console.error('Supabase createTopic error:', error.message);
        }
      } catch (err) {
        console.error('Supabase createTopic notice:', err);
      }
    }
    this.notifyLocalChange('TOPIC_CREATED', newTopic);
    return newTopic;
  },

  async deleteTopic(id) {
    localTopics = localTopics.filter((t) => t.id !== id);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('topics').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteTopic notice:', err);
      }
    }
    this.notifyLocalChange('TOPIC_DELETED', { id });
    return true;
  },

  // =========================================================================
  // TASKS & ASSIGNMENTS
  // =========================================================================
  async getTasks() {
    let overrides = {};
    try {
      overrides = JSON.parse(localStorage.getItem('fy_task_overrides') || '{}');
    } catch (e) {}

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, subjects(name, subject_code), topics(name)')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          const merged = data.map((t) => {
            const ov = overrides[t.id];
            if (ov) {
              return {
                ...t,
                ...ov,
                publication_status: ov.publication_status !== undefined ? ov.publication_status : t.publication_status,
                scheduled_at: ov.scheduled_at !== undefined ? ov.scheduled_at : t.scheduled_at,
              };
            }
            return t;
          });
          localTasks = merged;
          saveCache('tasks', merged);
          return merged;
        }
      } catch (err) {
        console.warn('Supabase getTasks notice:', err);
      }
    }
    return localTasks.map((t) => {
      const sub = localSubjects.find((s) => s.id === t.subject_id);
      const top = localTopics.find((tp) => tp.id === t.topic_id);
      const ov = overrides[t.id];
      return {
        ...t,
        ...(ov || {}),
        subjects: sub ? { name: sub.name, subject_code: sub.subject_code } : null,
        topics: top ? { name: top.name } : null,
      };
    });
  },

  async createTask(taskData, targetStudentIds = []) {
    let resolvedSubjectId = (taskData.subject_id && isValidUUID(taskData.subject_id)) ? taskData.subject_id : null;
    if (!resolvedSubjectId) {
      const subs = await this.getSubjects();
      if (subs && subs.length > 0 && isValidUUID(subs[0].id)) {
        resolvedSubjectId = subs[0].id;
      }
    }

    const taskId = (taskData.id && isValidUUID(taskData.id)) ? taskData.id : generateUUID();
    const cleanTask = {
      id: taskId,
      title: taskData.title,
      description: taskData.description || null,
      subject_id: resolvedSubjectId,
      topic_id: (taskData.topic_id && isValidUUID(taskData.topic_id)) ? taskData.topic_id : null,
      task_type: taskData.task_type || 'Assignment',
      priority: taskData.priority || 'Medium',
      due_at: taskData.due_at || new Date(Date.now() + 86400000 * 7).toISOString(),
      max_marks: taskData.max_marks || null,
      publication_status: taskData.publication_status === 'Scheduled' ? 'Draft' : (taskData.publication_status || 'Published'),
      assignment_target: taskData.assignment_target || 'all',
      reference_url: taskData.reference_url || null,
      created_by: (taskData.created_by && isValidUUID(taskData.created_by)) ? taskData.created_by : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let taskResult = null;
    if (isSupabaseConfigured()) {
      try {
        const { data: task, error } = await supabase
          .from('tasks')
          .insert([cleanTask])
          .select('*, subjects(name, subject_code), topics(name)')
          .single();

        if (!error && task) {
          taskResult = task;
        } else if (error) {
          console.error('Supabase createTask error:', error.message);
        }
      } catch (err) {
        console.error('Supabase createTask notice:', err);
      }
    }

    const newTask = {
      ...(taskResult || cleanTask),
      publication_status: taskData.publication_status || 'Published',
      scheduled_at: taskData.scheduled_at || null,
    };
    localTasks.unshift(newTask);
    saveCache('tasks', localTasks);

    if (newTask.publication_status === 'Published') {
      const studentsToAssign =
        newTask.assignment_target === 'all' || !targetStudentIds.length
          ? localStudents.filter((s) => s.is_active)
          : localStudents.filter((s) => targetStudentIds.includes(s.id));

      studentsToAssign.forEach((st) => {
        localAssignments.push({
          id: 'asg-' + newTask.id + '-' + st.id,
          task_id: newTask.id,
          student_id: st.id,
          status: 'Assigned',
          assigned_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          is_late: false,
        });

        localNotifications.unshift({
          id: 'notif-' + Date.now() + '-' + st.id,
          user_id: st.id,
          title: '📝 New Task Assigned: ' + newTask.title,
          message: `Due on ${new Date(newTask.due_at).toLocaleDateString()}. Check instructions and submit before deadline.`,
          notification_type: 'task_assigned',
          related_task_id: newTask.id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      });

      // AUTO-BROADCAST TO STUDENTS: Immediately deliver task notification to all students
      try {
        const sub = localSubjects.find((s) => s.id === newTask.subject_id);
        const subName = sub ? (sub.subject_code ? `${sub.subject_code} - ${sub.name}` : sub.name) : 'Academic Course';
        const formattedDueDate = newTask.due_at
          ? new Date(newTask.due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'No deadline';

        // 1. Create an announcement so every student gets it in their Notification list and Navbar bell
        this.createAnnouncement({
          title: `📝 New Task: ${newTask.title}`,
          message: `A new practical task has been assigned for ${subName}. Due Date: ${formattedDueDate}. Please check details and submit your journal on time.`,
          content: `A new practical task has been assigned for ${subName}. Due Date: ${formattedDueDate}. Please check details and submit your journal on time.`,
          author_name: 'Academic Faculty',
          priority: 'High',
          target_audience: 'All',
        }).catch((err) => console.warn('Auto task announcement notice:', err));

        // 2. Send instant desktop/mobile browser push notification
        if (pushService && typeof pushService.sendNotification === 'function') {
          pushService.sendNotification(`📝 New Task: ${newTask.title}`, {
            body: `Subject: ${subName} | Due: ${formattedDueDate}`,
            tag: `task-${newTask.id}`,
          });
        }
      } catch (autoErr) {
        console.warn('Auto task notification error:', autoErr);
      }
    }

    this.notifyLocalChange('TASK_CREATED', newTask);
    return newTask;
  },

  async updateTask(id, taskData) {
    // 1. Persist in local storage overrides so polling never resets the user's status
    try {
      const overrides = JSON.parse(localStorage.getItem('fy_task_overrides') || '{}');
      overrides[id] = {
        ...(overrides[id] || {}),
        ...taskData,
        publication_status: taskData.publication_status,
        scheduled_at: taskData.scheduled_at,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('fy_task_overrides', JSON.stringify(overrides));
    } catch (e) {}

    // 2. Prepare clean payload for Supabase tasks table
    // (Strip non-existent columns like scheduled_at, relations, etc.)
    const supabasePayload = {
      updated_at: new Date().toISOString(),
    };
    if (taskData.title !== undefined) supabasePayload.title = taskData.title.trim();
    if (taskData.description !== undefined) supabasePayload.description = taskData.description;
    if (taskData.subject_id !== undefined) supabasePayload.subject_id = isValidUUID(taskData.subject_id) ? taskData.subject_id : null;
    if (taskData.topic_id !== undefined) supabasePayload.topic_id = isValidUUID(taskData.topic_id) ? taskData.topic_id : null;
    if (taskData.task_type !== undefined) supabasePayload.task_type = taskData.task_type;
    if (taskData.priority !== undefined) supabasePayload.priority = taskData.priority;
    if (taskData.due_at !== undefined) supabasePayload.due_at = taskData.due_at;
    if (taskData.max_marks !== undefined) supabasePayload.max_marks = taskData.max_marks;
    if (taskData.assignment_target !== undefined) supabasePayload.assignment_target = taskData.assignment_target;

    // Handle publication_status safely for Supabase check constraints
    if (taskData.publication_status !== undefined) {
      supabasePayload.publication_status =
        taskData.publication_status === 'Scheduled' ? 'Draft' : taskData.publication_status;
    }

    let remoteUpdated = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .update(supabasePayload)
          .eq('id', id)
          .select('*, subjects(name, subject_code), topics(name)')
          .single();
        if (!error && data) {
          remoteUpdated = data;
        } else if (error) {
          console.warn('Supabase updateTask error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase updateTask notice:', err);
      }
    }

    // 3. Update local in-memory tasks and cache immediately
    localTasks = localTasks.map((t) =>
      t.id === id
        ? {
            ...t,
            ...(remoteUpdated || {}),
            ...taskData,
            publication_status: taskData.publication_status,
            scheduled_at: taskData.scheduled_at,
          }
        : t
    );
    saveCache('tasks', localTasks);

    // 4. If status changed to Published, ensure student assignments are generated
    if (taskData.publication_status === 'Published') {
      const existing = localAssignments.filter((a) => a.task_id === id);
      if (existing.length === 0) {
        localStudents.filter((s) => s.is_active).forEach((st) => {
          localAssignments.push({
            id: 'asg-' + id + '-' + st.id,
            task_id: id,
            student_id: st.id,
            status: 'Assigned',
            assigned_at: new Date().toISOString(),
            started_at: null,
            completed_at: null,
            is_late: false,
          });
        });
      }
    }

    const updated = localTasks.find((t) => t.id === id) || { id, ...taskData };
    this.notifyLocalChange('TASK_UPDATED', updated);
    return updated;
  },

  async deleteTask(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tasks').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteTask notice:', err);
      }
    }
    localTasks = localTasks.filter((t) => t.id !== id);
    localAssignments = localAssignments.filter((a) => a.task_id !== id);
    this.notifyLocalChange('TASK_DELETED', { id });
    return true;
  },

  // =========================================================================
  // STUDENT SPECIFIC ASSIGNMENTS & PROGRESS
  // =========================================================================
  async getStudentAssignments(studentId) {
    let allTasks = [];

    if (isSupabaseConfigured()) {
      try {
        // 1. Fetch tasks directly from Supabase
        const { data: remoteTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*, subjects(id, name, subject_code), topics(id, name)')
          .order('created_at', { ascending: false });

        if (!tasksError && Array.isArray(remoteTasks)) {
          allTasks = remoteTasks.filter((t) => {
            const status = (t.publication_status || 'published').toLowerCase();
            if (status === 'published') return true;
            if (status === 'scheduled') {
              return t.scheduled_at ? new Date() >= new Date(t.scheduled_at) : false;
            }
            return false;
          });
        }
      } catch (err) {
        console.warn('Supabase getStudentAssignments notice:', err);
      }
    }

    // 2. Merge with any local tasks created recently
    if (Array.isArray(localTasks) && localTasks.length > 0) {
      const seenTaskIds = new Set(allTasks.map((t) => t.id));
      localTasks
        .filter((t) => {
          const status = (t.publication_status || 'published').toLowerCase();
          if (status === 'published') return true;
          if (status === 'scheduled') {
            return t.scheduled_at ? new Date() >= new Date(t.scheduled_at) : false;
          }
          return false;
        })
        .forEach((lt) => {
          if (!seenTaskIds.has(lt.id)) {
            allTasks.push(lt);
            seenTaskIds.add(lt.id);
          }
        });
    }

    if (allTasks.length > 0) {
      const localStoredSubs = JSON.parse(localStorage.getItem('fy_it_submissions') || '[]');
      let studentSubmissions = localStoredSubs.filter(
        (s) => s.student_id === studentId || s.student_id === String(studentId)
      );

      if (isSupabaseConfigured()) {
        try {
          const { data: remoteSubs } = await supabase
            .from('submissions')
            .select('*, submission_files(*)');
          if (Array.isArray(remoteSubs)) {
            const matchedRemote = remoteSubs.filter(
              (s) => s.student_id === studentId || s.student_id === String(studentId)
            );
            studentSubmissions = [...studentSubmissions, ...matchedRemote];
          }
        } catch (e) {}
      }

      // Retrieve persistent task progress
      let progressMap = {};
      try {
        progressMap = JSON.parse(localStorage.getItem('fy_task_progress') || '{}');
      } catch (e) {}

      // Map each published task into an assignment object
      const assignments = allTasks.map((task) => {
        const taskSubs = studentSubmissions.filter(
          (s) => s.task_id === task.id || s.task_assignment_id === ('asg-' + task.id + '-' + studentId)
        );
        const latestSub = taskSubs[0] || null;

        const pData =
          progressMap['asg-' + task.id + '-' + studentId] ||
          progressMap[`${task.id}_${studentId}`] ||
          progressMap[`task_${task.id}_student_${studentId}`] ||
          null;

        let status = 'Assigned';
        let startedAt = pData?.started_at || null;

        if (latestSub) {
          status = latestSub.status || 'Submitted';
        } else if (pData && pData.status === 'In Progress') {
          status = 'In Progress';
        } else if (task.due_at && new Date(task.due_at) < new Date()) {
          status = 'Overdue';
        }

        return {
          id: 'asg-' + task.id + '-' + studentId,
          task_id: task.id,
          student_id: studentId,
          status: status,
          assigned_at: task.created_at || new Date().toISOString(),
          started_at: startedAt,
          completed_at: latestSub?.submitted_at || null,
          is_late: task.due_at ? new Date() > new Date(task.due_at) : false,
          tasks: task,
          submissions: taskSubs.map((s) => ({
            ...s,
            submission_files: s.submission_files || s.files || [],
          })),
        };
      });

      saveCache('assignments_' + studentId, assignments);
      return assignments;
    }

    // Demo mode: Return joined assignments
    let demoProgressMap = {};
    try {
      demoProgressMap = JSON.parse(localStorage.getItem('fy_task_progress') || '{}');
    } catch (e) {}

    return localAssignments
      .filter((a) => a.student_id === studentId)
      .map((a) => {
        const task = localTasks.find((t) => t.id === a.task_id);
        const sub = task ? localSubjects.find((s) => s.id === task.subject_id) : null;
        const top = task ? localTopics.find((tp) => tp.id === task.topic_id) : null;
        const subs = localSubmissions.filter((sm) => sm.task_assignment_id === a.id);

        const pData = demoProgressMap[a.id] || demoProgressMap[`${a.task_id}_${a.student_id}`];
        let currentStatus = a.status;
        let startedAt = a.started_at || pData?.started_at || null;

        if (pData && pData.status === 'In Progress' && !['Submitted', 'Under Review', 'Approved'].includes(currentStatus)) {
          currentStatus = 'In Progress';
        } else if (
          task &&
          new Date(task.due_at) < new Date() &&
          ['Assigned', 'In Progress'].includes(currentStatus)
        ) {
          currentStatus = 'Overdue';
        }

        return {
          ...a,
          status: currentStatus,
          started_at: startedAt,
          tasks: task
            ? {
                ...task,
                subjects: sub ? { id: sub.id, name: sub.name, subject_code: sub.subject_code } : null,
                topics: top ? { id: top.id, name: top.name } : null,
              }
            : null,
          submissions: subs.map((s) => ({
            ...s,
            submission_files: s.files || [],
          })),
        };
      });
  },

  async startTask(assignmentId, studentId = null, taskId = null) {
    let tId = taskId;
    let sId = studentId;

    if (assignmentId && assignmentId.startsWith('asg-')) {
      const raw = assignmentId.replace('asg-', '');
      if (!tId || !sId) {
        const foundTask = localTasks.find((t) => raw.startsWith(t.id));
        if (foundTask) {
          tId = foundTask.id;
          sId = raw.replace(foundTask.id + '-', '');
        }
      }
    }

    const now = new Date().toISOString();

    // 1. Save persistent task progress in localStorage
    try {
      const progressMap = JSON.parse(localStorage.getItem('fy_task_progress') || '{}');
      const progressRecord = {
        status: 'In Progress',
        started_at: now,
        assignment_id: assignmentId,
        task_id: tId,
        student_id: sId,
      };

      if (assignmentId) progressMap[assignmentId] = progressRecord;
      if (tId && sId) {
        progressMap[`${tId}_${sId}`] = progressRecord;
        progressMap[`asg-${tId}-${sId}`] = progressRecord;
      }
      localStorage.setItem('fy_task_progress', JSON.stringify(progressMap));
    } catch (e) {
      console.warn('Error saving fy_task_progress:', e);
    }

    // 2. Update local in-memory assignments
    localAssignments = localAssignments.map((a) => {
      if (a.id === assignmentId || (tId && sId && a.task_id === tId && a.student_id === sId)) {
        return { ...a, status: 'In Progress', started_at: now };
      }
      return a;
    });

    // 3. Update Supabase if configured
    let updated = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('task_assignments')
          .update({
            status: 'In Progress',
            started_at: now,
          })
          .eq('id', assignmentId)
          .select()
          .single();
        if (!error && data) updated = data;
      } catch (err) {
        if (tId && sId) {
          try {
            const { data } = await supabase
              .from('task_assignments')
              .update({
                status: 'In Progress',
                started_at: now,
              })
              .eq('task_id', tId)
              .eq('student_id', sId)
              .select()
              .single();
            if (data) updated = data;
          } catch (e) {}
        }
      }
    }

    const res = updated || {
      id: assignmentId,
      task_id: tId,
      student_id: sId,
      status: 'In Progress',
      started_at: now,
    };

    this.notifyLocalChange('ASSIGNMENT_UPDATED', res);
    this.notifyLocalChange('TASK_STARTED', res);
    return res;
  },

  async getTaskStudentProgress(taskId) {
    const students = await this.getStudents();
    const submissions = await this.getSubmissions();
    let progressMap = {};
    try {
      progressMap = JSON.parse(localStorage.getItem('fy_task_progress') || '{}');
    } catch (e) {}

    return (students || []).map((student) => {
      const studentSubs = (submissions || []).filter(
        (s) =>
          (s.task_id === taskId || s.task_assignments?.task_id === taskId) &&
          (s.student_id === student.id || s.task_assignments?.student_id === student.id)
      );
      const latestSub = studentSubs[0] || null;

      const pData =
        progressMap[`asg-${taskId}-${student.id}`] ||
        progressMap[`${taskId}_${student.id}`] ||
        null;

      let status = 'Assigned';
      let startedAt = pData?.started_at || null;

      if (latestSub) {
        status = latestSub.status || 'Submitted';
      } else if (pData && pData.status === 'In Progress') {
        status = 'In Progress';
      }

      return {
        student,
        status,
        started_at: startedAt,
        latestSubmission: latestSub,
      };
    });
  },

  // =========================================================================
  // SUBMISSIONS & PHOTO UPLOADS
  // =========================================================================
  async submitTaskWork({ assignmentId, studentId, comment, files, taskDueDate }) {
    const isLate = taskDueDate ? new Date() > new Date(taskDueDate) : false;
    const submissionId = generateUUID();

    // 1. Prepare uploaded photos representation
    const uploadedPhotos = files.map((f, idx) => ({
      id: 'file-' + Date.now() + '-' + idx,
      storage_path: `${studentId}/${assignmentId}/${submissionId}/${f.name}`,
      original_file_name: f.name,
      signed_url: URL.createObjectURL(f),
      content_type: f.type,
      file_size: f.size,
    }));

    let supaSubmission = null;
    let supaUploadedFiles = [];

    if (isSupabaseConfigured() && isValidUUID(assignmentId) && isValidUUID(studentId)) {
      try {
        const { data: existingSubmissions } = await supabase
          .from('submissions')
          .select('id, attempt_number')
          .eq('task_assignment_id', assignmentId)
          .order('attempt_number', { ascending: false });

        const nextAttempt = (existingSubmissions?.[0]?.attempt_number || 0) + 1;

        const { data: subData, error: subError } = await supabase
          .from('submissions')
          .insert([
            {
              id: submissionId,
              task_assignment_id: assignmentId,
              student_id: studentId,
              comment,
              status: 'Submitted',
              submitted_at: new Date().toISOString(),
              attempt_number: nextAttempt,
            },
          ])
          .select()
          .single();

        if (!subError && subData) {
          supaSubmission = subData;
          for (const file of files) {
            try {
              const uploadResult = await uploadSubmissionPhoto({
                file,
                studentId,
                taskAssignmentId: assignmentId,
                submissionId: subData.id,
              });

              const { data: fileRecord } = await supabase
                .from('submission_files')
                .insert([
                  {
                    submission_id: subData.id,
                    storage_path: uploadResult.storagePath,
                    original_file_name: uploadResult.originalName,
                    content_type: uploadResult.contentType,
                    file_size: uploadResult.fileSize,
                  },
                ])
                .select()
                .single();

              if (fileRecord) {
                supaUploadedFiles.push({ ...fileRecord, signed_url: uploadResult.signedUrl });
              }
            } catch (err) {}
          }

          await supabase
            .from('task_assignments')
            .update({
              status: 'Submitted',
              completed_at: new Date().toISOString(),
              is_late: isLate,
            })
            .eq('id', assignmentId);
        }
      } catch (err) {
        console.warn('Supabase direct submission attempt notice:', err);
      }
    }

    const finalSubmission = supaSubmission
      ? { ...supaSubmission, submission_files: supaUploadedFiles.length > 0 ? supaUploadedFiles : uploadedPhotos }
      : {
          id: submissionId,
          task_assignment_id: assignmentId,
          student_id: studentId,
          comment,
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
          reviewed_by: null,
          reviewed_at: null,
          feedback: null,
          marks_awarded: null,
          attempt_number: 1,
          submission_files: uploadedPhotos,
          files: uploadedPhotos,
        };

    // Store in localStorage for persistent offline proof
    try {
      const stored = JSON.parse(localStorage.getItem('fy_it_submissions') || '[]');
      stored.unshift(finalSubmission);
      localStorage.setItem('fy_it_submissions', JSON.stringify(stored));
    } catch (e) {}

    localSubmissions.unshift(finalSubmission);

    const assignment = localAssignments.find((a) => a.id === assignmentId);
    if (assignment) {
      assignment.status = 'Submitted';
      assignment.completed_at = new Date().toISOString();
      assignment.is_late = isLate;
    }

    this.notifyLocalChange('SUBMISSION_CREATED', finalSubmission);
    return finalSubmission;
  },

  // =========================================================================
  // ADMIN REVIEW & FEEDBACK
  // =========================================================================
  async getAllSubmissions() {
    let allSubs = [];
    try {
      const localStored = JSON.parse(localStorage.getItem('fy_it_submissions') || '[]');
      allSubs = [...localStored, ...localSubmissions];
    } catch (e) {}

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            profiles:student_id (id, full_name, roll_number, email, class_name, division),
            task_assignments:task_assignment_id (
              id,
              status,
              is_late,
              tasks (
                id,
                title,
                max_marks,
                due_at,
                priority,
                subjects (name, subject_code),
                topics (name)
              )
            ),
            submission_files (id, storage_path, original_file_name, content_type, file_size)
          `)
          .order('submitted_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          allSubs = [...data, ...allSubs];
          localSubmissions = allSubs;
          saveCache('submissions', allSubs);
        }
      } catch (err) {
        console.warn('Supabase getAllSubmissions notice:', err);
      }
    }

    // Deduplicate by ID
    const seen = new Set();
    const uniqueSubs = allSubs.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    const students = await this.getStudents();
    const tasks = await this.getTasks();

    return uniqueSubs.map((sub) => {
      const st = students.find((s) => s.id === sub.student_id);
      const taskId = sub.task_assignment_id?.replace(/^asg-/, '').replace(/-[^-]+$/, '') || sub.task_id;
      const t = tasks.find((tk) => tk.id === taskId);
      const asg = Array.isArray(sub.task_assignments) ? sub.task_assignments[0] : sub.task_assignments;

      return {
        ...sub,
        profiles: sub.profiles || st || { full_name: 'Student', roll_number: 'N/A' },
        task_assignments: asg || {
          id: sub.task_assignment_id,
          status: sub.status,
          tasks: t || null,
        },
        submission_files: sub.submission_files || sub.files || [],
      };
    });
  },

  async reviewSubmission({
    submissionId,
    assignmentId,
    studentId,
    status, // 'Approved' | 'Needs Correction' | 'Rejected'
    feedback,
    marksAwarded,
    adminId,
  }) {
    if (isSupabaseConfigured()) {
      // 1. Update submission record
      const { data: updatedSub, error: subError } = await supabase
        .from('submissions')
        .update({
          status,
          feedback,
          marks_awarded: marksAwarded,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (subError) throw subError;

      // 2. Update parent assignment status
      await supabase
        .from('task_assignments')
        .update({
          status,
        })
        .eq('id', assignmentId);

      // 3. Notify student
      await supabase.from('notifications').insert([
        {
          user_id: studentId,
          title: `Submission Review: ${status}`,
          message: `Your task submission was reviewed. Status: ${status}${
            marksAwarded !== null && marksAwarded !== undefined ? ` (${marksAwarded} marks)` : ''
          }. Feedback: "${feedback || 'No comments'}"`,
          notification_type: 'submission_reviewed',
          is_read: false,
        },
      ]);

      this.notifyLocalChange('SUBMISSION_REVIEWED', updatedSub);
      return updatedSub;
    }

    // Demo Mode
    const sub = localSubmissions.find((s) => s.id === submissionId);
    if (sub) {
      sub.status = status;
      sub.feedback = feedback;
      sub.marks_awarded = marksAwarded;
      sub.reviewed_by = adminId;
      sub.reviewed_at = new Date().toISOString();
    }

    const asg = localAssignments.find((a) => a.id === assignmentId);
    if (asg) {
      asg.status = status;
    }

    localNotifications.unshift({
      id: 'notif-' + Date.now(),
      user_id: studentId,
      title: `Submission Review: ${status}`,
      message: `Your task submission was reviewed: ${status}. Feedback: "${feedback || 'No comments'}"`,
      notification_type: 'submission_reviewed',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    this.notifyLocalChange('SUBMISSION_REVIEWED', sub);
    return sub;
  },

  // =========================================================================
  // STUDENTS DIRECTORY & MANAGEMENT (Separate Table: public.students)
  // =========================================================================
  async getStudents() {
    if (isSupabaseConfigured()) {
      try {
        // Query dedicated students table directly from Supabase
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .order('roll_number', { ascending: true });

        if (!error && Array.isArray(data)) {
          localStudents = data;
          saveCache('students', data);
          return data.map((st) => ({
            ...st,
            task_assignments: localAssignments.filter((a) => a.student_id === st.id),
          }));
        }
      } catch (err) {
        console.warn('Supabase getStudents from students table notice:', err);
      }
    }

    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    return localRegistered.map((st) => ({
      ...st,
      task_assignments: localAssignments.filter((a) => a.student_id === st.id),
    }));
  },

  async toggleStudentActive(studentId, currentStatus) {
    const newStatus = !currentStatus;
    localStudents = localStudents.map((s) =>
      s.id === studentId ? { ...s, is_active: newStatus } : s
    );

    try {
      const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
      const updatedLocal = localRegistered.map((s) =>
        s.id === studentId ? { ...s, is_active: newStatus } : s
      );
      localStorage.setItem('fy_registered_students', JSON.stringify(updatedLocal));
    } catch (e) {}

    let updatedStudent = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('students')
          .update({ is_active: newStatus })
          .eq('id', studentId)
          .select()
          .single();
        if (!error && data) updatedStudent = data;
      } catch (err) {
        console.warn('Supabase toggleStudentActive notice:', err);
      }
    }
    const res = updatedStudent || localStudents.find((s) => s.id === studentId);
    this.notifyLocalChange('STUDENT_UPDATED', res);
    return res;
  },

  async updateStudent(studentId, updates) {
    // 1. Update in local memory
    localStudents = localStudents.map((s) =>
      s.id === studentId ? { ...s, ...updates } : s
    );

    // 2. Update persistent fy_registered_students in localStorage
    try {
      const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
      const index = localRegistered.findIndex((s) => s.id === studentId);
      if (index !== -1) {
        localRegistered[index] = { ...localRegistered[index], ...updates };
      } else {
        const match = localStudents.find((s) => s.id === studentId);
        if (match) localRegistered.push({ ...match, ...updates });
      }
      localStorage.setItem('fy_registered_students', JSON.stringify(localRegistered));
    } catch (e) {
      console.warn('Error updating local registered students:', e);
    }

    // 3. Update cache
    const cachedStudents = getCache('students');
    if (cachedStudents && Array.isArray(cachedStudents)) {
      saveCache(
        'students',
        cachedStudents.map((s) => (s.id === studentId ? { ...s, ...updates } : s))
      );
    }

    // 4. Update Supabase if configured
    let updatedStudent = null;
    if (isSupabaseConfigured()) {
      try {
        const payload = {};
        if (updates.full_name !== undefined) payload.full_name = updates.full_name;
        if (updates.roll_number !== undefined) payload.roll_number = updates.roll_number;
        if (updates.mobile_number !== undefined) payload.mobile_number = updates.mobile_number;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.class_name !== undefined) payload.class_name = updates.class_name;
        if (updates.division !== undefined) payload.division = updates.division;
        if (updates.password !== undefined) payload.password = updates.password;
        if (updates.is_active !== undefined) payload.is_active = updates.is_active;

        const { data, error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', studentId)
          .select()
          .single();

        if (!error && data) {
          updatedStudent = data;
        } else if (error) {
          console.warn('Supabase updateStudent error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase updateStudent exception:', err);
      }
    }

    const res =
      updatedStudent || localStudents.find((s) => s.id === studentId) || { id: studentId, ...updates };
    this.notifyLocalChange('STUDENT_UPDATED', res);
    return res;
  },

  async addStudent(studentData) {
    const newStudent = {
      ...studentData,
      id: 'student-' + Date.now(),
      role: 'student',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    localStudents.push(newStudent);

    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    localRegistered.push(newStudent);
    localStorage.setItem('fy_registered_students', JSON.stringify(localRegistered));

    if (isSupabaseConfigured()) {
      try {
        // Direct insert into dedicated public.students table
        const { data, error } = await supabase.from('students').insert([{
          id: newStudent.id,
          full_name: newStudent.full_name,
          roll_number: newStudent.roll_number,
          mobile_number: newStudent.mobile_number || '',
          email: newStudent.email || '',
          class_name: newStudent.class_name || 'FY B.Sc. IT',
          division: newStudent.division || 'A',
          password: newStudent.password || 'student@123',
          is_active: true,
          created_at: newStudent.created_at,
        }]).select();

        if (error) {
          console.warn('Supabase students table insert notice:', error.message);
        } else {
          console.log('Student record successfully saved to Supabase students table:', data);
        }
      } catch (err) {
        console.warn('Supabase students insert error:', err);
      }
    }

    this.notifyLocalChange('STUDENT_CREATED', newStudent);
    return newStudent;
  },

  // =========================================================================
  // ADMINS MANAGEMENT (Separate Table: public.admins)
  // =========================================================================
  getAdmins() {
    try {
      return JSON.parse(localStorage.getItem('fy_it_admin_accounts') || '[]');
    } catch (e) {
      return [];
    }
  },

  async fetchAdminsFromSupabase() {
    if (!isSupabaseConfigured()) return this.getAdmins();
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        localStorage.setItem('fy_it_admin_accounts', JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetch admins notice:', err);
    }
    return this.getAdmins();
  },

  async createAdmin(adminData) {
    const admins = this.getAdmins();
    const newAdmin = {
      ...adminData,
      id: 'admin-' + Date.now(),
      assigned_subjects: adminData.assigned_subjects || ['ALL'],
      role: 'admin',
      is_active: true,
      is_default: false,
      created_at: new Date().toISOString(),
    };
    admins.push(newAdmin);
    localStorage.setItem('fy_it_admin_accounts', JSON.stringify(admins));

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('admins').insert([{
          id: newAdmin.id,
          full_name: newAdmin.full_name,
          username: newAdmin.username,
          email: newAdmin.email || '',
          password: newAdmin.password,
          department: newAdmin.department || 'Information Technology',
          assigned_subjects: newAdmin.assigned_subjects,
          role: 'admin',
          is_active: true,
          is_default: false,
          created_at: newAdmin.created_at,
        }]).select();

        if (error) {
          console.warn('Supabase admins table insert notice:', error.message);
        } else {
          console.log('Admin record successfully saved to Supabase admins table:', data);
        }
      } catch (e) {
        console.warn('Supabase admins insert error:', e);
      }
    }

    this.notifyLocalChange('ADMIN_CREATED', newAdmin);
    return newAdmin;
  },

  async updateAdmin(adminId, updates) {
    let admins = this.getAdmins();
    admins = admins.map((a) => (a.id === adminId ? { ...a, ...updates } : a));
    localStorage.setItem('fy_it_admin_accounts', JSON.stringify(admins));
    const updated = admins.find((a) => a.id === adminId);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('admins')
          .update(updates)
          .eq('id', adminId);
      } catch (e) {
        console.warn('Supabase admins update error:', e);
      }
    }

    this.notifyLocalChange('ADMIN_UPDATED', updated);
    return updated;
  },

  async deleteAdmin(adminId) {
    let admins = this.getAdmins();
    const target = admins.find((a) => a.id === adminId);
    if (target?.is_default) {
      throw new Error('Primary default Administrator account cannot be deleted.');
    }
    admins = admins.filter((a) => a.id !== adminId);
    localStorage.setItem('fy_it_admin_accounts', JSON.stringify(admins));

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('admins')
          .delete()
          .eq('id', adminId);
      } catch (e) {
        console.warn('Supabase admins delete error:', e);
      }
    }

    this.notifyLocalChange('ADMIN_DELETED', { id: adminId });
    return true;
  },

  // =========================================================================
  // ANNOUNCEMENTS & ATTACHMENTS
  // =========================================================================
  async uploadAnnouncementAttachment(file) {
    if (!file) return null;
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `announcements/${Date.now()}_${cleanFileName}`;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.storage
          .from('task-submissions')
          .upload(storagePath, file, { cacheControl: '3600', upsert: true });

        if (!error && data) {
          const { data: pubData } = supabase.storage
            .from('task-submissions')
            .getPublicUrl(storagePath);

          let finalUrl = pubData?.publicUrl;
          if (!finalUrl) {
            const { data: signedData } = await supabase.storage
              .from('task-submissions')
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
            finalUrl = signedData?.signedUrl;
          }

          if (finalUrl) {
            return {
              name: file.name,
              url: finalUrl,
              storage_path: storagePath,
              size: file.size,
              type: file.type || 'application/octet-stream',
            };
          }
        }
      } catch (err) {
        console.warn('Supabase storage upload error for announcement, using Data URL fallback:', err);
      }
    }

    // High-reliability Data URL fallback (works 100% reliably in all environments)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          url: reader.result,
          size: file.size,
          type: file.type || 'application/octet-stream',
        });
      };
      reader.onerror = () => {
        resolve({
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          type: file.type || 'application/octet-stream',
        });
      };
      reader.readAsDataURL(file);
    });
  },

  async getAnnouncements() {
    let rawList = [];
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('published_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          rawList = data;
        }
      } catch (err) {
        console.warn('Supabase getAnnouncements notice:', err);
      }
    }

    if (rawList.length === 0) {
      rawList = [...localAnnouncements];
    }

    const parsedList = rawList
      .map((item) => {
        const parsed = parseAnnouncementAttachment(item.message || item.content || '');
        return {
          ...item,
          message: parsed.message,
          content: parsed.message,
          attachment: parsed.attachment || item.attachment || null,
        };
      })
      .sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));

    localAnnouncements = parsedList;
    saveCache('announcements', parsedList);
    return parsedList;
  },

  async createAnnouncement(annData) {
    let annResult = null;
    const annId = (annData.id && isValidUUID(annData.id)) ? annData.id : generateUUID();
    const rawMessage = formatAnnouncementWithAttachment(
      annData.message || annData.content || '',
      annData.attachment || null
    );

    // Supabase strict schema payload (only columns that exist in public.announcements table)
    const supaPayload = {
      id: annId,
      title: (annData.title || 'Campus Announcement').trim(),
      message: rawMessage,
      content: rawMessage,
      created_by: null, // Set to null to prevent foreign key violations with profiles
      published_at: annData.published_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .insert([supaPayload])
          .select()
          .single();
        if (!error && data) {
          annResult = data;
        } else if (error) {
          console.error('Supabase createAnnouncement error:', error.message);
          throw new Error(error.message);
        }
      } catch (err) {
        console.error('Supabase createAnnouncement notice:', err);
        throw err;
      }
    }

    const parsed = parseAnnouncementAttachment(rawMessage);
    const fullAnn = {
      ...(annResult || supaPayload),
      title: supaPayload.title,
      message: parsed.message,
      content: parsed.message,
      attachment: parsed.attachment || annData.attachment || null,
      author_name: annData.author_name || 'Administrator',
      priority: annData.priority || 'Medium',
      target_audience: annData.target_audience || 'All',
    };

    localAnnouncements.unshift(fullAnn);
    saveCache('announcements', localAnnouncements);
    this.notifyLocalChange('ANNOUNCEMENT_CREATED', fullAnn);
    return fullAnn;
  },

  async broadcastNotification({ title, message, priority = 'Medium', targetAudience = 'All', attachment = null, sendPush = true }) {
    if (sendPush && pushService.isEnabled()) {
      pushService.sendNotification(`📢 ${title}`, {
        body: message + (attachment ? ` (📎 Attachment: ${attachment.name})` : ''),
        tag: `broadcast-${Date.now()}`,
      });
    }

    const ann = await this.createAnnouncement({
      title,
      message,
      content: message,
      attachment,
      author_name: 'Super Administrator',
      priority,
      target_audience: targetAudience,
    });

    localNotifications.unshift({
      id: generateUUID(),
      title: `📢 ${title}`,
      message,
      attachment,
      notification_type: 'announcement',
      priority,
      is_read: false,
      created_at: new Date().toISOString(),
    });
    this.notifyLocalChange('NOTIFICATION_RECEIVED', ann);

    return ann;
  },

  async deleteAnnouncement(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('announcements').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteAnnouncement notice:', err);
      }
    }
    localAnnouncements = localAnnouncements.filter((a) => a.id !== id);
    saveCache('announcements', localAnnouncements);
    this.notifyLocalChange('ANNOUNCEMENT_DELETED', { id });
    return true;
  },

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  async getNotifications(userId) {
    let combined = [];

    // 1. Fetch student notifications from Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          combined = [...data];
        }
      } catch (err) {
        console.warn('Supabase getNotifications notice:', err);
      }
    }

    // 2. Fetch all campus announcements and merge into the student feed
    try {
      const announcements = await this.getAnnouncements();
      if (Array.isArray(announcements)) {
        const annNotifs = announcements.map((a) => {
          const hasEmoji = a.title?.startsWith('📝') || a.title?.startsWith('📢') || a.title?.startsWith('🚨') || a.title?.startsWith('⚠️');
          return {
            id: 'ann-' + a.id,
            user_id: userId,
            title: hasEmoji ? a.title : `📢 ${a.title}`,
            message: a.message || a.content || '',
            attachment: a.attachment || null,
            notification_type: a.title?.includes('Task') ? 'task_assigned' : 'announcement',
            priority: a.priority || 'Normal',
            is_read: false,
            created_at: a.published_at || a.created_at || new Date().toISOString(),
          };
        });
        combined = [...combined, ...annNotifs];
      }
    } catch (e) {}

    // Deduplicate by ID
    const seen = new Set();
    const unique = [];
    for (const n of combined) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        unique.push(n);
      }
    }

    // Include local notifications
    localNotifications
      .filter((n) => !n.user_id || n.user_id === userId)
      .forEach((n) => {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          unique.push(n);
        }
      });

    return unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async markNotificationRead(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
      return true;
    }
    localNotifications = localNotifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
    return true;
  },

  async markAllNotificationsRead(userId) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    }
    localNotifications = localNotifications.map((n) =>
      n.user_id === userId ? { ...n, is_read: true } : n
    );
    return true;
  },

  async createNotification(notifData) {
    // Trigger desktop push notification if enabled
    if (pushService.isEnabled()) {
      pushService.sendNotification(`🔔 ${notifData.title}`, {
        body: notifData.message,
        tag: `notif-${Date.now()}`,
      });
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notifData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const newNotif = {
      ...notifData,
      id: 'notif-' + Date.now(),
      created_at: new Date().toISOString(),
      is_read: false,
    };
    localNotifications.unshift(newNotif);
    return newNotif;
  },

  // =========================================================================
  // STUDENT DAILY TO-DO LIST & STUDY PLANNER
  // =========================================================================
  async getTodos(userId) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('student_todos')
        .select('*, subjects(id, name, subject_code)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('student_todos table not available yet, using local store:', error.message);
        return localTodos
          .filter((t) => t.user_id === userId)
          .map((t) => ({
            ...t,
            subjects: localSubjects.find((s) => s.id === t.subject_id) || null,
          }));
      }
      if (Array.isArray(data)) {
        saveCache('todos_' + userId, data);
      }
      return data || [];
    }

    return localTodos
      .filter((t) => t.user_id === userId)
      .map((t) => ({
        ...t,
        subjects: localSubjects.find((s) => s.id === t.subject_id) || null,
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async createTodo(todoData) {
    let created = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('student_todos')
          .insert([todoData])
          .select('*, subjects(id, name, subject_code)')
          .single();
        if (!error && data) created = data;
      } catch (err) {
        console.warn('Fallback to local todo create:', err.message);
      }
    }

    if (!created) {
      const newTodo = {
        ...todoData,
        id: 'todo-' + Date.now(),
        status: todoData.status || 'pending',
        subtasks: todoData.subtasks || [],
        time_spent_minutes: 0,
        completed_at: null,
        created_at: new Date().toISOString(),
      };
      localTodos.unshift(newTodo);
      created = {
        ...newTodo,
        subjects: localSubjects.find((s) => s.id === newTodo.subject_id) || null,
      };
    }
    this.notifyLocalChange('TODO_CREATED', created);
    return created;
  },

  async updateTodo(id, updates) {
    let updated = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('student_todos')
          .update(updates)
          .eq('id', id)
          .select('*, subjects(id, name, subject_code)')
          .single();
        if (!error && data) updated = data;
      } catch (err) {
        console.warn('Fallback to local todo update:', err.message);
      }
    }

    localTodos = localTodos.map((t) => (t.id === id ? { ...t, ...updates } : t));
    const localUpdated = localTodos.find((t) => t.id === id);
    const result = updated || {
      ...localUpdated,
      subjects: localSubjects.find((s) => s.id === localUpdated?.subject_id) || null,
    };
    this.notifyLocalChange('TODO_UPDATED', result);
    return result;
  },

  async toggleTodoStatus(id) {
    const current = localTodos.find((t) => t.id === id);
    const newStatus = current?.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    return this.updateTodo(id, {
      status: newStatus,
      completed_at: completedAt,
    });
  },

  async toggleSubtask(todoId, subtaskId) {
    const todo = localTodos.find((t) => t.id === todoId);
    if (!todo) return null;

    const updatedSubtasks = (todo.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    return this.updateTodo(todoId, { subtasks: updatedSubtasks });
  },

  async addSubtask(todoId, text) {
    const todo = localTodos.find((t) => t.id === todoId);
    if (!todo) return null;

    const newSubtask = {
      id: 'st-' + Date.now(),
      text: text.trim(),
      completed: false,
    };

    const updatedSubtasks = [...(todo.subtasks || []), newSubtask];
    return this.updateTodo(todoId, { subtasks: updatedSubtasks });
  },

  async deleteSubtask(todoId, subtaskId) {
    const todo = localTodos.find((t) => t.id === todoId);
    if (!todo) return null;

    const updatedSubtasks = (todo.subtasks || []).filter((st) => st.id !== subtaskId);
    return this.updateTodo(todoId, { subtasks: updatedSubtasks });
  },

  async deleteTodo(id) {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('student_todos').delete().eq('id', id);
        if (error) console.warn('Supabase todo delete notice:', error.message);
      } catch (err) {
        console.warn('Fallback to local todo delete:', err.message);
      }
    }
    localTodos = localTodos.filter((t) => t.id !== id);
    this.notifyLocalChange('TODO_DELETED', { id });
    return true;
  },

  async logTodoStudyTime(id, minutes) {
    const todo = localTodos.find((t) => t.id === id);
    const newTime = (todo?.time_spent_minutes || 0) + minutes;
    return this.updateTodo(id, { time_spent_minutes: newTime });
  },

  async importAcademicTasksAsTodos(userId, assignments) {
    const pendingAsgs = assignments.filter((a) => !['Approved', 'Submitted'].includes(a.status));
    let importedCount = 0;

    for (const asg of pendingAsgs) {
      const task = asg.tasks;
      if (!task) continue;

      // Check if already in todo
      const exists = localTodos.some(
        (t) => t.user_id === userId && t.title.includes(task.title)
      );
      if (!exists) {
        await this.createTodo({
          user_id: userId,
          title: `Academic: ${task.title}`,
          description: task.description || '',
          subject_id: task.subject_id,
          category: task.task_type || 'Assignment',
          priority: task.priority || 'Medium',
          status: asg.status === 'In Progress' ? 'in_progress' : 'pending',
          due_date: task.due_at ? task.due_at.slice(0, 10) : null,
          subtasks: [
            { id: 'st-' + Date.now() + '-1', text: 'Read requirements & instructions', completed: false },
            { id: 'st-' + Date.now() + '-2', text: 'Complete handwritten write-up or code', completed: false },
            { id: 'st-' + Date.now() + '-3', text: 'Take clear photos and submit for review', completed: false },
          ],
        });
        importedCount++;
      }
    }
    return importedCount;
  },

  // =========================================================================
  // CONTINUOUS LIVE REALTIME SUBSCRIPTION
  // Refetches data immediately on local mutations, cross-tab events, and Supabase changes
  // =========================================================================
  subscribeRealtime(callback) {
    if (!realtimeListeners) {
      realtimeListeners = new Set();
    }
    realtimeListeners.add(callback);

    // Cross-tab Instant Sync via window storage event
    const handleStorageEvent = (e) => {
      if (e.key === 'fy_it_live_sync_ping') {
        try {
          callback({ eventType: 'CROSS_TAB_SYNC', timestamp: e.newValue });
        } catch (err) {}
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
    }

    if (isSupabaseConfigured() && !realtimeChannel) {
      try {
        realtimeChannel = supabase
          .channel('fy_it_realtime_data')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
              realtimeListeners.forEach((cb) => {
                try {
                  cb(payload);
                } catch (e) {
                  console.error('Error in realtime listener callback:', e);
                }
              });
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime channel subscription notice:', err);
      }
    }

    return () => {
      if (realtimeListeners) {
        realtimeListeners.delete(callback);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  },

  notifyLocalChange(type, detail) {
    if (realtimeListeners) {
      realtimeListeners.forEach((cb) => {
        try {
          cb({ eventType: type, detail });
        } catch (e) {}
      });
    }

    // Ping all other open browser tabs instantly
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fy_it_live_sync_ping', Date.now().toString());
      } catch (e) {}
    }
  },
};
