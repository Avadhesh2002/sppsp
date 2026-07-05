import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FileBarChart2, Calendar, Printer, ChevronLeft, ChevronRight, User } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';
import schoolLogo from '../../assets/school_logo.png';
import principalSign from '../../assets/sign.png';

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const today = fmt(new Date());
const PASS_MARK = 33;
const CLASS_ORDER = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const getNextClass = (currentClass, passed) => {
  if (!passed) return currentClass;
  const idx = CLASS_ORDER.indexOf(String(currentClass));
  if (idx === -1) return currentClass;
  if (idx >= CLASS_ORDER.length - 1) return 'Graduated';
  return CLASS_ORDER[idx + 1];
};
const scaledFont = (base, count) => {
  if (count <= 6)  return base + 3.5;
  if (count <= 8)  return base + 2.5;
  if (count <= 10) return base + 1.5;
  return base + 0.5;
};
const gradeFromPercent = (p) => {
  if (p >= 91) return 'A1'; if (p >= 81) return 'A2'; if (p >= 71) return 'B1';
  if (p >= 61) return 'B2'; if (p >= 51) return 'C1'; if (p >= 41) return 'C2';
  if (p >= 33) return 'D';  if (p >= 21) return 'E';  return 'F';
};
const gradeColor = (g) => {
  const map = { A1:'#166534',A2:'#15803d',B1:'#1d4ed8',B2:'#2563eb',C1:'#b45309',C2:'#d97706',D:'#ea580c',E:'#dc2626',F:'#991b1b',A:'#15803d',B:'#2563eb',C:'#d97706' };
  return map[g] || '#374151';
};
const gradeBg = (g) => {
  const map = { A1:'#dcfce7',A2:'#d1fae5',B1:'#dbeafe',B2:'#eff6ff',C1:'#fef3c7',C2:'#fffbeb',D:'#ffedd5',E:'#fee2e2',F:'#fce7f3' };
  return map[g] || 'transparent';
};

