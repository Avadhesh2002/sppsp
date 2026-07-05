import React, { useState, useEffect } from 'react';
import { Book, Hash, Plus, Trash2, Tag, ShieldCheck, Info, Edit3, Layers } from 'lucide-react';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  // Form State for classes checkboxes
  const availableClasses = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const [selectedMapping, setSelectedMapping] = useState([]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { maxMarks: 100 }
  });

  // 1. Load Subject Library
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/subjects');
      // Note: Your backend route is GET /api/admin/subjects
      setSubjects(res.data);
    } catch (err) {
      setToast({ message: "Failed to load subjects", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Multi-Select Checkbox Logic
  const toggleClassMapping = (className) => {
    setSelectedMapping(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className) 
        : [...prev, className]
    );
  };

  // 3. Create Subject Handshake
  const onCreateSubject = async (data) => {
    if (selectedMapping.length === 0) {
      setToast({ message: "Please map at least one class to this subject", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/admin/subjects', {
        ...data,
        applicableClasses: selectedMapping
      });
      
      setToast({ message: `${data.subjectName} added to curriculum!`, type: "success" });
      setIsModalOpen(false);
      reset();
      setSelectedMapping([]);
      fetchSubjects();
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Subject code must be unique", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

    const handleDeleteSubject = async (id, name) => {
    // Confirmation is mandatory for destructive actions
    if (window.confirm(`Are you sure you want to remove ${name}? This will also unassign all teachers currently teaching this subject.`)) {
      try {
        await API.delete(`/admin/subjects/${id}`);
        setToast({ message: "Subject removed from curriculum", type: "success" });
        fetchSubjects(); // Refresh the list
      } catch (err) {
        setToast({ 
          message: err.response?.data?.message || "Failed to delete subject", 
          type: "error" 
        });
      }
    }
  };

  const handleEditClick = (sub) => {
    setEditingSubject(sub);
    
    // These lines require 'setValue' from step 1
    setValue("subjectName", sub.subjectName);
    setValue("subjectCode", sub.subjectCode);
    setValue("maxMarks", sub.maxMarks);
    
    // This ensures the checkboxes (LKG, UKG, etc.) are checked correctly
    setSelectedMapping(sub.applicableClasses || []); 
    
    setIsEditModalOpen(true);
  };

  const onUpdateSubject = async (data) => {
    setSubmitting(true);
    try {
      await API.put(`/admin/subjects/${editingSubject._id}`, {
        ...data,
        applicableClasses: selectedMapping
      });
      setToast({ message: "Subject details updated!", type: "success" });
      setIsEditModalOpen(false);
      fetchSubjects();
    } catch (err) {
      setToast({ message: "Update failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">Curriculum Library</h1>
          <p className="text-sm text-secondary font-medium">Define subjects and their class-wise distribution.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Add New Subject
        </Button>
      </div>

      {/* 4. Subject Library Grid */}
      <div className="grid grid-cols-1 gap-4">
        {subjects.length > 0 ? (
          subjects.map((sub) => (
            <Card key={sub._id} className="hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Left: Info */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-50 text-primary rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                    <Book size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{sub.subjectName}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-widest">
                       <Hash size={12} /> {sub.subjectCode} • <ShieldCheck size={12} className="text-success" /> Max Marks: {sub.maxMarks}
                    </div>
                  </div>
                </div>

                {/* Center: Mapping Badges */}
                <div className="flex-grow">
                   <div className="flex flex-wrap gap-1.5">
                      <p className="text-[10px] font-black text-gray-400 uppercase w-full mb-1">Applicable Classes</p>
                      {sub.applicableClasses.map(cls => (
                        <span key={cls} className="px-2.5 py-1 bg-white border border-indigo-100 text-primary text-[10px] font-black rounded-lg shadow-sm">
                          {cls}
                        </span>
                      ))}
                   </div>
                </div>

                {/* Right: Actions */}
                <div className="flex gap-2 shrink-0">

                  <button 
                      onClick={() => handleEditClick(sub)}
                      className="p-2.5 bg-gray-50 text-gray-400 hover:text-primary hover:bg-indigo-50 rounded-xl transition-all"
                      >     
                      <Edit3 size={18}/>
                  </button>
                  <button 
                      onClick={() => handleDeleteSubject(sub._id, sub.subjectName)} // ADD THIS LINE
                      className="p-2.5 bg-gray-50 text-gray-400 hover:text-danger hover:bg-red-50 rounded-xl transition-all"
                      >
                      <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="py-20 text-center opacity-40">
             <Tag size={64} className="mx-auto mb-4" />
             <p className="text-lg font-bold">No subjects defined.</p>
          </div>
        )}
      </div>

      {/* 5. Create Subject Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Register New Subject"
        size="lg"
      >
        <form onSubmit={handleSubmit(onCreateSubject)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input label="Subject Name" placeholder="e.g. Mathematics" {...register("subjectName", { required: "Name required" })} error={errors.subjectName?.message} />
             <Input label="Subject Code" placeholder="e.g. MATH101" {...register("subjectCode", { required: "Unique Code required" })} error={errors.subjectCode?.message} />
          </div>

          <Input label="Default Max Marks" type="number" {...register("maxMarks", { required: true, min: 1 })} />

          {/* Mapping Checkboxes */}
          <div className="space-y-3">
             <label className="text-xs font-bold text-gray-400 uppercase ml-1 flex items-center gap-2">
                <Layers size={14} /> Map to Classes *
             </label>
             <div className="grid grid-cols-5 gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                {availableClasses.map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClassMapping(cls)}
                    className={`py-2 text-xs font-black rounded-xl border-2 transition-all ${
                      selectedMapping.includes(cls) 
                        ? 'bg-primary border-primary text-white shadow-lg shadow-indigo-100' 
                        : 'bg-white border-white text-secondary hover:border-indigo-100'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
             </div>
          </div>

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3 text-primary">
             <Info size={20} className="shrink-0" />
             <p className="text-[10px] font-bold uppercase leading-relaxed">
               Logic Guard: Subject codes must be unique system-wide. Class mapping allows teachers of those classes to assign marks for this subject.
             </p>
          </div>

          <div className="flex gap-3">
             <Button variant="ghost" fullWidth onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button type="submit" fullWidth isLoading={submitting} icon={ShieldCheck}>Save to Curriculum</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          reset(); // Clear form on close
        }} 
        title="Edit Subject Details"
        size="lg"
      >
        <form onSubmit={handleSubmit(onUpdateSubject)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Subject Name" {...register("subjectName", { required: true })} />
            <Input label="Subject Code" {...register("subjectCode", { required: true })} />
          </div>

          <Input label="Max Marks" type="number" {...register("maxMarks", { required: true })} />

          {/* COMPLETED CLASS MAPPING SECTION */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1 flex items-center gap-2">
                <Layers size={14} /> Update Class Mapping *
            </label>
            <div className="grid grid-cols-5 gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                {availableClasses.map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClassMapping(cls)}
                    className={`py-2 text-xs font-black rounded-xl border-2 transition-all ${
                      selectedMapping.includes(cls) 
                        ? 'bg-primary border-primary text-white shadow-lg' 
                        : 'bg-white border-white text-secondary hover:border-indigo-100'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" fullWidth isLoading={submitting}>Save System Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubjectManagement;
