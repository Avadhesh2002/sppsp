const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    subjectName: { type: String, required: true },
    subjectCode: { type: String, required: true, unique: true }, // e.g., MATH101
    // Which classes can take this subject?
        applicableClasses: [{ 
        type: String, 
        enum: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    }],
    maxMarks: { type: Number, default: 100 }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
