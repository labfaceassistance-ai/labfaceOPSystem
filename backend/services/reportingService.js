const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * Reporting Service
 * Generates various reports in multiple formats
 */
class ReportingService {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        // Ensure reports directory exists
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    /**
     * Generate attendance report
     */
    async generateAttendanceReport(options) {
        const { startDate, endDate, courseId, format = 'pdf', userId } = options;

        try {
            // Fetch attendance data
            let query = `
                SELECT 
                    al.id,
                    al.timestamp,
                    CONCAT(u.first_name, ' ', u.last_name) as student_name,
                    u.student_id,
                    c.course_code,
                    c.course_name,
                    s.session_name,
                    al.status,
                    al.confidence
                FROM attendance_logs al
                JOIN users u ON al.student_id = u.id
                JOIN sessions s ON al.session_id = s.id
                JOIN courses c ON s.course_id = c.id
                WHERE DATE(al.timestamp) BETWEEN ? AND ?
            `;

            const params = [startDate, endDate];

            if (courseId) {
                query += ' AND c.id = ?';
                params.push(courseId);
            }

            query += ' ORDER BY al.timestamp DESC';

            const [data] = await pool.query(query, params);

            // Generate report based on format
            let filePath;
            if (format === 'pdf') {
                filePath = await this.generatePDF(data, 'Attendance Report', startDate, endDate);
            } else if (format === 'excel') {
                filePath = await this.generateExcel(data, 'Attendance Report');
            } else if (format === 'csv') {
                filePath = await this.generateCSV(data, 'Attendance Report');
            }

            // Save report record
            const fileName = path.basename(filePath);
            const fileSize = fs.statSync(filePath).size;

            await pool.query(
                `INSERT INTO reports (report_type, report_name, parameters, file_path, file_size, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['attendance', fileName, JSON.stringify(options), filePath, fileSize, userId]
            );

            return { filePath, fileName, recordCount: data.length };
        } catch (error) {
            console.error('Error generating attendance report:', error);
            throw error;
        }
    }

    /**
     * Generate PDF report
     */
    async generatePDF(data, title, startDate, endDate) {
        return new Promise((resolve, reject) => {
            const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            const filePath = path.join(this.reportsDir, fileName);
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // Header
            doc.fontSize(20).text(title, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
            doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(2);

            // Summary
            doc.fontSize(14).text('Summary', { underline: true });
            doc.fontSize(10).text(`Total Records: ${data.length}`);
            doc.moveDown();

            // Table header
            doc.fontSize(12).text('Attendance Records', { underline: true });
            doc.moveDown();

            // Simple table
            doc.fontSize(8);
            const tableTop = doc.y;
            const itemHeight = 20;

            // Headers
            doc.text('Date', 50, tableTop);
            doc.text('Student', 120, tableTop);
            doc.text('Course', 220, tableTop);
            doc.text('Session', 320, tableTop);
            doc.text('Status', 420, tableTop);
            doc.text('Confidence', 480, tableTop);

            // Draw line
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            // Data rows
            let y = tableTop + 20;
            data.slice(0, 50).forEach((record, i) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }

                const date = new Date(record.timestamp).toLocaleDateString();
                doc.text(date, 50, y);
                doc.text(record.student_name.substring(0, 15), 120, y);
                doc.text(record.course_code, 220, y);
                doc.text(record.session_name?.substring(0, 15) || 'N/A', 320, y);
                doc.text(record.status, 420, y);
                doc.text((record.confidence * 100).toFixed(1) + '%', 480, y);

                y += itemHeight;
            });

            if (data.length > 50) {
                doc.moveDown(2);
                doc.fontSize(10).text(`... and ${data.length - 50} more records`, { align: 'center' });
            }

            // Footer
            doc.fontSize(8).text(
                `LabFace Attendance System - Page ${doc.bufferedPageRange().count}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        });
    }

    /**
     * Generate Excel report
     */
    async generateExcel(data, title) {
        const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
        const filePath = path.join(this.reportsDir, fileName);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        // Add title
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').value = title;
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add headers
        worksheet.addRow([]);
        const headerRow = worksheet.addRow([
            'Date',
            'Time',
            'Student ID',
            'Student Name',
            'Course',
            'Session',
            'Status',
            'Confidence'
        ]);

        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data
        data.forEach(record => {
            const date = new Date(record.timestamp);
            worksheet.addRow([
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                record.student_id,
                record.student_name,
                record.course_code,
                record.session_name || 'N/A',
                record.status,
                record.confidence ? (record.confidence * 100).toFixed(2) + '%' : 'N/A'
            ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        await workbook.xlsx.writeFile(filePath);
        return filePath;
    }

    /**
     * Generate CSV report
     */
    async generateCSV(data, title) {
        const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
        const filePath = path.join(this.reportsDir, fileName);

        const headers = ['Date', 'Time', 'Student ID', 'Student Name', 'Course', 'Session', 'Status', 'Confidence'];
        const rows = data.map(record => {
            const date = new Date(record.timestamp);
            return [
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                record.student_id,
                `"${record.student_name}"`,
                record.course_code,
                `"${record.session_name || 'N/A'}"`,
                record.status,
                record.confidence ? (record.confidence * 100).toFixed(2) + '%' : 'N/A'
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        fs.writeFileSync(filePath, csv);

        return filePath;
    }

    /**
     * Get report by ID
     */
    async getReport(reportId) {
        try {
            const [reports] = await pool.query(
                'SELECT * FROM reports WHERE id = ?',
                [reportId]
            );

            return reports[0] || null;
        } catch (error) {
            console.error('Error getting report:', error);
            throw error;
        }
    }

    /**
     * Get user's reports
     */
    async getUserReports(userId, limit = 10) {
        try {
            const [reports] = await pool.query(
                `SELECT * FROM reports 
                 WHERE created_by = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [userId, limit]
            );

            return reports;
        } catch (error) {
            console.error('Error getting user reports:', error);
            throw error;
        }
    }

    /**
     * Delete old reports (cleanup)
     */
    async deleteOldReports(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const [reports] = await pool.query(
                'SELECT file_path FROM reports WHERE created_at < ?',
                [cutoffDate]
            );

            // Delete files
            reports.forEach(report => {
                if (fs.existsSync(report.file_path)) {
                    fs.unlinkSync(report.file_path);
                }
            });

            // Delete records
            await pool.query('DELETE FROM reports WHERE created_at < ?', [cutoffDate]);

            return reports.length;
        } catch (error) {
            console.error('Error deleting old reports:', error);
            throw error;
        }
    }
}

module.exports = new ReportingService();
