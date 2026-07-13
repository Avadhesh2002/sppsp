import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  GraduationCap, Search, Mail, Phone, Trash2, Eye, Key, Plus, Edit3, Briefcase, ShieldCheck, User, MapPin, Fingerprint, Calendar
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';

const formatAadhar = (value) => {
  const digits = value.replace(/\D/g, ""); 
  const trimmed = digits.substring(0, 12); 
  const sections = trimmed.match(/.{1,4}/g); 
  return sections ? sections.join("-") : trimmed;
};

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/teachers?status=active&limit=200&page=1');
      setTeachers(res.data.teachers);
    } catch (err) {
      setToast({ message: "Failed to load staff roster", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAadharInput = (e) => {
    const formatted = formatAadhar(e.target.value);
    setValue("aadharNumber", formatted);
  };

  const handleView = (t) => { 
    setSelectedTeacher(t); 
    setIsViewModalOpen(true); 
  };

  // ✅ THE COMPLETE handleEditClick FUNCTION
  const handleEditClick = (t) => {
    setSelectedTeacher(t);
    
    // Set ALL 10 fields
    setValue("name", t.name);
    setValue("email", t.email || "");
    setValue("phone", t.phone);
    setValue("gender", t.gender);
    setValue("aadharNumber", t.aadharNumber);
    setValue("experience", t.experience);
    setValue("qualifications", t.qualifications);
    setValue("address", t.address);

    // Robust Date Formatting
    if (t.dateOfBirth) {
      try {
        const dob = new Date(t.dateOfBirth).toISOString().split('T')[0];
        setValue("dateOfBirth", dob);
      } catch (e) { 
        setValue("dateOfBirth", ""); 
      }
    } else {
      setValue("dateOfBirth", "");
    }
    
    if (t.joiningDate) {
      try {
        const joinDate = new Date(t.joiningDate).toISOString().split('T')[0];
        setValue("joiningDate", joinDate);
      } catch (e) { 
        setValue("joiningDate", ""); 
      }
    } else {
      setValue("joiningDate", "");
    }

    setIsEditModalOpen(true);
  };

  const onUpdateTeacher = async (data) => {
    setSubmitting(true);
    try {
      await API.put(`/admin/teachers/${selectedTeacher._id}`, data);
      setToast({ message: "Teacher info updated!", type: "success" });
      setIsEditModalOpen(false);
      fetchTeachers();
    } catch (err) { 
      setToast({ message: "Update failed", type: "error" }); 
    } finally {
      setSubmitting(false);
    }
  };

  const onHireTeacher = async (data) => {
    setSubmitting(true);
    try {
      // Normalize name: first letter of each word capital, rest small
      if (data.name) {
        data.name = data.name.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      }
      await API.post('/admin/teachers', data);
      setToast({ message: "Teacher hired!", type: "success" });
      setIsHireModalOpen(false);
      reset();
      fetchTeachers();
    } catch (err) { 
      setToast({ message: "Hiring failed", type: "error" }); 
    } finally {
      setSubmitting(false);
    }
  };

  const ViewField = ({ label, value, icon: Icon }) => (
    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-gray-400" />
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
          {label}
        </p>
      </div>
      <p className="text-sm font-bold text-gray-800 break-words">
        {value || 'N/A'}
      </p>
    </div>
  );

  const handleManualReset = async () => {
    if (!resetPasswordValue) return;
    setSubmitting(true);
    try {
      await API.put('/admin/reset-password', {
        userId: selectedTeacher._id,
        role: 'teacher',
        newPassword: resetPasswordValue
      });
      setToast({ message: "Teacher password updated!", type: "success" });
      setIsResetModalOpen(false);
      setResetPasswordValue("");
    } catch (err) {
      setToast({ message: "Failed to reset password", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try {
      await API.delete(`/admin/teachers/${id}`);
      setToast({ message: "Teacher deactivated", type: "success" });
      fetchTeachers();
    } catch (err) { 
      setToast({ message: "Action failed", type: "error" }); 
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Staff Management</h1>
          <p className="text-sm text-secondary font-medium">Manage your school's faculty.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => { 
          reset();
          setIsHireModalOpen(true); 
        }}>
          Hire New Teacher
        </Button>
      </div>

      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm max-w-md">
        <Input placeholder="Search by Name or Code..." icon={Search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-none bg-transparent h-10" />
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:block bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Staff Member</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredTeachers.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 text-success rounded-full flex items-center justify-center font-black">{t.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t.name}</p>
                      <p className="text-[10px] text-secondary font-medium">{t.employeeCode}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleView(t)} className="p-2 text-primary hover:bg-indigo-50 rounded-lg"><Eye size={16}/></button>
                    <button onClick={() => handleEditClick(t)} className="p-2 text-warning hover:bg-amber-50 rounded-lg"><Edit3 size={16}/></button>
                    <button onClick={() => { setSelectedTeacher(t); setIsResetModalOpen(true); }} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"><Key size={16}/></button>
                    <button onClick={() => handleDeactivate(t._id, t.name)} className="p-2 text-danger hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {filteredTeachers.length > 0 ? (
          filteredTeachers.map((t) => (
            <Card key={t._id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-50 text-success rounded-2xl flex items-center justify-center font-black text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{t.name}</h3>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">{t.employeeCode}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleView(t)} className="p-2 text-primary bg-indigo-50 rounded-lg"><Eye size={16}/></button>
                  <button onClick={() => handleEditClick(t)} className="p-2 text-warning bg-amber-50 rounded-lg"><Edit3 size={16}/></button>
                  <button onClick={() => { setSelectedTeacher(t); setIsResetModalOpen(true); }} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Key size={16}/></button>
                  <button onClick={() => handleDeactivate(t._id, t.name)} className="p-2 text-danger bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-center py-10 text-secondary text-sm">No faculty found.</p>
        )}
      </div>

      {/* VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detailed Staff Profile">
        {selectedTeacher && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-3xl border border-indigo-100 relative overflow-hidden">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-primary text-3xl font-black shadow-sm border-2 border-primary/10 overflow-hidden shrink-0 z-10">
                {selectedTeacher.profileImage ? (
                  <img src={selectedTeacher.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  selectedTeacher.name.charAt(0)
                )}
              </div>
              <div className="z-10">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">{selectedTeacher.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded uppercase tracking-tighter shadow-sm">
                    ID: {selectedTeacher.employeeCode}
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 text-success text-[10px] font-black rounded uppercase tracking-tighter border border-green-200">
                    Active
                  </span>
                </div>
              </div>
              <ShieldCheck className="absolute -right-4 -bottom-4 opacity-5 text-indigo-900" size={100} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ViewField label="Aadhar Number" value={selectedTeacher.aadharNumber} icon={Fingerprint} />
              <ViewField label="Gender" value={selectedTeacher.gender} icon={User} />
              <ViewField label="Date of Joining" value={selectedTeacher.joiningDate ? new Date(selectedTeacher.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} icon={Calendar} />
              <ViewField label="Total Experience" value={selectedTeacher.experience} icon={Briefcase} />
              <ViewField label="Date of Birth" value={selectedTeacher.dateOfBirth ? new Date(selectedTeacher.dateOfBirth).toLocaleDateString('en-GB') : 'N/A'} icon={Calendar} />
              <ViewField label="Mobile Number" value={selectedTeacher.phone} icon={Phone} />
              <div className="col-span-2">
                <ViewField label="Official Email Address" value={selectedTeacher.email || 'Email Not Registered'} icon={Mail} />
              </div>
              <div className="col-span-2">
                <ViewField label="Academic Qualifications" value={selectedTeacher.qualifications} icon={GraduationCap} />
              </div>
              <div className="col-span-2">
                <ViewField label="Residential Address" value={selectedTeacher.address} icon={MapPin} />
              </div>
            </div>

            <div className="pt-2">
              <Button variant="outline" fullWidth onClick={() => setIsViewModalOpen(false)}>
                Close Profile Window
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Update Staff Information" size="lg">
        <form onSubmit={handleSubmit(onUpdateTeacher)} className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">1. Update Identity Details</p>
            <Input label="Full Name" {...register("name", { required: "Name is required" })} error={errors.name?.message} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-secondary uppercase ml-1">Gender</label>
                <select {...register("gender", { required: true })} className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-3 font-bold text-sm outline-none focus:border-primary">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Input label="Date of Birth" type="date" {...register("dateOfBirth", { required: "DOB is required" })} error={errors.dateOfBirth?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary uppercase ml-1">Aadhar Card Number</label>
              <input {...register("aadharNumber", { required: "Aadhar is required", minLength: 14 })} onChange={handleAadharInput} placeholder="XXXX-XXXX-XXXX" className="w-full h-14 bg-white border-2 border-gray-100 rounded-2xl px-4 font-black tracking-widest text-center text-lg focus:border-primary outline-none" />
            </div>
          </div>

          <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-4">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">2. Employment & Contact Information</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone Number" {...register("phone", { required: "Phone is required", pattern: /^\d{10}$/ })} error={errors.phone && "Must be 10 digits"} />
              <Input label="Email Address" type="email" {...register("email")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Joining Date" type="date" {...register("joiningDate", { required: "Required" })} error={errors.joiningDate?.message} />
              <Input label="Experience" {...register("experience", { required: "Required" })} error={errors.experience?.message} />
            </div>
            <Input label="Qualifications" {...register("qualifications", { required: "Required" })} error={errors.qualifications?.message} />
            <Input label="Residential Address" icon={MapPin} {...register("address", { required: "Required" })} error={errors.address?.message} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setIsEditModalOpen(false)}>Discard Changes</Button>
            <Button type="submit" fullWidth isLoading={submitting} icon={Edit3}>Save Updated Profile</Button>
          </div>
        </form>
      </Modal>

      {/* HIRE MODAL */}
      <Modal isOpen={isHireModalOpen} onClose={() => setIsHireModalOpen(false)} title="Hire New Staff Member" size="lg">
        <form onSubmit={handleSubmit(onHireTeacher)} className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">1. Identity & Personal Details</p>
            <Input label="Full Name" placeholder="e.g. Mrs. Manju Singh" {...register("name", { required: "Name is required" })} error={errors.name?.message} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-secondary uppercase ml-1">Gender *</label>
                <select {...register("gender", { required: "Required" })} className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-3 font-bold text-sm outline-none focus:border-primary">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Input label="Date of Birth" type="date" {...register("dateOfBirth", { required: "Required" })} error={errors.dateOfBirth?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary uppercase ml-1">Aadhar Card Number *</label>
              <input {...register("aadharNumber", { required: "Aadhar is mandatory", minLength: 14 })} onChange={handleAadharInput} placeholder="XXXX-XXXX-XXXX" className="w-full h-14 bg-white border-2 border-gray-100 rounded-2xl px-4 font-black tracking-widest text-center text-lg focus:border-primary outline-none transition-all" />
              <p className="text-[9px] text-gray-400 font-bold ml-1 italic">Format: 0000-0000-0000</p>
              {errors.aadharNumber && <p className="text-[10px] text-danger font-bold uppercase">{errors.aadharNumber.message}</p>}
            </div>
          </div>

          <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-4">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">2. Professional & Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone (10 Digits)" placeholder="Enter 10 digit number" {...register("phone", { required: "Required", pattern: /^\d{10}$/ })} error={errors.phone && "Invalid phone (10 digits)"} />
              <Input label="Email (Optional)" type="email" placeholder="manju18@gmail.com" {...register("email")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Joining Date" type="date" {...register("joiningDate", { required: "Required" })} error={errors.joiningDate?.message} />
              <Input label="Teaching Experience" placeholder="e.g. 5 Years" {...register("experience", { required: "Required" })} error={errors.experience?.message} />
            </div>
            <Input label="Qualifications" placeholder="e.g. M.Sc. Mathematics, B.Ed." {...register("qualifications", { required: "Required" })} error={errors.qualifications?.message} />
            <Input label="Residential Address" placeholder="House no, Street, City" {...register("address", { required: "Required" })} error={errors.address?.message} />
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[9px] font-bold text-blue-700 uppercase leading-relaxed text-center">
              Employee ID will be generated automatically. Default password is: <span className="underline">Teacher@123</span>
            </p>
          </div>

          <Button type="submit" fullWidth isLoading={submitting}>Complete Hiring Process</Button>
        </form>
      </Modal>

      {/* PASSWORD RESET MODAL */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Teacher Password">
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <p className="text-xs font-black text-purple-700 uppercase">Faculty Member: {selectedTeacher?.name}</p>
            <p className="text-[10px] text-purple-400 mt-1">Resetting the password for official employee code: {selectedTeacher?.employeeCode}</p>
          </div>
          <Input label="New Access Password" placeholder="e.g. Teacher@2024" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
            <Button fullWidth isLoading={submitting} onClick={handleManualReset}>Confirm Reset</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeacherManagement;
