import React, { useState, useEffect, useCallback } from 'react';
import {
    BookMarked, Plus, Trash2, ChevronDown, ChevronUp,
    Save, Edit2, X, GripVertical, CheckCircle2, Circle
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const CLASS_ORDER = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const TERMS = ['Unit-1', 'Half Yearly Exam', 'Unit-2', 'Annual Exam'];

const SyllabusManagement = () => {
    const { settings } = useSettings();

    // ── data ──
    const [classes,   setClasses]   = useState([]);
    const [subjects,  setSubjects]  = useState([]);
    const [syllabus,  setSyllabus]  = useState([]);   // all syllabi for selected class

    // ── UI state ──
    const [selectedClass,   setSelectedClass]   = useState('');
    const [loading,         setLoading]         = useState(false);
    const [toast,           setToast]           = useState(null);
    const [expandedId,      setExpandedId]      = useState(null);  // which card is open
    const [isModalOpen,     setIsModalOpen]     = useState(false);
    const [editTarget,      setEditTarget]      = useState(null);  // syllabus being edited
    const [saving,          setSaving]          = useState(false);

    // ── form state ──
    const [form, setForm] = useState({
        subjectId: '',
        term: 'Full Year',
        notes: '',
        topics: [],          // [{ title, description, isCompleted }]
    });
    const [newTopic, setNewTopic] = useState({ title: '', description: '' });

    // ── load classes once ──
    useEffect(() => {
        API.get('/admin/classes').then(r => setClasses(r.data)).catch(() => {});
    }, []);

    // ── load subjects when class changes ──
    useEffect(() => {
        if (!selectedClass) { setSubjects([]); setSyllabus([]); return; }
        const cls = classes.find(c => c._id === selectedClass);
        if (!cls) return;
        Promise.all([
            API.get(`/admin/subjects/${cls.className}`),
            API.get(`/syllabus?classId=${selectedClass}`)
        ]).then(([subRes, sylRes]) => {
            setSubjects(subRes.data);
            setSyllabus(sylRes.data);
        }).catch(() => setToast({ message: 'Failed to load data', type: 'error' }));
    }, [selectedClass, classes]);

    // ── open modal for new syllabus ──
    const openNew = () => {
        setEditTarget(null);
        setForm({ subjectId: '', term: 'Unit-1', notes: '', topics: [] });
        setNewTopic({ title: '', description: '' });
        setIsModalOpen(true);
    };

    // ── open modal to edit existing ──
    const openEdit = (syl) => {
        setEditTarget(syl);
        setForm({
            subjectId: syl.subjectId._id,
            term:      syl.term,
            notes:     syl.notes || '',
            topics:    syl.topics.map(t => ({ ...t })),
        });
        setNewTopic({ title: '', description: '' });
        setIsModalOpen(true);
    };

    // ── add topic to local form ──
    const addTopic = () => {
        if (!newTopic.title.trim()) return;
        setForm(f => ({ ...f, topics: [...f.topics, { ...newTopic, isCompleted: false }] }));
        setNewTopic({ title: '', description: '' });
    };

    const removeTopic = (idx) =>
        setForm(f => ({ ...f, topics: f.topics.filter((_, i) => i !== idx) }));

    // ── save ──
    const handleSave = async () => {
        if (!form.subjectId) return setToast({ message: 'Select a subject', type: 'error' });
        if (form.topics.length === 0) return setToast({ message: 'Add at least one topic', type: 'error' });

        setSaving(true);
        try {
            if (editTarget) {
                await API.put(`/syllabus/${editTarget._id}`, {
                    topics: form.topics,
                    notes:  form.notes,
                    term:   form.term,
                });
            } else {
                await API.post('/syllabus', {
                    classId:   selectedClass,
                    subjectId: form.subjectId,
                    term:      form.term,
                    topics:    form.topics,
                    notes:     form.notes,
                });
            }
            setToast({ message: 'Syllabus saved successfully', type: 'success' });
            setIsModalOpen(false);
            // Refresh
            const res = await API.get(`/syllabus?classId=${selectedClass}`);
            setSyllabus(res.data);
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Save failed', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // ── delete ──
    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete syllabus for "${name}"?`)) return;
        try {
            await API.delete(`/syllabus/${id}`);
            setSyllabus(prev => prev.filter(s => s._id !== id));
            setToast({ message: 'Deleted', type: 'success' });
        } catch {
            setToast({ message: 'Delete failed', type: 'error' });
        }
    };

    const completedCount = (topics) => topics.filter(t => t.isCompleted).length;

    // Toggle a topic's complete status directly from the list view
    const handleToggleTopic = async (sylId, topicId) => {
        try {
            const res = await API.patch(`/syllabus/${sylId}/topic/${topicId}/toggle`);
            // Update local state without full reload
            setSyllabus(prev => prev.map(s => {
                if (s._id !== sylId) return s;
                return {
                    ...s,
                    topics: s.topics.map(t =>
                        t._id === topicId ? { ...t, isCompleted: res.data.isCompleted } : t
                    )
                };
            }));
        } catch {
            setToast({ message: 'Failed to update topic', type: 'error' });
        }
    };

    return (
        <div className="space-y-6">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Syllabus Management</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Session:</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-primary text-[10px] font-black rounded border border-indigo-100">
                            {settings.currentAcademicYear}
                        </span>
                    </div>
                </div>
                {selectedClass && (
                    <Button variant="primary" icon={Plus} onClick={openNew}>
                        Add Syllabus
                    </Button>
                )}
            </div>

            {/* Class Selector */}
            <Card>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Select Class to Manage
                </label>
                <div className="flex flex-wrap gap-2">
                    {CLASS_ORDER.map(cn => {
                        const cls = classes.find(c => c.className === cn);
                        if (!cls) return null;
                        return (
                            <button
                                key={cls._id}
                                onClick={() => { setSelectedClass(cls._id); setExpandedId(null); }}
                                className={`px-4 py-2 rounded-xl text-sm font-black transition-all border-2 ${
                                    selectedClass === cls._id
                                        ? 'bg-primary text-white border-primary shadow-lg'
                                        : 'bg-white text-gray-600 border-gray-100 hover:border-primary hover:text-primary'
                                }`}
                            >
                                {cn}
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Syllabus List */}
            {selectedClass && (
                loading ? <div className="py-16"><LoadingSpinner size="lg" /></div> :
                syllabus.length === 0 ? (
                    <div className="py-20 text-center opacity-30">
                        <BookMarked size={56} className="mx-auto mb-3" />
                        <p className="font-bold">No syllabus added for this class yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {syllabus.map(syl => {
                            const done  = completedCount(syl.topics);
                            const total = syl.topics.length;
                            const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                            const isOpen = expandedId === syl._id;

                            return (
                                <Card key={syl._id} className="overflow-hidden">
                                    {/* Card Header */}
                                    <div
                                        className="flex items-center gap-3 cursor-pointer"
                                        onClick={() => setExpandedId(isOpen ? null : syl._id)}
                                    >
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-gray-900">
                                                    {syl.subjectId?.subjectName}
                                                </span>
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-primary rounded-full border border-indigo-100">
                                                    {syl.term}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400">
                                                    {syl.subjectId?.subjectCode}
                                                </span>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="flex-grow h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-400 rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 shrink-0">
                                                    {done}/{total} topics
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={e => { e.stopPropagation(); openEdit(syl); }}
                                                className="p-2 text-gray-400 hover:text-primary hover:bg-indigo-50 rounded-xl transition-all"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={e => { e.stopPropagation(); handleDelete(syl._id, syl.subjectId?.subjectName); }}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                            {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Expanded Topics */}
                                    {isOpen && (
                                        <div className="mt-4 pt-4 border-t border-gray-50 space-y-1">
                                            {syl.notes && (
                                                <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3">
                                                    ≡ƒô¥ {syl.notes}
                                                </p>
                                            )}
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pb-1">
                                                Click topic to mark complete / incomplete
                                            </p>
                                            {syl.topics.map((t, i) => (
                                                <button
                                                    key={t._id || i}
                                                    onClick={() => handleToggleTopic(syl._id, t._id)}
                                                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all text-left
                                                        ${t.isCompleted ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}
                                                >
                                                    {t.isCompleted
                                                        ? <CheckCircle2 size={17} className="text-green-500 mt-0.5 shrink-0" />
                                                        : <Circle size={17} className="text-gray-300 mt-0.5 shrink-0" />
                                                    }
                                                    <div>
                                                        <p className={`text-sm font-bold ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                            {i + 1}. {t.title}
                                                        </p>
                                                        {t.description && (
                                                            <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )
            )}

            {/* Add / Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editTarget ? 'Edit Syllabus' : 'Add Syllabus'}
                size="lg"
            >
                <div className="space-y-5">
                    {/* Subject + Term */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase ml-1">Subject</label>
                            <select
                                disabled={!!editTarget}
                                value={form.subjectId}
                                onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                                className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-700 outline-none focus:border-primary disabled:opacity-60"
                            >
                                <option value="">-- Select Subject --</option>
                                {subjects.map(s => (
                                    <option key={s._id} value={s._id}>{s.subjectName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase ml-1">Term</label>
                            <select
                                value={form.term}
                                onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                                className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-700 outline-none focus:border-primary"
                            >
                                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase ml-1">Notes / Reference Book (Optional)</label>
                        <textarea
                            rows={2}
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="e.g. NCERT Class 5 Mathematics"
                            className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-medium text-gray-700 outline-none focus:border-primary resize-none"
                        />
                    </div>

                    {/* Topics List */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase ml-1">
                            Topics / Chapters ({form.topics.length} added)
                        </label>

                        {form.topics.length > 0 && (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {form.topics.map((t, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                        <GripVertical size={14} className="text-gray-300 shrink-0" />
                                        {/* Completion toggle inside modal */}
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({
                                                ...f,
                                                topics: f.topics.map((tp, idx) =>
                                                    idx === i ? { ...tp, isCompleted: !tp.isCompleted } : tp
                                                )
                                            }))}
                                            className="shrink-0"
                                        >
                                            {t.isCompleted
                                                ? <CheckCircle2 size={16} className="text-green-500" />
                                                : <Circle size={16} className="text-gray-300" />
                                            }
                                        </button>
                                        <div className="flex-grow min-w-0">
                                            <p className={`text-sm font-bold truncate ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                {i + 1}. {t.title}
                                            </p>
                                            {t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}
                                        </div>
                                        <button
                                            onClick={() => removeTopic(i)}
                                            className="p-1 text-gray-300 hover:text-red-500 rounded-lg transition-all shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add new topic inline */}
                        <div className="flex gap-2 pt-1">
                            <div className="flex-grow space-y-1">
                                <input
                                    value={newTopic.title}
                                    onChange={e => setNewTopic(n => ({ ...n, title: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && addTopic()}
                                    placeholder="Topic / Chapter name (press Enter)"
                                    className="w-full h-10 px-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-primary"
                                />
                                <input
                                    value={newTopic.description}
                                    onChange={e => setNewTopic(n => ({ ...n, description: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && addTopic()}
                                    placeholder="Short description (optional)"
                                    className="w-full h-9 px-3 bg-white border-2 border-gray-100 rounded-xl text-xs font-medium text-gray-500 outline-none focus:border-primary"
                                />
                            </div>
                            <button
                                onClick={addTopic}
                                className="px-4 bg-indigo-50 text-primary rounded-xl font-black text-sm hover:bg-primary hover:text-white transition-all shrink-0"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    <Button fullWidth icon={Save} isLoading={saving} onClick={handleSave}>
                        Save Syllabus
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default SyllabusManagement;