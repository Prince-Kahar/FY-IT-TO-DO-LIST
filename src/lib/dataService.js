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

// Built-in foundational academic curriculum (Empty: real subjects created by admin)
export const DEFAULT_SUBJECTS = [];

// Helper to identify and purge dummy/legacy subjects
const DUMMY_SUBJECT_IDS = new Set([
  'sub-it-101', 'sub-it-102', 'sub-it-103', 'sub-it-104', 'sub-it-105',
  'sub-it-201', 'sub-it-202', 'sub-it-203',
  'sub-ds-101', 'sub-ds-102', 'sub-ds-103',
  'sub-ds-201', 'sub-ds-202', 'sub-ds-203',
]);
const DUMMY_SUBJECT_NAMES = new Set([
  'imperative programming', 'digital electronics', 'operating systems',
  'discrete mathematics', 'communication skills', 'object oriented programming with c++',
  'microprocessor architecture', 'web programming', 'foundations of data science',
  'python for data science', 'linear algebra & calculus', 'data structures & algorithms',
  'database management systems & sql', 'probability & applied statistics'
]);
export const isDummySubject = (s) => {
  if (!s) return false;
  if (s.id && (DUMMY_SUBJECT_IDS.has(s.id) || s.id.startsWith('sub-it-') || s.id.startsWith('sub-ds-'))) return true;
  if (s.name && DUMMY_SUBJECT_NAMES.has((s.name || '').trim().toLowerCase())) return true;
  return false;
};

// Immediately purge any dummy subjects cached previously in localStorage
try {
  const cachedSubs = loadCache('subjects', []);
  const cleanSubs = (Array.isArray(cachedSubs) ? cachedSubs : []).filter((s) => !isDummySubject(s));
  saveCache('subjects', cleanSubs);

  const customSubs = JSON.parse(localStorage.getItem('fy_custom_subjects') || '[]');
  const cleanCustom = (Array.isArray(customSubs) ? customSubs : []).filter((s) => !isDummySubject(s));
  localStorage.setItem('fy_custom_subjects', JSON.stringify(cleanCustom));

  const cachedTops = loadCache('topics', []);
  const cleanTops = (Array.isArray(cachedTops) ? cachedTops : []).filter((t) => !DUMMY_SUBJECT_IDS.has(t.subject_id) && !t.id?.startsWith('top-it-') && !t.id?.startsWith('top-ds-'));
  saveCache('topics', cleanTops);

  const overrides = JSON.parse(localStorage.getItem('fy_subject_overrides') || '{}');
  let altered = false;
  for (const k of Object.keys(overrides)) {
    if (DUMMY_SUBJECT_IDS.has(k) || k.startsWith('sub-it-') || k.startsWith('sub-ds-')) {
      delete overrides[k];
      altered = true;
    }
  }
  if (altered) {
    localStorage.setItem('fy_subject_overrides', JSON.stringify(overrides));
  }
} catch (e) {}

// Clean in-memory caches populated immediately from persistent cache
let localSubjects = (() => {
  const c = loadCache('subjects', []);
  let deletedSubjectIds = new Set();
  try {
    const raw = JSON.parse(localStorage.getItem('fy_deleted_subject_ids') || '[]');
    deletedSubjectIds = new Set(raw.map((x) => String(x).toLowerCase()));
  } catch (e) {}
  return (Array.isArray(c) ? c : []).filter(
    (s) => !isDummySubject(s) && !deletedSubjectIds.has(String(s.id).toLowerCase())
  );
})();

let localTopics = (() => {
  const c = loadCache('topics', []);
  return (Array.isArray(c) ? c : []).filter(
    (t) => !DUMMY_SUBJECT_IDS.has(t.subject_id) && !t.id?.startsWith('top-it-') && !t.id?.startsWith('top-ds-')
  );
})();

