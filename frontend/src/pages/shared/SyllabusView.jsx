import React, { useState, useEffect } from 'react';
import {
    BookMarked, ChevronDown, ChevronUp,
    CheckCircle2, Circle, BookOpen
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

// ── Teacher needs to pick a class; student sees their own ──
const SyllabusView = () => {
    const { user }     = useAuth();
    const { settings } = useSettings();
    const isTeacher    = user?.role === 'teacher';

    const [classes,    setClasses]    = useState([]);
    const [selectedClass, setSelectedClass] = useState(null); // { _id, className }
    const [syllabus,   setSyllabus]   = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [error,      setError]      = useState(null);

    const CLASS_ORDER = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];

    // Teacher: load class list
    useEffect(() => {
        if (!isTeacher) return;
        API.get('/admin/classes').then(r => setClasses(r.data)).catch(() => {});
    }, [isTeacher]);

    // Student: load directly
    useEffect(() => {
        if (isTeacher) return;
        setLoading(true);
        API.get('/syllabus/my')
            .then(r => setSyllabus(r.data))
            .catch(() => setError('Could not load syllabus'))
            .finally(() => setLoading(false));
    }, [isTeacher]);

    // Teacher: load when class selected
    useEffect(() => {
        if (!isTeacher || !selectedClass) return;
        setLoading(true);
        API.get(`/syllabus/class/${selectedClass._id}`)
            .then(r => setSyllabus(r.data))
            .catch(() => setError('Could not load syllabus'))
            .finally(() => setLoading(false));
    }, [selectedClass, isTeacher]);

    const completedCount = (topics) => topics.filter(t => t.isCompleted).length;

    // Group syllabus by subject for cleaner display
    const grouped = syllabus.reduce((acc, syl) => {
        const key = syl.subjectId?._id || syl.subjectId;
        if (!acc[key]) acc[key] = { subject: syl.subjectId, entries: [] };
        acc[key].entries.push(syl);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Syllabus</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Session:</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-primary text-[10px] font-black rounded border border-indigo-100">
                        {settings.currentAcademicYear}
                    </span>
                    {!isTeacher && user?.class && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded border border-green-100">
                            Class {user.class}
                        </span>
                    )}
                </div>
            </div>

            {/* Teacher: class picker */}
            {isTeacher && (
                <Card>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
                        Select Class
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {CLASS_ORDER.map(cn => {
                            const cls = classes.find(c => c.className === cn);
                            if (!cls) return null;
                            return (
                                <button
                                    key={cls._id}
                                    onClick={() => { setSelectedClass(cls); setExpandedId(null); setSyllabus([]); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all border-2 ${
                                        selectedClass?._id === cls._id
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
            )}

            {/* Loading */}
            {loading && <div className="py-16"><LoadingSpinner size="lg" /></div>}

            {/* Error */}
            {error && <p className="text-center text-red-500 font-bold py-10">{error}</p>}

            {/* Empty */}
            {!loading && !error && syllabus.length === 0 && (isTeacher ? selectedClass : true) && (
                <div className="py-20 text-center opacity-30">
                    <BookMarked size={56} className="mx-auto mb-3" />
                    <p className="font-bold">No syllabus available yet</p>
                </div>
            )}

            {/* Teacher: prompt to select class */}
            {isTeacher && !selectedClass && !loading && (
                <div className="py-16 text-center opacity-40">
                    <BookOpen size={48} className="mx-auto mb-3" />
                    <p className="font-bold">Select a class to view its syllabus</p>
                </div>
            )}

            {/* Syllabus Cards — grouped by subject */}
            {!loading && Object.values(grouped).map(({ subject, entries }) => {
                const totalTopics = entries.reduce((s, e) => s + e.topics.length, 0);
                const doneTopics  = entries.reduce((s, e) => s + e.topics.filter(t => t.isCompleted).length, 0);
                const pct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

                return (
                    <Card key={subject?._id} className="overflow-hidden">
                        {/* Subject Header */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                                <h2 className="text-lg font-black text-gray-900">{subject?.subjectName}</h2>
                                <p className="text-[11px] font-bold text-gray-400">{subject?.subjectCode}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-2xl font-black text-primary">{pct}%</p>
                                <p className="text-[10px] font-bold text-gray-400">{doneTopics}/{totalTopics} done</p>
                            </div>
                        </div>

                        {/* Overall progress bar */}
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${pct}%`,
                                    background: pct === 100 ? '#22c55e' : pct > 60 ? '#6366f1' : '#f59e0b'
                                }}
                            />
                        </div>

                        {/* Term entries */}
                        {entries.map(syl => {
                            const isOpen = expandedId === syl._id;
                            const done   = completedCount(syl.topics);
                            const total  = syl.topics.length;

                            return (
                                <div key={syl._id} className="border border-gray-100 rounded-2xl overflow-hidden mb-2">
                                    {/* Term row */}
                                    <button
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-all"
                                        onClick={() => setExpandedId(isOpen ? null : syl._id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black px-2 py-0.5 bg-indigo-50 text-primary rounded-full border border-indigo-100">
                                                {syl.term}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400">{total} topics</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-black ${done === total ? 'text-green-500' : 'text-gray-400'}`}>
                                                {done}/{total}
                                            </span>
                                            {isOpen
                                                ? <ChevronUp size={16} className="text-gray-400" />
                                                : <ChevronDown size={16} className="text-gray-400" />
                                            }
                                        </div>
                                    </button>

                                    {/* Topics */}
                                    {isOpen && (
                                        <div className="px-4 pb-3 space-y-1.5 border-t border-gray-50">
                                            {syl.notes && (
                                                <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-3">
                                                    ≡ƒô¥ {syl.notes}
                                                </p>
                                            )}
                                            {syl.topics.map((t, i) => (
                                                <div key={t._id || i} className="flex items-start gap-3 py-2 px-1 rounded-xl hover:bg-gray-50">
                                                    {t.isCompleted
                                                        ? <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                                        : <Circle size={16} className="text-gray-300 mt-0.5 shrink-0" />
                                                    }
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-bold ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                            {i + 1}. {t.title}
                                                        </p>
                                                        {t.description && (
                                                            <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </Card>
                );
            })}
        </div>
    );
};

export default SyllabusView;