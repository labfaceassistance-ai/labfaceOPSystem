// Philippine Holidays Configuration
// This file contains the list of Philippine national holidays
// Update this list annually to reflect the current year's holidays

const holidays2026 = {
    '2026-01-01': 'New Year\'s Day',
    '2026-04-09': 'Araw ng Kagitingan (Day of Valor)',
    '2026-04-17': 'Maundy Thursday',
    '2026-04-18': 'Good Friday',
    '2026-05-01': 'Labor Day',
    '2026-06-12': 'Independence Day',
    '2026-08-31': 'National Heroes Day',
    '2026-11-30': 'Bonifacio Day',
    '2026-12-25': 'Christmas Day',
    '2026-12-30': 'Rizal Day'
};

/**
 * Check if a given date is a Philippine holiday
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string|null} - Holiday name if it's a holiday, null otherwise
 */
function isHoliday(dateStr) {
    return holidays2026[dateStr] || null;
}

/**
 * Get all holidays for the current year
 * @returns {Object} - Object with date strings as keys and holiday names as values
 */
function getAllHolidays() {
    return holidays2026;
}

module.exports = {
    holidays2026,
    isHoliday,
    getAllHolidays
};
