import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle, Calendar, Clock } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';

export const TaskModal = ({ taskToEdit = null, subjects = [], onClose, onSuccess }) => {
  const { addToast } = useToast();

  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [subjectId, setSubjectId] = useState(taskToEdit?.subject_id || (subjects[0]?.id || ''));
  const [topicId, setTopicId] = useState(taskToEdit?.topic_id || '');
  const [taskType, setTaskType] = useState(taskToEdit?.task_type || 'Assignment');
  const [priority, setPriority] = useState(taskToEdit?.priority || 'Medium');

  // Format initial due date for datetime-local input
  const getFormattedDueDate = () => {
    if (taskToEdit?.due_at) {
      const d = new Date(taskToEdit.due_at);
      return d.toISOString().slice(0, 16);
    }
    // Default 3 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [dueAt, setDueAt] = useState(getFormattedDueDate());
  const [maxMarks, setMaxMarks] = useState(taskToEdit?.max_marks || '');
  const [publicationStatus, setPublicationStatus] = useState(
    taskToEdit?.publication_status || 'Published'
  );

  // Format initial scheduled release date (default tomorrow 9:00 AM)
  const getFormattedScheduledDate = () => {
    if (taskToEdit?.scheduled_at) {
      const d = new Date(taskToEdit.scheduled_at);
      return d.toISOString().slice(0, 16);
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [scheduledAt, setScheduledAt] = useState(getFormattedScheduledDate());
  const [assignmentTarget, setAssignmentTarget] = useState(
    taskToEdit?.assignment_target || 'all'
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  const [availableTopics, setAvailableTopics] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load topics dynamically when subject changes
  useEffect(() => {
    if (!subjectId) {
      setAvailableTopics([]);
      setTopicId('');
      return;
    }
    const loadTopics = async () => {
      try {
        const topics = await dataService.getTopicsBySubject(subjectId);
        setAvailableTopics(topics);
        if (!taskToEdit || taskToEdit.subject_id !== subjectId) {
          setTopicId(topics[0]?.id || '');
        }
      } catch (err) {
        console.error('Error loading topics:', err);
      }
    };
    loadTopics();
  }, [subjectId]);

  // Load students for target selection
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const students = await dataService.getStudents();
        setStudentsList(students);
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
      const taskPayload = {
        title: title.trim(),
        description: description.trim(),
        subject_id: subjectId,
        topic_id: topicId || null,
        task_type: taskType,
        priority,
        due_at: new Date(dueAt).toISOString(),
        max_marks: maxMarks ? parseFloat(maxMarks) : null,
        publication_status: publicationStatus,
        scheduled_at: publicationStatus === 'Scheduled' ? new Date(scheduledAt).toISOString() : null,
        assignment_target: assignmentTarget,
      };

      if (taskToEdit) {
        await dataService.updateTask(taskToEdit.id, taskPayload);
        addToast('Task updated successfully.', 'success');
      } else {
        await dataService.createTask(taskPayload, selectedStudentIds);
        addToast(
          publicationStatus === 'Published'
            ? 'Task created and assigned to students!'
            : publicationStatus === 'Scheduled'
            ? `Task scheduled for release on ${new Date(scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}!`
            : 'Task saved as Draft.',
          'success'
        );
      }

      if (onSuccess) onSuccess();
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

            {/* Task Title */}
            <div className="form-group">
              <label className="form-label">Task Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Practical 4: Binary Search Trees Implementation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Subject and Topic selection */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <select
                  className="form-control"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.subject_code || 'IT'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Topic (Under Subject)</label>
                <select
                  className="form-control"
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                >
                  <option value="">Select Topic (Optional)</option>
                  {availableTopics.map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type, Priority, and Due Date */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Task Type</label>
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
                <label className="form-label">Priority</label>
                <select
                  className="form-control"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Due Date & Time *</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 2);
                        d.setHours(23, 59, 0, 0);
                        setDueAt(d.toISOString().slice(0, 16));
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
                        setDueAt(d.toISOString().slice(0, 16));
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
                <label className="form-label">Max Marks (Optional)</label>
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

            {/* Instructions / Description */}
            <div className="form-group">
              <label className="form-label">Task Instructions & Description</label>
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
                <label className="form-label">Target Students</label>
                <select
                  className="form-control"
                  value={assignmentTarget}
                  onChange={(e) => setAssignmentTarget(e.target.value)}
                >
                  <option value="all">All FY B.Sc. IT Students</option>
                  <option value="selected">Selected Students Only</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Publication & Schedule</label>
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
                <label className="form-label">Select Students ({selectedStudentIds.length} chosen):</label>
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
                  {studentsList.map((st) => (
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
                        {st.full_name} ({st.roll_number || 'No Roll No'}) • Div {st.division}
                      </span>
                    </label>
                  ))}
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
