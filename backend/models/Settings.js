const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    schoolName: { type: String, default: "Sardar Patel Public School" },
    schoolSlogan: { type: String, default: "शिक्षार्थ आइए, सेवार्थ जाइए" },
    schoolAddress: { type: String, default: "Enter School Address" },
    contactNumber: { type: String, default: "0000000000" },
    schoolLogo: { type: String, default: "" },
    currentAcademicYear: { type: String, default: "2026-27" },
    isRegistrationOpen: { type: Boolean, default: true },
    // UPI Payment Settings
    upiId: { type: String, default: "" },
    upiName: { type: String, default: "" },
    upiQrCode: { type: String, default: "" },   // Base64 image of QR code
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
