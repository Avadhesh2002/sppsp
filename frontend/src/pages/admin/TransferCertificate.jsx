import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, FileText, Printer, AlertTriangle, CheckCircle2,
    User, Calendar, BookOpen, Hash, RefreshCw, X, ChevronDown
} from 'lucide-react';
import API from '../../api/axios';
import { useSettings } from '../../context/SettingsContext';
import { printTransferCertificate } from '../../utils/transferCertificatePdf';
import principalSign from '../../assets/sign.png';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const REASON_OPTIONS = [
    "Parent's Request",
    "Family Relocation",
    "Admission in Another School",
    "Completion of Studies",
    "Financial Reasons",
    "Medical Reasons",
    "Other",
];

const REMARK_OPTIONS = [
    "Student has been regular and well-behaved throughout.",
    "Student has shown good academic progress during the session.",
    "Student has been sincere, hardworking and disciplined.",
    "Student's conduct and character have been satisfactory.",
    "Student has actively participated in co-curricular activities.",
    "Other",
];

const CLASS_ORDER = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];

// ── Sub-components ────────────────────────────────────────────────────────────

function StudentCard({ student, onSelect, selected }) {
    const hasTc = !!student.tcIssuedAt;
    return (
        <div
            onClick={() => onSelect(student)}
            className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
                ${selected
                    ? 'border-primary bg-primary/5 shadow-md shadow-indigo-100'
                    : 'border-gray-100 bg-white hover:border-primary/40 hover:shadow-sm'
                }`}
        >
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0
                ${selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                {student.name?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{student.name}</p>
                <p className="text-xs text-secondary mt-0.5">
                    Class {student.class} &nbsp;·&nbsp; Adm No: {student.UID || '—'}
                </p>
                <p className="text-xs text-secondary truncate">
                    Father: {student.fatherName || '—'}
                </p>
            </div>

            {hasTc && (
                <span className="absolute top-2 right-2 text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    TC Issued
                </span>
            )}
            {selected && !hasTc && (
                <CheckCircle2 size={18} className="text-primary shrink-0" />
            )}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-xs font-bold text-secondary w-32 shrink-0">{label}</span>
            <span className="text-xs text-gray-800 font-medium">{value || '—'}</span>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TransferCertificate = () => {
    const { settings } = useSettings();

    const [students, setStudents]       = useState([]);
    const [filtered, setFiltered]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [toast, setToast]             = useState(null);
    const [selected, setSelected]       = useState(null);
    const [issuing, setIssuing]         = useState(false);
    const [printing, setPrinting]       = useState(false);

    // Filters
    const [search, setSearch]           = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [showTcOnly, setShowTcOnly]   = useState(false);

    // TC Form fields
    const [tcNumber, setTcNumber]             = useState('');
    const [reason, setReason]                 = useState("Parent's Request");
    const [customReason, setCustomReason]     = useState('');
    const [admissionDate, setAdmissionDate]   = useState('');
    const [admissionClass, setAdmissionClass] = useState('');
    const [leavingDate, setLeavingDate]       = useState('');
    const [applicationDate, setApplicationDate] = useState('');
    const [remark, setRemark]                   = useState('');
    const [customRemark, setCustomRemark]       = useState('');
    const [bookNo, setBookNo]                   = useState('');
    const [srNo, setSrNo]                       = useState('');
    const [religion, setReligion]               = useState('');
    const [caste, setCaste]                     = useState('');

    // ── Load students ──
    const loadStudents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/admin/students', { params: { status: 'inactive', limit: 500 } });
            const list = res.data?.students || res.data || [];
            // Also fetch graduated students
            const res2 = await API.get('/admin/students', { params: { status: 'graduated', limit: 500 } });
            const list2 = res2.data?.students || res2.data || [];
            const combined = [...list, ...list2];
            setStudents(combined);
            setFiltered(combined);
        } catch {
            setToast({ message: 'Failed to load students', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    // ── Filter logic ──
    useEffect(() => {
        let list = [...students];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.name?.toLowerCase().includes(q) ||
                s.UID?.toLowerCase().includes(q) ||
                s.fatherName?.toLowerCase().includes(q)
            );
        }
        if (classFilter) list = list.filter(s => s.class === classFilter);
        if (showTcOnly)  list = list.filter(s => !!s.tcIssuedAt);
        setFiltered(list);
    }, [search, classFilter, showTcOnly, students]);

    // ── Auto-generate TC number + pre-fill editable fields ──
    useEffect(() => {
        if (selected) {
            const tc = selected.tcDetails;
            // If TC already issued, restore saved details
            if (selected.tcIssuedAt && tc) {
                setTcNumber(tc.tcNumber || '');
                setAdmissionDate(tc.admissionDate ? new Date(tc.admissionDate).toISOString().split('T')[0] : '');
                setAdmissionClass(tc.admissionClass || selected.class || '');
                setLeavingDate(tc.leavingDate ? new Date(tc.leavingDate).toISOString().split('T')[0] : '');
                setApplicationDate(tc.applicationDate ? new Date(tc.applicationDate).toISOString().split('T')[0] : '');
                setReason(tc.reason || "Parent's Request");
                setCustomReason('');
                setRemark(tc.remark || '');
                setCustomRemark('');
                setBookNo(tc.bookNo || '');
                setSrNo(tc.srNo || '');
                setReligion(tc.religion || '');
                setCaste(tc.caste || '');
            } else {
                // Fresh issue — auto-generate defaults
                const year = new Date().getFullYear();
                const seq  = String(Math.floor(Math.random() * 9000) + 1000);
                setTcNumber(`TC/${year}/${seq}`);
                setAdmissionDate(
                    selected.admissionDate
                        ? new Date(selected.admissionDate).toISOString().split('T')[0]
                        : ''
                );
                setAdmissionClass(selected.class || '');
                setLeavingDate(new Date().toISOString().split('T')[0]);
                setApplicationDate(new Date().toISOString().split('T')[0]);
                setReason("Parent's Request");
                setCustomReason('');
                setRemark('');
                setCustomRemark('');
                setBookNo('');
                setSrNo('');
                setReligion('');
                setCaste('');
            }
        }
    }, [selected]);

    // ── Issue TC (marks in DB) ──
    const handleIssueTC = async () => {
        if (!selected) return;
        if (selected.tcIssuedAt) {
            // Already issued — just print duplicate
            handlePrint(true);
            return;
        }
        if (!window.confirm(`Issue Transfer Certificate for ${selected.name}? This action will be recorded.`)) return;

        setIssuing(true);
        try {
            const res = await API.put(`/admin/students/${selected._id}/issue-tc`, {
                tcNumber,
                bookNo,
                srNo,
                religion,
                caste,
                admissionDate,
                admissionClass,
                leavingDate,
                applicationDate,
                reason: reason === 'Other' ? customReason : reason,
                remark: remark === 'Other' ? customRemark : remark,
            });
            const updated = { ...selected, tcIssuedAt: res.data.tcIssuedAt, tcDetails: res.data.tcDetails };
            setSelected(updated);
            setStudents(prev => prev.map(s => s._id === updated._id ? updated : s));
            setToast({ message: `TC issued for ${selected.name}`, type: 'success' });
            handlePrint(false, updated);
        } catch {
            setToast({ message: 'Failed to issue TC', type: 'error' });
        } finally {
            setIssuing(false);
        }
    };

    // ── Print TC ──
    const handlePrint = (isDuplicate = false, studentOverride = null) => {
        const s = studentOverride || selected;
        if (!s) return;
        setPrinting(true);
        setTimeout(() => {
            printTransferCertificate({
                student: s,
                tcNumber,
                bookNo,
                srNo,
                religion,
                caste,
                issueDate: s.tcIssuedAt || new Date(),
                isDuplicate,
                reason: reason === 'Other' ? customReason : reason,
                admissionDate: admissionDate || s.admissionDate,
                admissionClass,
                leavingDate,
                applicationDate,
                remark: remark === 'Other' ? customRemark : remark,
                schoolName: settings.schoolName,
                schoolAddress: settings.schoolAddress,
                schoolPhone: settings.contactNumber,
                schoolEmail: settings.schoolEmail,
                schoolAffiliation: settings.schoolAffiliation,
                affiliationNumber: settings.affiliationNumber,
                schoolCode: settings.schoolCode,
                schoolLogo: settings.schoolLogo,
                academicYear: settings.currentAcademicYear,
                principalName: settings.principalName,
                principalSign,
            });
            setPrinting(false);
        }, 100);
    };

    const tcIssued = selected?.tcIssuedAt;

    return (
        <div className="space-y-6">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Transfer Certificate</h1>
                <p className="text-sm text-secondary font-medium">
                    Issue and print official Transfer Certificates for inactive students.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* ── LEFT: Student Selector ── */}
                <div className="xl:col-span-2 space-y-4">

                    {/* Search & Filters */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, Admission No., father's name..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <select
                                    value={classFilter}
                                    onChange={e => setClassFilter(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                    <option value="">All Classes</option>
                                    {CLASS_ORDER.map(c => <option key={c} value={c}>Class {c}</option>)}
                                </select>
                                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>

                            <button
                                onClick={() => setShowTcOnly(v => !v)}
                                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all
                                    ${showTcOnly
                                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                                        : 'bg-gray-50 border-gray-200 text-secondary hover:border-primary/40'
                                    }`}
                            >
                                TC Issued
                            </button>

                            <button
                                onClick={() => { setSearch(''); setClassFilter(''); setShowTcOnly(false); }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                                title="Clear filters"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>

                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                            {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    {/* Student List */}
                    <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <LoadingSpinner size="md" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12 text-secondary text-sm font-medium">
                                {students.length === 0
                                    ? 'No inactive or graduated students found'
                                    : 'No students match your search'
                                }
                            </div>
                        ) : (
                            filtered.map(s => (
                                <StudentCard
                                    key={s._id}
                                    student={s}
                                    selected={selected?._id === s._id}
                                    onSelect={setSelected}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* ── RIGHT: TC Form & Preview ── */}
                <div className="xl:col-span-3 space-y-4">
                    {!selected ? (
                        <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center p-8">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                                <FileText size={28} className="text-primary" />
                            </div>
                            <p className="font-bold text-gray-700">Select a Student</p>
                            <p className="text-sm text-secondary mt-1">
                                Choose a student from the list to generate their Transfer Certificate.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Student Info Card */}
                            <Card title="Student Details" icon={User}>
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-black text-primary shrink-0">
                                        {selected.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 gap-x-6">
                                        <InfoRow label="Full Name"     value={selected.name} />
                        <InfoRow label="Admission No." value={selected.UID} />
                                        <InfoRow label="Class"         value={`Class ${selected.class}`} />
                                        <InfoRow label="Gender"        value={selected.gender} />
                                        <InfoRow label="Father's Name" value={selected.fatherName} />
                                        <InfoRow label="Mother's Name" value={selected.motherName} />
                                        <InfoRow label="Date of Birth" value={fmtDate(selected.dateOfBirth)} />
                                        <InfoRow label="Category"      value={selected.category} />
                                        <InfoRow label="Admission Date" value={fmtDate(selected.admissionDate)} />
                                        <InfoRow label="TC Status"
                                            value={tcIssued
                                                ? `Issued on ${fmtDate(selected.tcIssuedAt)}`
                                                : 'Not Issued'
                                            }
                                        />
                                    </div>
                                    <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>

                                {tcIssued && (
                                    <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold">
                                        <AlertTriangle size={14} className="shrink-0" />
                                        TC already issued on {fmtDate(selected.tcIssuedAt)}. Printing again will generate a DUPLICATE copy.
                                    </div>
                                )}
                            </Card>

                            {/* TC Configuration */}
                            <Card title="Certificate Details" icon={FileText}>
                                {tcIssued && (
                                    <div className="flex items-center gap-2 mb-4 p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-xs font-bold">
                                        <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                                        Fields are locked after TC is issued. Print duplicate to reprint.
                                    </div>
                                )}
                                <fieldset disabled={!!tcIssued} className="contents">
                                <div className={`grid grid-cols-2 gap-4 ${tcIssued ? 'opacity-60 pointer-events-none select-none' : ''}`}>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Book No</label>
                                        <input
                                            type="text"
                                            value={bookNo}
                                            onChange={e => setBookNo(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                                            placeholder="e.g. 01"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Sr No</label>
                                        <input
                                            type="text"
                                            value={srNo}
                                            onChange={e => setSrNo(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                                            placeholder="e.g. 001"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Religion</label>
                                        <input
                                            type="text"
                                            value={religion}
                                            onChange={e => setReligion(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                            placeholder="e.g. Hindu"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Caste</label>
                                        <input
                                            type="text"
                                            value={caste}
                                            onChange={e => setCaste(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                            placeholder="e.g. Brahmin"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">TC Number</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tcNumber}
                                                onChange={e => setTcNumber(e.target.value)}
                                                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                                                placeholder="TC/2025/0001"
                                            />
                                            <button
                                                onClick={() => {
                                                    const y = new Date().getFullYear();
                                                    setTcNumber(`TC/${y}/${String(Math.floor(Math.random()*9000)+1000)}`);
                                                }}
                                                className="p-2 text-gray-400 hover:text-primary hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Regenerate"
                                            >
                                                <RefreshCw size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Academic Year</label>
                                        <input
                                            type="text"
                                            value={settings.currentAcademicYear || ''}
                                            readOnly
                                            className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Date of Admission</label>
                                        <input
                                            type="date"
                                            value={admissionDate}
                                            onChange={e => setAdmissionDate(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Date of Leaving</label>
                                        <input
                                            type="date"
                                            value={leavingDate}
                                            onChange={e => setLeavingDate(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Class at Time of Admission</label>
                                        <div className="relative">
                                            <select
                                                value={admissionClass}
                                                onChange={e => setAdmissionClass(e.target.value)}
                                                className="w-full appearance-none px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                            >
                                                <option value="">Select class...</option>
                                                {CLASS_ORDER.map(c => <option key={c} value={c}>Class {c}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Class at Time of Leaving</label>
                                        <input
                                            type="text"
                                            value={`Class ${selected?.class || '—'}`}
                                            readOnly
                                            className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Reason for Leaving</label>
                                        <div className="relative">
                                            <select
                                                value={reason}
                                                onChange={e => setReason(e.target.value)}
                                                className="w-full appearance-none px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                            >
                                                {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                        {reason === 'Other' && (
                                            <input
                                                type="text"
                                                value={customReason}
                                                onChange={e => setCustomReason(e.target.value)}
                                                placeholder="Specify reason..."
                                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mt-2"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Date of Application</label>
                                        <input
                                            type="date"
                                            value={applicationDate}
                                            onChange={e => setApplicationDate(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Date of Issue</label>
                                        <input
                                            type="text"
                                            value={selected?.tcIssuedAt ? new Date(selected.tcIssuedAt).toLocaleDateString('en-IN') : 'On Issue'}
                                            readOnly
                                            className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-secondary uppercase">Remarks</label>
                                        <div className="relative">
                                            <select
                                                value={remark}
                                                onChange={e => setRemark(e.target.value)}
                                                className="w-full appearance-none px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                            >
                                                <option value="">Select a remark...</option>
                                                {REMARK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                        {remark === 'Other' && (
                                            <input
                                                type="text"
                                                value={customRemark}
                                                onChange={e => setCustomRemark(e.target.value)}
                                                placeholder="Write custom remark..."
                                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mt-2"
                                            />
                                        )}
                                    </div>

                                </div>
                                </fieldset>
                            </Card>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                {!tcIssued ? (
                                    <Button
                                        fullWidth
                                        icon={CheckCircle2}
                                        isLoading={issuing}
                                        onClick={handleIssueTC}
                                        className="bg-primary"
                                    >
                                        Issue TC &amp; Print
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            fullWidth
                                            icon={Printer}
                                            isLoading={printing}
                                            onClick={() => handlePrint(true)}
                                            variant="outline"
                                        >
                                            Print Duplicate
                                        </Button>
                                    </>
                                )}
                            </div>

                            {/* Info note */}
                            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-medium">
                                <Hash size={13} className="shrink-0 mt-0.5" />
                                <span>
                                    Issuing a TC records the date permanently in the student's profile.
                                    Subsequent prints are marked as <b>DUPLICATE</b> on the certificate.
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransferCertificate;