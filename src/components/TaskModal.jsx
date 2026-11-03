import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle, Calendar, Clock, BookOpen, Layers } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';
import { parseSubtopicsHierarchy, flattenDescendants } from '../utils/syllabusUtils';

// Helper to format Date into datetime-local value using LOCAL system time (preventing UTC offset shift)
const formatToLocalDateTimeInput = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const TaskModal = ({ taskToEdit = null, subjects = [], onClose, onSuccess }) => {
  const { addToast } = useToast();

  // 1. STREAM SELECTION (Asked First)
  const determineInitialStream = () => {
    if (taskToEdit?.stream) return taskToEdit.stream;
    if (taskToEdit?.subject_id) {
      const s = (subjects || []).find((sub) => sub.id === taskToEdit.subject_id);
      if (s) {
        return s.stream || (s.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT');
      }
    }
    return 'IT';
  };
  const [selectedStream, setSelectedStream] = useState(determineInitialStream);

  // Filter subjects based on selected stream
  const filteredSubjects = useMemo(() => {
    return (subjects || []).filter((sub) => {
      if (selectedStream === 'ALL') return true;
      const st = sub.stream || (sub.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT');
      return st === selectedStream || sub.stream === 'Both';
    });
  }, [subjects, selectedStream]);

  // 2. SUBJECT SELECTION
  const determineInitialSubjectId = () => {
    if (taskToEdit?.subject_id) return taskToEdit.subject_id;
    if (filteredSubjects.length > 0) return filteredSubjects[0].id;
    return subjects[0]?.id || '';
  };
  const [subjectId, setSubjectId] = useState(determineInitialSubjectId);

  // 3. UNIT & TOPIC STATES
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(taskToEdit?.unit_name || '');
  const [topicId, setTopicId] = useState(taskToEdit?.topic_id || '');

  // 4. SUBTOPIC STATES
  const [selectedSubtopic, setSelectedSubtopic] = useState(taskToEdit?.subtopic || '');
  const [selectedChildSubtopic, setSelectedChildSubtopic] = useState('');
  const [customSubtopic, setCustomSubtopic] = useState(taskToEdit?.subtopic || '');

  // 5. TASK TITLE (Right after Subtopic)
  const [title, setTitle] = useState(taskToEdit?.title || '');

  // Hidden Priority (Removed from UI, preserved for backend schema compatibility)
  const priority = taskToEdit?.priority || 'Medium';

  // Task Details
  const [taskType, setTaskType] = useState(taskToEdit?.task_type || 'Assignment');
  const [description, setDescription] = useState(taskToEdit?.description || '');

  // Format initial due date for datetime-local input using exact local time
  const getFormattedDueDate = () => {
    if (taskToEdit?.due_at) {
      return formatToLocalDateTimeInput(taskToEdit.due_at);
    }
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 0, 0);
    return formatToLocalDateTimeInput(d);
  };
  const [dueAt, setDueAt] = useState(getFormattedDueDate());
  const [maxMarks, setMaxMarks] = useState(taskToEdit?.max_marks || '');

  const [publicationStatus, setPublicationStatus] = useState(
    taskToEdit?.publication_status || 'Published'
  );

  const getFormattedScheduledDate = () => {
    if (taskToEdit?.scheduled_at) {
      return formatToLocalDateTimeInput(taskToEdit.scheduled_at);
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return formatToLocalDateTimeInput(d);
  };
  const [scheduledAt, setScheduledAt] = useState(getFormattedScheduledDate());

  const [assignmentTarget, setAssignmentTarget] = useState(
    taskToEdit?.assignment_target || 'all'
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Stream Change: Keep subject if valid, else pick first available in stream
  const handleStreamChange = (newStream) => {
    setSelectedStream(newStream);
    const nextSubjects = (subjects || []).filter((sub) => {
      if (newStream === 'ALL') return true;
      const st = sub.stream || (sub.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT');
      return st === newStream || sub.stream === 'Both';
    });
    if (nextSubjects.length > 0 && !nextSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(nextSubjects[0].id);
    } else if (nextSubjects.length === 0) {
      setSubjectId('');
    }
  };

  // Load topics dynamically when subject changes
  useEffect(() => {
    if (!subjectId) {
      setAvailableTopics([]);
      setSelectedUnit('');
      setTopicId('');
      setSelectedSubtopic('');
      setCustomSubtopic('');
      return;
    }

    let isCurrent = true;
    const loadTopics = async () => {
      try {
        const topics = await dataService.getTopicsBySubject(subjectId);
        if (!isCurrent) return;

        setAvailableTopics(topics || []);

        // Derive unique units
        const units = [];
        (topics || []).forEach((t) => {
          const u = (t.unit_name || 'Unit 1: General Topics').trim();
          if (u && !units.includes(u)) {
            units.push(u);
          }
        });

        // Determine which unit should be selected
        let unitToSelect = '';
        if (taskToEdit && taskToEdit.subject_id === subjectId && taskToEdit.unit_name) {
          unitToSelect = taskToEdit.unit_name;
        } else if (taskToEdit && taskToEdit.subject_id === subjectId && taskToEdit.topic_id) {
          const matchingTop = (topics || []).find((t) => t.id === taskToEdit.topic_id);
          unitToSelect = matchingTop?.unit_name || units[0] || 'Unit 1: General Topics';
        } else {
          unitToSelect = units[0] || (topics.length > 0 ? 'Unit 1: General Topics' : '');
        }
        setSelectedUnit(unitToSelect);

        // Filter topics under the chosen unit
        const topicsInUnit = (topics || []).filter(
          (t) => (t.unit_name || 'Unit 1: General Topics').trim() === unitToSelect
        );

        if (taskToEdit && taskToEdit.subject_id === subjectId && taskToEdit.topic_id) {
          setTopicId(taskToEdit.topic_id);
        } else if (topicsInUnit.length > 0) {
          setTopicId(topicsInUnit[0].id);
        } else if (topics && topics.length > 0) {
          setTopicId(topics[0].id);
        } else {
          setTopicId('');
        }

        // Subtopic selection initialization
        if (taskToEdit && taskToEdit.subject_id === subjectId && taskToEdit.subtopic) {
          setSelectedSubtopic(taskToEdit.subtopic);
          setCustomSubtopic(taskToEdit.subtopic);
        }
      } catch (err) {
        console.error('Error loading topics:', err);
      }
    };

    loadTopics();
    return () => {
      isCurrent = false;
    };
  }, [subjectId]);

  // Extract unique units from loaded topics
  const availableUnits = useMemo(() => {
    const units = [];
    (availableTopics || []).forEach((t) => {
      const u = (t.unit_name || 'Unit 1: General Topics').trim();
      if (u && !units.includes(u)) {
        units.push(u);
      }
    });
    return units;
  }, [availableTopics]);

  // Filter topics strictly under the selected unit
  const unitTopics = useMemo(() => {
    if (!selectedUnit) return availableTopics;
    return availableTopics.filter(
      (t) => (t.unit_name || 'Unit 1: General Topics').trim() === selectedUnit
    );
  }, [availableTopics, selectedUnit]);

  // Active topic object
  const activeTopic = useMemo(() => {
    return availableTopics.find((t) => t.id === topicId);
  }, [availableTopics, topicId]);

  // Parse subtopics & nested sub-subtopics from active topic
  const parsedHierarchy = useMemo(() => {
    if (!activeTopic) return [];
    return parseSubtopicsHierarchy(activeTopic.subtopic, activeTopic.subtopics_data);
  }, [activeTopic]);

  const activeSubtopicObj = useMemo(() => {
    return parsedHierarchy.find((s) => s.title === selectedSubtopic);
  }, [parsedHierarchy, selectedSubtopic]);

  const flattenedChildOptions = useMemo(() => {
    if (!activeSubtopicObj || !Array.isArray(activeSubtopicObj.items) || activeSubtopicObj.items.length === 0) {
      return [];
    }
    return flattenDescendants(activeSubtopicObj.items);
  }, [activeSubtopicObj]);

  // Handle unit change
  const handleUnitChange = (newUnit) => {
    setSelectedUnit(newUnit);
    const matchingTopics = availableTopics.filter(
      (t) => (t.unit_name || 'Unit 1: General Topics').trim() === newUnit
    );
    if (matchingTopics.length > 0) {
      if (!matchingTopics.some((t) => t.id === topicId)) {
        setTopicId(matchingTopics[0].id);
        setSelectedSubtopic('');
        setCustomSubtopic('');
      }
    } else {
      setTopicId('');
      setSelectedSubtopic('');
      setCustomSubtopic('');
    }
  };

  // Handle topic change
  const handleTopicChange = (newTopicId) => {
    setTopicId(newTopicId);
    if (errorMsg) setErrorMsg('');
    setSelectedSubtopic('');
    setCustomSubtopic('');
  };

  // Load students for target selection
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const students = await dataService.getStudents();
        setStudentsList(students || []);
      } catch (err) {
        console.error('Error loading students:', err);
      }
    };
    loadStudents();
  }, []);

  const handleStudentToggle = (sId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  // Filter student list by selected stream
  const filteredStudents = useMemo(() => {
    return (studentsList || []).filter((st) => {
      if (selectedStream === 'ALL') return true;
      return st.stream === selectedStream || !st.stream;
    });
  }, [studentsList, selectedStream]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a task title.');
      return;
    }
    if (!subjectId) {
      setErrorMsg('Please select a subject.');
      return;
    }
    if (!topicId || !topicId.trim()) {
      setErrorMsg('Please select a topic. Topic is compulsory for every academic task.');
      return;
    }
    if (!dueAt) {
      setErrorMsg('Please select a due date.');
      return;
    }
    if (publicationStatus === 'Scheduled' && !scheduledAt) {
      setErrorMsg('Please select a scheduled release date and time.');
      return;
    }
    if (publicationStatus === 'Scheduled' && new Date(scheduledAt) >= new Date(dueAt)) {
      setErrorMsg('Scheduled release date & time must be earlier than the submission deadline.');
      return;
    }
    if (assignmentTarget === 'selected' && selectedStudentIds.length === 0) {
      setErrorMsg('Please select at least one student or choose "All Students".');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let finalSubtopic = null;
      if (selectedSubtopic === '__custom__' || parsedHierarchy.length === 0) {
        finalSubtopic = customSubtopic.trim() || null;
      } else if (selectedSubtopic) {
        if (selectedChildSubtopic && selectedChildSubtopic !== '__all__') {
          finalSubtopic = `${selectedSubtopic} › ${selectedChildSubtopic}`;
        } else {
          finalSubtopic = selectedSubtopic;
        }
      }

      const matchedTopic = (availableTopics || []).find((t) => t.id === topicId);
      const taskPayload = {
        title: title.trim(),
        description: description.trim(),
        subject_id: subjectId,
        topic_id: topicId || null,
        topic_name: matchedTopic?.title || matchedTopic?.name || null,
        task_type: taskType,
        priority: priority, // Maintained for database schema without showing in form
        due_at: new Date(dueAt).toISOString(),
        max_marks: maxMarks ? parseFloat(maxMarks) : null,
        publication_status: publicationStatus,
        scheduled_at: publicationStatus === 'Scheduled' ? new Date(scheduledAt).toISOString() : null,
        assignment_target: assignmentTarget,
        unit_name: selectedUnit || null,
        subtopic: finalSubtopic || null,
        stream: selectedStream || null,
      };

      let saved = null;
      if (taskToEdit) {
        saved = await dataService.updateTask(taskToEdit.id, taskPayload);
        addToast('Task updated successfully.', 'success');
      } else {
        saved = await dataService.createTask(taskPayload, selectedStudentIds);
        addToast(
          publicationStatus === 'Published'
            ? 'Task created and assigned to students!'
            : publicationStatus === 'Scheduled'
            ? `Task scheduled for release on ${new Date(scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}!`
            : 'Task saved as Draft.',
          'success'
        );
      }

      if (onSuccess) await onSuccess(saved);
      onClose();
    } catch (err) {
      console.error('Task save error:', err);
      setErrorMsg(err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {taskToEdit ? 'Edit Academic Task' : 'Create New Academic Task'}
          </h3>
          <button className="photo-remove-btn" onClick={onClose} style={{ position: 'static' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. ACADEMIC STREAM (Asked First) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Academic Stream</span>
                <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleStreamChange('IT')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedStream === 'IT' ? '2px solid #2563EB' : '1px solid var(--border-light)',
                    background: selectedStream === 'IT' ? '#EFF6FF' : 'var(--bg-surface)',
                    color: selectedStream === 'IT' ? '#1D4ED8' : 'var(--text-primary)',
                    fontWeight: selectedStream === 'IT' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  💻 M.Sc. IT
                </button>
                <button
                  type="button"
                  onClick={() => handleStreamChange('DS')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedStream === 'DS' ? '2px solid #7C3AED' : '1px solid var(--border-light)',
                    background: selectedStream === 'DS' ? '#FAF5FF' : 'var(--bg-surface)',
                    color: selectedStream === 'DS' ? '#6D28D9' : 'var(--text-primary)',
                    fontWeight: selectedStream === 'DS' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  📊 B.Sc. DS
                </button>
                <button
                  type="button"
                  onClick={() => handleStreamChange('ALL')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedStream === 'ALL' ? '2px solid var(--primary-600)' : '1px solid var(--border-light)',
                    background: selectedStream === 'ALL' ? 'var(--primary-50)' : 'var(--bg-surface)',
                    color: selectedStream === 'ALL' ? 'var(--primary-700)' : 'var(--text-primary)',
                    fontWeight: selectedStream === 'ALL' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🌐 Both Streams
                </button>
              </div>
            </div>

            {/* 2. SUBJECT SELECTION (Filtered by Stream) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Subject <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                className="form-control"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
              >
                <option value="">-- Select Subject ({filteredSubjects.length} available) --</option>
                {filteredSubjects.map((sub) => {
                  const st = sub.stream || (sub.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT');
                  return (
                    <option key={sub.id} value={sub.id}>
                      [{st}] {sub.name} ({sub.subject_code || st})
                    </option>
                  );
                })}
              </select>
              {filteredSubjects.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                  ⚠️ No subjects found for {selectedStream} stream. Please configure subjects in Manage Subjects.
                </span>
              )}
            </div>

            {/* 3. UNIT & 4. TOPIC SELECTION */}
            <div className="form-grid-2">
              {/* Unit Selection */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={15} color="var(--primary-600)" />
                  <span>Unit</span>
                  <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={selectedUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  required
                  disabled={availableUnits.length === 0}
                >
                  <option value="">
                    {availableUnits.length === 0 ? 'No Units Defined' : '-- Select Unit --'}
                  </option>
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Selection */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={15} color="var(--primary-600)" />
                  <span>Topic (Under Unit)</span>
                  <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={topicId}
                  onChange={(e) => handleTopicChange(e.target.value)}
                  required
                  disabled={unitTopics.length === 0}
                >
                  <option value="">
                    {unitTopics.length === 0 ? 'No Topics under this Unit' : '-- Select Topic --'}
                  </option>
                  {unitTopics.map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.name}
                    </option>
                  ))}
                </select>
                {availableTopics.length === 0 && subjectId && (
                  <span style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                    ⚠️ No topics found for this subject. Please add topics under Manage Subjects first.
                  </span>
                )}
              </div>
            </div>

            {/* 5. SUBTOPIC & NESTED CONCEPT SELECTION (Optional) */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                  Subtopic & Specific Concept (Optional)
                </label>
                {parsedHierarchy.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {parsedHierarchy.length} subtopic{parsedHierarchy.length > 1 ? 's' : ''} available in syllabus
                  </span>
                )}
              </div>

              {parsedHierarchy.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    className="form-control"
                    value={selectedSubtopic}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSubtopic(val);
                      setSelectedChildSubtopic('');
                      if (val !== '__custom__') {
                        setCustomSubtopic(val);
                      }
                    }}
                  >
                    <option value="">-- All Subtopics / Complete Topic --</option>
                    {parsedHierarchy.map((st, idx) => {
                      const childCount = Array.isArray(st.items) ? st.items.length : 0;
                      return (
                        <option key={idx} value={st.title}>
                          🔹 {st.title} {childCount > 0 ? `(${childCount} sub-concepts)` : ''}
                        </option>
                      );
                    })}
                    <option value="__custom__">✏️ Custom Subtopic (Type manually)...</option>
                  </select>

                  {/* Nested Sub-subtopic (Subtopic ka subtopic dropdown with arbitrary depth) */}
                  {flattenedChildOptions.length > 0 && (
                    <div style={{ paddingLeft: '14px', borderLeft: '3px solid #93C5FD', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1D4ED8', margin: 0 }}>
                        ↳ Specific Method / Concept under "{activeSubtopicObj?.title}":
                      </label>
                      <select
                        className="form-control"
                        value={selectedChildSubtopic}
                        onChange={(e) => setSelectedChildSubtopic(e.target.value)}
                        style={{ fontSize: '0.85rem', borderColor: '#93C5FD' }}
                      >
                        <option value="">-- All Concepts under {activeSubtopicObj?.title} --</option>
                        {flattenedChildOptions.map((opt, itIdx) => (
                          <option key={itIdx} value={opt.path}>
                            🎯 {opt.path}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedSubtopic === '__custom__' && (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type custom subtopic..."
                      value={customSubtopic}
                      onChange={(e) => setCustomSubtopic(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. for loop, while loop, do-while (Optional - type if applicable)"
                  value={customSubtopic}
                  onChange={(e) => {
                    setCustomSubtopic(e.target.value);
                    setSelectedSubtopic(e.target.value);
                  }}
                />
              )}
            </div>

            {/* 6. TASK TITLE (Directly after Subtopic) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Task Title <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Practical 4: Binary Search Trees Implementation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Task Type, Due Date & Time, Max Marks (Priority is REMOVED from form UI) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Task Type</label>
                <select
                  className="form-control"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                >
                  <option value="Assignment">Assignment</option>
                  <option value="Practical">Practical</option>
                  <option value="Notes">Notes</option>
                  <option value="Homework">Homework</option>
                  <option value="Project">Project</option>
                  <option value="Revision">Revision</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Due Date & Time *</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 2);
                        d.setHours(23, 59, 0, 0);
                        setDueAt(formatToLocalDateTimeInput(d));
                      }}
                    >
                      +2 Days
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        d.setHours(23, 59, 0, 0);
                        setDueAt(formatToLocalDateTimeInput(d));
                      }}
                    >
                      +1 Week
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  className="form-control"
                  style={{ marginTop: '6px' }}
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Max Marks (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="form-control"
                  placeholder="e.g. 20"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                />
              </div>
            </div>

            {/* Task Instructions & Description */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Task Instructions & Description</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Specify questions, requirements, code to write, or pages to photograph..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Assignment Target & Publication Status */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Target Students</label>
                <select
                  className="form-control"
                  value={assignmentTarget}
                  onChange={(e) => setAssignmentTarget(e.target.value)}
                >
                  <option value="all">
                    All Enrolled Students ({selectedStream === 'ALL' ? 'All Streams' : `${selectedStream} Stream`})
                  </option>
                  <option value="selected">Selected Students Only</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Publication & Schedule</label>
                <select
                  className="form-control"
                  value={publicationStatus}
                  onChange={(e) => setPublicationStatus(e.target.value)}
                >
                  <option value="Published">Published (Students see immediately)</option>
                  <option value="Scheduled">Scheduled (Set specific release date)</option>
                  <option value="Draft">Draft (Saved only for Admin)</option>
                </select>
              </div>
            </div>

            {/* Scheduled Date & Time Picker (Displayed when Scheduled is selected) */}
            {publicationStatus === 'Scheduled' && (
              <div
                style={{
                  background: '#EEF2FF',
                  border: '1.5px solid #818CF8',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar size={17} color="var(--primary-600)" />
                  <label
                    className="form-label"
                    style={{ color: 'var(--primary-700)', fontWeight: 700, margin: 0, fontSize: '0.875rem' }}
                  >
                    Specify Release Date & Time *
                  </label>
                </div>

                <input
                  type="datetime-local"
                  className="form-control"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  style={{
                    background: '#FFFFFF',
                    borderColor: '#6366F1',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                />

                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--primary-700)',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Clock size={13} style={{ flexShrink: 0 }} />
                  <span>
                    Students will automatically receive the notification and assignment on this exact date & time.
                  </span>
                </div>
              </div>
            )}

            {/* Selected Students Checkboxes (if target == selected) */}
            {assignmentTarget === 'selected' && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Select Students ({selectedStudentIds.length} chosen of {filteredStudents.length}):
                </label>
                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {filteredStudents.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No students enrolled in {selectedStream} stream.
                    </span>
                  ) : (
                    filteredStudents.map((st) => (
                      <label
                        key={st.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(st.id)}
                          onChange={() => handleStudentToggle(st.id)}
                        />
                        <span>
                          {st.full_name} ({st.roll_number || 'No Roll No'}) • Div {st.division} • [{st.stream || 'IT'}]
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{taskToEdit ? 'Update Task' : 'Publish / Save Task'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
