import React, { useEffect, useState, useRef } from 'react';
import { FaClipboardList, FaPlus, FaTrash, FaEye, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import PTSAssessmentCreation from '../../pts/AssessmentCreation';
import * as XLSX from '@e965/xlsx';
import PTOService, { type Assessment as AssessDto } from '../../services/pto.service';

interface Assessment {
  id: string;
  name: string;
  department: string;
  type: 'department-wise' | 'college-wide';
  duration: number;
  date: string;
  timeWindow: { start: string; end: string };
  attempts: number;
  questions: number;
  status: 'active' | 'inactive' | 'scheduled';
  createdBy?: string;
}

interface Question {
  id?: string;
  text: string;
  options?: string[];
  correctIndex?: number;
}

interface AssessmentDetail {
  id?: string;
  name: string;
  department: string;
  type: 'department-wise' | 'college-wide';
  duration: number;
  date: string;
  timeWindow?: { start?: string; end?: string };
  attempts: number;
  questions?: Question[];
  status?: 'active' | 'inactive' | 'scheduled';
}

const AssessmentManagement: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await PTOService.getAssessments();
        const mapped: Assessment[] = data.map((a: AssessDto | unknown) => {
          const deptList = getNested(a, ['target', 'departments']);
          const typeRaw = getProp(a, 'type');
          const typeStr = asString(typeRaw).toUpperCase();
          const start = getNested(a, ['timeWindow', 'start']) ?? getNested(a, ['scheduling', 'startDate']);
          const end = getNested(a, ['timeWindow', 'end']) ?? getNested(a, ['scheduling', 'endDate']);
          const createdName = asString(getProp(a, 'createdByName'));
          const createdEmail = getProp(a, 'createdBy') ?? getProp(a, 'ownerEmail') ?? getNested(a, ['owner', 'email']) ?? getProp(a, 'createdByEmail');
          const createdUser = createdName || asString(createdEmail).split('@')[0];
          const qs = getProp(a, 'questions');
          const totalQ = Array.isArray(qs) ? qs.length : asNumber(qs ?? getNested(a, ['configuration', 'totalQuestions']) ?? getProp(a, 'totalQuestions'));
          return {
            id: asString(getProp(a, 'id') ?? getProp(a, 'assessmentId') ?? getProp(a, 'SK')),
            name: asString(getProp(a, 'name') ?? getProp(a, 'title')),
            department: asString(getProp(a, 'department') ?? (Array.isArray(deptList) ? deptList[0] : '')),
            type: typeStr === 'COLLEGE_WIDE' ? 'college-wide' : 'department-wise',
            duration: asNumber(getProp(a, 'duration') ?? getProp(a, 'durationMinutes') ?? 60),
            date: asString(getProp(a, 'date') ?? getNested(a, ['scheduling', 'startDate']) ?? ''),
            timeWindow: { start: asString(start ?? ''), end: asString(end ?? '') },
            attempts: asNumber(getProp(a, 'attempts') ?? getNested(a, ['configuration', 'maxAttempts']) ?? 1),
            questions: totalQ,
            status: (asString(getProp(a, 'status')).toLowerCase() === 'active') ? 'active' : 'inactive',
            createdBy: createdUser || undefined
          };
        });
        setAssessments(mapped);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load assessments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTargetId, setImportTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    type: 'department-wise' as 'department-wise' | 'college-wide',
    duration: 60,
    date: '',
    timeWindow: { start: '09:00', end: '18:00' },
    attempts: 1,
    questions: 0,
  });

  const [departments, setDepartments] = useState<string[]>([]);
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const list = await PTOService.getDepartmentCatalog();
        setDepartments(list);
      } catch {
        setDepartments(['CE', 'ME', 'EEE', 'ECE', 'CSE', 'IT']);
      }
    };
    loadCatalog();
  }, []);

  // PTO manual creation removed in favor of PTS schema

  // Edit action is not part of the streamlined PTO UX; opener removed

  const handleUpdateAssessment = async () => {
    if (selectedAssessment) {
      await PTOService.updateAssessment(selectedAssessment.id, {
        name: formData.name,
        department: formData.department,
        type: formData.type,
        duration: formData.duration,
        date: formData.date,
        timeWindow: formData.timeWindow,
        attempts: formData.attempts
      });
      setAssessments(assessments.map(assessment =>
        assessment.id === selectedAssessment.id
          ? { ...selectedAssessment, ...formData }
          : assessment
      ));
      setIsEditModalOpen(false);
      setSelectedAssessment(null);
      resetForm();
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      setAssessments(prev => prev.filter(a => a.id !== id));
      setDeletedIds(prev => [...prev, id]);
      try {
        await PTOService.deleteAssessment(id);
      } finally {
        setTimeout(() => { refreshAssessments(); }, 1500);
      }
    }
  };

  

  const refreshAssessments = async () => {
    const data = await PTOService.getAssessments();
    const mapped: Assessment[] = data.map((a: AssessDto | unknown) => {
      const deptList = getNested(a, ['target', 'departments']);
      const typeRaw = getProp(a, 'type');
      const typeStr = asString(typeRaw).toUpperCase();
      const start = getNested(a, ['timeWindow', 'start']) ?? getNested(a, ['scheduling', 'startDate']);
      const end = getNested(a, ['timeWindow', 'end']) ?? getNested(a, ['scheduling', 'endDate']);
      const createdName = asString(getProp(a, 'createdByName'));
          const createdEmail = getProp(a, 'createdBy') ?? getProp(a, 'ownerEmail') ?? getNested(a, ['owner', 'email']) ?? getProp(a, 'createdByEmail');
          const createdUser = createdName || asString(createdEmail).split('@')[0];
      const qs = getProp(a, 'questions');
      const totalQ = Array.isArray(qs) ? qs.length : asNumber(qs ?? getNested(a, ['configuration', 'totalQuestions']) ?? getProp(a, 'totalQuestions'));
      return {
        id: asString(getProp(a, 'id') ?? getProp(a, 'assessmentId') ?? getProp(a, 'SK')),
        name: asString(getProp(a, 'name') ?? getProp(a, 'title')),
        department: asString(getProp(a, 'department') ?? (Array.isArray(deptList) ? deptList[0] : '')),
        type: typeStr === 'COLLEGE_WIDE' ? 'college-wide' : 'department-wise',
        duration: asNumber(getProp(a, 'duration') ?? getProp(a, 'durationMinutes') ?? 60),
        date: asString(getProp(a, 'date') ?? getNested(a, ['scheduling', 'startDate']) ?? ''),
        timeWindow: { start: asString(start ?? ''), end: asString(end ?? '') },
        attempts: asNumber(getProp(a, 'attempts') ?? getNested(a, ['configuration', 'maxAttempts']) ?? 1),
        questions: totalQ,
        status: (asString(getProp(a, 'status')).toLowerCase() === 'active') ? 'active' : 'inactive',
            createdBy: createdUser || undefined
          };
    });
    const filtered = mapped.filter(a => !(deletedIds || []).includes(a.id));
    setAssessments(prev => {
      const prevById = new Map(prev.map(a => [a.id, a]));
      return filtered.map(cur => {
        const old = prevById.get(cur.id);
        if (!old) return cur;
        return {
          ...cur,
          name: cur.name || old.name,
          department: cur.department || old.department,
          date: cur.date || old.date,
          timeWindow: {
            start: cur.timeWindow.start || old.timeWindow.start,
            end: cur.timeWindow.end || old.timeWindow.end,
          },
          attempts: typeof cur.attempts === 'number' ? cur.attempts : old.attempts,
          questions: typeof cur.questions === 'number' && cur.questions > 0 ? cur.questions : old.questions,
          createdBy: cur.createdBy || old.createdBy,
          status: cur.status || old.status,
        };
      });
    });
  };

  const handleActivate = async (id: string) => {
    // Optimistic update for better UX
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a));
    try {
      await PTOService.enableAssessment(id);
    } finally {
      await refreshAssessments();
    }
  };

  const handleDisable = async (id: string) => {
    // Optimistic update for better UX
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'inactive' } : a));
    try {
      await PTOService.disableAssessment(id);
    } finally {
      await refreshAssessments();
    }
  };

  

  // Legacy status toggle removed in favor of explicit actions

  

  const [previewData, setPreviewData] = useState<AssessmentDetail | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const handlePreview = async (assessment: Assessment) => {
    const full = await PTOService.getAssessment(assessment.id) as AssessmentDetail;
    setSelectedAssessment({
      id: assessment.id,
      name: full?.name || assessment.name,
      department: full?.department || assessment.department,
      type: full?.type || assessment.type,
      duration: full?.duration ?? assessment.duration,
      date: full?.date || assessment.date,
      timeWindow: {
        start: full?.timeWindow?.start ?? assessment.timeWindow.start,
        end: full?.timeWindow?.end ?? assessment.timeWindow.end,
      },
      attempts: full?.attempts ?? assessment.attempts,
      questions: Array.isArray(full?.questions) ? full.questions.length : assessment.questions,
      status: (full?.status === 'active' ? 'active' : full?.status === 'inactive' ? 'inactive' : assessment.status)
    });
    setPreviewData(full || null);
    setIsPreviewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      department: '',
      type: 'department-wise',
      duration: 60,
      date: '',
      timeWindow: { start: '09:00', end: '18:00' },
      attempts: 1,
      questions: 0,
    });
  };

  type ParsedQuestion = { text: string; options: string[]; correctIndex: number };
  const parsePastedQuestions = (text: string): ParsedQuestion[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items: ParsedQuestion[] = [];
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const q = parts[0];
        const opts = parts.slice(1, parts.length - 1);
        const ans = parts[parts.length - 1];
        let correctIndex = parseInt(ans, 10);
        if (Number.isNaN(correctIndex)) {
          const letter = String(ans).toUpperCase();
          correctIndex = Math.max(0, ['A','B','C','D','E','F','G'].indexOf(letter));
        }
        items.push({ text: q, options: opts, correctIndex });
      }
    }
    return items;
  };

  const handleImportSubmit = async () => {
    if (!importTargetId) return;
    const parsed = parsePastedQuestions(importText);
    await PTOService.updateAssessment(importTargetId, { questions: parsed });
    const updatedList = assessments.map(a => a.id === importTargetId ? { ...a, questions: parsed.length } : a);
    setAssessments(updatedList);
    setIsImportModalOpen(false);
    setImportText('');
    setImportTargetId(null);
  };

  const handleExcelFile = async (file: File) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[];
    const parsed: ParsedQuestion[] = [];
    for (const r of rows) {
      if (Array.isArray(r) && r.length >= 3) {
        const q = String(r[0] || '').trim();
        const opts = r.slice(1, r.length - 1).map((x: unknown) => String(x ?? '').trim()).filter(Boolean);
        const ans = r[r.length - 1];
        let idx = parseInt(ans, 10);
        if (Number.isNaN(idx)) {
          idx = Math.max(0, ['A','B','C','D','E','F','G'].indexOf(String(ans || '').toUpperCase()));
        }
        if (q && opts.length) parsed.push({ text: q, options: opts, correctIndex: idx });
      }
    }
    if (importTargetId) {
      await PTOService.updateAssessment(importTargetId, { questions: parsed });
      const updatedList = assessments.map(a => a.id === importTargetId ? { ...a, questions: parsed.length } : a);
      setAssessments(updatedList);
    }
    setIsImportModalOpen(false);
    setImportText('');
    setImportTargetId(null);
  };

  return (
    <div className="pto-component-page">
      {/* Statistics */}
      <div className="stats-grid">
        {error && (<div className="admin-error"><p>{error}</p></div>)}
        {loading && (<div className="admin-loading"><div className="spinner"></div><p>Loading assessments...</p></div>)}
        <div className="stat-card">
          <FaClipboardList size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Assessments</h3>
            <p className="stat-value">{assessments.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaToggleOn size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Active</h3>
            <p className="stat-value">{assessments.filter(a => a.status === 'active').length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaToggleOff size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Inactive</h3>
            <p className="stat-value">{assessments.filter(a => a.status === 'inactive').length}</p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="action-buttons-section">
        <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
          <FaPlus /> Create Assessment
        </button>
      </div>

      {/* Assessments Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Assessment Name</th>
              <th>Department</th>
              <th>Created By</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Active Section */}
            {assessments.filter(a => a.status === 'active').length > 0 && (
              <tr><td colSpan={7}><strong>Active</strong></td></tr>
            )}
            {assessments.filter(a => a.status === 'active').map(assessment => (
              <tr key={`active-${assessment.id}`} onClick={(e) => e.stopPropagation()}>
                <td>{assessment.name || '(Untitled)'} </td>
                <td>{assessment.department}</td>
                <td>{assessment.createdBy || '—'}</td>
                <td>
                  <span className={`type-badge ${assessment.type}`}>
                    {assessment.type === 'department-wise' ? 'Dept-wise' : 'College-wide'}
                  </span>
                </td>
                <td>{assessment.duration} min</td>
                <td>
                  <span className={`status-badge ${assessment.status}`}>Active</span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn preview-btn" onClick={() => handlePreview(assessment)} title="View"><FaEye /></button>
                    <button className="text-btn" onClick={() => handleDisable(assessment.id)} title="Deactivate" type="button">Deactivate</button>
                    <button className="text-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImportTargetId(assessment.id); setIsImportModalOpen(true); }} title="Import Questions" type="button">Import</button>
                  </div>
                </td>
              </tr>
            ))}

            

            {/* Inactive Section */}
            {assessments.filter(a => a.status === 'inactive').length > 0 && (
              <tr><td colSpan={7}><strong>Inactive</strong></td></tr>
            )}
              {assessments.filter(a => a.status === 'inactive').map(assessment => (
                <tr key={`inactive-${assessment.id}`} onClick={(e) => e.stopPropagation()}>
                  <td>{assessment.name || '(Untitled)'} </td>
                  <td>{assessment.department}</td>
                  <td>{assessment.createdBy || '—'}</td>
                  <td>
                    <span className={`type-badge ${assessment.type}`}>
                      {assessment.type === 'department-wise' ? 'Dept-wise' : 'College-wide'}
                    </span>
                  </td>
                <td>{assessment.duration} min</td>
                <td>
                  <span className={`status-badge ${assessment.status}`}>Inactive</span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn preview-btn" onClick={() => handlePreview(assessment)} title="View"><FaEye /></button>
                      <button className="text-btn" onClick={() => handleActivate(assessment.id)} title="Activate" type="button">Activate</button>
                      <button className="icon-btn delete-btn" onClick={() => handleDeleteAssessment(assessment.id)} title="Delete"><FaTrash /></button>
                  </div>
                </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Assessment Modal replaced with PTS schema */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()} style={{ width: '95vw', maxWidth: '1200px', maxHeight: '80vh' }}>
            <h3>Create Assessment</h3>
            <div style={{ height: 'calc(80vh - 64px)', overflow: 'auto' }}>
              <div className="pts-dashboard">
                <PTSAssessmentCreation />
              </div>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={async () => {
                setIsAddModalOpen(false);
                const data = await PTOService.getAssessments();
                const mapped: Assessment[] = data.map((a: AssessDto | unknown) => {
                  const deptList = getNested(a, ['target', 'departments']);
                  const typeRaw = getProp(a, 'type');
                  const typeStr = asString(typeRaw).toUpperCase();
                  const start = getNested(a, ['timeWindow', 'start']) ?? getNested(a, ['scheduling', 'startDate']);
                  const end = getNested(a, ['timeWindow', 'end']) ?? getNested(a, ['scheduling', 'endDate']);
                  const createdName = asString(getProp(a, 'createdByName'));
                  const createdEmail = getProp(a, 'createdBy') ?? getProp(a, 'ownerEmail') ?? getNested(a, ['owner', 'email']) ?? getProp(a, 'createdByEmail');
                  const createdUser = createdName || asString(createdEmail).split('@')[0];
                  const qs = getProp(a, 'questions');
                  const totalQ = Array.isArray(qs) ? qs.length : asNumber(qs ?? getNested(a, ['configuration', 'totalQuestions']) ?? getProp(a, 'totalQuestions'));
                  return {
                    id: asString(getProp(a, 'id') ?? getProp(a, 'assessmentId') ?? getProp(a, 'SK')),
                    name: asString(getProp(a, 'name') ?? getProp(a, 'title')),
                    department: asString(getProp(a, 'department') ?? (Array.isArray(deptList) ? deptList[0] : '')),
                    type: typeStr === 'COLLEGE_WIDE' ? 'college-wide' : 'department-wise',
                    duration: asNumber(getProp(a, 'duration') ?? getProp(a, 'durationMinutes') ?? 60),
                    date: asString(getProp(a, 'date') ?? getNested(a, ['scheduling', 'startDate']) ?? ''),
                    timeWindow: { start: asString(start ?? ''), end: asString(end ?? '') },
                    attempts: asNumber(getProp(a, 'attempts') ?? getNested(a, ['configuration', 'maxAttempts']) ?? 1),
                    questions: totalQ,
                    status: (asString(getProp(a, 'status')).toLowerCase() === 'active') ? 'active' : 'inactive',
                    createdBy: createdUser || undefined
                  };
                });
                setAssessments(mapped);
              }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assessment Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Assessment</h3>
            <div className="form-group">
              <label>Assessment Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'department-wise' | 'college-wide' })}
              >
                <option value="department-wise">Department-wise</option>
                <option value="college-wide">College-wide</option>
              </select>
            </div>
            <div className="form-group">
              <label>Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Number of Attempts</label>
                <input
                  type="number"
                  value={formData.attempts}
                  onChange={(e) => setFormData({ ...formData, attempts: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Time Window Start</label>
                <input
                  type="time"
                  value={formData.timeWindow.start}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    timeWindow: { ...formData.timeWindow, start: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Time Window End</label>
                <input
                  type="time"
                  value={formData.timeWindow.end}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    timeWindow: { ...formData.timeWindow, end: e.target.value }
                  })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleUpdateAssessment}>Update</button>
              <button className="secondary-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Assessment Modal */}
      {isPreviewModalOpen && selectedAssessment && (
        <div className="modal-overlay" onClick={() => setIsPreviewModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Preview Assessment</h3>
            <div className="preview-content">
              <div className="preview-item">
                <strong>Name:</strong> {selectedAssessment.name}
              </div>
              <div className="preview-item">
                <strong>Department:</strong> {selectedAssessment.department}
              </div>
              <div className="preview-item">
                <strong>Type:</strong> {selectedAssessment.type === 'department-wise' ? 'Department-wise' : 'College-wide'}
              </div>
              <div className="preview-item">
                <strong>Duration:</strong> {selectedAssessment.duration} minutes
              </div>
              <div className="preview-item">
                <strong>Date:</strong> {selectedAssessment.date}
              </div>
              <div className="preview-item">
                <strong>Time Window:</strong> {selectedAssessment.timeWindow.start} - {selectedAssessment.timeWindow.end}
              </div>
              <div className="preview-item">
                <strong>Attempts:</strong> {selectedAssessment.attempts}
              </div>
              <div className="preview-item">
                <strong>Questions:</strong> {selectedAssessment.questions}
              </div>
              {previewData && Array.isArray(previewData.questions) && previewData.questions.length > 0 && (
                <div className="preview-item">
                  <strong>Question List:</strong>
                  <div>
                    {previewData.questions.map((q: Question, idx: number) => (
                      <div key={q.id || idx} style={{ marginTop: '8px' }}>
                        <div>{idx + 1}. {q.text}</div>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <ul style={{ marginLeft: '20px' }}>
                            {q.options.map((opt: string, oi: number) => (
                              <li key={oi}>
                                {String.fromCharCode(65 + oi)}. {opt}
                                {typeof q.correctIndex === 'number' && q.correctIndex === oi ? ' (Correct)' : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="preview-item">
                <strong>Status:</strong> 
                <span className={`status-badge ${selectedAssessment.status}`}>
                  {selectedAssessment.status.charAt(0).toUpperCase() + selectedAssessment.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={() => setIsPreviewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Import Questions</h3>
            <div className="form-group">
              <label>Paste format: question|option1|option2|option3|option4|Answer</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="One question per line"
                rows={8}
              />
            </div>
            <div className="form-group">
              <label>Or upload Excel</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) handleExcelFile(f);
                }}
              />
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleImportSubmit} disabled={!importText.trim() || !importTargetId}>Import</button>
              <button className="secondary-btn" onClick={() => setIsImportModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default AssessmentManagement;
  const getProp = (obj: unknown, key: string): unknown => {
    if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  };
  const getNested = (obj: unknown, keys: string[]): unknown => {
    let cur: unknown = obj;
    for (const k of keys) {
      if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return cur;
  };
  const asString = (v: unknown, fallback = ''): string => {
    return typeof v === 'string' ? v : String(v ?? fallback);
  };
  const asNumber = (v: unknown, fallback = 0): number => {
    return typeof v === 'number' ? v : Number(v ?? fallback);
  };
