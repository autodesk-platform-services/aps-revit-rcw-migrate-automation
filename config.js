require('dotenv').config();

let { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, APS_WEBHOOK_URL, SERVER_SESSION_SECRET, APS_AUTOMATION_NICKNAME, APS_AUTOMATION_ALIAS, APS_AUTOMATION_ACTIVITY_NAME, APS_AUTOMATION_ACTIVITY_ALIAS, PORT } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_CALLBACK_URL || !APS_WEBHOOK_URL || !SERVER_SESSION_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
PORT = PORT || 3000;

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_CALLBACK_URL,
    APS_WEBHOOK_URL,
    SERVER_SESSION_SECRET,
    PORT,
    // optional variables
    APS_AUTOMATION_NICKNAME,
    APS_AUTOMATION_ALIAS,
    APS_AUTOMATION_ACTIVITY_NAME,

    // Design Automation client settings
    APS_AUTOMATION_CLIENT_SETTINGS: {
        circuitBreaker: {
			threshold: 11,
			interval: 1200
		},
		retry: {
			maxNumberOfRetries: 7,
			backoffDelay: 4000,
			backoffPolicy: 'exponentialBackoffWithJitter'
		},
		requestTimeout: 25000
    }
};
