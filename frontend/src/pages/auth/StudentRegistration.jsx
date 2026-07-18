import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, User, Phone, MapPin, Mail, Users, Send,
  Camera, Image, Info, ChevronRight, ShieldCheck, Bus, School, X
} from 'lucide-react';
import API from '../../api/axios';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const formatAadhar = (value) => {
  const digits = value.replace(/\D/g, "").substring(0, 12);
  const sections = digits.match(/.{1,4}/g);
  return sections ? sections.join("-") : digits;
};

const SectionTitle = ({ icon: Icon, title, color = "text-red-600" }) => (
  <div className="flex items-center gap-2 mb-4 mt-2">
    <div className={`w-3 h-3 rounded-full ${color === "text-red-600" ? "bg-red-600" : "bg-blue-600"}`} />
    <h3 className={`font-black uppercase text-sm tracking-wider ${color}`}>{title}</h3>
  </div>
);

const FieldRow = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
);

const StudentRegistration = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sameAsResidential, setSameAsResidential] = useState(true);
  const [transportRequired, setTransportRequired] = useState(false);
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);

  // refs for dual photo input
  const galleryInputRef = useRef(null);
  const cameraInputRef  = useRef(null);
  // ✅ Documents managed separately — not via react-hook-form
  const [checkedDocs, setCheckedDocs] = useState({});

  const toggleDoc = (id) => setCheckedDocs(prev => ({ ...prev, [id]: !prev[id] }));

  const { register, handleSubmit, setValue, trigger, watch, formState: { errors } } = useForm({
    defaultValues: { gender: 'Male', category: 'General', class: '1' }
  });

  const TOTAL_STEPS = 4;

  const CHECKLIST_DOCS = [
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
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2000000) { setToast({ message: "File is too large. Max 2MB.", type: "error" }); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        profileImage: imagePreview,
        academicYear: settings.currentAcademicYear,
        admissionType: 'New',
        transportRequired,
        permanentAddressSameAsResidential: sameAsResidential,
        documents: checkedDocs,   // ✅ use state-managed docs
      };
      await API.post('/students/register', payload);
      setToast({ message: "Application submitted successfully! Awaiting admin approval.", type: "success" });
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Registration failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const goNext = async (fields) => {
    const isValid = await trigger(fields);
    if (isValid) setCurrentStep(s => s + 1);
  };

  if (!settings.isRegistrationOpen) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-amber-50 text-warning rounded-full flex items-center justify-center mb-4">
          <Info size={40} />
        </div>
        <h1 className="text-2xl font-black">Admissions Closed</h1>
        <p className="text-secondary mt-2">Currently not accepting applications for {settings.currentAcademicYear}.</p>
        <Button className="mt-6" onClick={() => navigate('/')}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* HEADER */}
          <div className="bg-primary p-6 text-white relative overflow-hidden">
            <button type="button" onClick={() => navigate('/')} className="mb-3 p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black">Admission Application</h1>
                <p className="text-indigo-100 text-sm mt-1">{settings.schoolName} • Session {settings.currentAcademicYear}</p>
              </div>
              <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-full">
                Step {currentStep}/{TOTAL_STEPS}
              </span>
            </div>
            <div className="flex gap-1.5 mt-4">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < currentStep ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-5">

            {/* ══════════════════════════════════════════
                STEP 1 — STUDENT DETAILS
            ══════════════════════════════════════════ */}
            {currentStep === 1 && (
              <>
                <SectionTitle title="Student Details" />

                {/* Photo + Name row */}
                <div className="flex gap-5 items-start">
                  {/* PHOTO */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="relative">
                      <div className="w-28 h-36 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden flex items-center justify-center">
                        {imagePreview
                          ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          : <div className="text-center p-2"><Camera size={28} className="mx-auto text-gray-300 mb-1" /><p className="text-[9px] text-gray-400 font-bold uppercase">Photo</p></div>
                        }
                      </div>
                      {/* Camera icon opens source chooser */}
                      <button
                        type="button"
                        onClick={() => setPhotoSourceOpen(true)}
                        className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-full cursor-pointer shadow-md hover:bg-indigo-600 transition-colors"
                      >
                        <Camera size={14} />
                      </button>

                      {/* Hidden: Gallery input */}
                      <input
                        ref={galleryInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {/* Hidden: Camera input */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageChange}
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-2 text-center">Passport Size</p>
                  </div>

                  {/* Name + DOB */}
                  <div className="flex-1 space-y-4">
                    <Input
                      label="First Name (Full Name)"
                      required
                      placeholder="Student's full name"
                      {...register("name", { required: "Name is required" })}
                      error={errors.name?.message}
                    />
                    <FieldRow>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-secondary uppercase">Gender <span className="text-danger">*</span></label>
                        <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold outline-none focus:border-primary" {...register("gender", { required: true })}>
                          <option value="Male">☐ Male</option>
                          <option value="Female">☐ Female</option>
                          <option value="Other">☐ Other</option>
                        </select>
                      </div>
                      <Input label="Date of Birth" type="date" required {...register("dateOfBirth", { required: "DOB is required" })} error={errors.dateOfBirth?.message} />
                    </FieldRow>
                  </div>
                </div>

                <FieldRow>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary uppercase">Class <span className="text-danger">*</span></label>
                    <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold outline-none focus:border-primary" {...register("class", { required: true })}>
                      {['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(c =>
                        <option key={c} value={c}>Class {c}</option>
                      )}
                    </select>
                  </div>
                  <Input label="Section (Optional)" placeholder="e.g. A, B" {...register("section")} />
                </FieldRow>

                <FieldRow>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary uppercase">Category <span className="text-danger">*</span></label>
                    <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold outline-none focus:border-primary" {...register("category", { required: "Category is required" })}>
                      <option value="">Select Category</option>
                      {['General', 'OBC', 'SC', 'ST', 'Minority', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="text-xs text-danger font-medium">{errors.category.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary uppercase">Blood Group</label>
                    <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold outline-none focus:border-primary" {...register("bloodGroup")}>
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                </FieldRow>

                {/* Aadhar */}
                <FieldRow>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary uppercase">Aadhar No. (Optional)</label>
                    <input
                      type="text" placeholder="XXXX-XXXX-XXXX" maxLength="14"
                      {...register("aadharNumber", { validate: v => !v || v.length === 14 || "Aadhar must be 12 digits" })}
                      onChange={e => setValue("aadharNumber", formatAadhar(e.target.value))}
                      className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold tracking-widest outline-none focus:border-primary transition-colors"
                    />
                    {errors.aadharNumber && <p className="text-xs text-danger">{errors.aadharNumber.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary uppercase">PEN No. (Optional)</label>
                    <input
                      type="text" placeholder="11 or 12 digit PEN" maxLength="12"
                      {...register("penNumber", { validate: v => !v || /^\d{11,12}$/.test(v) || "PEN must be 11-12 digits" })}
                      onChange={e => setValue("penNumber", e.target.value.replace(/\D/g, "").substring(0, 12))}
                      className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold tracking-widest outline-none focus:border-primary transition-colors"
                    />
                    {errors.penNumber && <p className="text-xs text-danger">{errors.penNumber.message}</p>}
                  </div>
                </FieldRow>

                <Button type="button" fullWidth icon={ChevronRight}
                  onClick={() => goNext(["name", "gender", "dateOfBirth", "class", "category"])}>
                  Continue to Parent Details
                </Button>
              </>
            )}

            {/* ══════════════════════════════════════════
                STEP 2 — PARENT & GUARDIAN DETAILS
            ══════════════════════════════════════════ */}
            {currentStep === 2 && (
              <>
                {/* Father */}
                <SectionTitle title="Father's Details" />
                <FieldRow>
                  <Input label="Father's Name" placeholder="Full name" {...register("fatherName")} />
                  <Input label="Father's Occupation" placeholder="Occupation" {...register("fatherOccupation")} />
                </FieldRow>
                <FieldRow>
                  <Input label="Father's Mobile" icon={Phone} type="tel" maxLength={10} placeholder="10-digit number"
                    {...register("fatherMobile", { pattern: { value: /^\d{10}$/, message: "Must be 10 digits" } })}
                    onInput={e => { e.target.value = e.target.value.replace(/\D/g,'').slice(0,10); }}
                    error={errors.fatherMobile?.message} />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary uppercase">Father's Aadhar No.</label>
                    <input type="text" placeholder="XXXX-XXXX-XXXX" maxLength="14"
                      {...register("fatherAadharNumber")}
                      onChange={e => setValue("fatherAadharNumber", formatAadhar(e.target.value))}
                      className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold tracking-widest outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </FieldRow>
                <Input label="Father's Qualification" placeholder="e.g. B.Tech, Graduate"
                  {...register("fatherQualification")} />

                <div className="border-t border-gray-100 my-2" />

                {/* Mother */}
                <SectionTitle title="Mother's Details" />
                <FieldRow>
                  <Input label="Mother's Name" placeholder="Full name" {...register("motherName")} />
                  <Input label="Mother's Occupation" placeholder="Occupation" {...register("motherOccupation")} />
                </FieldRow>
                <FieldRow>
                  <Input label="Mother's Mobile" icon={Phone} type="tel" maxLength={10} placeholder="10-digit number"
                    {...register("motherMobile", { pattern: { value: /^\d{10}$/, message: "Must be 10 digits" } })}
                    onInput={e => { e.target.value = e.target.value.replace(/\D/g,'').slice(0,10); }}
                    error={errors.motherMobile?.message} />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary uppercase">Mother's Aadhar No.</label>
                    <input type="text" placeholder="XXXX-XXXX-XXXX" maxLength="14"
                      {...register("motherAadharNumber")}
                      onChange={e => setValue("motherAadharNumber", formatAadhar(e.target.value))}
                      className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold tracking-widest outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </FieldRow>

                <div className="border-t border-gray-100 my-2" />

                {/* Guardian */}
                <div className="flex items-center gap-3 my-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Guardian Details (If No Parents)</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <FieldRow>
                  <Input label="Guardian's Name" placeholder="Legal guardian" {...register("guardianName")} />
                  <Input label="Relation" placeholder="e.g. Uncle, Grandparent" {...register("guardianRelation")} />
                </FieldRow>
                <FieldRow>
                  <Input label="Guardian's Mobile" icon={Phone} type="tel" maxLength={10} placeholder="10-digit number"
                    {...register("guardianMobile", { pattern: { value: /^\d{10}$/, message: "Must be 10 digits" } })}
                    onInput={e => { e.target.value = e.target.value.replace(/\D/g,'').slice(0,10); }}
                    error={errors.guardianMobile?.message} />
                  <Input label="Guardian's Occupation" placeholder="Occupation" {...register("guardianOccupation")} />
                </FieldRow>

                <div className="border-t border-gray-100 my-2" />

                {/* Contact */}
                <SectionTitle title="Contact Details" />
                <FieldRow>
                  <Input label="Parent/Guardian Email (Optional)" icon={Mail} type="email"
                    placeholder="parent@email.com"
                    {...register("parentEmail", {
                      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email" }
                    })}
                    error={errors.parentEmail?.message} />
                  <Input label="WhatsApp Number" icon={Phone} type="tel" maxLength={10} placeholder="10-digit WhatsApp"
                    {...register("whatsappNumber", { pattern: { value: /^\d{10}$/, message: "Must be 10 digits" } })}
                    onInput={e => { e.target.value = e.target.value.replace(/\D/g,'').slice(0,10); }}
                    error={errors.whatsappNumber?.message} />
                </FieldRow>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-700 font-medium">
                    ℹ️ Please provide either parent OR guardian information. At least one contact is required.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" fullWidth onClick={() => setCurrentStep(1)}>Back</Button>
                  <Button type="button" fullWidth icon={ChevronRight}
                    onClick={async () => {
                      const father = watch("fatherName");
                      const mother = watch("motherName");
                      const guardian = watch("guardianName");
                      if (!father && !mother && !guardian) {
                        setToast({ message: "Please provide at least one parent or guardian name", type: "error" });
                        return;
                      }
                      await goNext([]);
                    }}>
                    Continue to Address
                  </Button>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════
                STEP 3 — ADDRESS & PREVIOUS SCHOOL
            ══════════════════════════════════════════ */}
            {currentStep === 3 && (
              <>
                <SectionTitle title="Residential Address" />
                <Input label="House No. / City" icon={MapPin} required placeholder="House no., Street, City"
                  {...register("address", { required: "Address is required" })} error={errors.address?.message} />
                <FieldRow>
                  <Input label="District" placeholder="District" {...register("district")} />
                  <Input label="State" placeholder="State" {...register("state")} />
                </FieldRow>
                <Input label="Pincode" required placeholder="6-digit pincode" maxLength={6}
                  {...register("pincode", {
                    required: "Pincode is required",
                    pattern: { value: /^\d{6}$/, message: "Must be 6 digits" }
                  })} error={errors.pincode?.message} />

                {/* Permanent Address */}
                <div className="flex items-center gap-3 mt-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={sameAsResidential}
                      onChange={e => setSameAsResidential(e.target.checked)}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-xs font-bold text-gray-600">Permanent Address same as Residential</span>
                  </label>
                </div>

                {!sameAsResidential && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <SectionTitle title="Permanent Address" color="text-blue-600" />
                    <Input label="House No. / City" placeholder="House no., Street, City" {...register("permanentAddress")} />
                    <FieldRow>
                      <Input label="District" placeholder="District" {...register("permanentDistrict")} />
                      <Input label="State" placeholder="State" {...register("permanentState")} />
                    </FieldRow>
                    <Input label="Pincode" placeholder="6-digit pincode" maxLength={6} {...register("permanentPincode")} />
                  </div>
                )}

                <div className="border-t border-gray-100 my-4" />

                {/* Previous School */}
                <SectionTitle title="Previous School Details" />
                <Input label="Previous School Name" icon={School} placeholder="School name (if any)"
                  {...register("previousSchoolName")} />
                <FieldRow>
                  <Input label="Class" placeholder="e.g. Class 5" {...register("previousSchoolClass")} />
                  <Input label="Year" placeholder="e.g. 2024-25" {...register("previousSchoolYear")} />
                </FieldRow>

                <div className="border-t border-gray-100 my-4" />

                {/* Transport */}
                <SectionTitle title="Transport Details" />
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={transportRequired} onChange={() => setTransportRequired(true)} className="accent-primary" />
                    <span className="text-sm font-bold text-gray-700">☐ Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={!transportRequired} onChange={() => setTransportRequired(false)} className="accent-primary" />
                    <span className="text-sm font-bold text-gray-700">☐ No</span>
                  </label>
                </div>
                {transportRequired && (
                  <div className="space-y-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <Input label="Mode / Vehicle" icon={Bus} placeholder="e.g. School Bus, Van"
                      {...register("transportMode")} />
                    <Input label="Route / Stop" placeholder="Route name or stop point"
                      {...register("transportRoute")} />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" fullWidth onClick={() => setCurrentStep(2)}>Back</Button>
                  <Button type="button" fullWidth icon={ChevronRight}
                    onClick={() => goNext(["address", "pincode"])}>
                    Continue to Documents
                  </Button>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════
                STEP 4 — DOCUMENTS & DECLARATION
            ══════════════════════════════════════════ */}
            {currentStep === 4 && (
              <>
                <SectionTitle title="Documents Submitted" />
                <p className="text-xs text-gray-500 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-2">
                  ✅ Check the documents you are submitting now. Remaining can be submitted later.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CHECKLIST_DOCS.map((doc) => (
                    <label key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none
                        ${checkedDocs[doc.id]
                          ? 'bg-green-50 border-green-400'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}>
                      {/* Custom visible checkbox */}
                      <div
                        onClick={() => toggleDoc(doc.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all
                          ${checkedDocs[doc.id]
                            ? 'bg-green-500 border-green-500'
                            : 'bg-white border-gray-400'
                          }`}
                      >
                        {checkedDocs[doc.id] && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span
                        onClick={() => toggleDoc(doc.id)}
                        className={`text-xs font-bold transition-colors ${checkedDocs[doc.id] ? 'text-green-700' : 'text-gray-600'}`}
                      >
                        {doc.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="border-t border-gray-100 my-4" />

                {/* Sibling */}
                <Input label="Sibling in School (Optional)" placeholder="Name if already enrolled"
                  {...register("siblingName")} />

                {/* Declaration */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Declaration</p>
                  <p className="text-xs text-gray-600 font-medium">
                    I declare that the above information is true and correct to the best of my knowledge.
                  </p>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      {...register("declaration", { required: "Please accept the declaration" })}
                      style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#4f46e5' }}
                    />
                    <label className="text-xs text-gray-700 font-bold">I agree to the above declaration</label>
                  </div>
                  {errors.declaration && <p className="text-xs text-danger">{errors.declaration.message}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" fullWidth onClick={() => setCurrentStep(3)}>Back</Button>
                  <Button type="submit" fullWidth icon={Send} isLoading={loading}>Submit Application</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </form>

      {/* ── PHOTO SOURCE CHOOSER MODAL ── */}
      {photoSourceOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="text-sm font-black text-gray-900 uppercase tracking-wide">Photo Upload Karo</p>
              <button
                type="button"
                onClick={() => setPhotoSourceOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500 text-center">Photo kahan se leni hai?</p>

              {/* Camera Button */}
              <button
                type="button"
                onClick={() => { setPhotoSourceOpen(false); cameraInputRef.current?.click(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary hover:bg-indigo-50 transition-all"
              >
                <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                  <Camera size={22} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900">Camera se liya</p>
                  <p className="text-xs text-gray-500">Abhi photo khicho</p>
                </div>
              </button>

              {/* Gallery Button */}
              <button
                type="button"
                onClick={() => { setPhotoSourceOpen(false); galleryInputRef.current?.click(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary hover:bg-indigo-50 transition-all"
              >
                <div className="w-11 h-11 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                  <Image size={22} className="text-green-600" />
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
    </div>
  );
};

export default StudentRegistration;
