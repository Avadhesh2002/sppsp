const mongoose = require('mongoose');

const feeComponentSchema = new mongoose.Schema({
    name:      { type: String, required: true },
    amount:    { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: ['monthly','quarterly','annually','one-time'], default: 'monthly' },
    // For exam fees: which month they become due
    dueMonth:  { type: String, default: '' }, // e.g. 'October', 'February'
}, { _id: false });

const feeStructureSchema = new mongoose.Schema({
    className:     { type: String, required: true, enum: ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'] },
    admissionType: { type: String, required: true, enum: ['new','old'], default: 'old' },
    academicYear:  { type: String, required: true },
    feeComponents: [feeComponentSchema],
    totalAnnual:   { type: Number, default: 0 },
}, { timestamps: true });

feeStructureSchema.index({ className: 1, admissionType: 1, academicYear: 1 }, { unique: true });

feeStructureSchema.pre('save', function () {
    this.totalAnnual = this.feeComponents.reduce((sum, c) => {
        const mul = { monthly: 12, quarterly: 4, annually: 1, 'one-time': 1 }[c.frequency] || 1;
        return sum + c.amount * mul;
    }, 0);
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);