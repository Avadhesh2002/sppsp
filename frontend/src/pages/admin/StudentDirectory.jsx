import React, { useState, useEffect } from 'react';
import { Search, Filter, UserX, Edit3, Key, Eye, FileText, ShieldCheck, ChevronLeft, ChevronRight, User, Phone, Camera , MapPin, Calendar, CheckCircle, UserPlus, Hash } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal'; 
import { generateStudentListPDF } from '../../utils/pdfGenerator';

const StudentDirectory = () => {
  // ============ STATE MANAGEMENT ============
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [toast, setToast] = useState(null);
  
  // Modal States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form States
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [pdfClass, setPdfClass] = useState('');
  const [selectedFields, setSelectedFields] = useState(['name', 'fatherMobile']);
  const [exportCriteria, setExportCriteria] = useState('class');

  // Filter States
  const [filters, setFilters] = useState({
    search: '',
    studentClass: '',
    admissionType: '',
    status: 'active',
    page: 1,
    limit: 10
  });

  // ============ CONSTANTS ============
  const DOCUMENT_LABELS = {
    transferCertificate: 'Transfer Certificate',
    characterCertificate: 'Character Certificate',
    markSheet: 'Mark Sheet',
    migrationCertificate: 'Migration Certificate',
    casteCertificate: 'Caste Certificate',
    birthCertificate: 'Birth Certificate',
    fivePhotos: '5 Photos Physical',
    aadharPhotoCopy: 'Aadhar Photo Copy'
  };

const availableParams = [
    { id: 'name', label: 'Student Name' },
    { id: 'dateOfBirth', label: 'Date of Birth' },
    { id: 'fatherName', label: 'Father Name' },
    { id: 'fatherMobile', label: 'Father Mobile' },
    { id: 'motherName', label: 'Mother Name' },   
    { id: 'aadharNumber', label: 'Aadhar Card' },
    { id: 'penNumber', label: 'PEN No.' },          
    { id: 'address', label: 'Address' },
    { id: 'category', label: 'Category' },
    { id: 'pincode', label: 'Pincode' },
    { id: 'UID', label: 'UID' },                    
];

  // ============ DATA FETCHING ============
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { search, studentClass, status, page, admissionType } = filters;
        const res = await API.get('/admin/students', {
          params: { search, studentClass, status, page, admissionType, limit: filters.limit }
        });
        setStudents(res.data.students);
        setPagination(res.data.pagination);
      } catch (err) {
        setToast({ message: "Failed to load directory", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => fetchStudents(), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  // ============ MODAL HANDLERS ============
  const handleView = (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  // ============ CRUD OPERATIONS ============
const handleUpdate = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  const formData = new FormData(e.target);

  // Build flat data object
  const data = {};
  for (const [key, value] of formData.entries()) {
    if (value !== '') data[key] = value;
  }

  // Handle documents checkboxes — FormData only includes checked boxes
  // So we need to explicitly build the documents object
  const docIds = [
    'transferCertificate','migrationCertificate','characterCertificate',
    'casteCertificate','birthCertificate','markSheet','fivePhotos',
    'studentAadhar','fatherAadhar','motherAadhar'
  ];
  const documents = {};
  docIds.forEach(id => {
    documents[id] = formData.get(`documents.${id}`) === 'on';
    delete data[`documents.${id}`];
  });
  data.documents = documents;

  // Handle profile image from hidden input
  if (e._imagePreview) data.profileImage = e._imagePreview;

  try {
    await API.put(`/admin/students/${selectedStudent._id}`, data);
    setToast({ message: "Student records updated!", type: "success" });
    setIsEditModalOpen(false);
    setFilters({ ...filters });
  } catch (err) {
    setToast({ message: "Update failed", type: "error" });
  } finally {
    setSubmitting(false);
  }
};

  const handleManualReset = async () => {
    if (!resetPasswordValue) return;
    setSubmitting(true);
    try {
      await API.put('/admin/reset-password', {
        userId: selectedStudent._id,
        role: 'student',
        newPassword: resetPasswordValue
      });
      setToast({ message: "Password reset successfully!", type: "success" });
      setIsResetModalOpen(false);
      setResetPasswordValue("");
    } catch (err) {
      setToast({ message: "Failed to reset password", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (studentId, name) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;
    try {
      await API.delete(`/admin/students/${studentId}`);
      setToast({ message: "Student marked as Inactive", type: "success" });
      setFilters({ ...filters });
    } catch (err) {
      setToast({ message: "Action failed", type: "error" });
    }
  };

  // ============ ADD STUDENT ============
  const handleAddStudent = async (studentData) => {
    setSubmitting(true);
    try {
      const res = await API.post('/admin/students', studentData);
      setToast({ message: `Student "${res.data.student.name}" added! Admission No: ${res.data.student.UID}`, type: "success" });
      setIsAddStudentModalOpen(false);
      setFilters({ ...filters });
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Failed to add student", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ============ PDF GENERATION ============
  const handleCriteriaChange = (newCriteria) => {
    setExportCriteria(newCriteria);
    if (newCriteria === 'class') {
      setSelectedFields(prev => prev.filter(f => f !== 'class'));
    }
  };

  const toggleField = (id) => {
    setSelectedFields(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePreparePDF = async () => {
    if (selectedFields.length === 0) {
      setToast({ message: "Select at least one parameter.", type: "error" });
      return;
    }
    if (exportCriteria === 'class' && !pdfClass) {
      setToast({ message: "Select a target class.", type: "error" });
      return;
    }

    setIsGenerating(true);
    try {
      const apiParams = { status: 'active', limit: 1000, page: 1 };
      
      if (exportCriteria === 'class') {
        apiParams.studentClass = pdfClass;
      } else {
        apiParams.admissionType = 'New';
      }

      const res = await API.get('/admin/students', { params: apiParams });
      const studentsArray = res.data.students;

      if (!studentsArray || studentsArray.length === 0) {
        setToast({ message: "No records found.", type: "error" });
        setIsGenerating(false);
        return;
      }

      const pdfTitle = exportCriteria === 'class' 
        ? `Student List - Class ${pdfClass}` 
        : "New Admissions Master List";

      setTimeout(() => {
        generateStudentListPDF(studentsArray, pdfTitle, selectedFields);
        setToast({ message: "PDF Downloaded!", type: "success" });
        setIsPdfModalOpen(false);
        setIsGenerating(false);
      }, 400);
    } catch (err) {
      setToast({ message: "Generation failed.", type: "error" });
      setIsGenerating(false);
    }
  };

  // ============ RENDER ============
  if (loading && students.length === 0) {
    return <div className="py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Student Directory</h1>
        <div className="flex gap-3">
          <Button 
            variant="primary" 
            size="sm" 
            icon={UserPlus} 
            onClick={() => setIsAddStudentModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 shadow-md"
          >
            Add Student
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            icon={FileText} 
            onClick={() => setIsPdfModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
          >
            Generate PDF
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center gap-4">
        <div className="w-full lg:flex-grow">
          <Input 
            placeholder="Search Name or UID" 
            icon={Search} 
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="border-none"
          />
        </div>

        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <select 
            className="h-12 bg-gray-50 border-2 border-transparent focus:border-primary rounded-xl px-4 font-bold text-xs outline-none min-w-[140px] cursor-pointer hover:bg-gray-100 transition-colors"
            value={filters.studentClass}
            onChange={(e) => setFilters({ ...filters, studentClass: e.target.value, page: 1 })}
          >
            <option value="">All Classes</option>
            {['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>

          <select 
            className="h-12 bg-gray-50 border-2 border-transparent focus:border-primary rounded-xl px-4 font-bold text-xs outline-none min-w-[160px] cursor-pointer hover:bg-gray-100 transition-colors"
            value={filters.admissionType}
            onChange={(e) => setFilters({ ...filters, admissionType: e.target.value, page: 1 })}
          >
            <option value="">All Types</option>
            <option value="New">New Admissions</option>
          </select>

          <select 
            className="h-12 bg-gray-50 border-2 border-transparent focus:border-primary rounded-xl px-4 font-bold text-xs outline-none min-w-[140px] cursor-pointer hover:bg-gray-100 transition-colors"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option> 
          </select>
        </div>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="py-20 text-center"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Student</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Class</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Parent Contact</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-primary rounded-full flex items-center justify-center font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">{s.name}</p>
                            {s.admissionType === 'New' && (
                              <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-medium text-secondary">Adm: {s.UID}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-bold text-gray-700">Class {s.class}</span></td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-700">
                        {s.fatherMobile || s.guardianMobile || 'No contact'}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {s.fatherName || s.guardianName || ''}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <ActionBtn icon={Eye} color="text-primary" onClick={() => handleView(s)} />
                        <ActionBtn icon={Edit3} color="text-warning" onClick={() => handleEdit(s)} />
                        <ActionBtn icon={Key} color="text-purple-600" onClick={() => { setSelectedStudent(s); setIsResetModalOpen(true); }} />
                        {s.accountStatus === 'active' && <ActionBtn icon={UserX} color="text-danger" onClick={() => handleDeactivate(s._id, s.name)} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden grid grid-cols-1 gap-3">
            {students.map((s) => (
              <Card key={s._id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center font-bold">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{s.name}</p>
                      <p className="text-[10px] font-bold text-secondary uppercase">Class {s.class} • {s.UID}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleView(s)} className="p-2 bg-indigo-50 text-primary rounded-lg"><Eye size={16}/></button>
                    <button onClick={() => handleEdit(s)} className="p-2 bg-amber-50 text-warning rounded-lg"><Edit3 size={16}/></button>
                    <button onClick={() => { setSelectedStudent(s); setIsResetModalOpen(true); }} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Key size={16}/></button>
                    <button onClick={() => handleDeactivate(s._id, s.name)} className="p-2 bg-red-50 text-danger rounded-lg"><UserX size={16}/></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center shadow-inner">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                  Total {filters.admissionType || 'All'} Records
                </p>
                <p className="text-sm font-black text-gray-900">
                  {pagination.totalItems || 0} Students Found
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase">Show</span>
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}
                  className="h-9 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-700 outline-none focus:border-primary cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button 
                    disabled={filters.page === 1} 
                    onClick={() => setFilters({...filters, page: filters.page - 1})} 
                    className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-30 shadow-sm"
                  >
                    <ChevronLeft size={20}/>
                  </button>
                  <div className="px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                    <span className="text-xs font-black text-primary uppercase">
                      Page {filters.page} / {pagination.totalPages}
                    </span>
                  </div>
                  <button 
                    disabled={filters.page === pagination.totalPages} 
                    onClick={() => setFilters({...filters, page: filters.page + 1})} 
                    className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-30 shadow-sm"
                  >
                    <ChevronRight size={20}/>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ MODALS ============ */}
      
      {/* View Student Modal */}
      <ViewStudentModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        student={selectedStudent}
      />

      {/* Edit Student Modal */}
      <EditStudentModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={selectedStudent}
        onSubmit={handleUpdate}
        submitting={submitting}
      />

      {/* Password Reset Modal */}
      <PasswordResetModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        student={selectedStudent}
        password={resetPasswordValue}
        setPassword={setResetPasswordValue}
        onReset={handleManualReset}
        submitting={submitting}
      />

      {/* PDF Export Modal */}
      <PdfExportModal 
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        exportCriteria={exportCriteria}
        onCriteriaChange={handleCriteriaChange}
        pdfClass={pdfClass}
        setPdfClass={setPdfClass}
        availableParams={availableParams}
        selectedFields={selectedFields}
        toggleField={toggleField}
        onGenerate={handlePreparePDF}
        isGenerating={isGenerating}
      />

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSubmit={handleAddStudent}
        submitting={submitting}
      />
    </div>
  );
};

// ============ SUBCOMPONENTS ============

const ActionBtn = ({ icon: Icon, color, onClick }) => (
  <button onClick={onClick} className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${color}`}>
    <Icon size={16} />
  </button>
);

const InfoBox = ({ label, value }) => (
  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
    <p className="text-[8px] font-black text-gray-400 uppercase leading-none mb-1">{label}</p>
    <p className="text-sm font-bold text-gray-800">{value || 'N/A'}</p>
  </div>
);


// ============ VIEW MODAL COMPONENT ============
const IB = ({ label, value }) => (
  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
    <p className="text-[8px] font-black text-gray-400 uppercase leading-none mb-1">{label}</p>
    <p className="text-sm font-bold text-gray-800 break-words">{value || 'N/A'}</p>
  </div>
);
const SecHead = ({ title }) => (
  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mt-1">{title}</h4>
);

const DOC_LABELS = {
  transferCertificate: 'Transfer Certificate',
  migrationCertificate: 'Migration Certificate',
  characterCertificate: 'Character Certificate',
  casteCertificate: 'Caste Certificate',
  birthCertificate: 'Birth Certificate',
  markSheet: 'Previous Result',
  fivePhotos: '5 Photos',
  studentAadhar: 'Student Aadhar',
  fatherAadhar: 'Father Aadhar',
  motherAadhar: 'Mother Aadhar',
};

const ViewStudentModal = ({ isOpen, onClose, student }) => {
  if (!student) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Student Profile">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 relative overflow-hidden">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-primary font-black text-2xl shadow-sm border-2 border-primary/10 overflow-hidden shrink-0">
            {student.profileImage ? <img src={student.profileImage} alt="Profile" className="w-full h-full object-cover" /> : student.name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{student.name}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-[10px] font-bold text-primary bg-white/70 px-2 py-0.5 rounded-md border border-indigo-100">Adm No: {student.UID || 'Not assigned'}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${student.admissionType === 'New' ? 'bg-amber-500 text-white border-amber-600' : 'bg-emerald-500 text-white border-emerald-600'}`}>
                {student.admissionType === 'New' ? 'Fresh Admission' : 'Old Student'}
              </span>
              {student.accountStatus && <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">{student.accountStatus}</span>}
            </div>
          </div>
        </div>

        {/* Academic & Personal */}
        <SecHead title="Academic & Personal" />
        <div className="grid grid-cols-2 gap-2">
          <IB label="Class" value={`Class ${student.class}${student.section ? ' - ' + student.section : ''}`} />
          <IB label="Gender" value={student.gender} />
          <IB label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : null} />
          <IB label="Blood Group" value={student.bloodGroup} />
          <IB label="Category" value={student.category} />
          <IB label="Admission Type" value={student.admissionType === 'New' ? 'Fresh Admission' : 'Old Student'} />
          <IB label="Admission Date" value={student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : null} />
          <IB label="Academic Year" value={student.academicYear} />
        </div>

        {/* Identity */}
        <SecHead title="Identity Numbers" />
        <div className="grid grid-cols-2 gap-2">
          <IB label="Aadhar No." value={student.aadharNumber} />
          <IB label="PEN No." value={student.penNumber} />
        </div>

        {/* Father */}
        <SecHead title="Father's Details" />
        <div className="grid grid-cols-2 gap-2">
          <IB label="Father's Name" value={student.fatherName} />
          <IB label="Mobile" value={student.fatherMobile} />
          <IB label="Occupation" value={student.fatherOccupation} />
          <IB label="Qualification" value={student.fatherQualification} />
          <IB label="Aadhar No." value={student.fatherAadharNumber} />
        </div>

        {/* Mother */}
        <SecHead title="Mother's Details" />
        <div className="grid grid-cols-2 gap-2">
          <IB label="Mother's Name" value={student.motherName} />
          <IB label="Mobile" value={student.motherMobile} />
          <IB label="Occupation" value={student.motherOccupation} />
          <IB label="Aadhar No." value={student.motherAadharNumber} />
        </div>

        {/* Guardian */}
        {(student.guardianName || student.guardianMobile) && (<>
          <SecHead title="Guardian's Details" />
          <div className="grid grid-cols-2 gap-2">
            <IB label="Guardian's Name" value={student.guardianName} />
            <IB label="Relation" value={student.guardianRelation} />
            <IB label="Mobile" value={student.guardianMobile} />
            <IB label="Occupation" value={student.guardianOccupation} />
          </div>
        </>)}

        {/* Contact */}
        <SecHead title="Contact Details" />
        <div className="grid grid-cols-2 gap-2">
          <IB label="Parent Email" value={student.parentEmail} />
          <IB label="WhatsApp" value={student.whatsappNumber} />
          <IB label="Sibling in School" value={student.siblingName} />
        </div>

        {/* Address */}
        <SecHead title="Residential Address" />
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
          <p className="text-sm font-bold text-gray-800">{student.address || 'N/A'}</p>
          {(student.district || student.state) && <p className="text-xs text-gray-500">{[student.district, student.state].filter(Boolean).join(', ')}</p>}
          {student.pincode && <p className="text-xs text-gray-500">Pin: {student.pincode}</p>}
        </div>
        {!student.permanentAddressSameAsResidential && student.permanentAddress && (<>
          <SecHead title="Permanent Address" />
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <p className="text-sm font-bold text-gray-800">{student.permanentAddress}</p>
            {(student.permanentDistrict || student.permanentState) && <p className="text-xs text-gray-500">{[student.permanentDistrict, student.permanentState].filter(Boolean).join(', ')}</p>}
            {student.permanentPincode && <p className="text-xs text-gray-500">Pin: {student.permanentPincode}</p>}
          </div>
        </>)}

        {/* Previous School */}
        {student.previousSchoolName && (<>
          <SecHead title="Previous School" />
          <div className="grid grid-cols-2 gap-2">
            <IB label="School Name" value={student.previousSchoolName} />
            <IB label="Class" value={student.previousSchoolClass} />
            <IB label="Year" value={student.previousSchoolYear} />
          </div>
        </>)}

        {/* Transport */}
        <SecHead title="Transport" />
        <div className="grid grid-cols-2 gap-2">
          <IB label="Required" value={student.transportRequired ? 'Yes' : 'No'} />
          {student.transportRequired && <>
            <IB label="Mode / Vehicle" value={student.transportMode} />
            <IB label="Route / Stop" value={student.transportRoute} />
          </>}
        </div>

        {/* Documents */}
        <SecHead title="Documents Submitted" />
        <div className="flex flex-wrap gap-2">
          {student.documents && Object.entries(student.documents).filter(([,v]) => v === true).map(([key]) => (
            <span key={key} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-[11px] font-bold text-green-800">
              <CheckCircle size={12} className="text-green-600" /> {DOC_LABELS[key] || key}
            </span>
          ))}
          {(!student.documents || Object.values(student.documents).every(v => !v)) && (
            <p className="text-xs italic text-gray-400">No documents submitted yet.</p>
          )}
        </div>

        {/* Enrollment Timeline */}
        {student.academicHistory?.length > 0 && (<>
          <SecHead title="Academic History" />
          <div className="space-y-2">
            {student.academicHistory.map((h, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                <div className="flex-grow">
                  <p className="text-sm font-bold text-gray-800">Class {h.class}</p>
                  <p className="text-[10px] text-secondary font-medium">Session {h.year}</p>
                </div>
                <span className="text-[10px] font-black text-success bg-green-50 px-2 py-1 rounded-lg border border-green-100">{h.status}</span>
              </div>
            ))}
          </div>
        </>)}

      </div>
    </Modal>
  );
};


// ============ EDIT MODAL COMPONENT ============
const EditStudentModal = ({ isOpen, onClose, student, onSubmit, submitting }) => {
  const [imagePreview, setImagePreview] = React.useState(student?.profileImage || null);
  const [editTab, setEditTab] = React.useState(0);
  const [photoSourceOpen, setPhotoSourceOpen] = React.useState(false);
  const galleryInputRef = React.useRef(null);
  const cameraInputRef  = React.useRef(null);

  React.useEffect(() => {
    setImagePreview(student?.profileImage || null);
    setEditTab(0);
  }, [student?._id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2000000) return alert("File too large. Max 2MB.");
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  if (!student) return null;

  const EDIT_TABS = ['Basic', 'Parents', 'Address', 'Documents'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Student Records">
      <form onSubmit={(e) => { e._imagePreview = imagePreview; onSubmit(e); }} className="space-y-4">

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl">
          {EDIT_TABS.map((t, i) => (
            <button key={i} type="button" onClick={() => setEditTab(i)}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${editTab === i ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`}>
              {t}
            </button>
          ))}
        </div>


        {/* ── TAB 0: BASIC ── */}
        {editTab === 0 && (
          <div className="space-y-3">
            {/* Photo */}
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="relative">
                <div className="w-24 h-28 bg-white border-2 border-gray-200 rounded-xl overflow-hidden flex items-center justify-center shadow-md">
                  {imagePreview ? <img src={imagePreview} alt="Student" className="w-full h-full object-cover" />
                    : <span className="text-3xl font-black text-primary/30">{student.name?.charAt(0)}</span>}
                </div>
                <button type="button" onClick={() => setPhotoSourceOpen(true)}
                  className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-indigo-600 transition-colors">
                  <Camera size={16} />
                </button>
                <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageChange} />
              </div>
              <input type="hidden" name="profileImage" value={imagePreview || ''} />
            </div>

            {/* Photo Source Modal */}
            {photoSourceOpen && (
              <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                    <p className="text-sm font-black text-gray-900 uppercase tracking-wide">Photo Upload Karo</p>
                    <button type="button" onClick={() => setPhotoSourceOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                      <span className="text-gray-600 font-bold text-lg leading-none">×</span>
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-gray-500 text-center">Photo kahan se leni hai?</p>
                    <button type="button" onClick={() => { setPhotoSourceOpen(false); cameraInputRef.current?.click(); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary hover:bg-indigo-50 transition-all">
                      <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                        <Camera size={22} className="text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">Camera se liya</p>
                        <p className="text-xs text-gray-500">Abhi photo khicho</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => { setPhotoSourceOpen(false); galleryInputRef.current?.click(); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary hover:bg-indigo-50 transition-all">
                      <div className="w-11 h-11 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-green-600 text-xl">🖼</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">Gallery se chunao</p>
                        <p className="text-xs text-gray-500">Phone se photo select karo</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <EF label="Full Name *" name="name" defaultValue={student.name} />
              <ES label="Gender" name="gender" defaultValue={student.gender} options={['Male','Female','Other']} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EF label="Date of Birth" name="dateOfBirth" type="date" defaultValue={student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : ''} />
              <ES label="Class" name="class" defaultValue={student.class} options={['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'].map(c=>({v:c,l:`Class ${c}`}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EF label="Section" name="section" defaultValue={student.section} placeholder="A/B/C" />
              <ES label="Blood Group" name="bloodGroup" defaultValue={student.bloodGroup} options={['','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=>({v:b,l:b||'Select'}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ES label="Category" name="category" defaultValue={student.category} options={['General','OBC','SC','ST','Minority','Other']} />
              <ES label="Admission Type" name="admissionType" defaultValue={student.admissionType} options={[{v:'New',l:'New Admission'},{v:'Old',l:'Old Student'}]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EF label="Aadhar No." name="aadharNumber" defaultValue={student.aadharNumber} placeholder="XXXX-XXXX-XXXX" maxLength={14} />
              <EF label="PEN No." name="penNumber" defaultValue={student.penNumber} placeholder="11-12 digits" maxLength={12} />
            </div>
            <EF label="Sibling in School" name="siblingName" defaultValue={student.siblingName} placeholder="Name if enrolled" />
          </div>
        )}

        {/* ── TAB 1: PARENTS ── */}
        {editTab === 1 && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
              <p className="text-[10px] font-black text-blue-700 uppercase">Father</p>
              <div className="grid grid-cols-2 gap-3">
                <EF label="Father's Name" name="fatherName" defaultValue={student.fatherName} />
                <EF label="Mobile" name="fatherMobile" defaultValue={student.fatherMobile} maxLength={10} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EF label="Occupation" name="fatherOccupation" defaultValue={student.fatherOccupation} />
                <EF label="Qualification" name="fatherQualification" defaultValue={student.fatherQualification} />
              </div>
              <EF label="Aadhar No." name="fatherAadharNumber" defaultValue={student.fatherAadharNumber} placeholder="XXXX-XXXX-XXXX" maxLength={14} />
            </div>
            <div className="p-3 bg-pink-50 rounded-2xl border border-pink-100 space-y-3">
              <p className="text-[10px] font-black text-pink-700 uppercase">Mother</p>
              <div className="grid grid-cols-2 gap-3">
                <EF label="Mother's Name" name="motherName" defaultValue={student.motherName} />
                <EF label="Mobile" name="motherMobile" defaultValue={student.motherMobile} maxLength={10} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EF label="Occupation" name="motherOccupation" defaultValue={student.motherOccupation} />
                <EF label="Aadhar No." name="motherAadharNumber" defaultValue={student.motherAadharNumber} maxLength={14} />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <p className="text-[10px] font-black text-gray-500 uppercase">Guardian</p>
              <div className="grid grid-cols-2 gap-3">
                <EF label="Guardian Name" name="guardianName" defaultValue={student.guardianName} />
                <EF label="Relation" name="guardianRelation" defaultValue={student.guardianRelation} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EF label="Mobile" name="guardianMobile" defaultValue={student.guardianMobile} maxLength={10} />
                <EF label="Occupation" name="guardianOccupation" defaultValue={student.guardianOccupation} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EF label="Parent Email" name="parentEmail" type="email" defaultValue={student.parentEmail} />
              <EF label="WhatsApp No." name="whatsappNumber" defaultValue={student.whatsappNumber} maxLength={10} />
            </div>
          </div>
        )}


        {/* ── TAB 2: ADDRESS & SCHOOL ── */}
        {editTab === 2 && (
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
              <p className="text-[10px] font-black text-orange-700 uppercase">Residential Address</p>
              <EF label="House No. / City / Street *" name="address" defaultValue={student.address} />
              <div className="grid grid-cols-2 gap-3">
                <EF label="District" name="district" defaultValue={student.district} />
                <EF label="State" name="state" defaultValue={student.state} />
              </div>
              <EF label="Pincode *" name="pincode" defaultValue={student.pincode} maxLength={6} />
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <p className="text-[10px] font-black text-gray-500 uppercase">Permanent Address (if different)</p>
              <EF label="House No. / City / Street" name="permanentAddress" defaultValue={student.permanentAddress} />
              <div className="grid grid-cols-2 gap-3">
                <EF label="District" name="permanentDistrict" defaultValue={student.permanentDistrict} />
                <EF label="State" name="permanentState" defaultValue={student.permanentState} />
              </div>
              <EF label="Pincode" name="permanentPincode" defaultValue={student.permanentPincode} maxLength={6} />
            </div>
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
              <p className="text-[10px] font-black text-primary uppercase">Previous School</p>
              <EF label="School Name" name="previousSchoolName" defaultValue={student.previousSchoolName} />
              <div className="grid grid-cols-2 gap-3">
                <EF label="Class" name="previousSchoolClass" defaultValue={student.previousSchoolClass} />
                <EF label="Year" name="previousSchoolYear" defaultValue={student.previousSchoolYear} />
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
              <p className="text-[10px] font-black text-amber-700 uppercase">Transport</p>
              <ES label="Transport Required" name="transportRequired" defaultValue={student.transportRequired ? 'true' : 'false'} options={[{v:'false',l:'No'},{v:'true',l:'Yes'}]} />
              <div className="grid grid-cols-2 gap-3">
                <EF label="Mode / Vehicle" name="transportMode" defaultValue={student.transportMode} />
                <EF label="Route / Stop" name="transportRoute" defaultValue={student.transportRoute} />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: DOCUMENTS ── */}
        {editTab === 3 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-green-700 uppercase">Documents Received</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'transferCertificate',  label: 'Transfer Certificate' },
                { id: 'migrationCertificate', label: 'Migration Certificate' },
                { id: 'characterCertificate', label: 'Character Certificate' },
                { id: 'casteCertificate',     label: 'Caste Certificate' },
                { id: 'birthCertificate',     label: 'Birth Certificate' },
                { id: 'markSheet',            label: 'Previous Class Result' },
                { id: 'fivePhotos',           label: '5 Photograph Passport Size' },
                { id: 'studentAadhar',        label: 'Student Aadhar Copy' },
                { id: 'fatherAadhar',         label: 'Father Aadhar Copy' },
                { id: 'motherAadhar',         label: 'Mother Aadhar Copy' },
              ].map(doc => (
                <label key={doc.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-green-400 cursor-pointer transition-all">
                  <input type="checkbox" name={`documents.${doc.id}`} defaultChecked={student?.documents?.[doc.id] || false} className="w-5 h-5 accent-green-600 cursor-pointer" />
                  <span className="text-xs font-bold text-gray-600">{doc.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" fullWidth isLoading={submitting}>Save All Changes</Button>
        </div>
      </form>
    </Modal>
  );
};


// ============ PASSWORD RESET MODAL COMPONENT ============
const PasswordResetModal = ({ isOpen, onClose, student, password, setPassword, onReset, submitting }) => {
  if (!student) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Password Reset">
      <div className="space-y-4">
        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
          <p className="text-xs font-bold text-purple-700 uppercase">Target: {student.name}</p>
          <p className="text-[10px] text-purple-400 mt-1">Enter the new password the student will use to log in.</p>
        </div>
        <Input label="New Password" placeholder="Enter new password..." value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
          <Button fullWidth isLoading={submitting} onClick={onReset}>Update Password</Button>
        </div>
      </div>
    </Modal>
  );
};

// ============ PDF EXPORT MODAL COMPONENT ============
const PdfExportModal = ({ isOpen, onClose, exportCriteria, onCriteriaChange, pdfClass, setPdfClass, availableParams, selectedFields, toggleField, onGenerate, isGenerating }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Student Records">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">1. Report Type</label>
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button type="button" onClick={() => onCriteriaChange('class')}
              className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition-all ${exportCriteria === 'class' ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`}>
              Class-Wise
            </button>
            <button type="button" onClick={() => onCriteriaChange('new_admission')}
              className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition-all ${exportCriteria === 'new_admission' ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`}>
              New Admissions
            </button>
          </div>
        </div>
        {exportCriteria === 'class' && (
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">2. Select Class</label>
            <select className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 font-bold mt-1 outline-none focus:border-primary"
              value={pdfClass} onChange={(e) => setPdfClass(e.target.value)}>
              <option value="">Choose Class...</option>
              {['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'].map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">
            {exportCriteria === 'class' ? '3. Choose Parameters' : '2. Choose Parameters'}
          </label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {exportCriteria === 'new_admission' && (
              <button type="button" onClick={() => toggleField('class')}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-[11px] font-bold transition-all ${selectedFields.includes('class') ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-100 text-secondary'}`}>
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedFields.includes('class') ? 'bg-amber-500 border-amber-500' : 'bg-white'}`}>
                  {selectedFields.includes('class') && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                Target Class
              </button>
            )}
            {availableParams.map(param => (
              <button key={param.id} type="button" onClick={() => toggleField(param.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-[11px] font-bold transition-all ${selectedFields.includes(param.id) ? 'bg-indigo-50 border-primary text-primary' : 'bg-white border-gray-100 text-secondary'}`}>
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedFields.includes(param.id) ? 'bg-primary border-primary' : 'bg-white'}`}>
                  {selectedFields.includes(param.id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                {param.label}
              </button>
            ))}
          </div>
        </div>
        <Button fullWidth onClick={onGenerate} isLoading={isGenerating} icon={FileText}>Generate PDF Report</Button>
      </div>
    </Modal>
  );
};



// ============ ADD STUDENT MODAL COMPONENT ============
// Uses UNCONTROLLED inputs (no value/onChange per field) to prevent focus loss on re-render

const INP = "w-full h-11 bg-white border-2 border-gray-200 rounded-xl px-3 font-semibold text-sm outline-none focus:border-primary transition-colors";
const LB  = "text-[10px] font-black text-gray-500 uppercase tracking-wide block mb-1";

// EF and ES — used by EditStudentModal (uncontrolled, for editing existing student)
const EF = ({ label, name, type='text', defaultValue='', placeholder='', maxLength }) => (
  <div>
    <label className={LB}>{label}</label>
    <input name={name} type={type} defaultValue={defaultValue || ''} placeholder={placeholder}
      maxLength={maxLength} autoComplete="off" className={INP} />
  </div>
);
const ES = ({ label, name, defaultValue='', options }) => (
  <div>
    <label className={LB}>{label}</label>
    <select name={name} defaultValue={defaultValue || ''} className={INP}>
      {options.map(o => typeof o==='string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const FI = ({ label, name, type='text', placeholder='', defaultValue='', required=false, maxLength }) => (
  <div>
    <label className={LB}>{label}{required && <span className="text-danger ml-0.5">*</span>}</label>
    <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder}
      required={required} maxLength={maxLength} autoComplete="off" className={INP} />
  </div>
);

const SI = ({ label, name, options, defaultValue='' }) => (
  <div>
    <label className={LB}>{label}</label>
    <select name={name} defaultValue={defaultValue} className={INP}>
      {options.map(o => typeof o==='string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const DOCS = [
  { id:'transferCertificate',  label:'Transfer Certificate' },
  { id:'migrationCertificate', label:'Migration Certificate' },
  { id:'characterCertificate', label:'Character Certificate' },
  { id:'casteCertificate',     label:'Caste Certificate' },
  { id:'birthCertificate',     label:'Birth Certificate' },
  { id:'markSheet',            label:'Previous Class Result' },
  { id:'fivePhotos',           label:'5 Photograph Passport Size' },
  { id:'studentAadhar',        label:'Student Aadhar Copy' },
  { id:'fatherAadhar',         label:'Father Aadhar Copy' },
  { id:'motherAadhar',         label:'Mother Aadhar Copy' },
];

const AddStudentModal = ({ isOpen, onClose, onSubmit, submitting }) => {
  const [tab, setTab]               = React.useState(0);
  const [imgPreview, setImg]        = React.useState(null);
  const [sameAddr, setSameAddr]     = React.useState(true);
  const [transport, setTrans]       = React.useState(false);
  const [photoSourceOpen, setPhotoSourceOpen] = React.useState(false);
  const formRef       = React.useRef(null);
  const galleryImgRef = React.useRef(null);
  const cameraImgRef  = React.useRef(null);

  const reset = () => { setTab(0); setImg(null); setSameAddr(true); setTrans(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleImg = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2000000) { alert("Max 2MB"); return; }
    const r = new FileReader();
    r.onloadend = () => setImg(r.result);
    r.readAsDataURL(f);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const form = formRef.current;
    const g = name => form.elements[name]?.value || '';

    if (!g('UID').trim()) { alert("Admission No. is required"); return; }
    if (!g('fatherName') && !g('motherName') && !g('guardianName')) {
      alert("At least one parent/guardian name required"); return;
    }

    const documents = {};
    DOCS.forEach(d => { documents[d.id] = !!(form.elements[`doc_${d.id}`]?.checked); });

    onSubmit({
      UID: g('UID'), password: g('password') || 'Student@123',
      name: g('name'), dateOfBirth: g('dateOfBirth'), gender: g('gender'),
      class: g('class'), section: g('section'), category: g('category'),
      bloodGroup: g('bloodGroup'), admissionType: g('admissionType'),
      aadharNumber: g('aadharNumber'), penNumber: g('penNumber'),
      siblingName: g('siblingName'),
      address: g('address'), district: g('district'), state: g('state'), pincode: g('pincode'),
      permanentAddress: sameAddr ? '' : g('permanentAddress'),
      permanentDistrict: sameAddr ? '' : g('permanentDistrict'),
      permanentState: sameAddr ? '' : g('permanentState'),
      permanentPincode: sameAddr ? '' : g('permanentPincode'),
      permanentAddressSameAsResidential: sameAddr,
      fatherName: g('fatherName'), fatherMobile: g('fatherMobile'),
      fatherOccupation: g('fatherOccupation'), fatherAadharNumber: g('fatherAadharNumber'),
      fatherQualification: g('fatherQualification'),
      motherName: g('motherName'), motherMobile: g('motherMobile'),
      motherOccupation: g('motherOccupation'), motherAadharNumber: g('motherAadharNumber'),
      guardianName: g('guardianName'), guardianMobile: g('guardianMobile'),
      guardianRelation: g('guardianRelation'), guardianOccupation: g('guardianOccupation'),
      parentEmail: g('parentEmail'), whatsappNumber: g('whatsappNumber'),
      previousSchoolName: g('previousSchoolName'), previousSchoolClass: g('previousSchoolClass'),
      previousSchoolYear: g('previousSchoolYear'),
      transportRequired: transport,
      transportMode: g('transportMode'), transportRoute: g('transportRoute'),
      profileImage: imgPreview || "",
      documents,
    });
  };

  if (!isOpen) return null;

  const TABS = ['Credentials', 'Student', 'Parents', 'Address & School'];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Student">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={i} type="button" onClick={() => setTab(i)}
              className={`flex-1 min-w-max py-2 px-2 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap
                ${tab===i ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`}>
              {i+1}. {t}
            </button>
          ))}
        </div>

        {/* ── TAB 0: CREDENTIALS ── */}
        <div className={tab===0 ? 'space-y-4' : 'hidden'}>
            <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-200">
              <p className="text-[10px] font-black text-green-700 uppercase mb-3">Login Credentials</p>
              <div className="grid grid-cols-2 gap-3">
                <FI label="Admission No." name="UID" placeholder="e.g. SPP2025001" required />
                <FI label="Default Password" name="password" defaultValue="Student@123" placeholder="Student@123" />
              </div>
              <p className="text-[10px] text-green-600 italic mt-2">Student logs in with this Admission No. and password.</p>
            </div>
            {/* Photo */}
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="relative">
                <div className="w-24 h-28 bg-white border-2 border-gray-200 rounded-xl overflow-hidden flex items-center justify-center shadow-sm">
                  {imgPreview
                    ? <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
                    : <Camera size={28} className="text-gray-300" />}
                </div>
                <button type="button" onClick={() => setPhotoSourceOpen(true)}
                  className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-full cursor-pointer shadow-lg hover:bg-indigo-600 transition-colors">
                  <Camera size={14} />
                </button>
                <input ref={galleryImgRef} type="file" className="hidden" accept="image/*" onChange={handleImg} />
                <input ref={cameraImgRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImg} />
              </div>
              <p className="text-[10px] text-secondary mt-2">Photo (optional)</p>
            </div>

            {/* Photo Source Modal */}
            {photoSourceOpen && (
              <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                    <p className="text-sm font-black text-gray-900 uppercase tracking-wide">Photo Upload Karo</p>
                    <button type="button" onClick={() => setPhotoSourceOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                      <span className="text-gray-600 font-bold text-lg leading-none">×</span>
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-gray-500 text-center">Photo kahan se leni hai?</p>
                    <button type="button" onClick={() => { setPhotoSourceOpen(false); cameraImgRef.current?.click(); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary hover:bg-indigo-50 transition-all">
                      <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                        <Camera size={22} className="text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">Camera se liya</p>
                        <p className="text-xs text-gray-500">Abhi photo khicho</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => { setPhotoSourceOpen(false); galleryImgRef.current?.click(); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary hover:bg-indigo-50 transition-all">
                      <div className="w-11 h-11 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-green-600 text-xl">🖼</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">Gallery se chunao</p>
                        <p className="text-xs text-gray-500">Phone se photo select karo</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <Button type="button" fullWidth icon={ChevronRight} onClick={() => setTab(1)}>Next: Student Details</Button>
        </div>

        {/* ── TAB 1: STUDENT ── */}
        <div className={tab===1 ? 'space-y-3' : 'hidden'}>
            <FI label="Full Name" name="name" placeholder="Student's full name" required />
            <div className="grid grid-cols-2 gap-3">
              <SI label="Gender" name="gender" defaultValue="Male" options={['Male','Female','Other']} />
              <FI label="Date of Birth" name="dateOfBirth" type="date" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SI label="Class" name="class" defaultValue="1" options={['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'].map(c=>({v:c,l:`Class ${c}`}))} />
              <FI label="Section" name="section" placeholder="A / B / C" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SI label="Category" name="category" defaultValue="General" options={['General','OBC','SC','ST','Minority','Other']} />
              <SI label="Blood Group" name="bloodGroup" defaultValue="" options={['','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=>({v:b,l:b||'Select'}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SI label="Admission Type" name="admissionType" defaultValue="New" options={[{v:'New',l:'New Admission'},{v:'Old',l:'Old Student'}]} />
              <FI label="Sibling in School" name="siblingName" placeholder="Name if enrolled" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FI label="Aadhar No." name="aadharNumber" placeholder="XXXX-XXXX-XXXX" maxLength={14} />
              <FI label="PEN No." name="penNumber" placeholder="11-12 digits" maxLength={12} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" fullWidth onClick={() => setTab(0)}>Back</Button>
              <Button type="button" fullWidth icon={ChevronRight} onClick={() => setTab(2)}>Next: Parents</Button>
            </div>
        </div>

        {/* ── TAB 2: PARENTS ── */}
        <div className={tab===2 ? 'space-y-3' : 'hidden'}>
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
              <p className="text-[10px] font-black text-blue-700 uppercase">Father</p>
              <div className="grid grid-cols-2 gap-3">
                <FI label="Father's Name" name="fatherName" />
                <FI label="Occupation" name="fatherOccupation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FI label="Mobile" name="fatherMobile" maxLength={10} />
                <FI label="Aadhar No." name="fatherAadharNumber" maxLength={14} />
              </div>
              <FI label="Qualification" name="fatherQualification" placeholder="e.g. Graduate" />
            </div>
            <div className="p-3 bg-pink-50 rounded-2xl border border-pink-100 space-y-3">
              <p className="text-[10px] font-black text-pink-700 uppercase">Mother</p>
              <div className="grid grid-cols-2 gap-3">
                <FI label="Mother's Name" name="motherName" />
                <FI label="Occupation" name="motherOccupation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FI label="Mobile" name="motherMobile" maxLength={10} />
                <FI label="Aadhar No." name="motherAadharNumber" maxLength={14} />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <p className="text-[10px] font-black text-gray-500 uppercase">Guardian (if no parents)</p>
              <div className="grid grid-cols-2 gap-3">
                <FI label="Guardian Name" name="guardianName" />
                <FI label="Relation" name="guardianRelation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FI label="Mobile" name="guardianMobile" maxLength={10} />
                <FI label="Occupation" name="guardianOccupation" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FI label="Parent Email" name="parentEmail" type="email" />
              <FI label="WhatsApp No." name="whatsappNumber" maxLength={10} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" fullWidth onClick={() => setTab(1)}>Back</Button>
              <Button type="button" fullWidth icon={ChevronRight} onClick={() => setTab(3)}>Next: Address</Button>
            </div>
        </div>

        {/* ── TAB 3: ADDRESS & SCHOOL ── */}
        <div className={tab===3 ? 'space-y-3' : 'hidden'}>
            <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
              <p className="text-[10px] font-black text-orange-700 uppercase">Residential Address</p>
              <FI label="House No. / City / Street *" name="address" required />
              <div className="grid grid-cols-2 gap-3">
                <FI label="District" name="district" />
                <FI label="State" name="state" />
              </div>
              <FI label="Pincode *" name="pincode" maxLength={6} required />
            </div>
            <label className="flex items-center gap-2 cursor-pointer px-1">
              <input type="checkbox" checked={sameAddr} onChange={e => setSameAddr(e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-xs font-bold text-gray-600">Permanent address same as residential</span>
            </label>
            {!sameAddr && (
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase">Permanent Address</p>
                <FI label="House No. / City / Street" name="permanentAddress" />
                <div className="grid grid-cols-2 gap-3">
                  <FI label="District" name="permanentDistrict" />
                  <FI label="State" name="permanentState" />
                </div>
                <FI label="Pincode" name="permanentPincode" maxLength={6} />
              </div>
            )}
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
              <p className="text-[10px] font-black text-primary uppercase">Previous School</p>
              <FI label="School Name" name="previousSchoolName" />
              <div className="grid grid-cols-2 gap-3">
                <FI label="Class" name="previousSchoolClass" />
                <FI label="Year" name="previousSchoolYear" />
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
              <p className="text-[10px] font-black text-amber-700 uppercase">Transport</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                  <input type="radio" checked={transport} onChange={() => setTrans(true)} className="accent-primary" /> Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                  <input type="radio" checked={!transport} onChange={() => setTrans(false)} className="accent-primary" /> No
                </label>
              </div>
              {transport && (
                <div className="grid grid-cols-2 gap-3">
                  <FI label="Mode / Vehicle" name="transportMode" />
                  <FI label="Route / Stop" name="transportRoute" />
                </div>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-2xl border border-green-200 space-y-3">
              <p className="text-[10px] font-black text-green-700 uppercase">Documents Submitted</p>
              <div className="grid grid-cols-1 gap-2">
                {DOCS.map(doc => (
                  <label key={doc.id} className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-all">
                    <input type="checkbox" name={`doc_${doc.id}`} className="w-5 h-5 accent-green-600 cursor-pointer" />
                    <span className="text-xs font-bold text-gray-700">{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" fullWidth onClick={() => setTab(2)}>Back</Button>
              <Button type="submit" fullWidth isLoading={submitting} icon={UserPlus}>Add Student</Button>
            </div>
        </div>

      </form>
    </Modal>
  );
};

export default StudentDirectory;
