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
            title: '🚨 Attendance Warning',
            message: (className, equivalent, excusedCount) =>
                `Critical: You have ${equivalent} absences in ${className}. ${excusedCount > 0 ? `(${excusedCount} excused)` : ''} One more = dropout warning!`,
            type: 'error',
            category: 'attendance'
        },
        professor: {
            title: '🚨 Student At Risk',
            message: (studentName, className, equivalent) =>
                `${studentName} has ${equivalent} absences in ${className}. At risk of dropout warning.`,
            type: 'warning',
            category: 'attendance'
        }
    },
    dropout_warning: {
        student: {
            title: '🔴 DROPOUT WARNING',
            message: (className, equivalent) =>
                `URGENT: You have ${equivalent} absences in ${className}. Please contact your professor immediately.`,
            type: 'error',
            category: 'attendance'
        },
        professor: {
            title: '🔴 DROPOUT WARNING ISSUED',
            message: (studentName, className, equivalent) =>
                `${studentName} has reached ${equivalent} absences in ${className}. Dropout warning issued.`,
            type: 'error',
            category: 'attendance'
        }
    }
};

module.exports = { templates };
