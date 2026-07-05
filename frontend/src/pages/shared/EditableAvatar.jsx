import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, Eye, X, Check, ImageIcon } from 'lucide-react';
import { getCroppedImg } from '../../utils/cropImage';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Toast from '../../components/common/Toast';

const EditableAvatar = ({ currentImage }) => {
  const { updateUser } = useAuth();

  // Two separate file inputs — one for gallery, one for camera
  const galleryInputRef = useRef(null);
  const cameraInputRef  = useRef(null);

  const [image, setImage]                   = useState(null);
  const [isViewOpen, setIsViewOpen]         = useState(false);
  const [isCropOpen, setIsCropOpen]         = useState(false);
  const [isSourceOpen, setIsSourceOpen]     = useState(false); // source chooser
  const [submitting, setSubmitting]         = useState(false);
  const [toast, setToast]                   = useState(null);

  const [crop, setCrop]                     = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                     = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input so same file can be selected again
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setIsSourceOpen(false);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    setSubmitting(true);
    try {
      const croppedBase64 = await getCroppedImg(image, croppedAreaPixels);
      const res = await API.put('/users/profile-picture', { image: croppedBase64 });
      updateUser({ profileImage: res.data.profileImage });
      setToast({ message: "Profile updated!", type: "success" });
      setIsCropOpen(false);
    } catch (err) {
      setToast({ message: "Upload failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative group">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── AVATAR ── */}
      <div className="w-24 h-24 md:w-32 md:h-32 bg-indigo-50 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative">
        {currentImage
          ? <img src={currentImage} alt="Avatar" className="w-full h-full object-cover" />
          : <span className="text-3xl font-black text-primary/30 uppercase">Photo</span>}

        {/* DUAL-ACTION OVERLAY */}
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {currentImage && (
            <button
              onClick={() => setIsViewOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black text-white uppercase bg-white/20 hover:bg-white/40 px-3 py-1.5 rounded-full transition-all"
            >
              <Eye size={14} /> View
            </button>
          )}
          <button
            onClick={() => setIsSourceOpen(true)}
            className="flex items-center gap-2 text-[10px] font-black text-white uppercase bg-primary hover:bg-indigo-600 px-3 py-1.5 rounded-full shadow-lg transition-all"
          >
            <Camera size={14} /> Change
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      {/* Gallery — no capture attribute so OS shows gallery */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Camera — capture=user for selfie / capture=environment for rear camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── SOURCE CHOOSER MODAL ── */}
      <Modal isOpen={isSourceOpen} onClose={() => setIsSourceOpen(false)} title="Photo Upload Karo">
        <div className="space-y-3 pb-2">
          <p className="text-xs text-gray-500 text-center">Photo kahan se leni hai?</p>

          {/* Camera Button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center gap-4 p-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 rounded-2xl transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shrink-0">
              <Camera size={24} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-gray-900">Camera se liya</p>
              <p className="text-xs text-gray-500">Abhi photo khicho</p>
            </div>
          </button>

          {/* Gallery Button */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-2xl transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center shrink-0">
              <ImageIcon size={24} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-gray-900">Gallery se chunao</p>
              <p className="text-xs text-gray-500">Phone se photo select karo</p>
            </div>
          </button>

          <button
            onClick={() => setIsSourceOpen(false)}
            className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* ── VIEW MODAL ── */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Profile Photo Preview">
        <div className="flex flex-col items-center gap-4">
          <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
            <img src={currentImage} alt="Full View" className="w-full h-full object-cover" />
          </div>
          <Button variant="outline" onClick={() => setIsViewOpen(false)} icon={X}>Close Preview</Button>
        </div>
      </Modal>

      {/* ── CROP MODAL ── */}
      <Modal isOpen={isCropOpen} onClose={() => setIsCropOpen(false)} title="Photo Adjust Karo">
        <div className="space-y-6">
          <div className="relative h-64 md:h-80 w-full bg-gray-900 rounded-2xl overflow-hidden">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase">Zoom in/out karo</p>
            <input
              type="range" min={1} max={3} step={0.1}
              value={zoom} onChange={(e) => setZoom(e.target.value)}
              className="w-full accent-primary"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setIsCropOpen(false)}>Cancel</Button>
            <Button fullWidth isLoading={submitting} onClick={handleUpload} icon={Check}>Save Photo</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EditableAvatar;
