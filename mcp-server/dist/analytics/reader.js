/**
 * CF7 Submission Analytics and Log Reader
 */
export class CF7AnalyticsReader {
    static async checkAnalytics(wpClient) {
        const conn = await wpClient.checkConnection();
        if (!conn.connected) {
            return {
                hasSubmissionStorage: false,
                notes: ['Cannot connect to WordPress REST API to check submission logs.']
            };
        }
        // By default, Contact Form 7 does not store submissions in the database unless Flamingo or a DB plugin is installed.
        return {
            hasSubmissionStorage: false,
            storageProvider: 'None',
            notes: [
                'Contact Form 7 core does not retain historical submission records in the WordPress database by default (it acts as a stateless mail dispatch pipeline).',
                'To enable submission analytics, install the official Flamingo plugin (by Takayuki Miyoshi) or Advanced CF7 DB.',
                'When Flamingo is active, submissions are saved to the wp_posts database table under the "flamingo_inbound" post type.'
            ]
        };
    }
}
