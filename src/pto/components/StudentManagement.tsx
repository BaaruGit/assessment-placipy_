import React, { useEffect, useState } from 'react';
import { FaUserGraduate, FaSearch, FaFilter, FaEnvelope, FaBuilding } from 'react-icons/fa';
import PTOService from '../../services/pto.service';

interface Student {
  id: number;
  name: string;
  rollNumber: string;
  department: string;
  email: string;
  testsParticipated: number;
  avgScore: number;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageData, setMessageData] = useState({ subject: '', message: '', tags: '' });
  const [attachments, setAttachments] = useState<Array<{ filename: string; contentType: string; data: string }>>([]);
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [conversationFor, setConversationFor] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ messageId: string; senderType: string; senderId: string; recipientType: string; recipientId: string; message: string; timestamp: string; readStatus: boolean }>>([]);
  const [messagesNextToken, setMessagesNextToken] = useState<any>(null);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const [departments, setDepartments] = useState<string[]>(['all']);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await PTOService.getStudents();
        const mapped: Student[] = data.map(s => ({
          id: Number((s.id || '').split('#').pop()) || Math.random(),
          name: s.name,
          rollNumber: s.rollNumber || '',
          department: s.department,
          email: s.email,
          testsParticipated: s.testsParticipated || 0,
          avgScore: s.avgScore || 0,
        }));
        setStudents(mapped);
        const catalog = await PTOService.getDepartmentCatalog();
        const codes = Array.isArray(catalog)
          ? catalog.map((d: any) => {
              if (typeof d === 'string') return d;
              if (d && typeof d === 'object') return String(d.code || '').toUpperCase();
              return String(d || '').toUpperCase();
            }).filter((c: string) => !!c && c !== '[OBJECT OBJECT]')
          : [];
        const unique = Array.from(new Set(codes));
        setDepartments(['all', ...unique]);
        try {
          const ann = await PTOService.listAnnouncements({ limit: 10 });
          setAnnouncements(ann.items || []);
        } catch {}
      } catch (e: any) {
        setError(e.message || 'Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || student.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleSelectStudent = (id: number) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleSendMessage = async () => {
    if (selectedStudents.length > 0 && messageData.subject && messageData.message) {
      const recipients = filteredStudents.filter(s => selectedStudents.includes(s.id));
      for (const r of recipients) {
        try {
          await PTOService.sendMessage(r.email, `${messageData.subject}\n\n${messageData.message}`, attachments);
        } catch (e) {}
      }
      setIsMessageModalOpen(false);
      setMessageData({ subject: '', message: '', tags: '' });
      setAttachments([]);
      setSelectedStudents([]);
      alert(`Message sent to ${recipients.length} student(s)`);
    }
  };

  const handleSendAnnouncement = async () => {
    if (messageData.subject && messageData.message) {
      await PTOService.sendAnnouncement({ title: messageData.subject, message: messageData.message, tags: messageData.tags ? messageData.tags.split(',').map(t => t.trim()).filter(Boolean) : [], attachments });
      setIsMessageModalOpen(false);
      setMessageData({ subject: '', message: '', tags: '' });
      setAttachments([]);
      alert('Announcement sent to all students');
    }
  };

  const openConversation = async (email: string) => {
    setConversationFor(email);
    setIsConversationModalOpen(true);
    setMessagesLoading(true);
    try {
      const res = await PTOService.getMessageHistory({ recipientId: email, limit: 20 });
      setMessages(res.items || []);
      setMessagesNextToken(res.nextToken || null);
    } catch (e) {
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!conversationFor || !messagesNextToken) return;
    setMessagesLoading(true);
    try {
      const res = await PTOService.getMessageHistory({ recipientId: conversationFor, limit: 20, nextToken: messagesNextToken });
      setMessages([...(messages || []), ...(res.items || [])]);
      setMessagesNextToken(res.nextToken || null);
    } catch {}
    setMessagesLoading(false);
  };

  const markRead = async (msg: { messageId: string }) => {
    try {
      await PTOService.markMessageRead({ recipientId: conversationFor, messageId: msg.messageId });
    } catch {}
  };

  return (
    <div className="pto-component-page">
      {error && <div className="admin-error"><p>{error}</p></div>}
      {loading && <div className="admin-loading"><div className="spinner"></div><p>Loading students...</p></div>}
      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <FaUserGraduate size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Students</h3>
            <p className="stat-value">{students.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaBuilding size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Departments</h3>
            <p className="stat-value">{new Set(students.map(s => s.department)).size}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaFilter size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Active Tests</h3>
            <p className="stat-value">{students.reduce((sum, s) => sum + s.testsParticipated, 0)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons-section">
        <button 
          className="primary-btn"
          onClick={() => {
            setSelectedStudents([]);
            setIsMessageModalOpen(true);
          }}
          disabled={selectedStudents.length === 0}
        >
          <FaEnvelope /> Send Message ({selectedStudents.length})
        </button>
        <button
          className="secondary-btn"
          onClick={() => {
            if (selectedStudents.length === 1) {
              const student = filteredStudents.find(s => s.id === selectedStudents[0]);
              if (student) openConversation(student.email);
            }
          }}
          disabled={selectedStudents.length !== 1}
        >
          Inbox (1)
        </button>
        <button 
          className="secondary-btn"
          onClick={() => {
            setSelectedStudents([]);
            setIsMessageModalOpen(true);
          }}
        >
          <FaEnvelope /> Send Announcement
        </button>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, roll number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <FaFilter className="filter-icon" />
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Name</th>
              <th>Roll Number</th>
              <th>Department</th>
              <th>Email</th>
              <th>Tests Participated</th>
              <th>Average Score</th>
              <th>Messages</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleSelectStudent(student.id)}
                  />
                </td>
                <td>{student.name}</td>
                <td>{student.rollNumber}</td>
                <td>{student.department}</td>
                <td>{student.email}</td>
                <td>{student.testsParticipated}</td>
                <td>
                  <span className={`score-badge ${student.avgScore >= 80 ? 'high' : student.avgScore >= 70 ? 'medium' : 'low'}`}>
                    {student.avgScore}%
                  </span>
                </td>
                <td>
                  <button className="text-btn" onClick={() => openConversation(student.email)}>
                    View Messages
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Send Message Modal */}
      {isMessageModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMessageModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {selectedStudents.length > 0 
                ? `Send Message to ${selectedStudents.length} Student(s)`
                : 'Send Announcement to All Students'}
            </h3>
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                value={messageData.subject}
                onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                placeholder="Enter message subject"
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={messageData.message}
                onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                placeholder="Enter your message"
                rows={6}
              />
            </div>
            <div className="form-group">
              <label>Attachments</label>
              <input
                type="file"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  const processed: Array<{ filename: string; contentType: string; data: string }> = [];
                  for (const f of files) {
                    const arrayBuffer = await f.arrayBuffer();
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                    processed.push({ filename: f.name, contentType: f.type || 'application/octet-stream', data: base64 });
                  }
                  setAttachments(processed);
                }}
              />
            </div>
            {selectedStudents.length === 0 && (
              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  value={messageData.tags}
                  onChange={(e) => setMessageData({ ...messageData, tags: e.target.value })}
                  placeholder="e.g. exam, placement"
                />
              </div>
            )}
            <div className="modal-actions">
              <button 
                className="primary-btn" 
                onClick={selectedStudents.length > 0 ? handleSendMessage : handleSendAnnouncement}
              >
                <FaEnvelope /> Send
              </button>
              <button className="secondary-btn" onClick={() => setIsMessageModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Modal */}
      {isConversationModalOpen && (
        <div className="modal-overlay" onClick={() => setIsConversationModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Conversation with {conversationFor}</h3>
            <div className="messages-list">
              {messagesLoading && <div className="admin-loading"><div className="spinner"></div><p>Loading...</p></div>}
              {!messagesLoading && (!messages || messages.length === 0) && (
                <div className="admin-empty-chart"><p>No messages yet</p></div>
              )}
              {(messages || []).map(m => (
                <div key={m.messageId} className={`message-item ${m.senderType === 'PTO' ? 'sent' : 'received'}`}>
                  <div className="message-meta">
                    <span>{new Date(m.timestamp).toLocaleString()}</span>
                    {!m.readStatus && (
                      <button className="text-btn" onClick={() => markRead(m)}>Mark read</button>
                    )}
                  </div>
                  <div className="message-body">{m.message}</div>
                  {Array.isArray((m as any).attachments) && (m as any).attachments.length > 0 && (
                    <div className="attachments">
                      {((m as any).attachments as any[]).map((att: any, idx: number) => (
                        <a key={idx} href={`data:${att.contentType};base64,${att.data}`} download={att.filename} className="text-btn">
                          {att.filename}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              {messagesNextToken && (
                <button className="secondary-btn" onClick={loadMoreMessages}>Load more</button>
              )}
              <button className="primary-btn" onClick={() => setIsConversationModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <div className="table-container" style={{ marginTop: 20 }}>
          <h3>Recent Announcements</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Tags</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a: any) => (
                <tr key={a.SK}>
                  <td>{a.title}</td>
                  <td>{a.message}</td>
                  <td>{Array.isArray(a.tags) ? a.tags.join(', ') : ''}</td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;

