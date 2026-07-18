const Student = require('../models/Student');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');

const registerStudent = async (req, res) => {
    try {
        const {
            name, dateOfBirth, gender, class: studentClass,
            section, bloodGroup, category,
            // Address
            address, city, district, state, pincode,
            permanentAddressSameAsResidential,
            permanentAddress, permanentCity, permanentDistrict, permanentState, permanentPincode,
            // Parents
            fatherName, fatherMobile, fatherOccupation, fatherAadharNumber,
            motherName, motherMobile, motherOccupation, motherAadharNumber,
            // Guardian
            guardianName, guardianMobile, guardianRelation, guardianOccupation,
            // Contact
            parentEmail, whatsappNumber,
            // Previous School
            previousSchoolName, previousSchoolClass, previousSchoolYear,
            // Transport
            transportRequired, transportMode, transportRoute,
            // Extra
            profileImage: rawProfileImage, aadharNumber, penNumber,
            fatherQualification, siblingName,
            admissionType, documents, academicYear
        } = req.body;

        // Required fields validation
        if (!name || !dateOfBirth || !gender || !studentClass || !address || !pincode || !category) {
            return res.status(400).json({
                message: "Please fill all required fields: Name, DOB, Gender, Class, Address, Pincode, Category"
            });
        }

        // Either parents OR guardian must be provided
        const hasParents = fatherName || motherName;
        const hasGuardian = guardianName;
        if (!hasParents && !hasGuardian) {
            return res.status(400).json({
                message: "Please provide either parent information or guardian information"
            });
        }

        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({ message: "Pincode must be exactly 6 digits" });
        }

        const validCategories = ['General', 'OBC', 'SC', 'ST', 'Minority', 'Other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ message: "Invalid category." });
        }

        let profileImageUrl = "";
        if (rawProfileImage && rawProfileImage.startsWith('data:image')) {
            try {
                const uploadResult = await cloudinary.uploader.upload(rawProfileImage, {
                    folder: 'spps/profiles',
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' }
                    ]
                });
                profileImageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("Registration photo upload failed:", uploadError.message);
                profileImageUrl = "";
            }
        }

        // Auto-link bus route if transport required
        let busRouteId = null;
        if (transportRequired && transportRoute) {
            const BusRoute = require('../models/BusRoute');
            const matchedRoute = await BusRoute.findOne({
                routeName: { $regex: new RegExp(transportRoute.trim(), 'i') }
            });
            if (matchedRoute) {
                busRouteId = matchedRoute._id;
            } else {
                const routeByStop = await BusRoute.findOne({
                    stops: { $elemMatch: { $regex: new RegExp(transportRoute.trim(), 'i') } }
                });
                if (routeByStop) busRouteId = routeByStop._id;
            }
        }

        const newStudent = await Student.create({
            name, dateOfBirth, gender,
            class: studentClass,
            section: section || "",
            bloodGroup: bloodGroup || "",
            category,
            // Address
            address,
            city: city || "",
            district: district || "",
            state: state || "",
            pincode,
            permanentAddressSameAsResidential: permanentAddressSameAsResidential !== false,
            permanentAddress: permanentAddress || "",
            permanentCity: permanentCity || "",
            permanentDistrict: permanentDistrict || "",
            permanentState: permanentState || "",
            permanentPincode: permanentPincode || "",
            // Parents
            fatherName: fatherName || "",
            fatherMobile: fatherMobile || "",
            fatherOccupation: fatherOccupation || "",
            fatherAadharNumber: fatherAadharNumber || "",
            motherName: motherName || "",
            motherMobile: motherMobile || "",
            motherOccupation: motherOccupation || "",
            motherAadharNumber: motherAadharNumber || "",
            // Guardian
            guardianName: guardianName || "",
            guardianMobile: guardianMobile || "",
            guardianRelation: guardianRelation || "",
            guardianOccupation: guardianOccupation || "",
            // Contact
            parentEmail,
            whatsappNumber: whatsappNumber || "",
            // Previous School
            previousSchoolName: previousSchoolName || "",
            previousSchoolClass: previousSchoolClass || "",
            previousSchoolYear: previousSchoolYear || "",
            // Transport
            transportRequired: transportRequired || false,
            transportMode: transportMode || "",
            transportRoute: transportRoute || "",
            busRoute: busRouteId,
            // Extra
            profileImage: profileImageUrl,
            aadharNumber: aadharNumber || "",
            penNumber: penNumber || "",
            fatherQualification: fatherQualification || "",
            siblingName: siblingName || "",
            admissionType: admissionType || 'New',
            documents: documents || {},
            academicYear: academicYear || "",
            accountStatus: 'pending'
        });

        await Notification.create({
            recipientRole: 'admin',
            title: 'New Admission',
            message: `New Application: ${newStudent.name} has applied for Class ${newStudent.class}.`,
            link: '/admin/students'
        });

        res.status(201).json({
            message: "Application submitted successfully! Awaiting admin approval.",
            student: newStudent
        });

    } catch (error) {
        console.error("❌ Registration Error:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: "Validation failed", errors: messages });
        }
        res.status(500).json({ message: "Registration failed due to server error", error: error.message });
    }
};

module.exports = { registerStudent };