let localStudents = (() => {
  const c = loadCache('students', []);
  let deletedIds = new Set();
  try {
    const raw = JSON.parse(localStorage.getItem('fy_deleted_student_ids') || '[]');
    deletedIds = new Set(raw.map((x) => String(x).toLowerCase()));
  } catch (e) {}
  return (Array.isArray(c) ? c : []).filter(
    (s) => !deletedIds.has(String(s.id).toLowerCase()) && (!s.roll_number || !deletedIds.has(String(s.roll_number).toLowerCase()))
  );
})();
let localTasks = loadCache('tasks');
let localAssignments = loadCache('assignments');
let localSubmissions = loadCache('submissions');
let localAnnouncements = loadCache('announcements');
let localNotifications = loadCache('notifications');
let localTodos = (() => {
  const c = loadCache('todos');
  if (Array.isArray(c) && c.length > 0) return c;
  try {
    const raw = localStorage.getItem('fy_student_todos');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
})();

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
  // Strict stream & semester isolation validator
  isSubjectForStudent(sub, studentStream, studentSemester = 'Sem 1') {
    if (!sub || !sub.is_active) return false;
    const rawStream = (sub.stream || '').toUpperCase();
    const rawCode = (sub.subject_code || '').toUpperCase();
    const rawName = (sub.name || '').toUpperCase();

    const isDS = rawStream === 'DS' || rawCode.startsWith('DS') || rawName.includes('DATA SCIENCE');
    const isIT = rawStream === 'IT' || rawCode.startsWith('IT') || rawName.includes('IMPERATIVE') || rawName.includes('DIGITAL ELECTRONICS') || rawName.includes('OPERATING SYSTEMS') || rawName.includes('MICROPROCESSOR') || rawName.includes('WEB PROGRAMMING');

    const normStudentStream = (studentStream || 'IT').toUpperCase();

    if (normStudentStream === 'IT') {
      if (isDS) return false; // Strictly NEVER show DS subjects to IT student
    } else if (normStudentStream === 'DS') {
      if (isIT && !isDS) return false; // Strictly NEVER show IT subjects to DS student
    }

    if (studentSemester && studentSemester !== 'ALL') {
      const subSem = sub.semester || 'Sem 1';
      if (subSem !== 'ALL' && subSem !== studentSemester) return false;
    }

    return true;
  },

  // Synchronous getters for 0ms instantaneous rendering on initial page mount
  getCachedSubjects() {
    let mem = localSubjects && localSubjects.length > 0 ? localSubjects : loadCache('subjects', []);
    let overrides = {};
    let topicOverrides = {};
    let deletedSubjectIds = new Set();
    try {
      overrides = JSON.parse(localStorage.getItem('fy_subject_overrides') || '{}');
      topicOverrides = JSON.parse(localStorage.getItem('fy_topic_overrides') || '{}');
      const rawDeletedSubs = JSON.parse(localStorage.getItem('fy_deleted_subject_ids') || '[]');
      deletedSubjectIds = new Set(rawDeletedSubs.map((x) => String(x).toLowerCase()));
    } catch (e) {}

    const cleanMem = (Array.isArray(mem) ? mem : []).filter(
      (s) => !isDummySubject(s) && !deletedSubjectIds.has(String(s.id).toLowerCase())
    );

    return cleanMem.map((s) => {
      const ov = overrides[s.id] || {};
      const subjectCode = ov.subject_code || s.subject_code || s.code || (s.stream === 'DS' ? 'DS-101' : 'IT-101');
      const stream = ov.stream || s.stream || (
        subjectCode?.toUpperCase().startsWith('DS') ? 'DS' :
        subjectCode?.toUpperCase().startsWith('IT') ? 'IT' : 'Both'
      );
      const semester = ov.semester || s.semester || 'Sem 1';
      const rawTopics = [
        ...(Array.isArray(s.topics) ? s.topics : []),
        ...(localTopics || []).filter((t) => t.subject_id === s.id),
      ];
      const seenTopics = new Set();
      const uniqueTopics = [];
      rawTopics.forEach((tp) => {
        if (tp && tp.id && !seenTopics.has(tp.id)) {
          seenTopics.add(tp.id);
          const tov = topicOverrides[tp.id] || {};
          uniqueTopics.push({
            ...tp,
            ...tov,
            unit_name: tov.unit_name || tp.unit_name || 'Unit 1: General Topics',
          });
        }
      });

      return {
        ...s,
        ...ov,
        name: ov.name || s.name,
        subject_code: subjectCode,
        stream,
        semester,
        teacher_name: ov.teacher_name || s.teacher_name || s.faculty_name || s.teacher || 'Department Faculty',
        description: ov.description !== undefined ? ov.description : (s.description || ''),
        is_active: ov.is_active !== undefined ? ov.is_active : (s.is_active !== undefined ? s.is_active : true),
        topics: uniqueTopics,
      };
    });
  },
  checkAndAutoPublishScheduledTasks(tasks) {
    const list = Array.isArray(tasks) ? tasks : (localTasks && localTasks.length > 0 ? localTasks : loadCache('tasks', []));
    if (!list || list.length === 0) return list;

    const now = new Date();
    let overrides = {};
    try {
      overrides = JSON.parse(localStorage.getItem('fy_task_overrides') || '{}');
    } catch (e) {}

    let hasChanges = false;
    const updated = list.map((t) => {
      const ov = overrides[t.id];
      const pubStatus = ov?.publication_status !== undefined ? ov.publication_status : t.publication_status;
      const schedAt = ov?.scheduled_at !== undefined ? ov.scheduled_at : t.scheduled_at;

      if (pubStatus === 'Scheduled' && schedAt) {
        const releaseTime = new Date(schedAt);
        if (!isNaN(releaseTime.getTime()) && now >= releaseTime) {
          hasChanges = true;
          overrides[t.id] = {
            ...(overrides[t.id] || {}),
            publication_status: 'Published',
            updated_at: new Date().toISOString(),
          };

          // Generate student assignments if not present
          const existing = localAssignments.filter((a) => a.task_id === t.id);
          if (existing.length === 0) {
            const sub = (localSubjects || []).find((s) => s.id === t.subject_id) || t.subjects;
            const subStream = sub?.stream || (sub?.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT');
            const subSem = sub?.semester || 'Sem 1';

            const activeStudents = localStudents.filter((s) => {
              if (!s.is_active) return false;
              const sStream = s.stream || (s.class_name?.toUpperCase().includes('DS') ? 'DS' : 'IT');
              const sSem = s.semester || 'Sem 1';
              const matchStream = subStream === 'Both' || sStream === subStream;
              const matchSem = subSem === 'ALL' || sSem === subSem;
              return matchStream && matchSem;
            });
            activeStudents.forEach((st) => {
              localAssignments.push({
                id: 'asg-' + t.id + '-' + st.id,
                task_id: t.id,
                student_id: st.id,
                status: 'Assigned',
                assigned_at: new Date().toISOString(),
                started_at: null,
                completed_at: null,
                is_late: false,
              });
            });
            saveCache('assignments', localAssignments);
          }

          // Broadcast announcement for students
          try {
            const sub = (localSubjects || []).find((s) => s.id === t.subject_id) || t.subjects;
            const subName = sub ? (sub.subject_code ? `${sub.subject_code} - ${sub.name}` : sub.name) : 'Academic Course';
            const formattedDueDate = t.due_at
              ? new Date(t.due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'No deadline';

            this.createAnnouncement({
              title: `📝 Scheduled Task Released: ${t.title}`,
              message: `A new practical task has been released for ${subName}. Due Date: ${formattedDueDate}. Please check instructions and submit on time.`,
              content: `A new practical task has been released for ${subName}. Due Date: ${formattedDueDate}. Please check instructions and submit on time.`,
              author_name: 'Academic Faculty',
              priority: 'High',
              target_audience: 'All',
            }).catch(() => {});
          } catch (e) {}

          // Update Supabase if configured
          if (isSupabaseConfigured()) {
            supabase
              .from('tasks')
              .update({ publication_status: 'Published', updated_at: new Date().toISOString() })
              .eq('id', t.id)
              .then(() => {})
              .catch((err) => console.warn('Auto publish Supabase notice:', err));
          }

          return {
            ...t,
            ...(ov || {}),
            publication_status: 'Published',
          };
        }
      }
      return t;
    });

    if (hasChanges) {
      try {
        localStorage.setItem('fy_task_overrides', JSON.stringify(overrides));
      } catch (e) {}
      localTasks = updated;
      saveCache('tasks', updated);
      this.notifyLocalChange('TASK_AUTO_PUBLISHED', { timestamp: Date.now() });
    }

    return updated;
  },

  getCachedTasks() {
    const mem = localTasks && localTasks.length > 0 ? localTasks : loadCache('tasks');
    let overrides = {};
    try {
      overrides = JSON.parse(localStorage.getItem('fy_task_overrides') || '{}');
    } catch (e) {}
    const subjects = this.getCachedSubjects();
    const mapped = (Array.isArray(mem) ? mem : []).map((t) => {
      const ov = overrides[t.id];
      const taskObj = ov ? { ...t, ...ov } : { ...t };
      if (!taskObj.subjects && taskObj.subject_id) {
        const sub = subjects.find((s) => s.id === taskObj.subject_id);
        if (sub) {
          taskObj.subjects = { name: sub.name, subject_code: sub.subject_code };
        }
      }
      return taskObj;
    });
    return this.checkAndAutoPublishScheduledTasks(mapped);
  },
  getCachedStudents() {
    const mem = localStudents && localStudents.length > 0 ? localStudents : loadCache('students');
    return (Array.isArray(mem) ? mem : []).map((s) => ({
      ...s,
      semester: s.semester || 'Sem 1',
    }));
  },
  getCachedSubmissions() {
    let allSubs = [];
    try {
      const localStored = JSON.parse(localStorage.getItem('fy_it_submissions') || '[]');
      allSubs = [...localStored, ...(localSubmissions || [])];
    } catch (e) {}
    const mem = allSubs.length > 0 ? allSubs : (localSubmissions && localSubmissions.length > 0 ? localSubmissions : loadCache('submissions'));
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
    let overrides = {};
    try {
      overrides = JSON.parse(localStorage.getItem('fy_subject_overrides') || '{}');
    } catch (e) {}

    let customSubjects = [];
    try {
      customSubjects = JSON.parse(localStorage.getItem('fy_custom_subjects') || '[]');
    } catch (e) {}

    let remoteData = null;
    if (isSupabaseConfigured()) {
      try {
        const queryPromise = supabase
          .from('subjects')
          .select('*, topics(*)')
          .order('created_at', { ascending: true });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase subject query timeout (2.5s)')), 2500)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (!error && Array.isArray(data) && data.length > 0) {
          remoteData = data;
        } else if (error) {
          const plainQuery = supabase
            .from('subjects')
            .select('*')
            .order('created_at', { ascending: true });
          const { data: plainData, error: plainError } = await Promise.race([plainQuery, timeoutPromise]);
          if (!plainError && Array.isArray(plainData) && plainData.length > 0) {
            remoteData = plainData;
          }
        }
      } catch (err) {
        console.warn('Supabase getSubjects notice (falling back to cache):', err.message);
      }
    }

    let baseList = [];
    if (Array.isArray(remoteData) && remoteData.length > 0) {
      const remoteIds = new Set(remoteData.map((s) => s.id));
      const localOnly = (localSubjects || []).filter((s) => !remoteIds.has(s.id));
      const customOnly = (customSubjects || []).filter(
        (s) => !remoteIds.has(s.id) && !localOnly.some((l) => l.id === s.id)
      );
      baseList = [...remoteData, ...localOnly, ...customOnly];
    } else {
      const existingIds = new Set();
      const combined = [];
      (localSubjects || []).forEach((s) => {
        if (!existingIds.has(s.id)) {
          existingIds.add(s.id);
          combined.push(s);
        }
      });
      (customSubjects || []).forEach((s) => {
        if (!existingIds.has(s.id)) {
          existingIds.add(s.id);
          combined.push(s);
        }
      });
      baseList = combined;
    }

    let topicOverrides = {};
    let deletedSubjectIds = new Set();
    try {
      topicOverrides = JSON.parse(localStorage.getItem('fy_topic_overrides') || '{}');
      const rawDeletedSubs = JSON.parse(localStorage.getItem('fy_deleted_subject_ids') || '[]');
      deletedSubjectIds = new Set(rawDeletedSubs.map((x) => String(x).toLowerCase()));
    } catch (e) {}

    baseList = baseList.filter(
      (s) => !isDummySubject(s) && !deletedSubjectIds.has(String(s.id).toLowerCase())
    );

    const mapped = baseList.map((s) => {
      const ov = overrides[s.id] || {};
      const subjectCode = ov.subject_code || s.subject_code || s.code || (s.stream === 'DS' ? 'DS-101' : 'IT-101');
      const stream = ov.stream || s.stream || (
        subjectCode?.toUpperCase().startsWith('DS') ? 'DS' :
        subjectCode?.toUpperCase().startsWith('IT') ? 'IT' : 'Both'
      );
      const semester = ov.semester || s.semester || 'Sem 1';
      const rawTopics = [
        ...(Array.isArray(s.topics) ? s.topics : []),
        ...(localTopics || []).filter((t) => t.subject_id === s.id),
      ];
      const seenTopics = new Set();
      const uniqueTopics = [];
      rawTopics.forEach((tp) => {
        if (tp && tp.id && !seenTopics.has(tp.id)) {
          seenTopics.add(tp.id);
          const tov = topicOverrides[tp.id] || {};
          uniqueTopics.push({
            ...tp,
            ...tov,
            unit_name: tov.unit_name || tp.unit_name || 'Unit 1: General Topics',
          });
        }
      });

      return {
        ...s,
        ...ov,
        name: ov.name || s.name,
        subject_code: subjectCode,
        stream,
        semester,
        teacher_name: ov.teacher_name || s.teacher_name || s.faculty_name || s.teacher || 'Department Faculty',
        description: ov.description !== undefined ? ov.description : (s.description || ''),
        is_active: ov.is_active !== undefined ? ov.is_active : (s.is_active !== undefined ? s.is_active : true),
        topics: uniqueTopics,
      };
    });

    localSubjects = mapped;
    saveCache('subjects', mapped);
    return mapped;
  },

  async createSubject(subjectData) {
    const subjectId = (subjectData.id && isValidUUID(subjectData.id)) ? subjectData.id : generateUUID();
    const stream = subjectData.stream || (
      subjectData.subject_code?.toUpperCase().startsWith('DS') ? 'DS' :
      subjectData.subject_code?.toUpperCase().startsWith('IT') ? 'IT' : 'IT'
    );
    const semester = subjectData.semester || 'Sem 1';

    const fullSubject = {
      id: subjectId,
      name: subjectData.name,
      stream,
      semester,
      subject_code: subjectData.subject_code || (stream === 'DS' ? 'DS-101' : 'IT-101'),
      description: subjectData.description || null,
      teacher_name: subjectData.teacher_name || null,
      is_active: subjectData.is_active !== undefined ? subjectData.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      topics: [],
    };

    // 1. Immediately store in local memory and cache so UI never loses the subject
    try {
      const deletedSubs = JSON.parse(localStorage.getItem('fy_deleted_subject_ids') || '[]');
      const filtered = deletedSubs.filter((x) => x.toLowerCase() !== String(subjectId).toLowerCase());
      localStorage.setItem('fy_deleted_subject_ids', JSON.stringify(filtered));
    } catch (e) {}

    const existingIndex = localSubjects.findIndex((s) => s.id === subjectId);
    if (existingIndex >= 0) {
      localSubjects[existingIndex] = fullSubject;
    } else {
      localSubjects.push(fullSubject);
    }
    saveCache('subjects', localSubjects);

    // 2. Persist in localStorage fy_subject_overrides & fy_custom_subjects
    try {
      const custom = JSON.parse(localStorage.getItem('fy_custom_subjects') || '[]');
      const idx = custom.findIndex((s) => s.id === subjectId);
      if (idx >= 0) custom[idx] = fullSubject;
      else custom.push(fullSubject);
      localStorage.setItem('fy_custom_subjects', JSON.stringify(custom));
    } catch (e) {}

    try {
      const overrides = JSON.parse(localStorage.getItem('fy_subject_overrides') || '{}');
      overrides[subjectId] = {
        id: subjectId,
        name: fullSubject.name,
        stream: fullSubject.stream,
        semester: fullSubject.semester,
        subject_code: fullSubject.subject_code,
        teacher_name: fullSubject.teacher_name,
        description: fullSubject.description,
        is_active: fullSubject.is_active,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('fy_subject_overrides', JSON.stringify(overrides));
    } catch (e) {}

    // 3. Insert into Supabase if configured with clean base schema columns
    if (isSupabaseConfigured()) {
      try {
        const supabasePayload = {
          id: fullSubject.id,
          name: fullSubject.name,
          subject_code: fullSubject.subject_code,
          description: fullSubject.description,
          teacher_name: fullSubject.teacher_name,
          is_active: fullSubject.is_active,
          created_at: fullSubject.created_at,
          updated_at: fullSubject.updated_at,
        };

        const { data, error } = await supabase
          .from('subjects')
          .insert([supabasePayload])
          .select()
          .single();

        if (!error && data) {
          const merged = { ...fullSubject, ...data, stream: fullSubject.stream, semester: fullSubject.semester };
          this.notifyLocalChange('SUBJECT_CREATED', merged);
          return merged;
        } else if (error) {
          console.warn('Supabase createSubject warning:', error.message);
        }
      } catch (err) {
        console.error('Supabase createSubject error:', err);
      }
    }

    this.notifyLocalChange('SUBJECT_CREATED', fullSubject);
    return fullSubject;
  },

  async updateSubject(id, updates) {
    const { topics, ...cleanUpdates } = updates;
    if (cleanUpdates.subject_code && !cleanUpdates.stream) {
      cleanUpdates.stream = cleanUpdates.subject_code.toUpperCase().startsWith('DS') ? 'DS' :
                            cleanUpdates.subject_code.toUpperCase().startsWith('IT') ? 'IT' : 'Both';
    }

    // Persist in overrides
    try {
      const overrides = JSON.parse(localStorage.getItem('fy_subject_overrides') || '{}');
      overrides[id] = {
        ...(overrides[id] || {}),
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('fy_subject_overrides', JSON.stringify(overrides));
    } catch (e) {}

    localSubjects = localSubjects.map((s) => (s.id === id ? { ...s, ...updates, ...cleanUpdates } : s));
    saveCache('subjects', localSubjects);

    if (isSupabaseConfigured()) {
      try {
        const { stream, semester, ...baseUpdates } = cleanUpdates;
        const { data, error } = await supabase
          .from('subjects')
          .update(baseUpdates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const merged = { ...updates, ...cleanUpdates, ...data };
          this.notifyLocalChange('SUBJECT_UPDATED', merged);
          return merged;
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

    // Record tombstone so deleted subject never resurrects
    try {
      const deletedSubs = JSON.parse(localStorage.getItem('fy_deleted_subject_ids') || '[]');
      const set = new Set(deletedSubs.map((x) => String(x).toLowerCase()));
      if (id) set.add(String(id).toLowerCase());
      localStorage.setItem('fy_deleted_subject_ids', JSON.stringify([...set]));
    } catch (e) {}

    // Clear from overrides and custom subjects
    try {
      const custom = JSON.parse(localStorage.getItem('fy_custom_subjects') || '[]');
      localStorage.setItem('fy_custom_subjects', JSON.stringify(custom.filter((s) => s.id !== id)));
    } catch (e) {}

    try {
      const overrides = JSON.parse(localStorage.getItem('fy_subject_overrides') || '{}');
      if (overrides[id]) {
        delete overrides[id];
        localStorage.setItem('fy_subject_overrides', JSON.stringify(overrides));
      }
    } catch (e) {}

    localSubjects = localSubjects.filter((s) => s.id !== id);
    saveCache('subjects', localSubjects);
    localTopics = localTopics.filter((t) => t.subject_id !== id);
    saveCache('topics', localTopics);
    localTasks = localTasks.filter((t) => t.subject_id !== id);
    saveCache('tasks', localTasks);
    this.notifyLocalChange('SUBJECT_DELETED', { id });
    return true;
  },

  async getTopicsBySubject(subjectId) {
    if (isSupabaseConfigured()) {
      try {
        const queryPromise = supabase
          .from('topics')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: true });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Topics query timeout')), 2000)
        );
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        if (!error && Array.isArray(data) && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getTopicsBySubject notice:', err.message);
      }
    }
    const memTopics = (localTopics || []).filter((t) => t.subject_id === subjectId);
    if (memTopics.length > 0) return memTopics;

    // Check embedded topics in local subjects
    const sub = (localSubjects || []).find((s) => s.id === subjectId);
    if (sub && Array.isArray(sub.topics) && sub.topics.length > 0) {
      return sub.topics;
    }
    return [];
  },

  async createTopic(topicData) {
    // Check if topic with same name already exists for this subject
    const existing = await this.getTopicsBySubject(topicData.subject_id);
    const isDup = (existing || []).some(
      (t) => (t.name || '').trim().toLowerCase() === (topicData.name || '').trim().toLowerCase()
    );
    if (isDup) {
      throw new Error(`Topic "${topicData.name}" already exists for this subject.`);
    }

    const topicId = (topicData.id && isValidUUID(topicData.id)) ? topicData.id : generateUUID();
    const newTopic = {
      ...topicData,
      id: topicId,
      created_at: new Date().toISOString(),
    };
    localTopics.push(newTopic);
    saveCache('topics', localTopics);

    // Sync topics inside localSubjects
    const subIdx = localSubjects.findIndex((s) => s.id === topicData.subject_id);
    if (subIdx !== -1) {
      if (!Array.isArray(localSubjects[subIdx].topics)) {
        localSubjects[subIdx].topics = [];
      }
      if (!localSubjects[subIdx].topics.some((t) => t.id === newTopic.id)) {
        localSubjects[subIdx].topics.push(newTopic);
      }
      saveCache('subjects', localSubjects);
    }

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

  async updateTopic(id, updates) {
    const existing = (localTopics || []).find((t) => t.id === id);
    const merged = { ...(existing || {}), ...updates, id, updated_at: new Date().toISOString() };

    localTopics = (localTopics || []).map((t) => (t.id === id ? merged : t));
    saveCache('topics', localTopics);

    localSubjects = (localSubjects || []).map((s) => {
      if (Array.isArray(s.topics)) {
        return {
          ...s,
          topics: s.topics.map((t) => (t.id === id ? merged : t)),
        };
      }
      return s;
    });
    saveCache('subjects', localSubjects);

    try {
      const overrides = JSON.parse(localStorage.getItem('fy_topic_overrides') || '{}');
      overrides[id] = { ...(overrides[id] || {}), ...updates };
      localStorage.setItem('fy_topic_overrides', JSON.stringify(overrides));
    } catch (e) {}

    if (isSupabaseConfigured()) {
      try {
        const payload = {
          name: updates.name,
          description: updates.description,
        };
        const { error } = await supabase.from('topics').update(payload).eq('id', id);
        if (error) console.warn('Supabase updateTopic notice:', error.message);
      } catch (err) {
        console.warn('Supabase updateTopic error:', err);
      }
    }

    this.notifyLocalChange('TOPIC_UPDATED', merged);
    return merged;
  },

  async renameUnit(subjectId, oldUnitName, newUnitName) {
    if (!subjectId || !oldUnitName || !newUnitName) return false;
    const cleanOld = oldUnitName.trim();
    const cleanNew = newUnitName.trim();
    if (cleanOld === cleanNew) return true;

    localTopics = (localTopics || []).map((t) => {
      if (t.subject_id === subjectId && (t.unit_name || 'Unit 1: General Topics').trim() === cleanOld) {
        return { ...t, unit_name: cleanNew };
      }
      return t;
    });
    saveCache('topics', localTopics);

    localSubjects = (localSubjects || []).map((s) => {
      if (s.id === subjectId && Array.isArray(s.topics)) {
        return {
          ...s,
          topics: s.topics.map((t) => {
            if ((t.unit_name || 'Unit 1: General Topics').trim() === cleanOld) {
              return { ...t, unit_name: cleanNew };
            }
            return t;
          }),
        };
      }
      return s;
    });
    saveCache('subjects', localSubjects);

    try {
      const topicOverrides = JSON.parse(localStorage.getItem('fy_topic_overrides') || '{}');
      (localTopics || []).forEach((t) => {
        if (t.subject_id === subjectId && (t.unit_name || '').trim() === cleanNew) {
          topicOverrides[t.id] = { ...(topicOverrides[t.id] || {}), unit_name: cleanNew };
        }
      });
      localStorage.setItem('fy_topic_overrides', JSON.stringify(topicOverrides));
    } catch (e) {}

    this.notifyLocalChange('UNIT_RENAMED', { subjectId, oldUnitName: cleanOld, newUnitName: cleanNew });
    return true;
  },

  async deleteTopic(id) {
    localTopics = localTopics.filter((t) => t.id !== id);
    saveCache('topics', localTopics);
    localSubjects = localSubjects.map((s) => {
      if (Array.isArray(s.topics)) {
        return { ...s, topics: s.topics.filter((t) => t.id !== id) };
      }
      return s;
    });
    saveCache('subjects', localSubjects);
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
          const subjects = this.getCachedSubjects();
          const merged = data.map((t) => {
            const ov = overrides[t.id];
            const sub = t.subjects || subjects.find((s) => s.id === t.subject_id) || localSubjects.find((s) => s.id === t.subject_id);
            const top = t.topics || localTopics.find((tp) => tp.id === t.topic_id);
            const taskItem = {
              ...t,
              subjects: sub ? (sub.name ? sub : { name: sub.name, subject_code: sub.subject_code }) : null,
              topics: top ? (top.name ? top : { name: top.name }) : null,
            };
            if (ov) {
              return {
                ...taskItem,
                ...ov,
                publication_status: ov.publication_status !== undefined ? ov.publication_status : taskItem.publication_status,
                scheduled_at: ov.scheduled_at !== undefined ? ov.scheduled_at : taskItem.scheduled_at,
              };
            }
            return taskItem;
          });
          localTasks = merged;
          saveCache('tasks', merged);
          return this.checkAndAutoPublishScheduledTasks(merged);
        }
      } catch (err) {
        console.warn('Supabase getTasks notice:', err);
      }
    }
    const subjects = this.getCachedSubjects();
    const localResult = localTasks.map((t) => {
      const sub = t.subjects || subjects.find((s) => s.id === t.subject_id) || localSubjects.find((s) => s.id === t.subject_id);
      const top = t.topics || localTopics.find((tp) => tp.id === t.topic_id);
      const ov = overrides[t.id];
      return {
        ...t,
        ...(ov || {}),
        subjects: sub ? (sub.name ? sub : { name: sub.name, subject_code: sub.subject_code }) : null,
        topics: top ? (top.name ? top : { name: top.name }) : null,
      };
    });
    return this.checkAndAutoPublishScheduledTasks(localResult);
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

    // Persist in overrides immediately so Scheduled status is never overwritten by DB polling
    try {
      const overrides = JSON.parse(localStorage.getItem('fy_task_overrides') || '{}');
      overrides[newTask.id] = {
        publication_status: taskData.publication_status || 'Published',
        scheduled_at: taskData.scheduled_at || null,
      };
      localStorage.setItem('fy_task_overrides', JSON.stringify(overrides));
    } catch (e) {}

    localTasks.unshift(newTask);
    saveCache('tasks', localTasks);

    if (newTask.publication_status === 'Published') {
      const sub = (localSubjects || []).find((s) => s.id === newTask.subject_id);
      const subStream = sub?.stream || (sub?.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT');
      const subSem = sub?.semester || 'Sem 1';

      const studentsToAssign =
        newTask.assignment_target === 'all' || !targetStudentIds.length
          ? localStudents.filter((s) => {
              if (!s.is_active) return false;
              const sStream = s.stream || (s.class_name?.toUpperCase().includes('DS') ? 'DS' : 'IT');
              const sSem = s.semester || 'Sem 1';
              const matchStream = subStream === 'Both' || sStream === subStream;
              const matchSem = subSem === 'ALL' || sSem === subSem;
              return matchStream && matchSem;
            })
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
        // Delete related assignments and submissions first to satisfy FK constraints
        const { data: asgs } = await supabase.from('task_assignments').select('id').eq('task_id', id);
        if (asgs && asgs.length > 0) {
          const asgIds = asgs.map((a) => a.id);
          const { data: subs } = await supabase.from('submissions').select('id').in('task_assignment_id', asgIds);
          if (subs && subs.length > 0) {
            const subIds = subs.map((s) => s.id);
            await supabase.from('submission_files').delete().in('submission_id', subIds);
            await supabase.from('submissions').delete().in('id', subIds);
          }
          await supabase.from('task_assignments').delete().eq('task_id', id);
        }
        await supabase.from('tasks').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteTask notice:', err);
      }
    }

    localTasks = localTasks.filter((t) => t.id !== id);
    saveCache('tasks', localTasks);

    localAssignments = localAssignments.filter((a) => a.task_id !== id);
    saveCache('assignments', localAssignments);

    try {
      const overrides = JSON.parse(localStorage.getItem('fy_task_overrides') || '{}');
      if (overrides[id]) {
        delete overrides[id];
        localStorage.setItem('fy_task_overrides', JSON.stringify(overrides));
      }
    } catch (e) {}

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
  async getSubmissions() {
    return this.getAllSubmissions();
  },

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
    let studentOverrides = {};
    try {
      studentOverrides = JSON.parse(localStorage.getItem('fy_student_overrides') || '{}');
    } catch (e) {}

    let deletedIds = new Set();
    try {
      const raw = JSON.parse(localStorage.getItem('fy_deleted_student_ids') || '[]');
      deletedIds = new Set(raw.map((x) => String(x).toLowerCase()));
    } catch (e) {}

    const isStudentDeleted = (st) => {
      if (!st) return true;
      if (st.id && deletedIds.has(String(st.id).toLowerCase())) return true;
      if (st.roll_number && deletedIds.has(String(st.roll_number).toLowerCase())) return true;
      return false;
    };

    const mapStudent = (st) => {
      const ov = studentOverrides[st.id] || {};
      const rawClass = ov.class_name || st.class_name || 'FY M.Sc. IT';
      const isDS = ov.stream === 'DS' || rawClass.toUpperCase().includes('DS');
      const stream = isDS ? 'DS' : 'IT';
      const className = isDS ? 'FY B.Sc. DS' : (rawClass.toUpperCase().includes('IT') ? 'FY M.Sc. IT' : rawClass);
      const semester = ov.semester || st.semester || 'Sem 1';

      return {
        ...st,
        ...ov,
        stream,
        class_name: className,
        semester,
        task_assignments: (localAssignments || []).filter((a) => a.student_id === st.id),
      };
    };

    if (isSupabaseConfigured()) {
      try {
        // Query dedicated students table directly from Supabase with guard timeout
        const queryPromise = supabase
          .from('students')
          .select('*')
          .order('roll_number', { ascending: true });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase getStudents timeout (2s)')), 2000)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (!error && Array.isArray(data)) {
          const nonDeleted = data.filter((s) => !isStudentDeleted(s));
          const mapped = nonDeleted.map(mapStudent);
          localStudents = mapped;
          saveCache('students', mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase getStudents notice (falling back to local cache):', err.message);
      }
    }

    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    const nonDeletedLocal = localRegistered.filter((s) => !isStudentDeleted(s));
    const mappedLocal = nonDeletedLocal.map(mapStudent);
    localStudents = mappedLocal;
    saveCache('students', mappedLocal);
    return mappedLocal;
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
    const rawClass = updates.class_name || '';
    const isDS = updates.stream === 'DS' || rawClass.toUpperCase().includes('DS');
    const stream = isDS ? 'DS' : 'IT';
    const className = updates.class_name || (isDS ? 'FY B.Sc. DS' : 'FY M.Sc. IT');
    const semester = updates.semester || 'Sem 1';

    const normalizedUpdates = {
      ...updates,
      stream,
      class_name: className,
      semester,
    };

    // 1. Update in local memory
    localStudents = localStudents.map((s) =>
      s.id === studentId ? { ...s, ...normalizedUpdates } : s
    );

    // 2. Persist in fy_student_overrides
    try {
      const overrides = JSON.parse(localStorage.getItem('fy_student_overrides') || '{}');
      overrides[studentId] = {
        ...(overrides[studentId] || {}),
        ...normalizedUpdates,
      };
      localStorage.setItem('fy_student_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Error saving fy_student_overrides:', e);
    }

    // 3. Update persistent fy_registered_students in localStorage
    try {
      const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
      const index = localRegistered.findIndex((s) => s.id === studentId);
      if (index !== -1) {
        localRegistered[index] = { ...localRegistered[index], ...normalizedUpdates };
      } else {
        const match = localStudents.find((s) => s.id === studentId);
        if (match) localRegistered.push({ ...match, ...normalizedUpdates });
      }
      localStorage.setItem('fy_registered_students', JSON.stringify(localRegistered));
    } catch (e) {
      console.warn('Error updating local registered students:', e);
    }

    // 4. Update cache
    const cachedStudents = getCache('students');
    if (cachedStudents && Array.isArray(cachedStudents)) {
      saveCache(
        'students',
        cachedStudents.map((s) => (s.id === studentId ? { ...s, ...normalizedUpdates } : s))
      );
    }

    // 5. Update active student session if the logged-in student is this student
    try {
      const sessionRaw = localStorage.getItem('fy_it_student_session');
      if (sessionRaw) {
        const sess = JSON.parse(sessionRaw);
        if (sess.id === studentId) {
          const updatedSess = { ...sess, ...normalizedUpdates };
          localStorage.setItem('fy_it_student_session', JSON.stringify(updatedSess));
          sessionStorage.setItem('fy_it_student_session', JSON.stringify(updatedSess));
        }
      }
    } catch (e) {}

    // 6. Update Supabase if configured (ONLY columns that exist in public.students table!)
    let updatedStudent = null;
    if (isSupabaseConfigured()) {
      try {
        const payload = {};
        if (normalizedUpdates.full_name !== undefined) payload.full_name = normalizedUpdates.full_name;
        if (normalizedUpdates.roll_number !== undefined) payload.roll_number = normalizedUpdates.roll_number;
        if (normalizedUpdates.mobile_number !== undefined) payload.mobile_number = normalizedUpdates.mobile_number;
        if (normalizedUpdates.email !== undefined) payload.email = normalizedUpdates.email;
        if (normalizedUpdates.class_name !== undefined) payload.class_name = normalizedUpdates.class_name;
        // NOTE: semester and stream MUST NOT be sent to Supabase as they do not exist in the students schema
        if (normalizedUpdates.division !== undefined) payload.division = normalizedUpdates.division;
        if (normalizedUpdates.password !== undefined) payload.password = normalizedUpdates.password;
        if (normalizedUpdates.is_active !== undefined) payload.is_active = normalizedUpdates.is_active;
        payload.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', studentId)
          .select()
          .single();

        if (!error && data) {
          updatedStudent = { ...data, ...normalizedUpdates };
        } else if (error) {
          console.warn('Supabase updateStudent error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase updateStudent exception:', err);
      }
    }

    const res =
      updatedStudent || localStudents.find((s) => s.id === studentId) || { id: studentId, ...normalizedUpdates };
    this.notifyLocalChange('STUDENT_UPDATED', res);
    return res;
  },

  async addStudent(studentData) {
    const rawClass = studentData.class_name || '';
    const isDS = studentData.stream === 'DS' || rawClass.toUpperCase().includes('DS');
    const stream = isDS ? 'DS' : 'IT';
    const className = isDS ? 'FY B.Sc. DS' : 'FY M.Sc. IT';
    const semester = studentData.semester || 'Sem 1';

    const newStudent = {
      ...studentData,
      stream,
      class_name: className,
      semester,
      id: 'student-' + Date.now(),
      role: 'student',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    localStudents.push(newStudent);

    // Ensure re-registered or newly added student is not marked as deleted
    try {
      const deletedList = JSON.parse(localStorage.getItem('fy_deleted_student_ids') || '[]');
      const filtered = deletedList.filter(
        (x) => x.toLowerCase() !== newStudent.id.toLowerCase() && x.toLowerCase() !== newStudent.roll_number?.toLowerCase()
      );
      localStorage.setItem('fy_deleted_student_ids', JSON.stringify(filtered));
    } catch (e) {}

    try {
      const overrides = JSON.parse(localStorage.getItem('fy_student_overrides') || '{}');
      overrides[newStudent.id] = { stream, class_name: className, semester };
      localStorage.setItem('fy_student_overrides', JSON.stringify(overrides));
    } catch (e) {}

    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    localRegistered.push(newStudent);
    localStorage.setItem('fy_registered_students', JSON.stringify(localRegistered));
    saveCache('students', localStudents);

    if (isSupabaseConfigured()) {
      try {
        // Direct insert into dedicated public.students table
        const { data, error } = await supabase.from('students').insert([{
          id: newStudent.id,
          full_name: newStudent.full_name,
          roll_number: newStudent.roll_number,
          mobile_number: newStudent.mobile_number || '',
          email: newStudent.email || '',
          class_name: newStudent.class_name,
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

  async deleteStudent(studentId, rollNumber = null) {
    if (!studentId && !rollNumber) return false;

    // 1. Maintain persistent tombstone list so deleted student NEVER resurrects on poll
    try {
      const deletedList = JSON.parse(localStorage.getItem('fy_deleted_student_ids') || '[]');
      const set = new Set(deletedList.map((x) => String(x).toLowerCase()));
      if (studentId) set.add(String(studentId).toLowerCase());
      if (rollNumber) set.add(String(rollNumber).toLowerCase());
      localStorage.setItem('fy_deleted_student_ids', JSON.stringify([...set]));
    } catch (e) {}

    // 2. Remove immediately from local memory
    localStudents = (localStudents || []).filter(
      (s) => s.id !== studentId && (!rollNumber || s.roll_number?.toLowerCase() !== rollNumber?.toLowerCase())
    );
    saveCache('students', localStudents);

    // 3. Remove immediately from localStorage fy_registered_students
    try {
      const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
      const updated = localRegistered.filter(
        (s) => s.id !== studentId && (!rollNumber || s.roll_number?.toLowerCase() !== rollNumber?.toLowerCase())
      );
      localStorage.setItem('fy_registered_students', JSON.stringify(updated));
    } catch (e) {}

    // 4. Remove from overrides
    try {
      const overrides = JSON.parse(localStorage.getItem('fy_student_overrides') || '{}');
      if (studentId && overrides[studentId]) delete overrides[studentId];
      if (rollNumber && overrides[rollNumber]) delete overrides[rollNumber];
      localStorage.setItem('fy_student_overrides', JSON.stringify(overrides));
    } catch (e) {}

    // 5. Clean up active student session if this student was logged in
    try {
      const sess = JSON.parse(localStorage.getItem('fy_it_student_session') || '{}');
      if (sess.id === studentId || (rollNumber && sess.roll_number?.toLowerCase() === rollNumber?.toLowerCase())) {
        localStorage.removeItem('fy_it_student_session');
        sessionStorage.removeItem('fy_it_student_session');
      }
    } catch (e) {}

    // 6. Notify event bus immediately for 0ms reactive UI update
    this.notifyLocalChange('STUDENT_DELETED', { id: studentId, roll_number: rollNumber });

    // 7. Background cascade delete from Supabase (runs asynchronously without blocking UI)
    if (isSupabaseConfigured()) {
      (async () => {
        try {
          if (studentId) {
            await supabase.from('task_assignments').delete().eq('student_id', studentId);
            await supabase.from('submissions').delete().eq('student_id', studentId);
            await supabase.from('notifications').delete().eq('user_id', studentId);
            await supabase.from('students').delete().eq('id', studentId);
            await supabase.from('profiles').delete().eq('id', studentId);
          }
          if (rollNumber) {
            await supabase.from('students').delete().eq('roll_number', rollNumber);
            await supabase.from('profiles').delete().eq('roll_number', rollNumber);
          }
        } catch (err) {
          console.warn('Background Supabase deleteStudent notice:', err?.message);
        }
      })();
    }

    return true;
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
    try {
      const stored = localStorage.getItem('fy_student_todos');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localTodos = parsed;
        }
      }
    } catch (e) {}

    let list = localTodos.filter((t) => t.user_id === userId);

    if (isSupabaseConfigured() && isValidUUID(userId)) {
      try {
        const { data, error } = await supabase
          .from('student_todos')
          .select('*, subjects(id, name, subject_code)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const remoteMap = new Map(data.map((item) => [item.id, item]));
          list.forEach((lt) => {
            if (!remoteMap.has(lt.id)) remoteMap.set(lt.id, lt);
          });
          const combined = Array.from(remoteMap.values()).map((t) => ({
            ...t,
            subjects: t.subjects || localSubjects.find((s) => s.id === t.subject_id) || null,
          }));
          saveCache('todos_' + userId, combined);
          return combined;
        }
      } catch (err) {
        console.warn('Supabase getTodos notice:', err);
      }
    }

    const mapped = list
      .map((t) => ({
        ...t,
        subjects: localSubjects.find((s) => s.id === t.subject_id) || null,
      }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    saveCache('todos_' + userId, mapped);
    return mapped;
  },

  async createTodo(todoData) {
    let created = null;
    if (isSupabaseConfigured() && isValidUUID(todoData.user_id)) {
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
        id: 'todo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        status: todoData.status || 'pending',
        subtasks: (todoData.subtasks || []).map((st) => ({
          ...st,
          id: st.id || 'st-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          completed: !!st.completed,
          completed_at: st.completed ? (st.completed_at || new Date().toISOString()) : null,
        })),
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

    saveCache('todos', localTodos);
    if (todoData.user_id) {
      saveCache('todos_' + todoData.user_id, localTodos.filter((t) => t.user_id === todoData.user_id));
    }
    try {
      localStorage.setItem('fy_student_todos', JSON.stringify(localTodos));
    } catch (e) {}

    this.notifyLocalChange('TODO_CREATED', created);
    return created;
  },

  async updateTodo(id, updates) {
    let updated = null;
    if (isSupabaseConfigured() && isValidUUID(id)) {
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

    saveCache('todos', localTodos);
    if (localUpdated?.user_id) {
      saveCache('todos_' + localUpdated.user_id, localTodos.filter((t) => t.user_id === localUpdated.user_id));
    }
    try {
      localStorage.setItem('fy_student_todos', JSON.stringify(localTodos));
    } catch (e) {}

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

    const nowIso = new Date().toISOString();
    const updatedSubtasks = (todo.subtasks || []).map((st) => {
      if (st.id === subtaskId) {
        const nextCompleted = !st.completed;
        return {
          ...st,
          completed: nextCompleted,
          completed_at: nextCompleted ? (st.completed_at || nowIso) : null,
        };
      }
      return st;
    });

    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);
    const anyPending = updatedSubtasks.some((st) => !st.completed);

    const updates = {
      subtasks: updatedSubtasks,
    };

    if (allCompleted) {
      updates.status = 'completed';
      updates.completed_at = nowIso;
    } else if (anyPending && todo.status === 'completed') {
      updates.status = 'in_progress';
      updates.completed_at = null;
    }

    return this.updateTodo(todoId, updates);
  },

  async addSubtask(todoId, text) {
    const todo = localTodos.find((t) => t.id === todoId);
    if (!todo) return null;

    const newSubtask = {
      id: 'st-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      text: text.trim(),
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
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
    if (isSupabaseConfigured() && isValidUUID(id)) {
      try {
        const { error } = await supabase.from('student_todos').delete().eq('id', id);
        if (error) console.warn('Supabase todo delete notice:', error.message);
      } catch (err) {
        console.warn('Fallback to local todo delete:', err.message);
      }
    }
    localTodos = localTodos.filter((t) => t.id !== id);
    saveCache('todos', localTodos);
    try {
      localStorage.setItem('fy_student_todos', JSON.stringify(localTodos));
    } catch (e) {}
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

    // Ping all listeners and tabs instantly
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('fy_data_change', { detail: { type, detail } }));
        localStorage.setItem('fy_it_live_sync_ping', Date.now().toString());
      } catch (e) {}
    }
  },
};

// Start persistent live auto-publish runner for scheduled tasks (runs every 1 second)
if (typeof window !== 'undefined' && !window.__fy_scheduled_task_runner) {
  window.__fy_scheduled_task_runner = setInterval(() => {
    try {
      dataService.checkAndAutoPublishScheduledTasks();
    } catch (e) {}
  }, 1000);
}
