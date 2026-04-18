const mysql = require('mysql2/promise');

async function testResolution() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'labface'
    });

    try {
        const userId = '20210001'; // Mock school ID
        console.log(`Testing resolution for ID: ${userId}`);

        // Mocking the query logic I added to routes
        const [profUsers] = await pool.query(
            'SELECT id FROM users WHERE user_id = ? OR REPLACE(user_id, "-", "") = ? OR id = ?', 
            [userId, userId.toString().replace(/-/g, ''), isNaN(userId) ? -1 : userId]
        );

        console.log('Results:', profUsers);
        if (profUsers.length > 0) {
            console.log('SUCCESS: Resolved to PK', profUsers[0].id);
        } else {
            console.log('FAILURE: User not found. (Check if 20210001 exists in your DB)');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

testResolution();
