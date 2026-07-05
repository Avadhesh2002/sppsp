import React, { useState, useEffect } from 'react';
import { BookOpen, Users, UserCheck, Plus, School, Trash2, Edit3, ShieldAlert, GraduationCap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Added
  const [selectedClass, setSelectedClass] = useState(null); // Added
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const { settings } = useSettings();
  // FIX 1: Added 'setValue' to the destructuring list
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, teacherRes] = await Promise.all([
        API.get('/admin/classes'),
        API.get('/admin/teachers?status=active&limit=200&page=1')
      ]);
      setClasses(classRes.data);
      setTeachers(teacherRes.data.teachers);
    } catch (err) {
      setToast({ message: "Failed to load academic data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // FIX 2: handleEditClick logic
  const handleEditClick = (cls) => {
    setSelectedClass(cls);
    setValue("className", cls.className);
    setValue("capacity", cls.capacity);
    setValue("classTeacher", cls.classTeacher?._id || "");
    setIsEditModalOpen(true);
  };

  const onUpdateClass = async (data) => {
    setSubmitting(true);
    try {
      // Pass the existing academic year to the backend for the conflict check
      const payload = { ...data, academicYear: selectedClass.academicYear };

      await API.put(`/admin/classes/${selectedClass._id}`, payload);
      setToast({ message: "Class settings updated!", type: "success" });
      setIsEditModalOpen(false);
      fetchData(); 
    } catch (err) {
      // ARCHITECT FIX: Get the actual conflict message
      const msg = err.response?.data?.message || "Failed to update class";
      setToast({ message: msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

const onCreateClass = async (data) => {
    // ✅ STEP 1: Check for duplicate class names (no year check needed)
    const duplicate = classes.find(c => c.className === data.className);
    
    if (duplicate) {
        setToast({ message: `Error: Class ${data.className} already exists.`, type: "error" });
        return;
    }
    
    setSubmitting(true);
    
    try {
        // ✅ STEP 2: Build the payload FIRST (before using it)
        const payload = { 
            className: data.className,
            capacity: data.capacity
        };
        
        // ✅ STEP 3: Only add classTeacher if it's actually selected
        if (data.classTeacher && data.classTeacher !== "") {
            payload.classTeacher = data.classTeacher;
        }
        
        // ✅ STEP 4: Send to backend (no academicYear needed)
        await API.post('/admin/classes', payload);
        
        setToast({ message: `Class ${data.className} created successfully!`, type: "success" });
        setIsModalOpen(false);
        reset();
        fetchData(); // Refresh the class list
        
    } catch (err) {
        setToast({ 
            message: err.response?.data?.message || "Failed to create class", 
            type: "error" 
        });
    } finally {
        setSubmitting(false);
    }
};

  const handleDeleteClass = async (id, name) => {
  // Security Handshake: Always confirm before deleting!
  if (window.confirm(`CRITICAL: Are you sure you want to delete Class ${name}? This cannot be undone.`)) {
    try {
      await API.delete(`/admin/classes/${id}`);
      setToast({ message: `Class ${name} deleted successfully`, type: "success" });
      fetchData(); // Refresh the list from backend
    } catch (err) {
      setToast({ 
        message: err.response?.data?.message || "Failed to delete class", 
        type: "error" 
      });
    }
  }
};

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Class Management</h1>
          <p className="text-sm text-secondary font-medium">
            Session: <span className="text-primary font-bold">{settings.currentAcademicYear}</span>
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => { reset(); setIsModalOpen(true); }}>
          Create New Class
        </Button>
      </div>

      {classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls._id} className="group hover:border-primary transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-primary rounded-2xl flex items-center justify-center font-black text-xl">
                  {cls.className}
                </div>
                <div className="flex gap-1">
                   <button 
                    onClick={() => handleEditClick(cls)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors">
                    <Edit3 size={16}/></button>
                   <button 
                      onClick={() => handleDeleteClass(cls._id, cls.className)} // ADD THIS LINE
                      className="p-2 text-gray-400 hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16}/>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-secondary">
                      <Users size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Capacity</span>
                   </div>
                   <span className="text-sm font-black text-gray-900">{cls.capacity} Seats</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                   <div className="flex items-center gap-2 text-secondary">
                      <GraduationCap size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Class Teacher</span>
                   </div>
                   <span className="text-xs font-black text-primary italic">
                      {cls.classTeacher?.name || "Not Assigned"}
                   </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center opacity-40">
           <School size={64} className="mx-auto mb-4" />
           <p className="text-lg font-bold">No classes defined yet.</p>
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Establish New Grade">
        <form onSubmit={handleSubmit(onCreateClass)} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Grade Name</label>
            <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold" {...register("className", { required: true })}>
              <option value="">Select Grade Level...</option>
              {['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
          <Input label="Student Capacity" type="number" {...register("capacity", { required: true })} />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Assign Class Teacher (Optional)</label>
            <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold" {...register("classTeacher")}>
              <option value="">Assign Later...</option>
                {teachers.map(t => {
                // LOGIC: Is this teacher already a Class Teacher in ANY existing class?
                const isBusy = classes.some(c => c.classTeacher?._id === t._id);
                
                return (
                  <option key={t._id} value={t._id} disabled={isBusy}>
                    {t.name} {isBusy ? "— (Already Heading a Class)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <Button type="submit" fullWidth isLoading={submitting} icon={UserCheck}>Create Classroom</Button>
        </form>
      </Modal>

      {/* EDIT MODAL - FIXED PLACEMENT */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Class Details">
        <form onSubmit={handleSubmit(onUpdateClass)} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Grade Name</label>
            <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold" {...register("className")}>
              {['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
          <Input label="Student Capacity" type="number" {...register("capacity")} />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Assign/Change Class Teacher</label>
            <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold" {...register("classTeacher")}>
              <option value="">No Teacher Assigned</option>
              {teachers.map(t => {
                // LOGIC: Is this teacher heading a class THAT IS NOT the one we are editing?
                const isBusyElsewhere = classes.some(
                  c => c.classTeacher?._id === t._id && c._id !== selectedClass?._id
                );
                
                return (
                  <option key={t._id} value={t._id} disabled={isBusyElsewhere}>
                    {t.name} {isBusyElsewhere ? "— (Already Heading a Class)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <Button type="submit" variant="primary" fullWidth isLoading={submitting}>Update Class Settings</Button>
        </form>
      </Modal>

    </div>
  );
};

export default ClassManagement;