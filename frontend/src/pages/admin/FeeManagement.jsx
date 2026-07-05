import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Plus, Search, Users, TrendingUp, AlertCircle, Receipt,
  Trash2, Eye, Settings2, X, CheckCircle, Clock, CreditCard,
  ArrowUpRight, Banknote, Smartphone, BadgeCheck, ShieldCheck, Download,
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const MONTHS  = ['April','May','June','July','August','September','October','November','December','January','February','March'];
const MODES   = ['Cash','Bank Transfer','Google Pay','PhonePe'];
const FREQ    = ['monthly','quarterly','annually','one-time'];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const modeIcon = (mode) => {
    if (mode === 'Google Pay' || mode === 'PhonePe') return <Smartphone size={11} />;
    if (mode === 'Bank Transfer') return <CreditCard size={11} />;
    if (mode === 'Cash') return <Banknote size={11} />;
    return <CreditCard size={11} />;
};

const StatusPill = ({ status }) => {
    const cfg = {
        paid:    { cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
        partial: { cls: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
        pending: { cls: 'bg-red-100 text-red-600',         dot: 'bg-red-500' },
    }[status] || { cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {status}
        </span>
    );
};

const StatCard = ({ icon: Icon, label, value, sub, gradient, onClick }) => (
    <button onClick={onClick} className={`${gradient} rounded-2xl p-5 text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg`}>
        <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon size={20} className="text-white" />
            </div>
            {onClick && <ArrowUpRight size={16} className="text-white/60" />}
        </div>
        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">{label}</p>
        <p className="text-white text-2xl font-black mt-0.5">{value}</p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
    </button>
);

/* ─────────────────────────────────────────────────────────────────────────────
   RECEIPT MODAL  —  redesigned, compact, half-A4 printable
───────────────────────────────────────────────────────────────────────────── */
const ReceiptModal = ({ receiptData, onClose }) => {
    const { student, payments, academicYear, collectedAt, groupReceiptNo, discount, fine } = receiptData;
    const [downloading, setDownloading] = useState(false);
    const receiptDisplay = groupReceiptNo || payments[0]?.receiptNo || '—';
    const { settings }   = useSettings();

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const { downloadFeeReceipt } = await import('../../utils/feeReceiptPdf.js');
            downloadFeeReceipt({
                student, payments,
                groupReceiptNo: receiptDisplay,
                academicYear, collectedAt,
                discount: discount || 0,
                fine: fine || 0,
                schoolName:    settings?.schoolName,
                schoolAddress: settings?.schoolAddress,
                schoolPhone:   settings?.contactNumber,
                schoolLogo:    settings?.schoolLogo,
            });
        } catch (err) { console.error(err); }
        finally { setDownloading(false); }
    };

    /* One reusable receipt card used twice (parent + school) */
    return (
        <Modal isOpen onClose={onClose} title="Fee Collected" size="sm">
            <div className="space-y-5 py-2">
                {/* Success indicator */}
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="font-black text-slate-900 text-lg">Fee Collected!</p>
                        <p className="text-secondary text-sm mt-0.5">
                            {payments.length} month{payments.length > 1 ? 's' : ''} · Receipt #{receiptDisplay}
                        </p>
                        <p className="font-bold text-primary text-2xl mt-1">
                            ₹{payments.reduce((s, p) => s + p.amountPaid, 0).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

                {/* Two buttons */}
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleDownload} isLoading={downloading} className="flex-1" icon={Receipt}>
                        Download PDF
                    </Button>
                    <Button onClick={onClose} className="flex-1">Done</Button>
                </div>
                <p className="text-center text-xs text-slate-400">
                    PDF contains School Copy + Parent Copy on one A4 sheet
                </p>
            </div>
        </Modal>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   COLLECT FEE MODAL
───────────────────────────────────────────────────────────────────────────── */
const CollectFeeModal = ({ onClose, onSuccess, academicYear, structures }) => {
    const [search, setSearch] = useState('');
    const [students, setStudents] = useState([]);
    const [selected, setSelected] = useState(null);
    const [structure, setStructure] = useState(null);
    const [busRoute, setBusRoute]   = useState(null);
    const [admissionType, setAdmissionType] = useState('old');
    const [selectedMonths, setSelectedMonths] = useState(new Set());
    const [paidMonths, setPaidMonths] = useState(new Set()); // months already paid
    const [form, setForm] = useState({ discount: 0, fine: 0, paymentMode: 'Cash', transactionId: '', paidBy: '', remarks: '' });
    const [submitting, setSubmitting] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [toast, setToast] = useState(null);

    const searchStudents = useCallback(async () => {
        if (search.length < 2) return;
        try {
            const res = await API.get(`/admin/students?search=${search}&limit=10&page=1`);
            setStudents(res.data.students || res.data);
        } catch { setStudents([]); }
    }, [search]);

    useEffect(() => { const t = setTimeout(searchStudents, 400); return () => clearTimeout(t); }, [searchStudents]);

    const selectStudent = async (s) => {
        setSelected(s); setStudents([]); setSearch(s.name);
        setSelectedMonths(new Set());
        setStructure(structures.find(x => x.className === s.class && x.admissionType === admissionType) || null);
        // Fetch already paid months + bus route for this student
        try {
            const res = await API.get(`/fees/student/${s._id}?academicYear=${academicYear}`);
            const paid = new Set(
                (res.data.payments || [])
                    .filter(p => p.status === 'paid')
                    .map(p => p.month)
                    .filter(Boolean)
            );
            setPaidMonths(paid);
            setBusRoute(res.data.busRoute || null);
        } catch { setPaidMonths(new Set()); setBusRoute(null); }
    };

    useEffect(() => {
        if (selected) {
            setStructure(structures.find(x => x.className === selected.class && x.admissionType === admissionType) || null);
        }
    }, [admissionType, selected, structures]);

    const monthFeeMap = {};
    MONTHS.forEach(m => { monthFeeMap[m] = 0; });
    if (structure) {
        structure.feeComponents.forEach(c => {
            if (c.frequency === 'monthly') {
                MONTHS.forEach(m => { monthFeeMap[m] += c.amount; });
            } else if (c.dueMonth && monthFeeMap[c.dueMonth] !== undefined) {
                monthFeeMap[c.dueMonth] += c.amount;
            }
        });
    }
    // Auto-add bus fee if student is assigned to a route (skip June)
    if (busRoute?.monthlyFee > 0) {
        MONTHS.forEach(m => {
            if (m !== 'June') monthFeeMap[m] += busRoute.monthlyFee;
        });
    }

    const toggleMonth = (m) => {
        setSelectedMonths(prev => {
            const next = new Set(prev);
            next.has(m) ? next.delete(m) : next.add(m);
            return next;
        });
    };

    const monthsArr = Array.from(selectedMonths);
    const baseAmount = monthsArr.reduce((sum, m) => sum + (monthFeeMap[m] || 0), 0);
    const netAmount  = baseAmount - Number(form.discount || 0) + Number(form.fine || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selected) return setToast({ message: 'Select a student first', type: 'error' });
        if (selectedMonths.size === 0) return setToast({ message: 'Select at least one month', type: 'error' });
        setSubmitting(true);
        try {
            const res = await API.post('/fees/pay', {
                studentId: selected._id, academicYear,
                months: monthsArr,
                monthAmounts: Object.fromEntries(monthsArr.map(m => [m, monthFeeMap[m] || 0])),
                feeComponents: structure?.feeComponents || [],
                totalAmount: baseAmount,
                discount: Number(form.discount || 0),
                fine: Number(form.fine || 0),
                amountPaid: netAmount,
                paymentMode: form.paymentMode,
                transactionId: form.transactionId,
                paidBy: form.paidBy,
                remarks: form.remarks,
            });
            setReceiptData({
                student: res.data.student || selected,
                payments: res.data.payments || [res.data],
                groupReceiptNo: res.data.groupReceiptNo || res.data.payments?.[0]?.receiptNo || '',
                academicYear,
                collectedAt: new Date().toISOString(),
                discount: Number(form.discount || 0),
                fine: Number(form.fine || 0),
            });
            onSuccess(`Fee collected for ${monthsArr.length} month${monthsArr.length > 1 ? 's' : ''}`);
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        } finally { setSubmitting(false); }
    };

    return (
        <Modal isOpen onClose={onClose} title="Collect Fee" size="lg">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {receiptData && (
                <ReceiptModal receiptData={receiptData} onClose={() => { setReceiptData(null); onClose(); }} />
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Student search */}
                <div className="relative">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="Search student by name or admission no..."
                            value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} />
                    </div>
                    {students.length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-float mt-1 max-h-48 overflow-y-auto">
                            {students.map(s => (
                                <div key={s._id} onClick={() => selectStudent(s)} className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm flex items-center justify-between">
                                    <span className="font-semibold text-slate-800">{s.name}</span>
                                    <span className="text-slate-400 text-xs">Class {s.class} · {s.admissionNo || s.UID}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selected && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="font-bold text-primary">{selected.name}</p>
                        <p className="text-blue-600 text-sm">Class {selected.class} · {selected.admissionNo || selected.UID}</p>
                        {busRoute && <p className="text-violet-600 text-xs mt-1">🚌 {busRoute.routeName} · +₹{busRoute.monthlyFee}/month</p>}
                        {!structure && <p className="text-amber-600 text-xs mt-1">No fee structure for Class {selected.class} ({admissionType})</p>}
                    </div>
                )}

                {/* Admission type */}
                <div className="flex gap-2">
                    {[['old','Old / Continuing'],['new','New Admission']].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setAdmissionType(val)}
                            className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                                admissionType === val ? 'bg-primary text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Month multi-select */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Select Months</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setSelectedMonths(new Set(MONTHS))}
                                className="text-xs font-bold text-primary hover:underline">All</button>
                            <button type="button" onClick={() => setSelectedMonths(new Set())}
                                className="text-xs font-bold text-slate-400 hover:underline">Clear</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        {MONTHS.map(m => {
                            const fee        = monthFeeMap[m] || 0;
                            const isPaid     = paidMonths.has(m);
                            const isSelected = selectedMonths.has(m);
                            return (
                                <button key={m} type="button"
                                    disabled={isPaid}
                                    onClick={() => !isPaid && toggleMonth(m)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 text-left transition-all ${
                                        isPaid
                                            ? 'border-emerald-200 bg-emerald-50 cursor-not-allowed opacity-80'
                                            : isSelected
                                            ? 'border-primary bg-blue-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                            isPaid ? 'bg-emerald-500 border-emerald-500'
                                            : isSelected ? 'bg-primary border-primary'
                                            : 'border-slate-300'
                                        }`}>
                                            {(isPaid || isSelected) && <span className="text-white text-[8px] font-black">✔</span>}
                                        </div>
                                        <span className={`text-xs font-semibold ${isPaid ? 'text-emerald-700' : 'text-slate-700'}`}>
                                            {m.slice(0,3)}
                                        </span>
                                    </div>
                                    {isPaid
                                        ? <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Paid</span>
                                        : fee > 0 && <span className="text-[10px] text-slate-500 font-medium">{fmt(fee)}</span>
                                    }
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Payment details */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Payment Mode</label>
                        <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                            {MODES.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                    <Input label="Transaction ID" value={form.transactionId} onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))} />
                    <Input label="Discount (₹)" type="number" min="0" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
                    <Input label="Fine (₹)" type="number" min="0" value={form.fine} onChange={e => setForm(f => ({ ...f, fine: e.target.value }))} />
                    <Input label="Paid By" value={form.paidBy} onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))} />
                </div>
                <Input label="Remarks" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />

                {/* Net amount */}
                {selected && selectedMonths.size > 0 && (
                    <div className="rounded-2xl p-4 bg-primary">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-indigo-200 text-xs">{selectedMonths.size} month{selectedMonths.size > 1 ? 's' : ''} · Net Payable</p>
                                <p className="text-white text-3xl font-black">{fmt(netAmount)}</p>
                            </div>
                            <div className="text-right text-xs text-indigo-200 space-y-0.5">
                                <p>Base: {fmt(baseAmount)}</p>
                                {Number(form.discount) > 0 && <p className="text-emerald-300">-{fmt(form.discount)} disc</p>}
                                {Number(form.fine) > 0 && <p className="text-red-300">+{fmt(form.fine)} fine</p>}
                            </div>
                        </div>
                        {monthsArr.length > 0 && (
                            <p className="text-indigo-200 text-xs mt-2">{monthsArr.join(', ')}</p>
                        )}
                    </div>
                )}

                <div className="flex gap-3 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" isLoading={submitting} className="flex-1">Collect Fee</Button>
                </div>
            </form>
        </Modal>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   FEE STRUCTURE MODAL
───────────────────────────────────────────────────────────────────────────── */
const DEFAULT_MONTH_FEES = () =>
    MONTHS.map(month => ({ month, baseFee: 0, extraFees: [] }));

const initFromComponents = (feeComponents) => {
    const monthMap = {};
    MONTHS.forEach(m => { monthMap[m] = { month: m, baseFee: 0, extraFees: [] }; });
    feeComponents.forEach(c => {
        if (c.frequency === 'monthly') {
            MONTHS.forEach(m => { monthMap[m].baseFee = c.amount; });
        } else if (c.dueMonth && monthMap[c.dueMonth]) {
            monthMap[c.dueMonth].extraFees.push({ name: c.name, amount: c.amount });
        }
    });
    return MONTHS.map(m => monthMap[m]);
};

const FeeStructureModal = ({ onClose, onSuccess, academicYear, editing }) => {
    const [className, setClassName] = useState(editing?.className || CLASSES[0]);
    const [admissionType, setAdmissionType] = useState(editing?.admissionType || 'old');
    const [monthFees, setMonthFees] = useState(
        editing?.feeComponents?.length
            ? initFromComponents(editing.feeComponents)
            : DEFAULT_MONTH_FEES()
    );
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const updateBaseFee = (idx, val) =>
        setMonthFees(prev => prev.map((m, i) => i === idx ? { ...m, baseFee: Number(val) || 0 } : m));

    const addExtraFee = (idx) =>
        setMonthFees(prev => prev.map((m, i) => i === idx ? { ...m, extraFees: [...m.extraFees, { name: '', amount: 0 }] } : m));

    const updateExtraFee = (mIdx, eIdx, field, val) =>
        setMonthFees(prev => prev.map((m, i) => i === mIdx
            ? { ...m, extraFees: m.extraFees.map((e, j) => j === eIdx ? { ...e, [field]: field === 'amount' ? Number(val) || 0 : val } : e) }
            : m));

    const removeExtraFee = (mIdx, eIdx) =>
        setMonthFees(prev => prev.map((m, i) => i === mIdx
            ? { ...m, extraFees: m.extraFees.filter((_, j) => j !== eIdx) }
            : m));

    const fillAll = (val) =>
        setMonthFees(prev => prev.map(m => ({ ...m, baseFee: Number(val) || 0 })));

    const buildComponents = () => {
        const components = [];
        const baseFees = monthFees.map(m => m.baseFee);
        const allSame = baseFees.every(f => f === baseFees[0]) && baseFees[0] > 0;
        if (allSame) {
            components.push({ name: 'Monthly Fee', amount: baseFees[0], frequency: 'monthly', dueMonth: '' });
        } else {
            monthFees.forEach(m => {
                if (m.baseFee > 0) {
                    components.push({ name: 'Monthly Fee', amount: m.baseFee, frequency: 'one-time', dueMonth: m.month });
                }
            });
        }
        monthFees.forEach(m => {
            m.extraFees.forEach(e => {
                if (e.name && e.amount > 0) {
                    components.push({ name: e.name, amount: e.amount, frequency: 'one-time', dueMonth: m.month });
                }
            });
        });
        return components;
    };

    const annualTotal = monthFees.reduce((sum, m) => sum + m.baseFee + m.extraFees.reduce((s, e) => s + (e.amount || 0), 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const feeComponents = buildComponents();
        if (!feeComponents.length) return setToast({ message: 'Add at least one fee amount', type: 'error' });
        setSubmitting(true);
        try {
            if (editing) {
                await API.put(`/fees/structure/${editing._id}`, { feeComponents, academicYear });
            } else {
                await API.post('/fees/structure', { className, academicYear, admissionType, feeComponents });
            }
            onSuccess(editing ? 'Fee structure updated' : 'Fee structure created');
            onClose();
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        } finally { setSubmitting(false); }
    };

    return (
        <Modal isOpen onClose={onClose} title={editing ? 'Edit Fee Structure' : 'Create Fee Structure'} size="xl">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Class</label>
                        <select disabled={!!editing}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100"
                            value={className} onChange={e => setClassName(e.target.value)}>
                            {CLASSES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <Input label="Academic Year" value={academicYear} disabled />
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Admission Type</label>
                        <div className="flex gap-1.5">
                            {[['old','Old'],['new','New']].map(([val, label]) => (
                                <button key={val} type="button" disabled={!!editing} onClick={() => setAdmissionType(val)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all disabled:opacity-60 ${
                                        admissionType === val ? 'bg-primary text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
                                    }`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <span className="text-xs font-bold text-primary shrink-0">Fill all months:</span>
                    <input type="number" min="0" placeholder="Enter base fee amount"
                        className="w-full sm:flex-1 border border-blue-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                        onChange={e => fillAll(e.target.value)} />
                    <span className="text-xs text-slate-400 shrink-0">₹/month</span>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Month-wise Fee</label>
                        <span className="text-xs text-slate-400 hidden sm:block">Base fee + extra fees per month</span>
                    </div>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {monthFees.map((m, mIdx) => (
                            <div key={m.month} className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2.5">
                                    <span className="text-sm font-black text-slate-700 w-20 shrink-0">{m.month}</span>
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <span className="text-xs text-slate-400">₹</span>
                                        <input type="number" min="0" value={m.baseFee || ''}
                                            onChange={e => updateBaseFee(mIdx, e.target.value)}
                                            placeholder="Base fee"
                                            className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                                    </div>
                                    <button type="button" onClick={() => addExtraFee(mIdx)}
                                        className="text-[10px] font-bold text-primary bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0">
                                        <Plus size={11} /> Extra
                                    </button>
                                </div>
                                {m.extraFees.map((e, eIdx) => (
                                    <div key={eIdx} className="flex items-center gap-2 px-3 pb-2 pl-4">
                                        <input type="text" placeholder="Fee name"
                                            value={e.name} onChange={ev => updateExtraFee(mIdx, eIdx, 'name', ev.target.value)}
                                            className="flex-1 min-w-0 border border-violet-200 bg-violet-50 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-300" />
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-xs text-slate-400">₹</span>
                                            <input type="number" min="0" placeholder="0"
                                                value={e.amount || ''}
                                                onChange={ev => updateExtraFee(mIdx, eIdx, 'amount', ev.target.value)}
                                                className="w-16 border border-violet-200 bg-violet-50 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-300" />
                                        </div>
                                        <button type="button" onClick={() => removeExtraFee(mIdx, eIdx)}
                                            className="text-danger hover:text-danger/70 shrink-0">
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl p-4 flex justify-between items-center bg-primary">
                    <div>
                        <p className="text-indigo-200 text-xs">Annual Total</p>
                        <p className="text-white text-2xl font-black">₹{annualTotal.toLocaleString('en-IN')}</p>
                        <p className="text-indigo-200 text-xs mt-0.5">
                            Class {className} · {admissionType === 'new' ? 'New Admission' : 'Old / Continuing'}
                        </p>
                    </div>
                    <TrendingUp size={28} className="text-white/30" />
                </div>

                <div className="flex gap-3 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" isLoading={submitting} className="flex-1">{editing ? 'Update' : 'Create'}</Button>
                </div>
            </form>
        </Modal>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   STUDENT LEDGER MODAL
───────────────────────────────────────────────────────────────────────────── */
const StudentLedgerModal = ({ studentId, academicYear, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get(`/fees/student/${studentId}?academicYear=${academicYear}`)
            .then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
    }, [studentId, academicYear]);

    return (
        <Modal isOpen onClose={onClose} title="Student Fee Ledger" size="lg">
            {loading ? <LoadingSpinner /> : !data ? <p className="text-center text-slate-400">No data</p> : (
                <div className="space-y-4">
                    <div className="rounded-2xl p-4 bg-primary">
                        <p className="text-white font-black text-lg">{data.student.name}</p>
                        <p className="text-indigo-200 text-sm">Class {data.student.class} · {data.student.admissionNo || data.student.UID}</p>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-white/15 rounded-xl p-3">
                                <p className="text-indigo-200 text-xs">Total Paid</p>
                                <p className="text-emerald-300 font-black text-lg">{fmt(data.totalPaid)}</p>
                            </div>
                            <div className="bg-white/15 rounded-xl p-3">
                                <p className="text-indigo-200 text-xs">Balance Due</p>
                                <p className={`font-black text-lg ${data.totalDue > 0 ? 'text-red-300' : 'text-emerald-300'}`}>{fmt(data.totalDue)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-slate-100">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>{['Receipt','Month','Amount','Paid','Mode','Date'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.payments.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{p.receiptNo}</td>
                                        <td className="px-3 py-2.5 font-medium">{p.month || '—'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{fmt(p.totalAmount)}</td>
                                        <td className="px-3 py-2.5 font-bold text-primary">{fmt(p.amountPaid)}</td>
                                        <td className="px-3 py-2.5">
                                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                                                {modeIcon(p.paymentMode)} {p.paymentMode}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.payments.length === 0 && <p className="text-center text-slate-400 py-8">No payments found</p>}
                    </div>
                </div>
            )}
        </Modal>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const FeeManagement = () => {
    const { settings } = useSettings();
    const academicYear = settings?.academicYear || settings?.currentAcademicYear || '2025-26';

    const [tab, setTab] = useState('payments');
    const [summary, setSummary] = useState(null);
    const [payments, setPayments] = useState([]);
    const [structures, setStructures] = useState([]);
    const [defaulters, setDefaulters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [toast, setToast] = useState(null);

    const [showCollect, setShowCollect] = useState(false);
    const [showStructure, setShowStructure] = useState(false);
    const [editStructure, setEditStructure] = useState(null);
    const [ledgerStudent, setLedgerStudent] = useState(null);
    const [pendingUpi, setPendingUpi] = useState([]);
    const [pendingUpiCount, setPendingUpiCount] = useState(0);

    // Daily report
    const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [reportLoading, setReportLoading] = useState(false);

    const showToast = (message, type = 'success') => setToast({ message, type });

    const handleDownloadDailyReport = async () => {
        setReportLoading(true);
        try {
            const res = await API.get(`/fees/daily?date=${reportDate}&academicYear=${academicYear}`);
            const { downloadDailyCollectionPdf } = await import('../../utils/dailyCollectionPdf.js');
            downloadDailyCollectionPdf({
                ...res.data,
                schoolName:    settings?.schoolName,
                schoolAddress: settings?.schoolAddress,
                schoolPhone:   settings?.contactNumber,
                schoolLogo:    settings?.schoolLogo,
                academicYear,
            });
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to generate report', 'error');
        } finally { setReportLoading(false); }
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [sumRes, payRes, strRes] = await Promise.all([
                API.get(`/fees/summary?academicYear=${academicYear}`),
                API.get(`/fees/payments?academicYear=${academicYear}&page=${page}&limit=20`),
                API.get(`/fees/structure?academicYear=${academicYear}`),
            ]);
            setSummary(sumRes.data);
            setPayments(payRes.data.payments);
            setTotalPages(payRes.data.pages || 1);
            setStructures(strRes.data);
        } catch (err) { showToast(err.message, 'error'); }
        finally { setLoading(false); }
    }, [academicYear, page]);

    const loadDefaulters = useCallback(async () => {
        try {
            const res = await API.get(`/fees/defaulters?academicYear=${academicYear}${filterClass ? `&className=${filterClass}` : ''}`);
            setDefaulters(res.data);
        } catch { setDefaulters([]); }
    }, [academicYear, filterClass]);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { if (tab === 'defaulters') loadDefaulters(); }, [tab, loadDefaulters]);
    useEffect(() => { if (tab === 'pending_upi') loadPendingUpi(); }, [tab]);

    const loadPendingUpi = useCallback(async () => {
        try {
            const res = await API.get(`/fees/upi/pending?academicYear=${academicYear}`);
            setPendingUpi(res.data);
            setPendingUpiCount(res.data.length);
        } catch { setPendingUpi([]); }
    }, [academicYear]);

    // Keep badge count fresh on every data load
    useEffect(() => {
        API.get(`/fees/upi/pending?academicYear=${academicYear}`)
            .then(r => setPendingUpiCount(r.data.length))
            .catch(() => {});
    }, [academicYear]);

    const handleDeletePayment = async (id) => {
        if (!window.confirm('Delete this payment record?')) return;
        try { await API.delete(`/fees/payments/${id}`); showToast('Payment deleted'); loadData(); }
        catch (err) { showToast(err.message, 'error'); }
    };

    const handleDeleteStructure = async (id) => {
        if (!window.confirm('Delete this fee structure?')) return;
        try { await API.delete(`/fees/structure/${id}`); showToast('Fee structure deleted'); loadData(); }
        catch (err) { showToast(err.message, 'error'); }
    };

    const handleConfirmUpi = async (groupReceiptNo) => {
        try {
            await API.put(`/fees/upi/confirm/${groupReceiptNo}`);
            showToast('UPI payment confirmed');
            loadPendingUpi(); loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const handleRejectUpi = async (groupReceiptNo) => {
        if (!window.confirm('Reject and delete this UPI payment submission?')) return;
        try {
            await API.put(`/fees/upi/reject/${groupReceiptNo}`);
            showToast('Payment rejected', 'error');
            loadPendingUpi();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const filteredPayments = payments.filter(p => {
        const q = search.toLowerCase();
        return (!q || p.student?.name?.toLowerCase().includes(q) || p.receiptNo?.toLowerCase().includes(q) || p.groupReceiptNo?.toLowerCase().includes(q))
            && (!filterMonth || p.month === filterMonth);
    });

    const groupedPayments = (() => {
        const groups = {};
        filteredPayments.forEach(p => {
            const key = p.groupReceiptNo || p.receiptNo || p._id;
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        return Object.values(groups).sort((a, b) => new Date(b[0].createdAt) - new Date(a[0].createdAt));
    })();

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Hero Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <DollarSign size={22} className="text-primary" /> Fee Management
                    </h1>
                    <p className="text-sm text-secondary font-medium">Academic Year {academicYear}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setEditStructure(null); setShowStructure(true); }}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                        <Settings2 size={16} /> Fee Structure
                    </button>
                    <button onClick={() => setShowCollect(true)}
                        className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                        <Plus size={16} /> Collect Fee
                    </button>
                </div>
            </div>

            {/* ── Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={TrendingUp} label="Total Collected" value={summary ? fmt(summary.totalCollected) : '—'} sub={academicYear} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
                <StatCard icon={Receipt} label="Total Receipts" value={summary?.totalPayments ?? '—'} sub="payments" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" onClick={() => setTab('payments')} />
                <StatCard icon={AlertCircle} label="Defaulters" value={defaulters.length || '—'} sub="pending balance" gradient="bg-gradient-to-br from-red-500 to-rose-600" onClick={() => setTab('defaulters')} />
                <StatCard icon={Users} label="Fee Structures" value={structures.length} sub="classes configured" gradient="bg-gradient-to-br from-violet-500 to-purple-600" onClick={() => setTab('structures')} />
            </div>

            {/* ── Today's Summary + Daily Report Download */}
            {summary?.today && (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { icon: TrendingUp, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', label: 'Today Total', value: fmt(summary.today.total), sub: `${summary.today.count} receipt${summary.today.count !== 1 ? 's' : ''} today` },
                            { icon: Banknote,   iconBg: 'bg-amber-100',   iconColor: 'text-amber-600',   label: 'Today Cash',  value: fmt(summary.today.cash),  sub: 'Cash payments' },
                            { icon: Smartphone, iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    label: 'Today Digital', value: fmt(summary.today.online), sub: 'GPay / PhonePe / Bank' },
                        ].map(({ icon: Icon, iconBg, iconColor, label, value, sub }) => (
                            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center`}>
                                        <Icon size={14} className={iconColor} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900">{value}</p>
                                <p className="text-xs text-secondary mt-0.5">{sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Daily Collection Report download bar */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <Download size={15} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Daily Collection Report</p>
                                <p className="text-xs text-secondary">All payments by admin + student portal for any date</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:ml-auto">
                            <input
                                type="date"
                                value={reportDate}
                                onChange={e => setReportDate(e.target.value)}
                                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                                onClick={handleDownloadDailyReport}
                                disabled={reportLoading}
                                className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 shrink-0">
                                {reportLoading
                                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <Download size={14} />
                                }
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 overflow-x-auto">
                {[['payments','Payments'],['structures','Structures'],['defaulters','Defaulters']].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab === key ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {label}
                    </button>
                ))}
                <button onClick={() => setTab('pending_upi')}
                    className={`relative px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab === 'pending_upi' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    UPI Pending
                    {pendingUpiCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white text-[10px] font-black rounded-full flex items-center justify-center">
                            {pendingUpiCount}
                        </span>
                    )}
                </button>
            </div>

            {loading ? <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div> : (
                <>
                    {/* ── Payments Tab */}
                    {tab === 'payments' && (
                        <Card noPadding>
                            <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="Search by name or receipt no..." value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                                <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                                    value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                    <option value="">All Months</option>
                                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            <Table headers={['Receipt No','Student','Months','Total Paid','Mode','Date','']} count={groupedPayments.length} emptyMessage="No payments found" emptyIcon="≡ƒÆ│">
                                {groupedPayments.map(group => {
                                    const first = group[0];
                                    const totalPaid = group.reduce((s, p) => s + p.amountPaid, 0);
                                    const months = group.map(p => p.month || 'General').join(', ');
                                    const receiptNo = first.groupReceiptNo || first.receiptNo;
                                    return (
                                        <tr key={receiptNo} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-5 py-3 font-mono text-xs text-slate-400">{receiptNo}</td>
                                            <td className="px-5 py-3">
                                                <p className="font-semibold text-slate-800 text-sm">{first.student?.name}</p>
                                                <p className="text-xs text-secondary">Class {first.student?.class}</p>
                                            </td>
                                            <td className="px-5 py-3 text-slate-600 text-sm">
                                                {group.length > 1
                                                    ? <span className="inline-flex items-center gap-1 bg-blue-50 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">{group.length} months</span>
                                                    : <span>{months}</span>
                                                }
                                                {group.length > 1 && <p className="text-[10px] text-slate-400 mt-0.5">{months}</p>}
                                            </td>
                                            <td className="px-5 py-3 font-bold text-primary text-sm">{fmt(totalPaid)}</td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                                                    {modeIcon(first.paymentMode)} {first.paymentMode}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-secondary text-xs whitespace-nowrap">{fmtDate(first.createdAt)}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={async () => {
                                                            const { downloadFeeReceipt } = await import('../../utils/feeReceiptPdf.js');
                                                            downloadFeeReceipt({
                                                                student: first.student, payments: group,
                                                                groupReceiptNo: receiptNo, academicYear,
                                                                collectedAt: first.createdAt,
                                                                schoolName:    settings?.schoolName,
                                                                schoolAddress: settings?.schoolAddress,
                                                                schoolPhone:   settings?.contactNumber,
                                                                schoolLogo:    settings?.schoolLogo,
                                                            });
                                                        }}
                                                        className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors" title="Download Receipt">
                                                        <Receipt size={13} />
                                                    </button>
                                                    <button onClick={() => setLedgerStudent(first.student?._id)} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-primary transition-colors"><Eye size={13} /></button>
                                                    <button onClick={() => handleDeletePayment(first._id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-danger transition-colors"><Trash2 size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </Table>
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-slate-50 flex items-center justify-between">
                                    <p className="text-xs text-secondary">Page {page} of {totalPages}</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* ── Structures Tab */}
                    {tab === 'structures' && (
                        <div className="space-y-6">
                            {/* New Admission */}
                            {['new','old'].map(type => {
                                const filtered = structures.filter(s => s.admissionType === type);
                                const isNew = type === 'new';
                                return (
                                    <div key={type}>
                                        {/* Section Header */}
                                        <div className={`flex items-center gap-3 mb-3 p-3 rounded-2xl ${isNew ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50 border border-blue-100'}`}>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isNew ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                                <Users size={16} className="text-white" />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-black uppercase tracking-wide ${isNew ? 'text-emerald-800' : 'text-blue-800'}`}>
                                                    {isNew ? 'New Admission' : 'Old / Continuing Students'}
                                                </p>
                                                <p className="text-xs text-slate-500">{filtered.length} class{filtered.length !== 1 ? 'es' : ''} configured</p>
                                            </div>
                                            <button onClick={() => { setEditStructure(null); setShowStructure(true); }}
                                                className={`ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${isNew ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                                                <Plus size={13} /> Add
                                            </button>
                                        </div>

                                        {filtered.length === 0 ? (
                                            <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center py-10 text-slate-400">
                                                <Settings2 size={32} className="mb-2 opacity-30" />
                                                <p className="text-sm font-semibold">No structures for {isNew ? 'new' : 'old'} students</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {filtered.map(s => {
                                                    const MONTHS_LIST = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                                                    const monthMap = {};
                                                    MONTHS_LIST.forEach(m => { monthMap[m] = { base: 0, extras: [] }; });
                                                    s.feeComponents.forEach(c => {
                                                        if (c.frequency === 'monthly') {
                                                            MONTHS_LIST.forEach(m => { monthMap[m].base += c.amount; });
                                                        } else if (c.dueMonth && monthMap[c.dueMonth]) {
                                                            if (c.name === 'Monthly Fee') monthMap[c.dueMonth].base += c.amount;
                                                            else monthMap[c.dueMonth].extras.push({ name: c.name, amount: c.amount });
                                                        }
                                                    });
                                                    const activeMonths = MONTHS_LIST.filter(m => monthMap[m].base > 0 || monthMap[m].extras.length > 0);
                                                    const baseFees = activeMonths.map(m => monthMap[m].base);
                                                    const allSameBase = baseFees.length > 0 && baseFees.every(f => f === baseFees[0]);
                                                    const extraFeeMonths = MONTHS_LIST.filter(m => monthMap[m].extras.length > 0);
                                                    return (
                                                        <div key={s._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                                            {/* Card Header */}
                                                            <div className={`px-4 py-3 flex items-center justify-between ${isNew ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                                                                <div>
                                                                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Class</p>
                                                                    <p className="text-white text-2xl font-black leading-tight">{s.className}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Annual Total</p>
                                                                    <p className="text-white text-xl font-black">{fmt(s.totalAnnual)}</p>
                                                                </div>
                                                            </div>

                                                            {/* Fee Breakdown */}
                                                            <div className="p-4 space-y-2">
                                                                {allSameBase && baseFees[0] > 0 && (
                                                                    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-700">Monthly Fee</p>
                                                                            <p className="text-[10px] text-slate-400">× {activeMonths.length} months</p>
                                                                        </div>
                                                                        <p className="font-black text-slate-800">{fmt(baseFees[0])}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                                                                    </div>
                                                                )}
                                                                {!allSameBase && activeMonths.length > 0 && (
                                                                    <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Month-wise Fees</p>
                                                                        {activeMonths.map(m => (
                                                                            <div key={m} className="flex justify-between text-xs">
                                                                                <span className="text-slate-600">{m}</span>
                                                                                <span className="font-bold text-slate-800">{fmt(monthMap[m].base)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {extraFeeMonths.length > 0 && (
                                                                    <div className="bg-violet-50 rounded-xl p-3 space-y-1.5">
                                                                        <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-2">Extra / One-time Fees</p>
                                                                        {extraFeeMonths.map(m => monthMap[m].extras.map((e, i) => (
                                                                            <div key={`${m}-${i}`} className="flex justify-between text-xs">
                                                                                <span className="text-violet-700">{e.name} <span className="text-violet-400">({m})</span></span>
                                                                                <span className="font-bold text-violet-800">{fmt(e.amount)}</span>
                                                                            </div>
                                                                        )))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="px-4 pb-4 flex gap-2">
                                                                <button onClick={() => { setEditStructure(s); setShowStructure(true); }}
                                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                                                                    <Settings2 size={13} /> Edit
                                                                </button>
                                                                <button onClick={() => handleDeleteStructure(s._id)}
                                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-danger text-xs font-bold transition-colors">
                                                                    <Trash2 size={13} /> Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {structures.length === 0 && (
                                <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center py-16 text-slate-400">
                                    <Settings2 size={40} className="mb-3 opacity-30" />
                                    <p className="font-semibold">No fee structures yet</p>
                                    <p className="text-sm mt-1">Click "Fee Structure" to create one</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Defaulters Tab */}
                    {tab === 'defaulters' && (
                        <Card noPadding>
                            <div className="p-4 border-b border-slate-50 flex items-center gap-3">
                                <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                                    value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                    <option value="">All Classes</option>
                                    {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                                </select>
                                <Button variant="outline" size="sm" onClick={loadDefaulters}>Refresh</Button>
                                {defaulters.length > 0 && (
                                    <span className="ml-auto text-sm text-danger font-bold bg-red-50 px-3 py-1.5 rounded-xl">
                                        {defaulters.length} defaulters
                                    </span>
                                )}
                            </div>
                            <Table headers={['Student','Class','Unpaid Months','Due Amount','']} count={defaulters.length} emptyMessage="No defaulters — all months cleared!" emptyIcon="Γ£à">
                                {defaulters.map(({ student, totalPaid, unpaidMonths, monthCount, balance }) => (
                                    <tr key={student._id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-slate-800">{student.name}</p>
                                            <p className="text-xs text-secondary">{student.admissionNo || student.UID}</p>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600">{student.class}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(unpaidMonths || []).map(m => (
                                                    <span key={m} className="bg-red-100 text-danger text-xs font-semibold px-2 py-0.5 rounded-full">{m.slice(0,3)}</span>
                                                ))}
                                            </div>
                                            <p className="text-xs text-secondary mt-0.5">{monthCount} month{monthCount !== 1 ? 's' : ''} pending</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="bg-red-100 text-danger font-bold px-3 py-1 rounded-xl text-sm">{fmt(balance)}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <button onClick={() => setLedgerStudent(student._id)} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-primary transition-colors"><Eye size={13} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </Table>
                        </Card>
                    )}

                    {/* ── Pending UPI Tab */}
                    {tab === 'pending_upi' && (
                        <Card noPadding>
                            <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Smartphone size={16} className="text-amber-500" />
                                    <span className="font-bold text-slate-700 text-sm">Pending UPI Payments</span>
                                    {pendingUpi.length > 0 && (
                                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingUpi.length} pending</span>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" onClick={loadPendingUpi}>Refresh</Button>
                            </div>
                            {pendingUpi.length === 0 ? (
                                <div className="flex flex-col items-center py-16 text-slate-400">
                                    <ShieldCheck size={40} className="mb-3 opacity-30" />
                                    <p className="font-semibold">No pending UPI payments</p>
                                    <p className="text-sm mt-1">All student UPI submissions have been reviewed</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {pendingUpi.map(group => {
                                        const first = group[0];
                                        const totalAmt = group.reduce((s, p) => s + p.amountPaid, 0);
                                        const months = group.map(p => p.month || 'General').join(', ');
                                        return (
                                            <div key={first.groupReceiptNo} className="px-5 py-4 hover:bg-amber-50/30 transition-colors">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-slate-800">{first.student?.name}</span>
                                                            <span className="text-xs text-secondary bg-slate-100 px-2 py-0.5 rounded-full">Class {first.student?.class}</span>
                                                            <span className="text-xs font-mono text-slate-400">#{first.groupReceiptNo}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 mt-1">Months: <span className="font-semibold">{months}</span></p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Smartphone size={12} className="text-blue-500" />
                                                            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Txn: {first.transactionId}</span>
                                                        </div>
                                                        {first.paidBy && <p className="text-xs text-slate-400 mt-0.5">Paid by: {first.paidBy}</p>}
                                                        <p className="text-xs text-slate-400 mt-0.5">{fmtDate(first.createdAt)}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-black text-slate-900 text-lg">{fmt(totalAmt)}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <button onClick={() => handleConfirmUpi(first.groupReceiptNo)}
                                                                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                                                                <CheckCircle size={13} /> Confirm
                                                            </button>
                                                            <button onClick={() => handleRejectUpi(first.groupReceiptNo)}
                                                                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-danger text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                                                                <X size={13} /> Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    )}

                </>
            )}

            {showCollect && <CollectFeeModal academicYear={academicYear} structures={structures} onClose={() => setShowCollect(false)} onSuccess={msg => { showToast(msg); loadData(); }} />}
            {showStructure && <FeeStructureModal academicYear={academicYear} editing={editStructure} onClose={() => { setShowStructure(false); setEditStructure(null); }} onSuccess={msg => { showToast(msg); loadData(); }} />}
            {ledgerStudent && <StudentLedgerModal studentId={ledgerStudent} academicYear={academicYear} onClose={() => setLedgerStudent(null)} />}
        </div>
    );
};

export default FeeManagement;