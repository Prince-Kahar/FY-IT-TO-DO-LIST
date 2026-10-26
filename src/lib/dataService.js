// Data Service layer: Seamlessly communicates with Supabase PostgreSQL,
// with interactive fallback when evaluating prior to Supabase credentials setup.

import { supabase, isSupabaseConfigured, uploadSubmissionPhoto, getSubmissionPhotoUrl } from './supabaseClient';
import { pushService } from './pushNotificationService';
import {
  initialSubjects,
  initialTopics,
  initialStudents,
  initialTasks,
  initialAssignments,
  initialSubmissions,
  initialAnnouncements,
  initialNotifications,
  initialTodos,
} from './mockData';

// Memory store for demo mode
let localSubjects = [...initialSubjects];
let localTopics = [...initialTopics];
let localStudents = [...initialStudents];
let localTasks = [...initialTasks];
let localAssignments = [...initialAssignments];
let localSubmissions = [...initialSubmissions];
let localAnnouncements = [...initialAnnouncements];
let localNotifications = [...initialNotifications];
let localTodos = [...initialTodos];

export const dataService = {
  // =========================================================================
  // SUBJECTS & TOPICS
  // =========================================================================
  async getSubjects() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*, topics(*)')
          .order('created_at', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Error fetching subjects from Supabase:', err);
      }
    }
    // Reliable fallback with topics
    return localSubjects.map((s) => ({
      ...s,
      topics: localTopics.filter((t) => t.subject_id === s.id),
    }));
  },

  async createSubject(subjectData) {
    const newSubject = {
      ...subjectData,
      id: 'sub-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    localSubjects.push(newSubject);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .insert([subjectData])
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase createSubject notice:', err);
      }
    }
    return newSubject;
  },

  async updateSubject(id, updates) {
    localSubjects = localSubjects.map((s) => (s.id === id ? { ...s, ...updates } : s));
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase updateSubject notice:', err);
      }
    }
    return localSubjects.find((s) => s.id === id);
  },

  async deleteSubject(id) {
    localSubjects = localSubjects.filter((s) => s.id !== id);
    localTopics = localTopics.filter((t) => t.subject_id !== id);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('subjects').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteSubject notice:', err);
      }
    }
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
    const newTopic = {
      ...topicData,
      id: 'top-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    localTopics.push(newTopic);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('topics')
          .insert([topicData])
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase createTopic notice:', err);
      }
    }
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
    return true;
  },

  // =========================================================================
  // TASKS & ASSIGNMENTS
  // =========================================================================
  async getTasks() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, subjects(name, subject_code), topics(name)')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getTasks notice:', err);
      }
    }
    return localTasks.map((t) => {
      const sub = localSubjects.find((s) => s.id === t.subject_id);
      const top = localTopics.find((tp) => tp.id === t.topic_id);
      return {
        ...t,
        subjects: sub ? { name: sub.name, subject_code: sub.subject_code } : null,
        topics: top ? { name: top.name } : null,
      };
    });
  },

  async createTask(taskData, targetStudentIds = []) {
    if (isSupabaseConfigured()) {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();
      if (error) throw error;

      // If published, assign students
      if (task.publication_status === 'Published') {
        if (task.assignment_target === 'all' || !targetStudentIds.length) {
          await supabase.rpc('assign_task_to_all_students', { task_uuid: task.id });
        } else {
          await supabase.rpc('assign_task_to_selected_students', {
            task_uuid: task.id,
            student_ids: targetStudentIds,
          });
        }
      }
      return task;
    }

    const newTask = {
      ...taskData,
      id: 'task-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localTasks.unshift(newTask);

    if (newTask.publication_status === 'Published') {
      const studentsToAssign =
        newTask.assignment_target === 'all' || !targetStudentIds.length
          ? localStudents.filter((s) => s.is_active)
          : localStudents.filter((s) => targetStudentIds.includes(s.id));

      studentsToAssign.forEach((st) => {
        localAssignments.push({
          id: 'asg-' + Date.now() + '-' + st.id,
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
          title: 'New Task Assigned: ' + newTask.title,
          message: `Due on ${new Date(newTask.due_at).toLocaleDateString()}. Check instructions and submit before deadline.`,
          notification_type: 'task_assigned',
          related_task_id: newTask.id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      });
    }

    return newTask;
  },

  async updateTask(id, taskData) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    localTasks = localTasks.map((t) => (t.id === id ? { ...t, ...taskData } : t));
    return localTasks.find((t) => t.id === id);
  },

  async deleteTask(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    localTasks = localTasks.filter((t) => t.id !== id);
    localAssignments = localAssignments.filter((a) => a.task_id !== id);
    return true;
  },

  // =========================================================================
  // STUDENT SPECIFIC ASSIGNMENTS & PROGRESS
  // =========================================================================
  async getStudentAssignments(studentId) {
    if (isSupabaseConfigured()) {
      try {
        // Attempt check_overdue_tasks RPC safely without failing if function does not exist
        try {
          await supabase.rpc('check_overdue_tasks');
        } catch (rpcErr) {}

        const { data, error } = await supabase
          .from('task_assignments')
          .select(`
            *,
            tasks (
              id,
              title,
              description,
              due_at,
              priority,
              task_type,
              max_marks,
              subject_id,
              topic_id,
              subjects (id, name, subject_code),
              topics (id, name)
            ),
            submissions (
              id,
              status,
              comment,
              submitted_at,
              reviewed_at,
              feedback,
              marks_awarded,
              attempt_number,
              submission_files (id, storage_path, original_file_name, file_size)
            )
          `)
          .eq('student_id', studentId)
          .order('assigned_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase getStudentAssignments notice:', err);
      }
    }

    // Demo mode: Return joined assignments
    return localAssignments
      .filter((a) => a.student_id === studentId)
      .map((a) => {
        const task = localTasks.find((t) => t.id === a.task_id);
        const sub = task ? localSubjects.find((s) => s.id === task.subject_id) : null;
        const top = task ? localTopics.find((tp) => tp.id === task.topic_id) : null;
        const subs = localSubmissions.filter((sm) => sm.task_assignment_id === a.id);

        // Check if overdue
        let currentStatus = a.status;
        if (
          task &&
          new Date(task.due_at) < new Date() &&
          ['Assigned', 'In Progress'].includes(currentStatus)
        ) {
          currentStatus = 'Overdue';
        }

        return {
          ...a,
          status: currentStatus,
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

  async startTask(assignmentId) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('task_assignments')
        .update({
          status: 'In Progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    localAssignments = localAssignments.map((a) =>
      a.id === assignmentId
        ? { ...a, status: 'In Progress', started_at: new Date().toISOString() }
        : a
    );
    return localAssignments.find((a) => a.id === assignmentId);
  },

  // =========================================================================
  // SUBMISSIONS & PHOTO UPLOADS
  // =========================================================================
  async submitTaskWork({ assignmentId, studentId, comment, files, taskDueDate }) {
    const isLate = taskDueDate ? new Date() > new Date(taskDueDate) : false;

    if (isSupabaseConfigured()) {
      // 1. Fetch current assignment to determine attempt number
      const { data: existingSubmissions } = await supabase
        .from('submissions')
        .select('id, attempt_number')
        .eq('task_assignment_id', assignmentId)
        .order('attempt_number', { ascending: false });

      const nextAttempt = (existingSubmissions?.[0]?.attempt_number || 0) + 1;

      // 2. Insert submission record
      const { data: submission, error: subError } = await supabase
        .from('submissions')
        .insert([
          {
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

      if (subError) throw subError;

      // 3. Upload files to Supabase Storage & insert submission_files
      const uploadedFiles = [];
      for (const file of files) {
        const uploadResult = await uploadSubmissionPhoto({
          file,
          studentId,
          taskAssignmentId: assignmentId,
          submissionId: submission.id,
        });

        const { data: fileRecord, error: fileError } = await supabase
          .from('submission_files')
          .insert([
            {
              submission_id: submission.id,
              storage_path: uploadResult.storagePath,
              original_file_name: uploadResult.originalName,
              content_type: uploadResult.contentType,
              file_size: uploadResult.fileSize,
            },
          ])
          .select()
          .single();

        if (fileError) console.error('Error saving submission file metadata:', fileError);
        uploadedFiles.push({ ...fileRecord, signed_url: uploadResult.signedUrl });
      }

      // 4. Update task_assignment status to 'Submitted'
      await supabase
        .from('task_assignments')
        .update({
          status: 'Submitted',
          completed_at: new Date().toISOString(),
          is_late: isLate,
        })
        .eq('id', assignmentId);

      return {
        ...submission,
        submission_files: uploadedFiles,
      };
    }

    // Demo Mode Implementation
    const assignment = localAssignments.find((a) => a.id === assignmentId);
    const existingCount = localSubmissions.filter((s) => s.task_assignment_id === assignmentId).length;

    const newSubmissionId = 'subm-' + Date.now();
    const uploadedPhotos = files.map((f, idx) => ({
      id: 'file-' + Date.now() + '-' + idx,
      storage_path: `${studentId}/${assignmentId}/${newSubmissionId}/${f.name}`,
      original_file_name: f.name,
      signed_url: URL.createObjectURL(f),
      content_type: f.type,
      file_size: f.size,
    }));

    const newSubmission = {
      id: newSubmissionId,
      task_assignment_id: assignmentId,
      student_id: studentId,
      comment,
      status: 'Submitted',
      submitted_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      feedback: null,
      marks_awarded: null,
      attempt_number: existingCount + 1,
      files: uploadedPhotos,
    };

    localSubmissions.unshift(newSubmission);

    if (assignment) {
      assignment.status = 'Submitted';
      assignment.completed_at = new Date().toISOString();
      assignment.is_late = isLate;
    }

    return newSubmission;
  },

  // =========================================================================
  // ADMIN REVIEW & FEEDBACK
  // =========================================================================
  async getAllSubmissions() {
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
          return data.map((sub) => {
            const asg = Array.isArray(sub.task_assignments) ? sub.task_assignments[0] : sub.task_assignments;
            return {
              ...sub,
              task_assignments: asg,
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getAllSubmissions notice:', err);
      }
    }

    // Demo fallback: assemble submissions with student & task info
    return localSubmissions.map((sub) => {
      const st = localStudents.find((s) => s.id === sub.student_id);
      const asg = localAssignments.find((a) => a.id === sub.task_assignment_id);
      const t = asg ? localTasks.find((tk) => tk.id === asg.task_id) : null;
      const s = t ? localSubjects.find((sb) => sb.id === t.subject_id) : null;
      const tp = t ? localTopics.find((top) => top.id === t.topic_id) : null;

      return {
        ...sub,
        profiles: st || { full_name: 'Student', roll_number: 'N/A' },
        task_assignments: asg
          ? {
              ...asg,
              tasks: t
                ? {
                    ...t,
                    subjects: s ? { name: s.name, subject_code: s.subject_code } : null,
                    topics: tp ? { name: tp.name } : null,
                  }
                : null,
            }
          : null,
        submission_files: sub.files || [],
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

    return sub;
  },

  // =========================================================================
  // STUDENTS DIRECTORY & MANAGEMENT
  // =========================================================================
  async getStudents() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, task_assignments(id, status, is_late)')
          .eq('role', 'student')
          .order('roll_number', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase getStudents notice:', err);
      }
    }
    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    const combined = [...localStudents, ...localRegistered.filter((r) => !localStudents.some((s) => s.id === r.id))];
    return combined.map((st) => {
      const asgs = localAssignments.filter((a) => a.student_id === st.id);
      return {
        ...st,
        task_assignments: asgs,
      };
    });
  },

  async toggleStudentActive(studentId, currentStatus) {
    localStudents = localStudents.map((s) =>
      s.id === studentId ? { ...s, is_active: !currentStatus } : s
    );
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ is_active: !currentStatus })
          .eq('id', studentId)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase toggleStudentActive notice:', err);
      }
    }
    return localStudents.find((s) => s.id === studentId);
  },

  // =========================================================================
  // ANNOUNCEMENTS
  // =========================================================================
  async getAnnouncements() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('published_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase getAnnouncements notice:', err);
      }
    }
    return [...localAnnouncements].sort(
      (a, b) => new Date(b.published_at) - new Date(a.published_at)
    );
  },

  async createAnnouncement(annData) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('announcements')
        .insert([annData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const newAnn = {
      ...annData,
      id: 'ann-' + Date.now(),
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    localAnnouncements.unshift(newAnn);
    return newAnn;
  },

  async deleteAnnouncement(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    localAnnouncements = localAnnouncements.filter((a) => a.id !== id);
    return true;
  },

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  async getNotifications(userId) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase getNotifications notice:', err);
      }
    }
    return localNotifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('student_todos')
          .insert([todoData])
          .select('*, subjects(id, name, subject_code)')
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Fallback to local todo create:', err.message);
      }
    }

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
    return {
      ...newTodo,
      subjects: localSubjects.find((s) => s.id === newTodo.subject_id) || null,
    };
  },

  async updateTodo(id, updates) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('student_todos')
          .update(updates)
          .eq('id', id)
          .select('*, subjects(id, name, subject_code)')
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Fallback to local todo update:', err.message);
      }
    }

    localTodos = localTodos.map((t) => (t.id === id ? { ...t, ...updates } : t));
    const updated = localTodos.find((t) => t.id === id);
    return {
      ...updated,
      subjects: localSubjects.find((s) => s.id === updated?.subject_id) || null,
    };
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
        if (error) throw error;
        return true;
      } catch (err) {
        console.warn('Fallback to local todo delete:', err.message);
      }
    }
    localTodos = localTodos.filter((t) => t.id !== id);
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
};
