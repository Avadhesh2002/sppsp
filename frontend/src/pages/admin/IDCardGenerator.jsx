import { useState, useEffect } from 'react';
import { Search, Download, Users, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../../api/axios';
import { useSettings } from '../../context/SettingsContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import schoolLogo from '../../assets/school_logo.png';
import signImage from '../../assets/sign.png';
import { downloadCards } from '../../utils/idCardDownload';

const CARD_W = 230;
const CARD_H = 370;

const resolvePhoto = (profileImage) => {
  if (!profileImage) return null;
  if (profileImage.startsWith('data:')) return profileImage;
  if (profileImage.startsWith('http')) return profileImage;
  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${apiBase}${profileImage}`;
};

// ─── StudentCard — Modern Theme ────────────────────────────────────────────
const StudentCard = ({ student, settings, color = '#1a237e' }) => {
  const dob     = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const contact = student.fatherMobile || student.motherMobile || student.guardianMobile || '—';
  const photo   = resolvePhoto(student.profileImage);

  // Derive accent colors
  const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r,g,b] = hex2rgb(color.length===7 ? color : '#1a237e');
  const light   = `rgba(${r},${g},${b},0.08)`;
  const mid     = `rgba(${r},${g},${b},0.15)`;

  return (
    <div style={{
      width: CARD_W, minHeight: CARD_H,
      fontFamily: "'Segoe UI', Arial, sans-serif",
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      flexShrink: 0,
      background: '#ffffff',
      position: 'relative',
    }}>

      {/* ── TOP COLOR BAR (3 stripes) ── */}
      <div style={{ display: 'flex', height: 6, flexShrink: 0 }}>
        <div style={{ flex: 1, background: color }} />
        <div style={{ flex: 1, background: '#FFD700' }} />
        <div style={{ flex: 1, background: color }} />
      </div>

      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(135deg, ${color} 0%, rgba(${r},${g},${b},0.85) 100%)`,
        padding: '10px 12px 8px',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ position:'absolute', bottom:-30, left:10, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ width:54, height:54, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,0.9)', overflow:'hidden', background:'#fff', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
            <img src={settings.schoolLogo || schoolLogo} alt="logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          {/* School Info */}
          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{ color:'#fff', fontWeight:900, fontSize:11.5, lineHeight:1.3, textShadow:'0 1px 2px rgba(0,0,0,0.3)' }}>
              {settings.schoolName || 'Sardar Patel Public School'}
            </div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:6, marginTop:1 }}>Govt. Recognised</div>
            <div style={{ color:'rgba(255,255,255,0.85)', fontSize:6, marginTop:2 }}>
              {settings.schoolAddress || 'Udaichandpur, Soraon, Prayagraj'}
            </div>
            <div style={{ color:'#FFD700', fontWeight:800, fontSize:6.5, marginTop:2 }}>
              📞 {settings.contactNumber || '—'}
            </div>
          </div>
        </div>

        {/* STUDENT ID CARD label */}
        <div style={{ textAlign:'center', marginTop:6, position:'relative', zIndex:1 }}>
          <span style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', fontWeight:900, fontSize:7.5, padding:'2px 14px', borderRadius:20, letterSpacing:'1.5px', textTransform:'uppercase' }}>
            Student ID Card
          </span>
        </div>
      </div>

      {/* ── PHOTO SECTION ── */}
      <div style={{ background: light, padding:'12px 12px 8px', display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <div style={{
          width:88, height:100,
          border:`3px solid ${color}`,
          borderRadius:8,
          overflow:'hidden',
          background:'#e8eaf6',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 4px 12px rgba(${r},${g},${b},0.25)`,
        }}>
          {photo
            ? <img src={photo} alt="photo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:40, fontWeight:900, color:color }}>{student.name?.charAt(0)}</span>}
        </div>

        {/* Name */}
        <div style={{ color:'#1a1a2e', fontWeight:800, fontSize:13.5, marginTop:7, textAlign:'center', letterSpacing:'0.3px' }}>
          {student.name}
        </div>

        {/* Class badge */}
        <div style={{ display:'flex', gap:6, marginTop:4 }}>
          <span style={{ background:color, color:'#fff', fontWeight:800, fontSize:7, padding:'2.5px 10px', borderRadius:20, letterSpacing:'0.5px' }}>
            Class {student.class || '—'}{student.section ? ` - ${student.section}` : ''}
          </span>
          <span style={{ background:'#FFD700', color:'#1a1a1a', fontWeight:800, fontSize:7, padding:'2.5px 10px', borderRadius:20, letterSpacing:'0.5px' }}>
            {student.admissionType === 'New' ? 'New Adm.' : student.category || 'General'}
          </span>
        </div>
      </div>

      {/* ── INFO TABLE ── */}
      <div style={{ padding:'4px 12px 2px', flex:1, background:'#fff' }}>
        {/* Adm No highlighted */}
        <div style={{ background:mid, borderRadius:6, padding:'4px 8px', marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:7, fontWeight:900, color:color, textTransform:'uppercase', letterSpacing:'0.5px' }}>Adm. No.:</span>
          <span style={{ fontSize:9, fontWeight:900, color:color, letterSpacing:'1px' }}>{student.UID || '—'}</span>
        </div>

        {[
          ["Father", student.fatherName || student.guardianName || '—'],
          ["Mother", student.motherName || '—'],
          ["D.O.B.", dob],
          ["Contact", contact],
          ["Address", student.address || '—'],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ display:'flex', borderBottom:`1px solid ${light}`, padding:'3px 0' }}>
            <span style={{ fontSize:7, color:'#666', fontWeight:700, width:46, flexShrink:0 }}>{lbl}</span>
            <span style={{ fontSize:7, color:'#1a1a1a', fontWeight:500, flex:1, wordBreak:'break-word', overflowWrap:'anywhere' }}>: {val}</span>
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ padding:'5px 12px', background:light, display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${mid}`, flexShrink:0 }}>
        <div style={{ textAlign:'center' }}>
          <img src={signImage} alt="sign" crossOrigin="anonymous"
            style={{ height:26, width:56, objectFit:'contain', display:'block', margin:'0 auto' }}
            onError={e => { e.target.style.display='none'; }} />
          <div style={{ fontSize:6.5, color:'#555', fontWeight:700, marginTop:1 }}>Principal's Sign</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:6, color:'#888', fontWeight:600 }}>Academic Year</div>
          <div style={{ fontSize:8, color:color, fontWeight:900 }}>{settings.currentAcademicYear || '2025-26'}</div>
        </div>
      </div>

      {/* ── BOTTOM STRIP ── */}
      <div style={{ display:'flex', height:5, flexShrink:0 }}>
        <div style={{ flex:1, background:'#FFD700' }} />
        <div style={{ flex:2, background:color }} />
        <div style={{ flex:1, background:'#FFD700' }} />
      </div>
    </div>
  );
};

