const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    className: { 
        type: String, 
        required: true, 
        unique: true, // ✅ ONLY className is unique
        enum: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    },
    capacity: { type: Number, default: 500 },
    classTeacher: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Teacher' 
    }
}, { timestamps: true });

// NEW INDEX: One unique class per academic year (e.g., only one 'Class 5' for 2024-2025)
classSchema.index({ className: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
