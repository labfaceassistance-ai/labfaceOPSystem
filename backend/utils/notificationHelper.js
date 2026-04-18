const templates = {
    excuse_approved: {
        student: {
            title: '✅ Absence Excused',
            message: (className, reason) =>
                `Your absence in ${className} has been excused. Reason: ${reason}`,
            type: 'success',
            category: 'attendance'
        }
    },
    late_threshold: {
        student: {
            title: '⚠️ Late Attendance Alert',
            message: (className, lateCount) =>
                `You have ${lateCount} late arrivals in ${className}. 3 lates = 1 absence.`,
            type: 'warning',
            category: 'attendance'
        },
        professor: {
            title: '📊 Student Late Pattern',
            message: (studentName, className, lateCount) =>
                `${studentName} has ${lateCount} late arrivals in ${className}.`,
            type: 'info',
            category: 'attendance'
        }
    },
    absence_warning: {
        student: {
            title: '🚨 Attendance Warning — 2nd Absence',
            message: (className, equivalent, excusedCount) =>
                `⚠️ You have ${equivalent} consecutive absences in ${className}. ${excusedCount > 0 ? `(${excusedCount} excused) ` : ''}One more absence will trigger a DROPOUT WARNING. Please inform your class professor as soon as possible.`,
            type: 'error',
            category: 'attendance'
        },
        professor: {
            title: '🚨 Student At Risk — 2nd Absence',
            message: (studentName, className, equivalent) =>
                `${studentName} now has ${equivalent} absences in ${className}. They are at risk of a dropout warning on the next absence. Please reach out to this student.`,
            type: 'warning',
            category: 'attendance'
        }
    },
    dropout_warning: {
        student: {
            title: '🔴 DROPOUT WARNING — 3rd Absence',
            message: (className, equivalent) =>
                `🚨 URGENT: You have ${equivalent} consecutive absences in ${className}. If you are not reported to your adviser, you may be DROPPED from this subject. Contact your professor AND adviser immediately.`,
            type: 'error',
            category: 'attendance'
        },
        professor: {
            title: '🔴 DROPOUT WARNING ISSUED',
            message: (studentName, className, equivalent) =>
                `${studentName} has reached ${equivalent} absences in ${className}. A dropout warning has been issued. Please coordinate with the student's adviser as they may be dropped from the subject.`,
            type: 'error',
            category: 'attendance'
        }
    }
};

module.exports = { templates };