// ─── TeacherCard — Modern Theme ────────────────────────────────────────────
const TeacherCard = ({ teacher, settings }) => {
  const photo   = resolvePhoto(teacher.profileImage);
  const PRIMARY = '#7b1fa2';  // Purple for staff
  const GOLD    = '#FFD700';

  return (
    <div style={{
      width: CARD_W, minHeight: CARD_H,
      fontFamily: "'Segoe UI', Arial, sans-serif",
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      flexShrink: 0,
      background: '#ffffff',
    }}>

      {/* Top strip */}
      <div style={{ display:'flex', height:6, flexShrink:0 }}>
        <div style={{ flex:1, background:PRIMARY }} />
        <div style={{ flex:1, background:GOLD }} />
        <div style={{ flex:1, background:PRIMARY }} />
      </div>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${PRIMARY} 0%, #4a148c 100%)`, padding:'10px 12px 8px', flexShrink:0, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ display:'flex', alignItems:'center', gap:8, position:'relative', zIndex:1 }}>
          <div style={{ width:54, height:54, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,0.9)', overflow:'hidden', background:'#fff', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
            <img src={settings.schoolLogo || schoolLogo} alt="logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{ color:'#fff', fontWeight:900, fontSize:11.5, lineHeight:1.3 }}>
              {settings.schoolName || 'Sardar Patel Public School'}
            </div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:6, marginTop:1 }}>Govt. Recognised</div>
            <div style={{ color:'rgba(255,255,255,0.85)', fontSize:6, marginTop:2 }}>
              {settings.schoolAddress || 'Udaichandpur, Soraon, Prayagraj'}
            </div>
            <div style={{ color:GOLD, fontWeight:800, fontSize:6.5, marginTop:2 }}>
              📞 {settings.contactNumber || '—'}
            </div>
          </div>
        </div>
        <div style={{ textAlign:'center', marginTop:6, position:'relative', zIndex:1 }}>
          <span style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', fontWeight:900, fontSize:7.5, padding:'2px 14px', borderRadius:20, letterSpacing:'1.5px', textTransform:'uppercase' }}>
            Staff ID Card
          </span>
        </div>
      </div>

      {/* Photo section */}
      <div style={{ background:'rgba(123,31,162,0.06)', padding:'12px 12px 8px', display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <div style={{ width:88, height:100, border:`3px solid ${PRIMARY}`, borderRadius:8, overflow:'hidden', background:'#f3e5f5', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(123,31,162,0.25)' }}>
          {photo
            ? <img src={photo} alt="photo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:40, fontWeight:900, color:PRIMARY }}>{teacher.name?.charAt(0)}</span>}
        </div>
        <div style={{ color:'#1a1a2e', fontWeight:800, fontSize:13.5, marginTop:7, textAlign:'center' }}>{teacher.name}</div>
        <span style={{ background:PRIMARY, color:'#fff', fontWeight:800, fontSize:7, padding:'2.5px 12px', borderRadius:20, marginTop:4 }}>
          {teacher.designation || 'Teacher'}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding:'6px 12px 2px', flex:1, background:'#fff' }}>
        <div style={{ background:'rgba(123,31,162,0.08)', borderRadius:6, padding:'4px 8px', marginBottom:5, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:7, fontWeight:900, color:PRIMARY, textTransform:'uppercase' }}>Emp. ID:</span>
          <span style={{ fontSize:9, fontWeight:900, color:PRIMARY, letterSpacing:'1px' }}>{teacher.employeeCode || '—'}</span>
        </div>
        {[
          ['Phone', teacher.phone],
          ['Email', teacher.email],
          ['Address', teacher.address],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ display:'flex', borderBottom:'1px solid rgba(123,31,162,0.08)', padding:'3.5px 0' }}>
            <span style={{ fontSize:7, color:'#666', fontWeight:700, width:46, flexShrink:0 }}>{lbl}</span>
            <span style={{ fontSize:7, color:'#1a1a1a', fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>: {val || '—'}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding:'5px 12px', background:'rgba(123,31,162,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid rgba(123,31,162,0.1)', flexShrink:0 }}>
        <div style={{ textAlign:'center' }}>
          <img src={signImage} alt="sign" crossOrigin="anonymous"
            style={{ height:26, width:56, objectFit:'contain', display:'block', margin:'0 auto' }}
            onError={e => { e.target.style.display='none'; }} />
          <div style={{ fontSize:6.5, color:'#555', fontWeight:700, marginTop:1 }}>Principal's Sign</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:6, color:'#888', fontWeight:600 }}>Academic Year</div>
          <div style={{ fontSize:8, color:PRIMARY, fontWeight:900 }}>{settings.currentAcademicYear || '2025-26'}</div>
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{ display:'flex', height:5, flexShrink:0 }}>
        <div style={{ flex:1, background:GOLD }} />
        <div style={{ flex:2, background:PRIMARY }} />
        <div style={{ flex:1, background:GOLD }} />
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const IDCardGenerator = () => {
  const { settings } = useSettings();
  const [tab, setTab]                   = useState('student');
  const [search, setSearch]             = useState('');
  const [classFilter, setClassFilter]   = useState('');
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState(null);
  const [selected, setSelected]         = useState(new Set());
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState({});
  const [printing, setPrinting]         = useState(false);
  const [progress, setProgress]         = useState({ current: 0, total: 0 });
  const [studentColor, setStudentColor] = useState('#1a237e');

  const PRESET_COLORS = [
    '#1a237e','#1b5e20','#4a148c','#e65100',
    '#880e4f','#006064','#37474f','#b71c1c',
    '#0d47a1','#33691e',
  ];

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [tab, search, classFilter, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'student') {
        const res = await API.get('/admin/students', { params: { search, studentClass: classFilter, status: 'active', page, limit: 20 } });
        setItems(res.data.students); setPagination(res.data.pagination);
      } else {
        const res = await API.get('/admin/teachers', { params: { search, status: 'active', page, limit: 20 } });
        setItems(res.data.teachers); setPagination(res.data.pagination);
      }
    } catch { setToast({ message: 'Failed to load data', type: 'error' }); }
    finally   { setLoading(false); }
  };

  const toggleSelect  = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll     = () => selected.size === items.length ? setSelected(new Set()) : setSelected(new Set(items.map(i => i._id)));
  const selectedItems = items.filter(i => selected.has(i._id));

  const handleDownload = async () => {
    if (!selectedItems.length) { setToast({ message: 'Select at least one card', type: 'error' }); return; }
    setPrinting(true);
    setProgress({ current: 0, total: selectedItems.length });
    setToast({ message: selectedItems.length === 1 ? 'Preparing PNG…' : 'Preparing ZIP…', type: 'success' });
    try {
      await downloadCards(selectedItems, tab, settings, schoolLogo, signImage,
        (current, total) => setProgress({ current, total }),
        tab === 'student' ? studentColor : null);
      setToast({ message: selectedItems.length === 1 ? 'PNG downloaded!' : `ZIP downloaded (${selectedItems.length} cards)!`, type: 'success' });
    } catch (err) {
      setToast({ message: 'Download failed: ' + err.message, type: 'error' });
    } finally {
      setPrinting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleTabChange = (t) => { setTab(t); setSearch(''); setClassFilter(''); setSelected(new Set()); setPage(1); };
  const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];

  return (
    <div className="space-y-5">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">ID Card Generator</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">CR-80 standard • 54mm × 85.6mm</p>
        </div>
        <button onClick={handleDownload} disabled={printing}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm">
          <Download size={16} />
          {printing
            ? progress.total > 1 ? `Processing ${progress.current}/${progress.total}…` : 'Processing…'
            : selectedItems.length > 1 ? `Download ZIP (${selectedItems.length})` : `Download PNG (${selectedItems.length})`}
        </button>
      </div>

      {/* Tab */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[['student','Students',<Users size={14}/>],['teacher','Teachers',<GraduationCap size={14}/>]].map(([t,label,icon]) => (
          <button key={t} onClick={() => handleTabChange(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab===t ? `bg-white ${t==='student'?'text-indigo-700':'text-purple-700'} shadow-sm` : 'text-gray-500 hover:text-gray-700'}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-gray-50 rounded-xl px-3 h-10 border border-gray-100">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input className="bg-transparent text-sm font-medium outline-none w-full placeholder:text-gray-400"
            placeholder={tab==='student' ? 'Search name or Admission No...' : 'Search name or code...'}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {tab==='student' && (
          <select className="h-10 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-bold outline-none"
            value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }}>
            <option value="">All Classes</option>
            {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        )}
        {tab==='student' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Theme:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setStudentColor(c)}
                  style={{ background:c, width:22, height:22, borderRadius:'50%', border: studentColor===c ? '3px solid #111' : '2px solid transparent', flexShrink:0, outline: studentColor===c ? '2px solid #fff' : 'none', outlineOffset:'-4px', transition:'transform 0.1s', transform: studentColor===c ? 'scale(1.15)' : 'scale(1)' }} />
              ))}
              <input type="color" value={studentColor} onChange={e => setStudentColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-0 p-0" title="Custom color" style={{ padding:0 }} />
            </div>
          </div>
        )}
        <button onClick={toggleAll}
          className="h-10 px-4 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
          {selected.size===items.length && items.length>0 ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : items.length===0 ? (
        <div className="py-20 text-center text-gray-400 font-medium">No records found</div>
      ) : (
        <div className="flex flex-wrap gap-5">
          {items.map(item => (
            <div key={item._id} onClick={() => toggleSelect(item._id)} style={{ cursor:'pointer', position:'relative', flexShrink:0 }}>
              {/* Selection border */}
              <div style={{ position:'absolute', inset:-4, borderRadius:18, border: selected.has(item._id) ? '3px solid #4f46e5' : '3px solid transparent', transition:'border-color 0.15s', pointerEvents:'none', zIndex:10 }} />
              {selected.has(item._id) && (
                <div style={{ position:'absolute', top:-8, right:-8, width:22, height:22, borderRadius:'50%', background:'#4f46e5', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, zIndex:20, boxShadow:'0 2px 8px rgba(79,70,229,0.5)' }}>✔</div>
              )}
              {tab==='student'
                ? <StudentCard student={item} settings={settings} color={studentColor} />
                : <TeacherCard teacher={item} settings={settings} />}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-2 bg-white border border-gray-200 rounded-xl disabled:opacity-30 shadow-sm"><ChevronLeft size={18}/></button>
          <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Page {page} / {pagination.totalPages}</span>
          <button disabled={page===pagination.totalPages} onClick={() => setPage(p=>p+1)} className="p-2 bg-white border border-gray-200 rounded-xl disabled:opacity-30 shadow-sm"><ChevronRight size={18}/></button>
        </div>
      )}
    </div>
  );
};

export default IDCardGenerator;
