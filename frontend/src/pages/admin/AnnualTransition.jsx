import React, { useState, useEffect } from 'react';
import { AlertTriangle, Users, GraduationCap, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const AnnualTransition = () => {
    // ✅ CORRECT: All hooks must be inside the component body
    const { settings, refreshSettings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [nextYearLabel, setNextYearLabel] = useState("");
    const [confirmText, setConfirmText] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState(null);

    // Mock summary data (In production, fetch these from an API)
    const summary = {
        totalToPromote: "Calculating...",
        totalToGraduate: "Calculating..."
    };

    const handlePromotion = async () => {
        if (confirmText !== "CONFIRM") return;
        setLoading(true);
        try {
            // 1. ONLY Promote Students (Keep this)
            await API.post('/admin/promote-mass', { 
                nextYearLabel, 
                failedStudentIds: [] 
            });

            // 2. Success Logic
            setToast({ message: "Annual Transition Complete!", type: "success" });
            setIsModalOpen(false);
            await refreshSettings(); 
            
        } catch (err) {
            setToast({ message: err.response?.data?.message || "Operation failed", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const isReady = nextYearLabel.length > 4 && confirmText === "CONFIRM";

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            
            <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-start gap-4">
                <AlertTriangle className="text-warning shrink-0" size={32} />
                <div>
                    <h1 className="text-xl font-black text-amber-900">Annual Transition Hub</h1>
                    <p className="text-sm text-amber-700 font-medium">This is a high-security operation. You are about to move the entire school into a new academic session.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card title="Promotion Summary" icon={Users}>
                   <p className="text-sm font-bold text-secondary">All active students will move to the next grade.</p>
                </Card>
                <Card title="Graduation Logic" icon={GraduationCap}>
                   <p className="text-sm font-bold text-secondary">Class 12 students will be marked as "Graduated".</p>
                </Card>
            </div>

            <Card title="Transition Parameters">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase">Target Academic Year</label>
                        <input 
                            type="text" 
                            placeholder="e.g. 2025-2026"
                            className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 font-black text-lg focus:border-primary outline-none mt-1"
                            value={nextYearLabel}
                            onChange={(e) => setNextYearLabel(e.target.value)}
                        />
                    </div>
                    
                    <Button 
                        fullWidth 
                        variant="danger" 
                        disabled={!nextYearLabel}
                        onClick={() => setIsModalOpen(true)}
                    >
                        Initialize Mass Promotion
                    </Button>
                </div>
            </Card>

            {/* SECURITY MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Final Confirmation">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3 text-danger">
                        <ShieldAlert size={24} className="shrink-0" />
                        <p className="text-xs font-bold leading-relaxed">
                            To prevent accidental promotion, please type <span className="underline">CONFIRM</span> below. 
                            This will process all students and flip the system to {nextYearLabel}.
                        </p>
                    </div>

                    <input 
                        type="text" 
                        placeholder="Type CONFIRM here..."
                        className="w-full h-12 border-2 border-gray-200 rounded-xl text-center font-black uppercase outline-none focus:border-danger"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                    />

                    <Button 
                        fullWidth 
                        variant="danger" 
                        isLoading={loading}
                        disabled={!isReady}
                        onClick={handlePromotion}
                    >
                        Execute School Transition
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default AnnualTransition;