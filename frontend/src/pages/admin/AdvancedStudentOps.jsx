import React, { useState } from 'react';
import { 
  TrendingUp, 
  UploadCloud, 
  AlertTriangle, 
  FileJson, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdvancedStudentOps = () => {
  const [activeTab, setActiveTab] = useState('promote'); // 'promote' or 'bulk'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // --- PROMOTION STATE ---
  const [promoData, setPromoData] = useState({ fromClass: '', toClass: '' });
  
  // --- BULK UPLOAD STATE ---
  const [jsonInput, setJsonInput] = useState("");
  const sampleJson = JSON.stringify([
    { "name": "Rahul Sharma", "UID": "2024101", "password": "Pass@123", "class": "5", "section": "A", "fatherName": "Raj", "fatherMobile": "9876543210", "motherName": "Sita", "motherMobile": "9876543211", "gender": "Male", "dateOfBirth": "2013-05-15", "address": "Delhi" }
  ], null, 2);

  // 1. Promotion Logic
  const handlePromotion = async () => {
    if (!promoData.fromClass || !promoData.toClass) {
      setToast({ message: "Select both current and target classes", type: "error" });
      return;
    }

    if (!window.confirm(`CRITICAL ACTION: Are you sure you want to promote ALL active students from Class ${promoData.fromClass} to Class ${promoData.toClass}? This cannot be easily undone.`)) return;

    setLoading(true);
    try {
      const res = await API.put('/admin/students/promote', promoData);
      setToast({ message: res.data.message, type: "success" });
      setPromoData({ fromClass: '', toClass: '' });
    } catch (err) {
      setToast({ message: "Promotion failed. Check if target class is valid.", type: "error" });
    } finally {
      setLoading(false);
    }
  };


  const handleAnnualTransition = async () => {
    const nextYear = prompt("Enter the New Academic Year Label (e.g., 2025-26):");
    
    if (!nextYear) return;

    if (window.confirm(`CRITICAL WARNING: This will promote ALL students and change the school session to ${nextYear}. This cannot be undone. Proceed?`)) {
        setLoading(true);
        try {
            const res = await API.post('/admin/promote-mass', { nextYearLabel: nextYear });
            alert(res.data.message);
            window.location.reload(); // Refresh to update global year context
        } catch (err) {
            alert(err.response?.data?.message || "Transition Failed");
        } finally {
            setLoading(false);
        }
    }
};

  // 2. Bulk Upload Logic
  const handleBulkUpload = async () => {
    try {
      const studentsArray = JSON.parse(jsonInput);
      if (!Array.isArray(studentsArray)) throw new Error("Input must be an array of student objects");

      setLoading(true);
      const res = await API.post('/admin/students/bulk-upload', { students: studentsArray });
      
      setToast({ 
        message: `Success! ${res.data.successCount} students imported. Errors: ${res.data.errors}`, 
        type: res.data.successCount > 0 ? "success" : "error" 
      });
      if (res.data.successCount > 0) setJsonInput("");
    } catch (err) {
      setToast({ message: "Invalid JSON format. Please follow the template.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Advanced Operations</h1>
        <p className="text-sm text-secondary font-medium">Handle high-volume data and academic transitions.</p>
      </div>

      {/* 3. Tab Switcher */}
      <div className="flex p-1 bg-gray-100 rounded-2xl w-full max-w-md">
        <button 
          onClick={() => setActiveTab('promote')}
          className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition-all ${activeTab === 'promote' ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`}
        >
          <TrendingUp size={14} className="inline mr-2" /> Class Promotion
        </button>
        <button 
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition-all ${activeTab === 'bulk' ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`}
        >
          <UploadCloud size={14} className="inline mr-2" /> Bulk Upload
        </button>
      </div>

      {activeTab === 'promote' ? (
        /* 4. PROMOTION UI */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
           <Card title="Promote Students" icon={TrendingUp}>
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                   <div className="flex-1 space-y-2">
                      <p className="text-[10px] font-black text-primary uppercase">From Class</p>
                      <select 
                        className="w-full h-12 bg-white border-2 border-transparent focus:border-primary rounded-xl px-4 font-black"
                        value={promoData.fromClass}
                        onChange={(e) => setPromoData({...promoData, fromClass: e.target.value})}
                      >
                         <option value="">Select...</option>
                         {['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(c => <option key={c} value={c}>Class {c}</option>)}
                      </select>
                   </div>
                   <ArrowRight className="text-primary mt-6" />
                   <div className="flex-1 space-y-2">
                      <p className="text-[10px] font-black text-primary uppercase">To Class</p>
                      <select 
                        className="w-full h-12 bg-white border-2 border-transparent focus:border-primary rounded-xl px-4 font-black"
                        value={promoData.toClass}
                        onChange={(e) => setPromoData({...promoData, toClass: e.target.value})}
                      >
                         <option value="">Select...</option>
                         {['UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'Graduated'].map(c => <option key={c} value={c}>Class {c}</option>)}
                      </select>
                   </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-warning">
                   <AlertTriangle size={20} className="shrink-0" />
                   <p className="text-xs font-bold leading-relaxed">
                     Warning: This will update the class for ALL active students in the selected "From" class. Ensure marks and attendance for the current session are closed.
                   </p>
                </div>

                <Button fullWidth icon={CheckCircle2} isLoading={loading} onClick={handlePromotion}>
                   Execute Promotion
                </Button>
              </div>
           </Card>

           <div className="space-y-4">
              <Card title="How it works" icon={Info} className="bg-gray-50/50">
                 <ul className="space-y-4">
                    <li className="flex gap-3">
                       <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200 shadow-sm shrink-0">1</div>
                       <p className="text-xs text-secondary font-medium">Select the current class of students who have completed their session.</p>
                    </li>
                    <li className="flex gap-3">
                       <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200 shadow-sm shrink-0">2</div>
                       <p className="text-xs text-secondary font-medium">Select the target class they are moving into (e.g., Class 5 → Class 6).</p>
                    </li>
                    <li className="flex gap-3">
                       <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200 shadow-sm shrink-0">3</div>
                       <p className="text-xs text-secondary font-medium">The system will update all matching records instantly in the database.</p>
                    </li>
                 </ul>
              </Card>
           </div>
        </div>
      ) : (
        /* 5. BULK UPLOAD UI */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
           <Card title="JSON Student Import" icon={FileJson}>
              <div className="space-y-4">
                 <p className="text-xs font-bold text-gray-400 uppercase">Paste Student Array (JSON)</p>
                 <textarea 
                    className="w-full h-80 p-4 bg-gray-900 text-green-400 font-mono text-xs rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                    placeholder="[ { ... }, { ... } ]"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                 />
                 <Button fullWidth icon={UploadCloud} isLoading={loading} onClick={handleBulkUpload}>
                    Start Bulk Import
                 </Button>
              </div>
           </Card>

           <div className="space-y-6">
              <Card title="Data Template" icon={Users} noPadding>
                 <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <p className="text-[10px] font-black text-secondary uppercase">Copy this format</p>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(sampleJson); setToast({ message: "Template copied!", type: "success" }); }}
                      className="text-[10px] font-black text-primary uppercase"
                    >
                      Copy Template
                    </button>
                 </div>
                 <pre className="p-4 text-[10px] text-gray-500 font-mono overflow-x-auto">
                    {sampleJson}
                 </pre>
              </Card>

              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 text-danger">
                 <ShieldAlert size={20} className="shrink-0" />
                 <p className="text-xs font-bold">Important: All students imported via JSON will be set to "Active" status automatically.</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedStudentOps;