const TermMarksheet = ({ student, termKey, termLabel, schoolInfo, academicYear }) => {
  const subjects = student.subjects || [];
  const enriched = subjects.map(s => {
    if (s.term1 && s.term2) return s;
    const obtained = s.marksObtained ?? 0;
    const maxM = s.maxMarks ?? 100;
    return { ...s, term1: { periodicTest:null,noteBooks:null,subEnrichment:null,halfYearlyExam:null,total:0,maxTotal:maxM,grade:'--' }, term2: { periodicTest:null,noteBooks:null,subEnrichment:null,yearlyExam:obtained,total:obtained,maxTotal:maxM,grade:s.grade||gradeFromPercent((obtained/maxM)*100) } };
  });
  const grandTotal = enriched.reduce((a,s) => a+(typeof s[termKey]?.total==='number'?s[termKey].total:0),0);
  const grandMax   = enriched.reduce((a,s) => a+(s[termKey]?.maxTotal||0),0);
  const percentage = grandMax>0?((grandTotal/grandMax)*100).toFixed(2):'0.00';
  const pctNum     = parseFloat(percentage);
  const overallGrade = gradeFromPercent(pctNum);
  const coScholastic = student.coScholastic || {};
  const attendance   = student.attendance   || {};
  const remark = student.teacherRemark || 'Keep up the good work and strive for excellence.';
  const passed = pctNum >= PASS_MARK;
  const nextClass = getNextClass(student.class, passed);
  const resultQualified = passed ? `QUALIFIED FOR ADMISSION TO CLASS - ${nextClass}` : `NOT PROMOTED -- DETAINED IN CLASS - ${student.class||''}`;
  const apiBase  = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';
  const photoSrc = student.profileImage ? (student.profileImage.startsWith('data:') ? student.profileImage : `${apiBase}${student.profileImage}`) : null;
  const isT1 = termKey === 'term1';
  const BLUE = '#1a3a6b'; const BLUE_LIGHT = '#e8edf7'; const ACCENT = isT1 ? '#6d28d9' : '#b45309';
  const subCount = enriched.length;
  const fs = (b) => scaledFont(b, subCount);
  const rowPad = subCount > 8 ? '2.5px 5px' : '4px 5px';
  const TH = ({ children, colSpan, rowSpan, style={} }) => (
    <th colSpan={colSpan} rowSpan={rowSpan} style={{ border:`1px solid ${BLUE}`,padding:'4px 5px',fontSize:`${fs(8.5)}px`,fontWeight:'800',textAlign:'center',background:BLUE,color:'white',whiteSpace:'pre-line',verticalAlign:'middle',letterSpacing:'0.3px',...style }}>{children}</th>
  );
  const TD = ({ children, style={} }) => (
    <td style={{ border:'1px solid #c7d2e8',padding:rowPad,fontSize:`${fs(10)}px`,textAlign:'center',verticalAlign:'middle',...style }}>
      {children===null||children===undefined?<span style={{color:'#d1d5db'}}>--</span>:children}
    </td>
  );
  return (
    <div className="marksheet-page bg-white" style={{ width:'210mm',height:'297mm',margin:'0 auto',padding:'7mm 9mm',fontFamily:'"Times New Roman",Times,serif',fontSize:'12px',boxSizing:'border-box',pageBreakAfter:'always',position:'relative',background:'#fff',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <div style={{position:'absolute',inset:'3.5mm',border:`3px solid ${BLUE}`,pointerEvents:'none',zIndex:0,borderRadius:'3px'}} />
      <div style={{position:'absolute',inset:'5.5mm',border:`1px solid #93afd4`,pointerEvents:'none',zIndex:0,borderRadius:'2px'}} />
      {schoolInfo.schoolLogo && <img src={schoolInfo.schoolLogo} alt="" style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'200px',opacity:0.05,pointerEvents:'none',zIndex:0}} />}
      <div style={{position:'relative',zIndex:1,flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px',paddingBottom:'8px',borderBottom:`3px double ${BLUE}`}}>
          <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',width:'80px',height:'80px',borderRadius:'50%',background:`radial-gradient(circle,#e8edf7 60%,#c7d2e8 100%)`,border:`3px solid ${BLUE}`,boxShadow:'0 2px 8px rgba(26,58,107,0.25)',padding:'4px'}}>
            <img src={schoolInfo.schoolLogo||schoolLogo} alt="logo" style={{width:'68px',height:'68px',objectFit:'contain',borderRadius:'50%'}} />
          </div>
          <div style={{flex:1,textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'3px'}}>
              <div style={{flex:1,height:'1.5px',background:`linear-gradient(to right,transparent,${BLUE})`}} />
              <div style={{fontSize:'24px',fontWeight:'900',color:BLUE,fontFamily:'Georgia,"Times New Roman",serif',letterSpacing:'1px',lineHeight:1.15,textShadow:'0 1px 2px rgba(26,58,107,0.15)'}}>{schoolInfo.schoolName}</div>
              <div style={{flex:1,height:'1.5px',background:`linear-gradient(to left,transparent,${BLUE})`}} />
            </div>
            <div style={{fontSize:'11px',color:'#1e4d8c',fontFamily:'Georgia,serif',fontStyle:'italic',letterSpacing:'0.5px',marginBottom:'3px'}}>
              {schoolInfo.schoolSlogan||'Affiliated to Central Board of Secondary Education'}
            </div>
            {schoolInfo.affiliationNumber && (
              <div style={{display:'inline-flex',gap:'12px',fontSize:'9px',color:'#374151',background:'#e8edf7',borderRadius:'20px',padding:'2px 14px',border:`1px solid #c7d2e8`,marginBottom:'3px'}}>
                <span>Affil. No.: <b style={{color:BLUE}}>{schoolInfo.affiliationNumber}</b></span>
                {schoolInfo.schoolCode && <span>|&nbsp;School Code: <b style={{color:BLUE}}>{schoolInfo.schoolCode}</b></span>}
              </div>
            )}
            <div style={{fontSize:'10px',color:'#4b5563',fontFamily:'Arial,sans-serif',letterSpacing:'0.3px'}}>
              {schoolInfo.schoolAddress}
            </div>
          </div>
          <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',width:'80px',height:'80px',borderRadius:'50%',background:`radial-gradient(circle,#e8edf7 60%,#c7d2e8 100%)`,border:`3px solid ${BLUE}`,boxShadow:'0 2px 8px rgba(26,58,107,0.25)',padding:'4px'}}>
            <img src={schoolInfo.schoolLogo||schoolLogo} alt="logo2" style={{width:'68px',height:'68px',objectFit:'contain',borderRadius:'50%'}} />
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${BLUE} 0%,#1e4d8c 100%)`,color:'white',textAlign:'center',padding:'6px 12px',fontSize:'15px',fontWeight:'900',letterSpacing:'3px',marginBottom:'10px',fontFamily:'Arial,sans-serif',borderRadius:'3px',boxShadow:'0 2px 6px rgba(26,58,107,0.3)'}}>
          {termLabel} RESULT &nbsp;--&nbsp; SESSION {academicYear}
        </div>
        <div style={{display:'flex',marginBottom:'10px',border:`1.5px solid ${BLUE}`,borderRadius:'4px',overflow:'hidden'}}>
          <div style={{flex:1,padding:'8px 12px',background:BLUE_LIGHT}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <tbody>
                <tr>
                  <td style={{fontSize:'11px',paddingBottom:'4px',width:'52%'}}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Admission No.</span><br/>
                    <b style={{fontSize:'12px',color:'#111827'}}>{student.admissionNo||student.UID||'--'}</b>
                  </td>
                  <td style={{fontSize:'11px',paddingBottom:'4px'}}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Class &amp; Section</span><br/>
                    <b style={{fontSize:'12px',color:'#111827'}}>{student.class||'--'}</b>
                  </td>
                </tr>
                <tr>
                  <td style={{paddingBottom:'4px'}} colSpan={2}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Student Name</span><br/>
                    <b style={{fontSize:'15px',color:BLUE,letterSpacing:'0.3px'}}>{student.name}</b>
                  </td>
                </tr>
                <tr>
                  <td style={{paddingBottom:'3px'}}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase'}}>Father&apos;s Name</span><br/>
                    <span style={{fontSize:'11px',fontWeight:'600'}}>{student.fatherName||'--'}</span>
                  </td>
                  <td style={{paddingBottom:'3px'}}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase'}}>Mother&apos;s Name</span><br/>
                    <span style={{fontSize:'11px',fontWeight:'600'}}>{student.motherName||'--'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase'}}>Date of Birth</span><br/>
                    <span style={{fontSize:'11px',fontWeight:'600'}}>{student.dob?fmt(student.dob):'--'}</span>
                  </td>
                  <td>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase'}}>Address</span><br/>
                    <span style={{fontSize:'10.5px'}}>{student.address||'--'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{width:'106px',flexShrink:0,borderLeft:`1.5px solid ${BLUE}`,display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f4fb',padding:'8px'}}>
            <div style={{width:'88px',height:'110px',border:`2px solid ${BLUE}`,borderRadius:'3px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#e5e7eb',boxShadow:'0 2px 6px rgba(0,0,0,0.15)'}}>
              {photoSrc?<img src={photoSrc} alt={student.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />:<User size={30} color="#9ca3af" />}
            </div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px'}}>
          <div style={{flex:1,height:'1px',background:'#c7d2e8'}} />
          <div style={{textAlign:'center',fontWeight:'900',fontSize:'13px',fontFamily:'Arial,sans-serif',color:BLUE,letterSpacing:'1px',padding:'0 10px'}}>
            Scholastic Area -- {termLabel}
          </div>
          <div style={{flex:1,height:'1px',background:'#c7d2e8'}} />
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'10px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
          <thead>
            <tr>
              <TH rowSpan={2} style={{width:'130px',fontSize:'12px',letterSpacing:'0.5px'}}>SUBJECTS</TH>
              <TH style={{background:'#1e4080'}}>{'Periodic\nTest\n(10)'}</TH>
              <TH style={{background:'#1e4080'}}>{'Note\nBooks\n(5)'}</TH>
              <TH style={{background:'#1e4080'}}>{'Sub.\nEnrl.\n(5)'}</TH>
              <TH style={{background:'#1e4080'}}>{isT1?'Half Yearly\nExam\n(80)':'Final\nExam\n(80)'}</TH>
              <TH style={{background:'#14326e',fontSize:'11px'}}>{'Marks\nObtained\n(100)'}</TH>
              <TH style={{background:'#14326e'}}>Grade</TH>
            </tr>
          </thead>
          <tbody>
            {enriched.map((sub,i) => {
              const t = sub[termKey];
              const total = typeof t?.total==='number'&&t.total>0?t.total:null;
              const grade = t?.grade;
              const failed = total!==null&&(total/(t?.maxTotal||100))*100<PASS_MARK;
              return (
                <tr key={i} style={{background:i%2===0?'#f8faff':'#ffffff'}}>
                  <td style={{border:'1px solid #c7d2e8',padding:rowPad,fontSize:`${fs(11.5)}px`,fontWeight:'700',fontFamily:'Arial,sans-serif',color:'#1f2937',borderLeft:`3px solid ${ACCENT}`}}>{sub.subjectName}</td>
                  <TD>{t?.periodicTest}</TD>
                  <TD>{t?.noteBooks}</TD>
                  <TD>{t?.subEnrichment}</TD>
                  <TD>{isT1?t?.halfYearlyExam:t?.yearlyExam}</TD>
                  <TD style={{fontWeight:'800',fontSize:'12px',color:failed?'#dc2626':'#111827',background:failed?'#fef2f2':'transparent'}}>{total??<span style={{color:'#d1d5db'}}>--</span>}</TD>
                  <TD style={{fontWeight:'900',fontSize:'12px',color:gradeColor(grade),background:grade?gradeBg(grade):'transparent'}}>{grade||<span style={{color:'#d1d5db'}}>--</span>}</TD>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#e8edf7'}}>
              <td colSpan={5} style={{border:`1px solid ${BLUE}`,padding:'5px 10px',fontWeight:'900',fontSize:'12px',textAlign:'right',fontFamily:'Arial,sans-serif',color:BLUE}}>Grand Total</td>
              <td style={{border:`1px solid ${BLUE}`,padding:'4px 6px',fontWeight:'900',fontSize:'13px',textAlign:'center',color:BLUE}}>{grandTotal}/{grandMax}</td>
              <td style={{border:`1px solid ${BLUE}`}} />
            </tr>
            <tr style={{background:BLUE}}>
              <td colSpan={4} style={{border:`1px solid ${BLUE}`,padding:'4px 10px',fontWeight:'900',fontSize:'12px',textAlign:'right',color:'white',fontFamily:'Arial,sans-serif'}}>Percentage</td>
              <td style={{border:`1px solid ${BLUE}`,padding:'4px 8px',fontWeight:'900',fontSize:'14px',textAlign:'center',color:'#fcd34d'}}>{percentage}%</td>
              <td style={{border:`1px solid ${BLUE}`,padding:'4px 6px',fontWeight:'900',fontSize:'14px',textAlign:'center',color:'#fcd34d'}}>{overallGrade}</td>
              <td style={{border:`1px solid ${BLUE}`}} />
            </tr>
          </tfoot>
        </table>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px'}}>
          <div style={{flex:1,height:'1px',background:'#c7d2e8'}} />
          <div style={{textAlign:'center',fontWeight:'900',fontSize:'12px',fontFamily:'Arial,sans-serif',color:BLUE,padding:'0 10px',letterSpacing:'0.5px'}}>
            Co-Scholastic Area <span style={{fontWeight:'400',fontSize:'10px',color:'#6b7280'}}>[on a 3 point (A-C) scale]</span>
          </div>
          <div style={{flex:1,height:'1px',background:'#c7d2e8'}} />
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'6px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <thead>
            <tr>
              <th style={{border:`1px solid ${BLUE}`,padding:'4px 8px',fontSize:'11px',fontWeight:'800',background:BLUE,color:'white',textAlign:'left',letterSpacing:'0.4px'}}>Activity</th>
              <th style={{border:`1px solid ${BLUE}`,padding:'4px 8px',fontSize:'11px',fontWeight:'800',background:BLUE,color:'white',textAlign:'center',width:'80px'}}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {[['Work Education (or Pre-vocational Education)','workEducation'],['Art Education','artEducation'],['Health & Physical Education','healthPhysical']].map(([lbl,key],idx) => (
              <tr key={key} style={{background:idx%2===0?'#f8faff':'#fff'}}>
                <td style={{border:'1px solid #c7d2e8',padding:'4px 8px',fontSize:'11px',borderLeft:`3px solid #6d28d9`}}><span style={{color:'#374151',fontWeight:'600'}}>{lbl}</span></td>
                <td style={{border:'1px solid #c7d2e8',padding:'4px',textAlign:'center',fontSize:'12px',fontWeight:'900',color:'#15803d',background:'#f0fdf4'}}>{coScholastic[key]?.[termKey]||'A'}</td>
              </tr>
            ))}
            <tr style={{background:'#f8faff'}}>
              <td style={{border:'1px solid #c7d2e8',padding:'4px 8px',fontSize:'11px',borderLeft:`3px solid #6d28d9`}}>
                <span style={{color:'#374151',fontWeight:'600'}}>Discipline</span>
                <span style={{fontWeight:'400',fontSize:'10px',color:'#9ca3af',marginLeft:'4px'}}>[on a 3 point (A-C) scale]</span>
              </td>
              <td style={{border:'1px solid #c7d2e8',padding:'4px',textAlign:'center',fontSize:'12px',fontWeight:'900',color:'#15803d',background:'#f0fdf4'}}>{coScholastic.discipline?.[termKey]||'A'}</td>
            </tr>
          </tbody>
        </table>
        {/* Attendance */}
        <div style={{display:'flex',gap:'6px',marginBottom:'5px'}}>
          <div style={{flex:1,display:'grid',gridTemplateColumns:'auto 1fr 1fr 1fr',alignItems:'center',gap:'0',background:BLUE_LIGHT,border:`1.5px solid #93afd4`,borderRadius:'6px',overflow:'hidden'}}>
            <div style={{background:BLUE,padding:'4px 8px',display:'flex',alignItems:'center',gap:'5px'}}>
              <span style={{fontSize:'9px',fontWeight:'900',color:'white',textTransform:'uppercase',letterSpacing:'0.8px'}}>Attendance</span>
            </div>
            {[
              ['Present', attendance.presentDays??'--'],
              ['Total Days', attendance.totalWorkingDays??'--'],
              ['Percentage', attendance.presentDays&&attendance.totalWorkingDays?`${((attendance.presentDays/attendance.totalWorkingDays)*100).toFixed(1)}%`:'--'],
            ].map(([label, value], i) => {
              const isLow = label==='Percentage'&&attendance.presentDays&&attendance.totalWorkingDays&&((attendance.presentDays/attendance.totalWorkingDays)*100)<75;
              return (
                <div key={label} style={{padding:'3px 8px',borderLeft:`1px solid #c7d2e8`,textAlign:'center'}}>
                  <div style={{fontSize:'8px',color:'#6b7280',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</div>
                  <div style={{fontSize:'11px',fontWeight:'900',color:label==='Percentage'?(isLow?'#dc2626':'#15803d'):BLUE,marginTop:'1px'}}>{value}</div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Remark */}
        <div style={{display:'flex',alignItems:'stretch',marginBottom:'4px',borderRadius:'6px',overflow:'hidden',border:`1.5px solid #fcd34d`}}>
          <div style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',padding:'4px 8px',display:'flex',alignItems:'center',writingMode:'horizontal-tb',flexShrink:0}}>
            <span style={{fontSize:'8px',fontWeight:'900',color:'white',textTransform:'uppercase',letterSpacing:'0.8px',whiteSpace:'nowrap'}}>Teacher&apos;s Remark</span>
          </div>
          <div style={{background:'#fffbeb',padding:'4px 10px',display:'flex',alignItems:'center',flex:1}}>
            <span style={{fontSize:'10px',color:'#374151',fontStyle:'italic'}}>"{remark}"</span>
          </div>
        </div>
        {/* Result */}
        <div style={{borderRadius:'6px',overflow:'hidden',border:`1.5px solid ${pctNum>=33?'#86efac':'#fca5a5'}`,marginBottom:'0'}}>
          <div style={{background:pctNum>=33?'linear-gradient(135deg,#166534,#15803d)':'linear-gradient(135deg,#991b1b,#dc2626)',padding:'3px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:'9px',fontWeight:'900',color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:'1px'}}>Result</span>
            <span style={{fontSize:'9px',fontWeight:'700',color:'rgba(255,255,255,0.6)'}}>Session {academicYear}</span>
          </div>
          <div style={{background:pctNum>=33?'linear-gradient(135deg,#f0fdf4,#dcfce7)':'#fef2f2',padding:'5px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:'11px',fontWeight:'800',color:pctNum>=33?'#166534':'#991b1b'}}>{resultQualified}</div>
              <div style={{fontSize:'9px',color:'#6b7280',marginTop:'1px'}}>Place: {schoolInfo.schoolAddress||'--'} &nbsp;|&nbsp; Date: {today}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
              <div style={{fontSize:'14px',fontWeight:'900',letterSpacing:'2px',color:pctNum>=33?'#166534':'#991b1b',border:`2px solid ${pctNum>=33?'#86efac':'#fca5a5'}`,padding:'2px 12px',borderRadius:'4px',background:'white',lineHeight:1.2}}>
                {pctNum>=33?'PASS':'FAIL'}
              </div>
              {pctNum>=33 && (
                <div style={{fontSize:'8px',fontWeight:'900',letterSpacing:'1px',color:'white',background:pctNum>=65?'#1d4ed8':pctNum>=45?'#15803d':'#d97706',padding:'2px 7px',borderRadius:'3px',textTransform:'uppercase'}}>
                  {pctNum>=65?'First Div.':pctNum>=45?'Second Div.':'Third Div.'}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{flex:'1 1 0px',minHeight:subCount>8?'2mm':'4mm',maxHeight:subCount>8?'8mm':'18mm'}} />
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
            {["Parent's Signature","Class Teacher's Signature"].map(sig => (
              <div key={sig} style={{textAlign:'center',flex:1,padding:'0 8px'}}>
                <div style={{height:'44px',borderBottom:`1.5px solid #374151`,marginBottom:'4px'}} />
                <div style={{fontSize:'11px',color:'#374151',fontFamily:'Arial,sans-serif',fontWeight:'600'}}>{sig}</div>
              </div>
            ))}
            <div style={{textAlign:'center',flex:1,padding:'0 8px'}}>
              <div style={{height:'44px',borderBottom:`1.5px solid #374151`,marginBottom:'4px',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
                <img src={principalSign} alt="Principal Signature" style={{maxHeight:'40px',maxWidth:'100%',objectFit:'contain',marginBottom:'2px'}} />
              </div>
              <div style={{fontSize:'11px',color:'#374151',fontFamily:'Arial,sans-serif',fontWeight:'600'}}>Principal&apos;s Signature</div>
            </div>
          </div>
          <div style={{borderTop:`2px solid ${BLUE}`,paddingTop:'8px'}}>
            <div style={{fontSize:'11px',fontWeight:'800',marginBottom:'5px',color:BLUE,fontFamily:'Arial,sans-serif',textTransform:'uppercase',letterSpacing:'0.5px',textAlign:'center'}}>Grading Scale</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
              <thead>
                <tr>{[['91-100','A1'],['81-90','A2'],['71-80','B1'],['61-70','B2'],['51-60','C1'],['41-50','C2'],['33-40','D'],['32 & Below','E']].map(([r])=>(<th key={r} style={{border:`1px solid ${BLUE}`,padding:'3px 4px',background:BLUE,color:'white',fontWeight:'800',textAlign:'center'}}>{r}</th>))}</tr>
              </thead>
              <tbody>
                <tr>{[['91-100','A1'],['81-90','A2'],['71-80','B1'],['61-70','B2'],['51-60','C1'],['41-50','C2'],['33-40','D'],['32 & Below','E']].map(([,g])=>(<td key={g} style={{border:'1px solid #c7d2e8',padding:'3px 4px',textAlign:'center',fontWeight:'900',fontSize:'12px',color:gradeColor(g),background:gradeBg(g)}}>{g}</td>))}</tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const CombinedMarksheet = ({ student, schoolInfo, academicYear }) => {
  const subjects = student.subjects || [];
  const enriched = subjects.map(s => {
    if (s.term1 && s.term2) return s;
    const obtained = s.marksObtained ?? 0; const maxM = s.maxMarks ?? 100;
    return { ...s, term1:{periodicTest:null,noteBooks:null,subEnrichment:null,halfYearlyExam:null,total:0,maxTotal:maxM,grade:'--'}, term2:{periodicTest:null,noteBooks:null,subEnrichment:null,yearlyExam:obtained,total:obtained,maxTotal:maxM,grade:s.grade||gradeFromPercent((obtained/maxM)*100)} };
  });
  const grandT1 = enriched.reduce((a,s)=>a+(typeof s.term1?.total==='number'?s.term1.total:0),0);
  const grandT2 = enriched.reduce((a,s)=>a+(typeof s.term2?.total==='number'?s.term2.total:0),0);
  const grandMax = enriched.reduce((a,s)=>a+(s.term1?.maxTotal||0)+(s.term2?.maxTotal||0),0)||enriched.length*200;
  const grandTotal    = student.totalObtained??(grandT1+grandT2);
  const grandMaxFinal = student.totalMax??grandMax;
  const percentage    = grandMaxFinal>0?((grandTotal/grandMaxFinal)*100).toFixed(2):'0.00';
  const pctNum        = parseFloat(percentage);
  const overallGrade  = gradeFromPercent(pctNum);
  const coScholastic = student.coScholastic || {};
  const attendance   = student.attendance   || {};
  const remark = student.teacherRemark || 'Keep up the good work and strive for excellence.';
  const passed = pctNum >= PASS_MARK;
  const nextClass = getNextClass(student.class, passed);
  const resultQualified = passed?`QUALIFIED FOR ADMISSION TO CLASS - ${nextClass}`:`NOT PROMOTED -- DETAINED IN CLASS - ${student.class||''}`;
  const apiBase  = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';
  const photoSrc = student.profileImage?(student.profileImage.startsWith('data:')?student.profileImage:`${apiBase}${student.profileImage}`):null;
  const BLUE = '#1a3a6b'; const BLUE_LIGHT = '#e8edf7';
  const subCount = enriched.length;
  const fs = (b) => scaledFont(b, subCount);
  const rowPad = subCount > 8 ? '2px 4px' : '3px 4px';
  const TH = ({ children, colSpan, rowSpan, style={} }) => (
    <th colSpan={colSpan} rowSpan={rowSpan} style={{border:`1px solid ${BLUE}`,padding:rowPad,fontSize:`${fs(10)}px`,fontWeight:'800',textAlign:'center',background:BLUE,color:'white',whiteSpace:'pre-line',verticalAlign:'middle',letterSpacing:'0.3px',...style}}>{children}</th>
  );
  const TD = ({ children, style={} }) => (
    <td style={{border:'1px solid #c7d2e8',padding:rowPad,fontSize:`${fs(11.5)}px`,textAlign:'center',verticalAlign:'middle',...style}}>
      {children===null||children===undefined?<span style={{color:'#d1d5db'}}>--</span>:children}
    </td>
  );
  return (
    <div className="marksheet-page bg-white" style={{width:'210mm',height:'297mm',margin:'0 auto',padding:'6mm 8mm',fontFamily:'"Times New Roman",Times,serif',fontSize:'15.5px',boxSizing:'border-box',pageBreakAfter:'always',position:'relative',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:'3.5mm',border:`3px solid ${BLUE}`,pointerEvents:'none',zIndex:0,borderRadius:'3px'}} />
      <div style={{position:'absolute',inset:'5.5mm',border:`1px solid #93afd4`,pointerEvents:'none',zIndex:0,borderRadius:'2px'}} />
      {schoolInfo.schoolLogo && <img src={schoolInfo.schoolLogo} alt="" style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'190px',opacity:0.05,pointerEvents:'none',zIndex:0}} />}
      <div style={{position:'relative',zIndex:1,flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'7px',paddingBottom:'7px',borderBottom:`3px double ${BLUE}`}}>
          <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',width:'78px',height:'78px',borderRadius:'50%',background:`radial-gradient(circle,#e8edf7 60%,#c7d2e8 100%)`,border:`3px solid ${BLUE}`,boxShadow:'0 2px 8px rgba(26,58,107,0.25)',padding:'4px'}}>
            <img src={schoolInfo.schoolLogo||schoolLogo} alt="logo" style={{width:'66px',height:'66px',objectFit:'contain',borderRadius:'50%'}} />
          </div>
          <div style={{flex:1,textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'3px'}}>
              <div style={{flex:1,height:'1.5px',background:`linear-gradient(to right,transparent,${BLUE})`}} />
              <div style={{fontSize:'28px',fontWeight:'900',color:BLUE,fontFamily:'Georgia,"Times New Roman",serif',letterSpacing:'1px',lineHeight:1.15,textShadow:'0 1px 2px rgba(26,58,107,0.15)'}}>{schoolInfo.schoolName}</div>
              <div style={{flex:1,height:'1.5px',background:`linear-gradient(to left,transparent,${BLUE})`}} />
            </div>
            <div style={{fontSize:'14px',color:'#1e4d8c',fontFamily:'Georgia,serif',fontStyle:'italic',letterSpacing:'0.5px',marginBottom:'3px'}}>{schoolInfo.schoolSlogan||'Affiliated to Central Board of Secondary Education'}</div>
            {schoolInfo.affiliationNumber && (
              <div style={{display:'inline-flex',gap:'12px',fontSize:'12.5px',color:'#374151',background:'#e8edf7',borderRadius:'20px',padding:'2px 14px',border:`1px solid #c7d2e8`,marginBottom:'3px'}}>
                <span>Affil. No.: <b style={{color:BLUE}}>{schoolInfo.affiliationNumber}</b></span>
                {schoolInfo.schoolCode && <span>|&nbsp;School Code: <b style={{color:BLUE}}>{schoolInfo.schoolCode}</b></span>}
              </div>
            )}
            <div style={{fontSize:'13.5px',color:'#4b5563',fontFamily:'Arial,sans-serif',letterSpacing:'0.3px'}}>{schoolInfo.schoolAddress}</div>
          </div>
          <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',width:'78px',height:'78px',borderRadius:'50%',background:`radial-gradient(circle,#e8edf7 60%,#c7d2e8 100%)`,border:`3px solid ${BLUE}`,boxShadow:'0 2px 8px rgba(26,58,107,0.25)',padding:'4px'}}>
            <img src={schoolInfo.schoolLogo||schoolLogo} alt="logo2" style={{width:'66px',height:'66px',objectFit:'contain',borderRadius:'50%'}} />
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${BLUE} 0%,#1e4d8c 100%)`,color:'white',textAlign:'center',padding:'5px 12px',fontSize:'18px',fontWeight:'900',letterSpacing:'3px',marginBottom:'8px',fontFamily:'Arial,sans-serif',borderRadius:'3px',boxShadow:'0 2px 6px rgba(26,58,107,0.3)'}}>
          ANNUAL RESULT -- SESSION {academicYear}
        </div>
        <div style={{display:'flex',marginBottom:'8px',border:`1.5px solid ${BLUE}`,borderRadius:'4px',overflow:'hidden'}}>
          <div style={{flex:1,padding:'8px 12px',background:BLUE_LIGHT}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <tbody>
                <tr>
                  <td style={{fontSize:'11px',paddingBottom:'4px',width:'52%'}}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Admission No.</span><br/>
                    <b style={{fontSize:'12px',color:'#111827'}}>{student.admissionNo||student.UID||'--'}</b>
                  </td>
                  <td style={{fontSize:'11px',paddingBottom:'4px'}}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Class &amp; Section</span><br/>
                    <b style={{fontSize:'12px',color:'#111827'}}>{student.class||'--'}</b>
                  </td>
                </tr>
                <tr>
                  <td style={{paddingBottom:'4px'}} colSpan={2}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Student Name</span><br/>
                    <b style={{fontSize:'15px',color:BLUE,letterSpacing:'0.3px'}}>{student.name}</b>
                  </td>
                </tr>
                <tr>
                  <td style={{paddingBottom:'3px'}}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase'}}>Father&apos;s Name</span><br/>
                    <span style={{fontSize:'11px',fontWeight:'600'}}>{student.fatherName||'--'}</span>
                  </td>
                  <td style={{paddingBottom:'3px'}}>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase'}}>Mother&apos;s Name</span><br/>
                    <span style={{fontSize:'11px',fontWeight:'600'}}>{student.motherName||'--'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase'}}>Date of Birth</span><br/>
                    <span style={{fontSize:'11px',fontWeight:'600'}}>{student.dob?fmt(student.dob):'--'}</span>
                  </td>
                  <td>
                    <span style={{color:'#6b7280',fontSize:'9px',fontWeight:'700',textTransform:'uppercase'}}>Address</span><br/>
                    <span style={{fontSize:'10.5px'}}>{student.address||'--'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{width:'106px',flexShrink:0,borderLeft:`1.5px solid ${BLUE}`,display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f4fb',padding:'8px'}}>
            <div style={{width:'88px',height:'110px',border:`2px solid ${BLUE}`,borderRadius:'3px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#e5e7eb',boxShadow:'0 2px 6px rgba(0,0,0,0.15)'}}>
              {photoSrc?<img src={photoSrc} alt={student.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />:<User size={30} color="#9ca3af" />}
            </div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
          <div style={{flex:1,height:'1px',background:'#c7d2e8'}} />
          <div style={{fontWeight:'900',fontSize:'16px',fontFamily:'Arial,sans-serif',color:BLUE,padding:'0 10px',letterSpacing:'0.5px'}}>Scholastic Area</div>
          <div style={{flex:1,height:'1px',background:'#c7d2e8'}} />
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'8px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
          <thead>
            <tr>
              <TH rowSpan={2} style={{width:'95px',fontSize:`${fs(11)}px`}}>SUBJECTS</TH>
              <TH colSpan={6} style={{background:'#1e3575',fontSize:`${fs(11)}px`}}>TERM - 1</TH>
              <TH colSpan={6} style={{background:'#7c2d12',fontSize:`${fs(11)}px`}}>TERM - 2</TH>
            </tr>
            <tr>
              <TH style={{background:'#243d8a'}}>{'PT\n(10)'}</TH>
              <TH style={{background:'#243d8a'}}>{'NB\n(5)'}</TH>
              <TH style={{background:'#243d8a'}}>{'SE\n(5)'}</TH>
              <TH style={{background:'#243d8a'}}>{'HY\n(80)'}</TH>
              <TH style={{background:'#1a326e'}}>{'Total\n(100)'}</TH>
              <TH style={{background:'#1a326e'}}>Grade</TH>
              <TH style={{background:'#92400e'}}>{'PT\n(10)'}</TH>
              <TH style={{background:'#92400e'}}>{'NB\n(5)'}</TH>
              <TH style={{background:'#92400e'}}>{'SE\n(5)'}</TH>
              <TH style={{background:'#92400e'}}>{'FE\n(80)'}</TH>
              <TH style={{background:'#78350f'}}>{'Total\n(100)'}</TH>
              <TH style={{background:'#78350f'}}>Grade</TH>
            </tr>
          </thead>
          <tbody>
            {enriched.map((sub,i) => (
              <tr key={i} style={{background:i%2===0?'#f8faff':'#ffffff'}}>
                <td style={{border:'1px solid #c7d2e8',padding:rowPad,fontSize:`${fs(11.5)}px`,fontWeight:'700',borderLeft:`3px solid ${BLUE}`}}>{sub.subjectName}</td>
                <TD>{sub.term1?.periodicTest}</TD>
                <TD>{sub.term1?.noteBooks}</TD>
                <TD>{sub.term1?.subEnrichment}</TD>
                <TD>{sub.term1?.halfYearlyExam}</TD>
                <TD style={{fontWeight:'800',background:'#f0f4ff'}}>{typeof sub.term1?.total==='number'&&sub.term1.total>0?sub.term1.total:null}</TD>
                <TD style={{fontWeight:'900',color:gradeColor(sub.term1?.grade),background:gradeBg(sub.term1?.grade)}}>{sub.term1?.grade}</TD>
                <TD>{sub.term2?.periodicTest}</TD>
                <TD>{sub.term2?.noteBooks}</TD>
                <TD>{sub.term2?.subEnrichment}</TD>
                <TD>{sub.term2?.yearlyExam}</TD>
                <TD style={{fontWeight:'800',background:'#fff7ed'}}>{typeof sub.term2?.total==='number'&&sub.term2.total>0?sub.term2.total:null}</TD>
                <TD style={{fontWeight:'900',color:gradeColor(sub.term2?.grade),background:gradeBg(sub.term2?.grade)}}>{sub.term2?.grade}</TD>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:'#e8edf7'}}>
              <td style={{border:`1px solid ${BLUE}`,padding:rowPad,fontWeight:'900',fontSize:`${fs(13)}px`,textAlign:'center',color:BLUE}}>Grand Total</td>
              <td colSpan={4} style={{border:`1px solid ${BLUE}`}} />
              <td style={{border:`1px solid ${BLUE}`,padding:rowPad,fontWeight:'900',fontSize:`${fs(14)}px`,textAlign:'center',color:'#1e3575'}}>{grandT1>0?grandT1:'--'}</td>
              <td style={{border:`1px solid ${BLUE}`}} />
              <td colSpan={4} style={{border:`1px solid ${BLUE}`}} />
              <td style={{border:`1px solid ${BLUE}`,padding:rowPad,fontWeight:'900',fontSize:`${fs(14)}px`,textAlign:'center',color:'#78350f'}}>{grandT2>0?grandT2:'--'}</td>
              <td style={{border:`1px solid ${BLUE}`}} />
            </tr>
            <tr style={{background:BLUE}}>
              <td colSpan={5} style={{border:`1px solid ${BLUE}`,padding:rowPad,fontWeight:'900',fontSize:`${fs(13)}px`,textAlign:'right',color:'white'}}>Combined Total</td>
              <td colSpan={2} style={{border:`1px solid ${BLUE}`,padding:rowPad,fontWeight:'900',fontSize:`${fs(14)}px`,textAlign:'center',color:'#fcd34d'}}>{grandTotal}/{grandMaxFinal}</td>
              <td colSpan={4} style={{border:`1px solid ${BLUE}`,padding:rowPad,fontWeight:'900',fontSize:`${fs(13)}px`,textAlign:'right',color:'white'}}>Percentage &amp; Grade</td>
              <td colSpan={2} style={{border:`1px solid ${BLUE}`,padding:rowPad,fontWeight:'900',fontSize:`${fs(14)}px`,textAlign:'center',color:'#fcd34d'}}>{percentage}% &nbsp; {overallGrade}</td>
            </tr>
          </tfoot>
        </table>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
          <div style={{flex:1,height:'1px',background:'#c7d2e8'}} />
          <div style={{fontWeight:'900',fontSize:'15.5px',fontFamily:'Arial,sans-serif',color:BLUE,padding:'0 10px',letterSpacing:'0.5px'}}>Co-Scholastic Area</div>
          <div style={{flex:1,height:'1px',background:'#c7d2e8'}} />
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'5px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <thead>
            <tr>
              <th style={{border:`1px solid ${BLUE}`,padding:'5px 10px',fontSize:'11px',fontWeight:'800',background:BLUE,color:'white',textAlign:'left',letterSpacing:'0.3px'}}>Activity</th>
              <th style={{border:`1px solid ${BLUE}`,padding:'5px 0',fontSize:'11px',fontWeight:'800',background:'#1e3575',color:'white',textAlign:'center',width:'80px'}}>Term-1</th>
              <th style={{border:`1px solid ${BLUE}`,padding:'5px 0',fontSize:'11px',fontWeight:'800',background:'#78350f',color:'white',textAlign:'center',width:'80px'}}>Term-2</th>
            </tr>
          </thead>
          <tbody>
            {[['Work Education','workEducation'],['Art Education','artEducation'],['Health & Physical Education','healthPhysical']].map(([lbl,key],idx) => (
              <tr key={key} style={{background:idx%2===0?'#f8faff':'#fff'}}>
                <td style={{border:'1px solid #c7d2e8',padding:'5px 10px',fontSize:'11px',borderLeft:`3px solid #6d28d9`,fontWeight:'600',color:'#374151'}}>{lbl}</td>
                <td style={{border:'1px solid #c7d2e8',padding:'4px',textAlign:'center',fontSize:'13px',fontWeight:'900',color:'#15803d',background:'#f0fdf4'}}>{coScholastic[key]?.term1||'A'}</td>
                <td style={{border:'1px solid #c7d2e8',padding:'4px',textAlign:'center',fontSize:'13px',fontWeight:'900',color:'#15803d',background:'#f0fdf4'}}>{coScholastic[key]?.term2||'A'}</td>
              </tr>
            ))}
            <tr style={{background:'#f8faff'}}>
              <td style={{border:'1px solid #c7d2e8',padding:'5px 10px',fontSize:'11px',borderLeft:`3px solid #6d28d9`,fontWeight:'600',color:'#374151'}}>Discipline</td>
              <td style={{border:'1px solid #c7d2e8',padding:'4px',textAlign:'center',fontSize:'13px',fontWeight:'900',color:'#15803d',background:'#f0fdf4'}}>{coScholastic.discipline?.term1||'A'}</td>
              <td style={{border:'1px solid #c7d2e8',padding:'4px',textAlign:'center',fontSize:'13px',fontWeight:'900',color:'#15803d',background:'#f0fdf4'}}>{coScholastic.discipline?.term2||'A'}</td>
            </tr>
          </tbody>
        </table>
        {/* Attendance */}
        <div style={{display:'flex',gap:'6px',marginBottom:'4px'}}>
          <div style={{flex:1,display:'grid',gridTemplateColumns:'auto 1fr 1fr 1fr',alignItems:'center',gap:'0',background:BLUE_LIGHT,border:`1.5px solid #93afd4`,borderRadius:'6px',overflow:'hidden'}}>
            <div style={{background:BLUE,padding:'4px 8px',display:'flex',alignItems:'center'}}>
              <span style={{fontSize:'9px',fontWeight:'900',color:'white',textTransform:'uppercase',letterSpacing:'0.8px'}}>Attendance</span>
            </div>
            {[
              ['Present', attendance.presentDays??'--'],
              ['Total Days', attendance.totalWorkingDays??'--'],
              ['Percentage', attendance.presentDays&&attendance.totalWorkingDays?`${((attendance.presentDays/attendance.totalWorkingDays)*100).toFixed(1)}%`:'--'],
            ].map(([label, value]) => {
              const isLow = label==='Percentage'&&attendance.presentDays&&attendance.totalWorkingDays&&((attendance.presentDays/attendance.totalWorkingDays)*100)<75;
              return (
                <div key={label} style={{padding:'3px 8px',borderLeft:`1px solid #c7d2e8`,textAlign:'center'}}>
                  <div style={{fontSize:'8px',color:'#6b7280',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</div>
                  <div style={{fontSize:'11px',fontWeight:'900',color:label==='Percentage'?(isLow?'#dc2626':'#15803d'):BLUE,marginTop:'1px'}}>{value}</div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Remark */}
        <div style={{display:'flex',alignItems:'stretch',marginBottom:'4px',borderRadius:'6px',overflow:'hidden',border:`1.5px solid #fcd34d`}}>
          <div style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',padding:'4px 8px',display:'flex',alignItems:'center',flexShrink:0}}>
            <span style={{fontSize:'8px',fontWeight:'900',color:'white',textTransform:'uppercase',letterSpacing:'0.8px',whiteSpace:'nowrap'}}>Teacher&apos;s Remark</span>
          </div>
          <div style={{background:'#fffbeb',padding:'4px 10px',display:'flex',alignItems:'center',flex:1}}>
            <span style={{fontSize:'11px',color:'#374151',fontStyle:'italic'}}>"{remark}"</span>
          </div>
        </div>
        {/* Result */}
        <div style={{borderRadius:'6px',overflow:'hidden',border:`1.5px solid ${pctNum>=33?'#86efac':'#fca5a5'}`,marginTop:'4px',marginBottom:'0'}}>
          <div style={{background:pctNum>=33?'linear-gradient(135deg,#166534,#15803d)':'linear-gradient(135deg,#991b1b,#dc2626)',padding:'3px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:'9px',fontWeight:'900',color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:'1px'}}>Result</span>
            <span style={{fontSize:'9px',fontWeight:'700',color:'rgba(255,255,255,0.6)'}}>Session {academicYear}</span>
          </div>
          <div style={{background:pctNum>=33?'linear-gradient(135deg,#f0fdf4,#dcfce7)':'#fef2f2',padding:'5px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:'13px',fontWeight:'800',color:pctNum>=33?'#166534':'#991b1b'}}>{resultQualified}</div>
              <div style={{fontSize:'10px',color:'#6b7280',marginTop:'1px'}}>Place: {schoolInfo.schoolAddress||'--'} &nbsp;|&nbsp; Date: {today}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
              <div style={{fontSize:'16px',fontWeight:'900',letterSpacing:'2px',color:pctNum>=33?'#166534':'#991b1b',border:`2px solid ${pctNum>=33?'#86efac':'#fca5a5'}`,padding:'2px 14px',borderRadius:'4px',background:'white',lineHeight:1.2}}>
                {pctNum>=33?'PASS':'FAIL'}
              </div>
              {pctNum>=33 && (
                <div style={{fontSize:'8px',fontWeight:'900',letterSpacing:'1px',color:'white',background:pctNum>=65?'#1d4ed8':pctNum>=45?'#15803d':'#d97706',padding:'2px 8px',borderRadius:'3px',textTransform:'uppercase'}}>
                  {pctNum>=65?'First Division':pctNum>=45?'Second Division':'Third Division'}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{flex:'1 1 0px',minHeight:subCount>8?'2mm':'3mm',maxHeight:subCount>8?'6mm':'14mm'}} />
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
            {["Parent's Signature","Class Teacher's Signature"].map(sig => (
              <div key={sig} style={{textAlign:'center',flex:1,padding:'0 8px'}}>
                <div style={{height:'44px',borderBottom:`1.5px solid #374151`,marginBottom:'3px'}} />
                <div style={{fontSize:'14px',color:'#374151',fontFamily:'Arial,sans-serif',fontWeight:'600'}}>{sig}</div>
              </div>
            ))}
            <div style={{textAlign:'center',flex:1,padding:'0 8px'}}>
              <div style={{height:'44px',borderBottom:`1.5px solid #374151`,marginBottom:'3px',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
                <img src={principalSign} alt="Principal Signature" style={{maxHeight:'40px',maxWidth:'100%',objectFit:'contain',marginBottom:'2px'}} />
              </div>
              <div style={{fontSize:'14px',color:'#374151',fontFamily:'Arial,sans-serif',fontWeight:'600'}}>Principal&apos;s Signature</div>
            </div>
          </div>
          <div style={{borderTop:`2px solid ${BLUE}`,paddingTop:'7px'}}>
            <div style={{fontSize:'11px',fontWeight:'800',marginBottom:'5px',color:BLUE,fontFamily:'Arial,sans-serif',textTransform:'uppercase',letterSpacing:'0.4px',textAlign:'center'}}>Grading Scale</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
              <thead>
                <tr>{[['91-100','A1'],['81-90','A2'],['71-80','B1'],['61-70','B2'],['51-60','C1'],['41-50','C2'],['33-40','D'],['32 & Below','E']].map(([r])=>(<th key={r} style={{border:`1px solid ${BLUE}`,padding:'3px 4px',background:BLUE,color:'white',fontWeight:'800',textAlign:'center'}}>{r}</th>))}</tr>
              </thead>
              <tbody>
                <tr>{[['91-100','A1'],['81-90','A2'],['71-80','B1'],['61-70','B2'],['51-60','C1'],['41-50','C2'],['33-40','D'],['32 & Below','E']].map(([,g])=>(<td key={g} style={{border:'1px solid #c7d2e8',padding:'3px 4px',textAlign:'center',fontWeight:'900',fontSize:'12px',color:gradeColor(g),background:gradeBg(g)}}>{g}</td>))}</tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const MODES = [
  { key: 'term1', label: 'Term-1 Result',  termKey: 'term1', termLabel: 'TERM-1' },
  { key: 'final', label: 'Final Combined', termKey: null,    termLabel: 'FINAL'  },
];

const ResultGeneration = () => {
  const { settings } = useSettings();
  const location = useLocation();
  const [classes, setClasses]     = useState([]);
  const [exams, setExams]         = useState([]);
  const [sessions, setSessions]   = useState([]);
  const [viewYear, setViewYear]   = useState('');
  const [examsLoading, setExamsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExams, setSelectedExams] = useState([]);
  const [mode, setMode]           = useState('term1');
  const [results, setResults]     = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);
  const printRef = useRef();
  const navApplied = useRef(false);

  useEffect(() => {
    if (settings?.currentAcademicYear) setViewYear(settings.currentAcademicYear);
    API.get('/admin/exams/sessions').then(r => {
      setSessions(r.data);
      if (!settings?.currentAcademicYear && r.data.length > 0) setViewYear(r.data[0]);
    }).catch(() => {});
  }, [settings?.currentAcademicYear]);

  useEffect(() => {
    if (!viewYear) return;
    const load = async () => {
      setExamsLoading(true);
      try {
        const [clsRes, exRes] = await Promise.all([
          API.get('/admin/classes'),
          API.get(`/admin/exams?year=${viewYear}`),
        ]);
        setClasses(clsRes.data);
        setExams(exRes.data);
        setSelectedExams([]); setResults([]);
        if (!navApplied.current && location.state?.examId) {
          navApplied.current = true;
          setSelectedExams([location.state.examId]);
        }
      } catch {
        setToast({ message: 'Failed to load exams', type: 'error' });
      } finally { setExamsLoading(false); }
    };
    load();
  }, [viewYear]);

  const toggleExam = (id) =>
    setSelectedExams(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleGenerate = async () => {
    if (!selectedClass) return setToast({ message: 'Select a class first', type: 'error' });
    const examIds = selectedExams;
    if (!examIds.length) return setToast({ message: 'Select at least one exam', type: 'error' });
    setLoading(true); setResults([]);
    try {
      const [resultRes, attendanceRes] = await Promise.all([
        API.get(`/admin/results/final/${selectedClass}?examIds=${examIds.join(',')}`),
        API.get(`/attendance/class-report/${selectedClass}?academicYear=${viewYear}`).catch(() => ({ data: [] })),
      ]);
      const attMap = {};
      (attendanceRes.data || []).forEach(a => {
        attMap[a.UID] = { presentDays: a.presentCount, totalWorkingDays: a.totalCount };
      });
      const merged = resultRes.data.map(s => ({ ...s, attendance: attMap[s.UID] || s.attendance || {} }));
      setResults(merged);
      setCurrentIdx(0);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'No data found', type: 'error' });
    } finally { setLoading(false); }
  };

  const printHTML = (html) => {
    const style = `<style>
      @page { size: A4; margin: 0; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; padding: 0; background: white; }
      .marksheet-page { width:210mm; height:297mm; box-sizing:border-box; page-break-after:always; overflow:hidden; display:flex; flex-direction:column; }
      .marksheet-page:last-child { page-break-after: avoid; }
    </style>`;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Marksheet</title>${style}</head><body>${html}</body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handlePrintAll = () => printHTML(printRef.current.innerHTML);
  const handlePrintOne = () => {
    const node = printRef.current?.querySelectorAll('.marksheet-page')[currentIdx];
    if (node) printHTML(node.outerHTML);
  };

  const activeMode = MODES.find(m => m.key === mode);
  const className  = classes.find(c => c._id === selectedClass)?.className || '';
  const schoolInfo = {
    schoolName:        settings?.schoolName        || 'School Name',
    schoolSlogan:      settings?.schoolSlogan       || '',
    schoolAddress:     settings?.schoolAddress      || '',
    schoolLogo:        settings?.schoolLogo         || '',
    affiliationNumber: settings?.affiliationNumber  || '',
    schoolCode:        settings?.schoolCode         || '',
    currentAcademicYear: settings?.currentAcademicYear || viewYear,
  };

  const renderMarksheet = (student) => {
    if (mode === 'final') {
      return <CombinedMarksheet key={student.studentId} student={student} schoolInfo={schoolInfo} academicYear={viewYear} />;
    }
    return (
      <TermMarksheet key={student.studentId} student={student}
        termKey={activeMode.termKey} termLabel={activeMode.termLabel}
        schoolInfo={schoolInfo} academicYear={viewYear} />
    );
  };

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div>
        <h1 className="text-2xl font-black text-indigo-700 tracking-tight">Result Generation</h1>
        <p className="text-sm text-gray-500 font-medium">Generate marksheets per term or combined.</p>
      </div>

      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-indigo-600" />
          <span className="text-xs font-black text-indigo-900 uppercase tracking-tight">Session:</span>
        </div>
        <select value={viewYear} onChange={e => setViewYear(e.target.value)}
          className="bg-white border-2 border-indigo-100 rounded-xl text-sm font-black text-indigo-700 px-3 py-1.5 outline-none">
          {sessions.length > 0
            ? sessions.map(y => <option key={y} value={y}>{y === settings?.currentAcademicYear ? `Current (${y})` : `Session ${y}`}</option>)
            : viewYear ? <option value={viewYear}>{viewYear}</option> : <option value="">Loading...</option>}
        </select>
      </div>

      <div className="flex gap-2">
        {MODES.map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); setResults([]); }}
            className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all border-2 ${
              mode === m.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <select className="w-full h-12 bg-gray-50 rounded-xl px-4 font-bold outline-none"
          value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setResults([]); }}>
          <option value="">Select Class...</option>
          {classes.map(c => <option key={c._id} value={c._id}>Grade {c.className}</option>)}
        </select>
        <div className="space-y-2">
          <p className="text-xs font-black text-gray-400 uppercase ml-1">
            {mode === 'term1' ? 'Select Term-1 Exams' : 'Select Exams to Combine'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {examsLoading
              ? <p className="text-sm text-gray-400 col-span-2 py-2 text-center">Loading exams...</p>
              : (() => {
                  const filtered = mode === 'term1' ? exams.filter(e => e.term === 'Term-1' || !e.term) : exams;
                  return filtered.length === 0
                    ? <p className="text-sm text-gray-400 col-span-2 py-2 text-center">No exams found for {viewYear}</p>
                    : filtered.map(e => (
                        <button key={e._id} onClick={() => toggleExam(e._id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                            selectedExams.includes(e._id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-gray-50 hover:border-indigo-200'}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            selectedExams.includes(e._id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                            {selectedExams.includes(e._id) && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-800">{e.examName}</p>
                            <p className="text-[10px] font-bold uppercase"
                              style={{ color: e.status==='Completed'?'#16a34a':e.status==='Ongoing'?'#d97706':'#6b7280' }}>
                              {e.term||'Term-1'} · {e.component||e.examType} · {e.status}
                            </p>
                          </div>
                        </button>
                      ));
                })()}
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="w-full h-12 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-tight disabled:opacity-50">
          {loading ? 'Generating...' : 'Generate Marksheets'}
        </button>
      </div>

      {loading ? (
        <div className="py-20"><LoadingSpinner size="lg" /></div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-tight">{activeMode.label} · Grade {className}</p>
              <p className="text-sm font-bold text-gray-700">{results.length} marksheets generated</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button onClick={handlePrintOne}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-100 rounded-xl text-sm font-black text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                <Printer size={15} /> Print This
              </button>
              <button onClick={handlePrintAll}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
                <Printer size={15} /> Print All ({results.length})
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">All Students</p>
            <div className="flex gap-1.5 flex-wrap">
              {results.map((s,i) => (
                <button key={s.studentId} onClick={() => setCurrentIdx(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    i===currentIdx
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                  {s.name?.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Result Preview */}
          <div style={{ background:'linear-gradient(160deg,#1e1b4b 0%,#312e81 40%,#1e3a5f 100%)', borderRadius:'24px', padding:'32px 24px 36px', boxShadow:'0 20px 60px rgba(30,27,75,0.35),inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            {/* Top label */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#f87171' }} />
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#fbbf24' }} />
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#34d399' }} />
              </div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.45)', letterSpacing:'2px', textTransform:'uppercase' }}>
                Marksheet Preview &nbsp;·&nbsp; {results[currentIdx]?.name}
              </div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.35)' }}>
                {currentIdx + 1} / {results.length}
              </div>
            </div>

            {/* Paper shadow stack */}
            <div style={{ position:'relative', width:'fit-content', margin:'0 auto', overflow:'hidden', borderRadius:'6px' }}>
              {/* Stack layers */}
              <div style={{ position:'absolute', top:'10px', left:'8px', width:'635px', background:'rgba(255,255,255,0.12)', borderRadius:'6px', zIndex:0, bottom:'-10px' }} />
              <div style={{ position:'absolute', top:'5px', left:'4px', width:'635px', background:'rgba(255,255,255,0.2)', borderRadius:'5px', zIndex:1, bottom:'-5px' }} />
              {/* Main paper */}
              <div style={{ position:'relative', zIndex:2, borderRadius:'4px', width:'635px', boxShadow:'0 24px 64px rgba(0,0,0,0.5),0 4px 16px rgba(0,0,0,0.3),inset 0 0 0 1px rgba(255,255,255,0.15)', background:'white' }}>
                <style>{`@media screen { .marksheet-page { overflow: visible !important; height: auto !important; } }`}</style>
                <div style={{ zoom: 0.8, width:'794px' }}>
                  {mode === 'final' ? (
                    <CombinedMarksheet student={results[currentIdx]} schoolInfo={schoolInfo} academicYear={viewYear} />
                  ) : (
                    <TermMarksheet student={results[currentIdx]}
                      termKey={activeMode.termKey} termLabel={activeMode.termLabel}
                      schoolInfo={schoolInfo} academicYear={viewYear} />
                  )}
                </div>
              </div>
            </div>

            {/* Bottom nav */}
            <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', marginTop:'24px' }}>
              <button onClick={() => setCurrentIdx(i => Math.max(0, i-1))} disabled={currentIdx===0}
                style={{ width:'36px', height:'36px', borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.08)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:currentIdx===0?'not-allowed':'pointer', opacity:currentIdx===0?0.3:1, transition:'all 0.2s' }}>
                <ChevronLeft size={16} />
              </button>
              <div style={{ display:'flex', gap:'6px' }}>
                {results.slice(Math.max(0,currentIdx-3), Math.min(results.length, currentIdx+4)).map((_,relIdx) => {
                  const absIdx = Math.max(0,currentIdx-3) + relIdx;
                  return (
                    <button key={absIdx} onClick={() => setCurrentIdx(absIdx)}
                      style={{ width: absIdx===currentIdx?'28px':'8px', height:'8px', borderRadius:'4px', border:'none', background: absIdx===currentIdx?'white':'rgba(255,255,255,0.3)', cursor:'pointer', transition:'all 0.25s', padding:0 }} />
                  );
                })}
              </div>
              <button onClick={() => setCurrentIdx(i => Math.min(results.length-1, i+1))} disabled={currentIdx===results.length-1}
                style={{ width:'36px', height:'36px', borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.08)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:currentIdx===results.length-1?'not-allowed':'pointer', opacity:currentIdx===results.length-1?0.3:1, transition:'all 0.2s' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div ref={printRef} style={{ display:'none' }}>
            {results.map(s => renderMarksheet(s))}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center opacity-30">
          <FileBarChart2 size={64} className="mx-auto mb-4" />
          <p className="font-bold text-lg">Select filters and generate marksheets.</p>
        </div>
      )}
    </div>
  );
};

export default ResultGeneration;