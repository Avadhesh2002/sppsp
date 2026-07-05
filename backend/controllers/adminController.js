const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');


const PROMOTION_MAP = {
    'Nursery': 'LKG',  
    'LKG': 'UKG',
    'UKG': '1',
    '1': '2',
    '2': '3',
    '3': '4',
    '4': '5',
    '5': '6',
    '6': '7',
    '7': '8',
    '8': '9',
    '9': '10',
    '10': '11',
    '11': '12',
    '12': 'Graduated' 
};
const getPendingStudents = async (req, res) => {
    try {
        const pendingStudents = await Student.find({ accountStatus: 'pending' });
        res.status(200).json(pendingStudents);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const approveStudent = async (req, res) => {
    try {
        const { UID, password } = req.body;
        const studentId = req.params.id;

        // 1. Validation: Ensure Roll Number and Password are provided
        if (!UID || !password) {
            return res.status(400).json({ message: "Please provide UID and Password" });
        }

        // 2. Check if Roll Number is already taken by another student
        const existingRoll = await Student.findOne({ UID });
        if (existingRoll) {
            return res.status(400).json({ message: "This UID is already assigned to another student." });
        }

        // 3. Find the student and update
        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({ message: "Student application not found" });
        }

        // 4. Transform student from 'pending' to 'active'
        student.UID = UID;
        student.password = password; // Remember: Our pre-save hook in Student.js will hash this automatically!
        student.accountStatus = 'active';
        student.admissionDate = Date.now(); 
        await student.save();

        await student.save();

        res.status(200).json({
            message: `Student ${student.name} approved successfully!`,
            credentials: {
                UID: student.UID,
                status: student.accountStatus
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// @desc    Get all students with Search, Filtering, and Pagination
// @route   GET /api/admin/students
const getAllStudents = async (req, res) => {
    try {
        // 1. ADD admissionType to the extracted query
        const { studentClass, status, search, page = 1, limit = 10, admissionType } = req.query;
        
        let query = {};

        const activeStatus = (status && status !== "") ? status : 'active';
        query.accountStatus = activeStatus;

        if (studentClass) query.class = studentClass;

        // 2. ADD the filter logic for Admission Type
        if (admissionType) query.admissionType = admissionType;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { UID: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const totalStudents = await Student.countDocuments(query); // This counts based on the filters
        const students = await Student.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            pagination: {
                totalItems: totalStudents, // THIS IS THE "COUNT" DATA
                totalPages: Math.ceil(totalStudents / limit),
                currentPage: parseInt(page)
            },
            students
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// @desc    Update student details (Edit Profile)
// @route   PUT /api/admin/students/:id
// @access  Private (Admin)
const updateStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // We update the record but prevent changing the UID via this route
        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            message: "Student profile updated successfully",
            updatedStudent
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Deactivate a student (Soft Delete)
// @route   DELETE /api/admin/students/:id
// @access  Private (Admin)
const deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Instead of deleting, we move them to 'inactive'
        student.accountStatus = 'inactive';
        await student.save();

        res.status(200).json({ message: `Student ${student.name} has been marked as inactive.` });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Teacher

const addTeacher = async (req, res) => {
    try {
        let { 
            name, email, phone, gender, dateOfBirth, 
            joiningDate, experience, address, aadharNumber, 
            qualifications, password, employeeCode 
        } = req.body;

        if (!email || email.trim() === "") {
            email = undefined;
        }
        // 1. ARCHITECT'S GUARD: Check for existing Aadhar or Email
        // Email is optional, so we only check if it's actually provided
        if (email) {
            const emailExists = await Teacher.findOne({ email });
            if (emailExists) return res.status(400).json({ message: "Teacher with this Email already exists." });
        }

        const aadharExists = await Teacher.findOne({ aadharNumber });
        if (aadharExists) return res.status(400).json({ message: "Teacher with this Aadhar Number already registered." });

        // 2. AUTOMATION: Default Password & Employee ID
        if (!password) password = "Teacher@123"; 

        if (!employeeCode) {
            // This counts all teachers (Active + Inactive)
            const count = await Teacher.countDocuments(); 
            
            // Start from 100, so first teacher is TCH-101
            const nextNumber = 100 + count + 1;
            
            employeeCode = `TCH-${nextNumber}`;
        }

        // 3. CREATE TEACHER RECORD
        const teacher = await Teacher.create({
            name,
            email,
            phone,
            gender,
            dateOfBirth,
            joiningDate,
            experience,
            address,
            aadharNumber,
            qualifications,
            employeeCode,
            password
        });

        res.status(201).json({
            message: "Faculty member hired successfully!",
            teacher: {
                id: teacher._id,
                name: teacher.name,
                employeeCode: teacher.employeeCode
            }
        });

    } catch (error) {
        // This catches the Mongoose validation errors (like 10-digit phone check)
        res.status(400).json({ message: "Validation Failed", error: error.message });
    }
};



// @desc    Get all teachers with optional status filtering
// @desc    Get all teachers with Search and Pagination
// @route   GET /api/admin/teachers
const getAllTeachers = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;
        let query = {};

        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;

        // Search Logic (Name or Employee Code)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { employeeCode: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const totalTeachers = await Teacher.countDocuments(query);
        const teachers = await Teacher.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            pagination: {
                totalItems: totalTeachers,
                totalPages: Math.ceil(totalTeachers / limit),
                currentPage: parseInt(page)
            },
            teachers
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// @desc    Update teacher details
// @route   PUT /api/admin/teachers/:id
// @access  Private (Admin)
const updateTeacher = async (req, res) => {
    try {
        const teacherId = req.params.id;
        const teacher = await Teacher.findById(teacherId);

        if (!teacher) {
            return res.status(404).json({ message: "Staff record not found" });
        }

        // We prevent updating the employeeCode and password via this specific route for security
        // The rest of the fields from req.body (gender, address, etc.) will be processed
        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { $set: req.body },
            { 
                new: true,           // Returns the updated document
                runValidators: true  // Critical: Ensures the 10-digit phone check is active on update
            }
        ).select('-password');

        res.status(200).json({
            message: "Faculty profile updated successfully",
            updatedTeacher
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Conflict: Email or Aadhar already exists in the system." });
        }
        res.status(500).json({ message: "Update Failed", error: error.message });
    }
};

// @desc    Soft delete (Deactivate) a teacher
// @route   DELETE /api/admin/teachers/:id
// @access  Private (Admin)
const deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        teacher.isActive = false;
        await teacher.save();

        res.status(200).json({ message: `Teacher ${teacher.name} has been deactivated.` });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};



// @desc    Bulk upload students from an array
// @route   POST /api/admin/students/bulk-upload
const bulkUploadStudents = async (req, res) => {
    try {
        const { students } = req.body;

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: "Please provide an array of students" });
        }

        const processedStudents = [];
        const errors = [];

        for (let i = 0; i < students.length; i++) {
            const s = students[i];

            // 1. Validation: Check required fields for each student
            if (!s.name || !s.UID || !s.password || !s.class || !s.section) {
                errors.push(`Row ${i + 1}: Missing required fields`);
                continue;
            }

            // 2. Validation: Check for duplicate UID in Database
            const existing = await Student.findOne({ UID: s.UID });
            if (existing) {
                errors.push(`Row ${i + 1}: UID ${s.UID} already exists`);
                continue;
            }

            // 3. SECURITY: Manual Hashing (Since insertMany skips hooks)
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(s.password, salt);

            // 4. Prepare the student object
            processedStudents.push({
                ...s,
                password: hashedPassword,
                accountStatus: 'active',
                admissionDate: Date.now()
            });
        }

        // 5. If there are too many errors, stop and report
        if (errors.length > 0 && processedStudents.length === 0) {
            return res.status(400).json({ message: "Bulk upload failed", errors });
        }

        // 6. Final Bulk Insert
        const result = await Student.insertMany(processedStudents);

        res.status(201).json({
            message: "Bulk upload completed",
            successCount: result.length,
            errors: errors.length > 0 ? errors : "None"
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error during bulk upload", error: error.message });
    }
};



// @desc    Promote students from one class to another
// @route   PUT /api/admin/students/promote
const promoteStudents = async (req, res) => {
    try {
        const { fromClass, toClass } = req.body;

        if (!fromClass || !toClass) {
            return res.status(400).json({ message: "Please provide both current and target class" });
        }

        let query = { class: fromClass, accountStatus: 'active' };
       

        // Perform the promotion
        const result = await Student.updateMany(
            query,
            { $set: { class: toClass } }
        );

        res.status(200).json({
            message: `Successfully promoted ${result.modifiedCount} students from Class ${fromClass} to ${toClass}`,
            count: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ message: "Promotion Failed", error: error.message });
    }
};


//Settings Section

const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            // Create default settings if they don't exist yet
            settings = await Settings.create({});
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update Global Settings
// @route   PUT /api/admin/settings
const updateSettings = async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate(
            {}, // Empty filter finds the first/only document
            { $set: req.body },
            { new: true, upsert: true }
        );
        res.status(200).json({ message: "Settings Updated Successfully", settings });
    } catch (error) {
        res.status(500).json({ message: "Update Failed" });
    }
};



const massPromote = async (req, res) => {
    try {
        const { nextYearLabel, failedStudentIds } = req.body; // Array of IDs unchecked in UI

        const settings = await Settings.findOne();

        // If the Admin tries to promote to a year that was already processed
        if (settings.lastPromotedYear === nextYearLabel) {
            return res.status(400).json({ 
                message: `Error: Promotion to ${nextYearLabel} has already been completed. You cannot promote twice to the same year.` 
            });
        }

        const currentYear = settings.currentAcademicYear;
        const students = await Student.find({ accountStatus: 'active' });

        const bulkOps = students.map(student => {
        const isFailed = failedStudentIds.includes(student._id.toString());
        const oldClass = student.class;
        
        // Logic for Next Class
        let nextClass = isFailed ? oldClass : PROMOTION_MAP[oldClass];

        // STEP C: Record history
        const historyEntry = {
            year: currentYear,
            class: oldClass,
            status: isFailed ? 'Repeated' : (nextClass === 'Graduated' ? 'Graduated' : 'Promoted')
        };

        // --- THE FIX: Include admissionType reset in the $set block ---
        let updateData = { 
            $push: { academicHistory: historyEntry },
            $set: {
                admissionType: 'Old' // EVERYONE becomes 'Old' for the new session
            }
        };

        if (!isFailed && nextClass === 'Graduated') {
            updateData.$set.accountStatus = 'graduated';
        } else {
            updateData.$set.class = nextClass;
        }

        return {
            updateOne: {
                filter: { _id: student._id },
                update: updateData
            }
        };
    });

    // Execute the bulk update
    await Student.bulkWrite(bulkOps);

        settings.lastPromotedYear = nextYearLabel;
        await settings.save();

        res.status(200).json({ message: "Annual Transition Complete with Exceptions." });
    } catch (error) {
        res.status(500).json({ message: "Promotion Error", error: error.message });
    }
};



// @desc    Admin directly adds a student with UID and default password
// @route   POST /api/admin/students
// @access  Private (Admin)
const addStudent = async (req, res) => {
    try {
        const {
            name, dateOfBirth, gender, class: studentClass, address,
            pincode, category,
            fatherName, fatherMobile, motherName, motherMobile,
            guardianName, guardianMobile,
            parentEmail,
            profileImage: rawProfileImage,
            aadharNumber, penNumber, fatherQualification, siblingName,
            admissionType, documents, academicYear,
            UID, password
        } = req.body;

        // Required fields validation
        if (!name || !dateOfBirth || !gender || !studentClass || !address || !pincode || !category || !parentEmail) {
            return res.status(400).json({
                message: "Please fill all required fields: Name, DOB, Gender, Class, Address, Pincode, Category, and Email"
            });
        }

        if (!UID) {
            return res.status(400).json({ message: "UID is required when admin adds a student." });
        }

        const finalPassword = password && password.trim() !== "" ? password : "Student@123";

        // Check for duplicate UID
        const uidExists = await Student.findOne({ UID });
        if (uidExists) {
            return res.status(400).json({ message: "This UID is already assigned to another student." });
        }

        // Either parents OR guardian required
        const hasParents = fatherName || motherName;
        const hasGuardian = guardianName;
        if (!hasParents && !hasGuardian) {
            return res.status(400).json({
                message: "Please provide either parent information or guardian information"
            });
        }

        // Validate pincode
        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({ message: "Pincode must be exactly 6 digits" });
        }

        // Validate category
        const validCategories = ['General', 'OBC', 'SC', 'ST', 'Minority', 'Other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ message: "Invalid category." });
        }

        let profileImageUrl = "";
        if (rawProfileImage && rawProfileImage.startsWith('data:image')) {
            try {
                const cloudinary = require('../config/cloudinary');
                const uploadResult = await cloudinary.uploader.upload(rawProfileImage, {
                    folder: 'spps/profiles',
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' }
                    ]
                });
                profileImageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("Profile photo upload failed:", uploadError.message);
                profileImageUrl = "";
            }
        }

        const Settings = require('../models/Settings');
        const settings = await Settings.findOne();
        const currentYear = settings ? settings.currentAcademicYear : new Date().getFullYear() + "-" + (new Date().getFullYear() + 1);

        const newStudent = await Student.create({
            name,
            dateOfBirth,
            gender,
            class: studentClass,
            address,
            pincode,
            category,
            fatherName: fatherName || "",
            fatherMobile: fatherMobile || "",
            motherName: motherName || "",
            motherMobile: motherMobile || "",
            guardianName: guardianName || "",
            guardianMobile: guardianMobile || "",
            parentEmail,
            profileImage: profileImageUrl,
            aadharNumber: aadharNumber || "",
            penNumber: penNumber || "",
            fatherQualification: fatherQualification || "",
            siblingName: siblingName || "",
            admissionType: admissionType || 'New',
            documents: documents || {},
            academicYear: academicYear || currentYear,
            UID,
            password: finalPassword,
            accountStatus: 'active',
            admissionDate: Date.now()
        });

        res.status(201).json({
            message: `Student ${newStudent.name} added successfully!`,
            student: {
                _id: newStudent._id,
                name: newStudent.name,
                UID: newStudent.UID,
                class: newStudent.class,
                defaultPassword: finalPassword
            }
        });

    } catch (error) {
        console.error("❌ Add Student Error:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: "Validation failed", errors: messages });
        }
        res.status(500).json({ message: "Server error while adding student", error: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { userId, role, newPassword } = req.body;

        if (!userId || !role || !newPassword) {
            return res.status(400).json({ message: "UserId, Role and New Password are required" });
        }

        let Model;
        if (role === 'student') Model = require('../models/Student');
        else if (role === 'teacher') Model = require('../models/Teacher');
        else return res.status(400).json({ message: "Invalid role provided" });

        const user = await Model.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update the password - the pre-save hook in your models will automatically hash this
        user.password = newPassword;
        await user.save();

        res.status(200).json({ 
            message: `Password for ${user.name} has been updated successfully.` 
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};



module.exports = { 
    getPendingStudents, 
    approveStudent, 
    addTeacher, 
    getAllTeachers, 
    updateTeacher, 
    deleteTeacher,
    getAllStudents, 
    updateStudent,   
    deleteStudent,  
    bulkUploadStudents,
    promoteStudents,
    getSettings,
    updateSettings,
    massPromote,
    resetPassword,
    addStudent,
};

