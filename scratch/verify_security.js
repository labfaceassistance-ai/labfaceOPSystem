const axios = require('axios');

const API_URL = 'https://www.labface.site/api/auth/register/professor';

async function testRegistration() {
    console.log('Testing public professor registration (should be blocked)...');
    try {
        const response = await axios.post(API_URL, {
            professorId: 'TEST-PROF',
            firstName: 'Test',
            lastName: 'Prof',
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('FAIL: Registration succeeded without admin token!');
        console.log(response.data);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('SUCCESS: Registration blocked with 401 (Unauthorized).');
        } else if (error.response && error.response.status === 403) {
            console.log('SUCCESS: Registration blocked with 403 (Forbidden).');
        } else {
            console.log('UNEXPECTED ERROR:', error.message);
            if (error.response) console.log('Status:', error.response.status);
        }
    }
}

testRegistration();
