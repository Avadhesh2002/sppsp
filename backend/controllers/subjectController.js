const Subject = require('../models/Subject');

// @desc    Create a new Subject
const createSubject = async (req, res) => {
    try {
        const subject = await Subject.create(req.body);
        res.status(201).json(subject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get subjects by class level
const getSubjectsByClass = async (req, res) => {
    try {
        const { className } = req.params;
        const subjects = await Subject.find({ applicableClasses: className });
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get all subjects in the system
const getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const deleteSubject = async (req, res) => {
    try {
        const subjectId = req.params.id;

        // 1. Verify existence
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // 2. CLEANUP: Delete all Teacher Assignments linked to this subject
        // This prevents the "Ghost Subject" bug in the Teacher Portal
        const TeacherAssignment = require('../models/TeacherAssignment');
        await TeacherAssignment.deleteMany({ subjectId: subjectId });

        // 3. Final Deletion
        await Subject.findByIdAndDelete(subjectId);

        res.status(200).json({ 
            message: `Subject ${subject.subjectName} and its linked assignments removed.` 
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


const updateSubject = async (req, res) => {
    try {
        const { subjectName, applicableClasses, maxMarks } = req.body;

        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ message: "Subject not found" });

        const updatedSubject = await Subject.findByIdAndUpdate(
            req.params.id,
            { $set: { subjectName, applicableClasses, maxMarks } },
            { new: true, runValidators: false }
        );

        res.status(200).json({ message: "Subject updated successfully", updatedSubject });
    } catch (error) {
        res.status(500).json({ message: "Update Failed", error: error.message });
    }
};



module.exports = { createSubject, getSubjectsByClass, getAllSubjects, deleteSubject, updateSubject };