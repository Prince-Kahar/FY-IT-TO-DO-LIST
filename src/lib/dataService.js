// Data Service layer: Seamlessly communicates with Supabase PostgreSQL,
// with interactive fallback when evaluating prior to Supabase credentials setup.

import { supabase, isSupabaseConfigured, uploadSubmissionPhoto, getSubmissionPhotoUrl } from './supabaseClient';
import { pushService } from './pushNotificationService';
// Clean in-memory caches for live sync & offline resilience (zero hardcoded mock data)
let localSubjects = [];
let localTopics = [];
let localStudents = [];
let localTasks = [];
let localAssignments = [];
let localSubmissions = [];
let localAnnouncements = [];
let localNotifications = [];
let localTodos = [];

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

// Realtime sync channels and listener bus
let realtimeChannel = null;
let realtimeListeners = new Set();

export const dataService = {
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
          return data.map((s) => ({
            ...s,
            topics: Array.isArray(s.topics) ? s.topics : [],
          }));
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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, subjects(name, subject_code), topics(name)')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) return data;
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
      publication_status: taskData.publication_status || 'Published',
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

    const newTask = taskResult || cleanTask;
    localTasks.unshift(newTask);

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
          title: 'New Task Assigned: ' + newTask.title,
          message: `Due on ${new Date(newTask.due_at).toLocaleDateString()}. Check instructions and submit before deadline.`,
          notification_type: 'task_assigned',
          related_task_id: newTask.id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      });
    }

    this.notifyLocalChange('TASK_CREATED', newTask);
    return newTask;
  },

  async updateTask(id, taskData) {
    const { subjects, topics, submissions, task_assignments, ...cleanTaskUpdates } = taskData;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .update(cleanTaskUpdates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          localTasks = localTasks.map((t) => (t.id === id ? { ...t, ...data } : t));
          this.notifyLocalChange('TASK_UPDATED', data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase updateTask notice:', err);
      }
    }
    localTasks = localTasks.map((t) => (t.id === id ? { ...t, ...taskData } : t));
    const updated = localTasks.find((t) => t.id === id);
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
          allTasks = remoteTasks.filter(
            (t) => !t.publication_status || t.publication_status.toLowerCase() === 'published'
          );
        }
      } catch (err) {
        console.warn('Supabase getStudentAssignments notice:', err);
      }
    }

    // 2. Merge with any local tasks created recently
    if (Array.isArray(localTasks) && localTasks.length > 0) {
      const seenTaskIds = new Set(allTasks.map((t) => t.id));
      localTasks
        .filter((t) => !t.publication_status || t.publication_status.toLowerCase() === 'published')
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

      // Map each published task into an assignment object
      const assignments = allTasks.map((task) => {
        const taskSubs = studentSubmissions.filter(
          (s) => s.task_id === task.id || s.task_assignment_id === ('asg-' + task.id + '-' + studentId)
        );
        const latestSub = taskSubs[0] || null;

        let status = 'Assigned';
        if (latestSub) {
          status = latestSub.status || 'Submitted';
        } else if (task.due_at && new Date(task.due_at) < new Date()) {
          status = 'Overdue';
        }

        return {
          id: 'asg-' + task.id + '-' + studentId,
          task_id: task.id,
          student_id: studentId,
          status: status,
          assigned_at: task.created_at || new Date().toISOString(),
          started_at: null,
          completed_at: latestSub?.submitted_at || null,
          is_late: task.due_at ? new Date() > new Date(task.due_at) : false,
          tasks: task,
          submissions: taskSubs.map((s) => ({
            ...s,
            submission_files: s.submission_files || s.files || [],
          })),
        };
      });

      return assignments;
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
    let updated = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('task_assignments')
          .update({
            status: 'In Progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', assignmentId)
          .select()
          .single();
        if (!error && data) updated = data;
      } catch (err) {
        console.warn('Supabase startTask notice:', err);
      }
    }
    localAssignments = localAssignments.map((a) =>
      a.id === assignmentId
        ? { ...a, status: 'In Progress', started_at: new Date().toISOString() }
        : a
    );
    const res = updated || localAssignments.find((a) => a.id === assignmentId);
    this.notifyLocalChange('ASSIGNMENT_UPDATED', res);
    return res;
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
    localStudents = localStudents.map((s) =>
      s.id === studentId ? { ...s, is_active: !currentStatus } : s
    );
    let updatedStudent = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('students')
          .update({ is_active: !currentStatus })
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
  // ANNOUNCEMENTS
  // =========================================================================
  async getAnnouncements() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('published_at', { ascending: false });
        if (!error && Array.isArray(data)) {
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
    let annResult = null;
    const annId = (annData.id && isValidUUID(annData.id)) ? annData.id : generateUUID();
    const cleanPayload = {
      ...annData,
      id: annId,
      title: annData.title || 'Campus Announcement',
      message: annData.message || annData.content || '',
      content: annData.content || annData.message || '',
      author_id: (annData.author_id && isValidUUID(annData.author_id)) ? annData.author_id : null,
      author_name: annData.author_name || 'Super Administrator',
      priority: annData.priority || 'Medium',
      target_audience: annData.target_audience || 'All',
      published_at: annData.published_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .insert([cleanPayload])
          .select()
          .single();
        if (!error && data) annResult = data;
        else if (error) {
          console.error('Supabase createAnnouncement error:', error.message);
        }
      } catch (err) {
        console.error('Supabase createAnnouncement notice:', err);
      }
    }
    const newAnn = annResult || cleanPayload;
    localAnnouncements.unshift(newAnn);
    this.notifyLocalChange('ANNOUNCEMENT_CREATED', newAnn);
    return newAnn;
  },

  async broadcastNotification({ title, message, priority = 'Medium', targetAudience = 'All', sendPush = true }) {
    if (sendPush && pushService.isEnabled()) {
      pushService.sendNotification(`📢 ${title}`, {
        body: message,
        tag: `broadcast-${Date.now()}`,
      });
    }

    const ann = await this.createAnnouncement({
      title,
      message,
      content: message,
      author_name: 'Super Administrator',
      priority,
      target_audience: targetAudience,
    });

    if (isSupabaseConfigured()) {
      try {
        const students = await this.getStudents();
        if (Array.isArray(students) && students.length > 0) {
          const validStudentIds = students
            .map((st) => st.id)
            .filter((id) => isValidUUID(id));

          if (validStudentIds.length > 0) {
            const notifs = validStudentIds.map((stId) => ({
              id: generateUUID(),
              user_id: stId,
              title: `📢 ${title}`,
              message,
              notification_type: 'announcement',
              is_read: false,
              created_at: new Date().toISOString(),
            }));
            await supabase.from('notifications').insert(notifs);
          }
        }
      } catch (e) {
        console.warn('Broadcast notification to student feed caught:', e.message);
      }
    }

    localNotifications.unshift({
      id: generateUUID(),
      title: `📢 ${title}`,
      message,
      notification_type: 'announcement',
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
        const annNotifs = announcements.map((a) => ({
          id: 'ann-' + a.id,
          user_id: userId,
          title: `📢 ${a.title}`,
          message: a.message || a.content || '',
          notification_type: 'announcement',
          priority: a.priority || 'Normal',
          is_read: false,
          created_at: a.published_at || a.created_at || new Date().toISOString(),
        }));
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
  // Automatically refetches data whenever Supabase database tables change
  // =========================================================================
  subscribeRealtime(callback) {
    if (!realtimeListeners) {
      realtimeListeners = new Set();
    }
    realtimeListeners.add(callback);

    if (isSupabaseConfigured() && !realtimeChannel) {
      try {
        realtimeChannel = supabase
          .channel('fy_it_realtime_data')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
              console.log('⚡ Realtime Supabase change received:', payload.table, payload.eventType);
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
  },
};
