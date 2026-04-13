/**
 * Philippines public holiday checker.
 * Returns the holiday name if the date is a public holiday, otherwise null.
 *
 * Source: Proclamation No. 727 (2024 regular + special non-working days)
 * Update this list annually or integrate with a live holiday API.
 */

const PH_HOLIDAYS_2024 = {
    '2024-01-01': "New Year's Day",
    '2024-02-10': 'Chinese New Year',
    '2024-02-25': 'EDSA People Power Revolution Anniversary',
    '2024-03-28': 'Maundy Thursday',
    '2024-03-29': 'Good Friday',
    '2024-03-30': 'Black Saturday',
    '2024-04-09': 'Araw ng Kagitingan (Day of Valor)',
    '2024-05-01': 'Labor Day',
    '2024-06-12': 'Independence Day',
    '2024-08-21': 'Ninoy Aquino Day',
    '2024-08-26': 'National Heroes Day',
    '2024-11-01': "All Saints' Day",
    '2024-11-02': "All Souls' Day",
    '2024-11-30': 'Bonifacio Day',
    '2024-12-08': 'Feast of the Immaculate Conception',
    '2024-12-24': 'Christmas Eve',
    '2024-12-25': 'Christmas Day',
    '2024-12-30': 'Rizal Day',
    '2024-12-31': "New Year's Eve",
};

const PH_HOLIDAYS_2025 = {
    '2025-01-01': "New Year's Day",
    '2025-01-29': 'Chinese New Year',
    '2025-02-25': 'EDSA People Power Revolution Anniversary',
    '2025-04-09': 'Araw ng Kagitingan (Day of Valor)',
    '2025-04-17': 'Maundy Thursday',
    '2025-04-18': 'Good Friday',
    '2025-04-19': 'Black Saturday',
    '2025-05-01': 'Labor Day',
    '2025-06-12': 'Independence Day',
    '2025-08-21': 'Ninoy Aquino Day',
    '2025-08-25': 'National Heroes Day',
    '2025-11-01': "All Saints' Day",
    '2025-11-02': "All Souls' Day",
    '2025-11-30': 'Bonifacio Day',
    '2025-12-08': 'Feast of the Immaculate Conception',
    '2025-12-24': 'Christmas Eve',
    '2025-12-25': 'Christmas Day',
    '2025-12-30': 'Rizal Day',
    '2025-12-31': "New Year's Eve",
};

const ALL_HOLIDAYS = {
    ...PH_HOLIDAYS_2024,
    ...PH_HOLIDAYS_2025,
};

/**
 * Check if a date string (YYYY-MM-DD) is a Philippine public holiday.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string|null} The holiday name, or null if not a holiday.
 */
function isHoliday(dateStr) {
    return ALL_HOLIDAYS[dateStr] ?? null;
}

/**
 * Get all holidays for a given year.
 * @param {number} year
 * @returns {Record<string, string>}
 */
function getHolidaysForYear(year) {
    return Object.fromEntries(
        Object.entries(ALL_HOLIDAYS).filter(([date]) => date.startsWith(`${year}-`))
    );
}

module.exports = { isHoliday, getHolidaysForYear };
