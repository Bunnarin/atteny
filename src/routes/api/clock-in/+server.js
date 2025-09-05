import { GoogleSpreadsheet } from 'google-spreadsheet';
import { OAuth2Client } from 'google-auth-library';
import { PUBLIC_GOOGLE_CLIENT_ID} from '$env/static/public';
import { GOOGLE_CLIENT_SECRET } from '$env/static/private';

const oauthClient = new OAuth2Client({
    clientId: PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
  });

export const POST = async ({ request, locals }) => {
    try {
        // get the timezone
        const { file_id, name, employer, workplace_id } = await request.json();

        // Get workplace rules for time validation
        const workplace = await locals.pb.collection('workplace').getOne(workplace_id);

        // Check time restrictions
        if (workplace.rules && workplace.rules.length > 0) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            const isWithinTimeWindow = workplace.rules.some(rule => {
                const startTime = rule.start.split(':').map(Number);
                const endTime = rule.end.split(':').map(Number);
                const startMinutes = startTime[0] * 60 + startTime[1];
                const endMinutes = endTime[0] * 60 + endTime[1];

                if (startMinutes <= endMinutes) {
                    // Same day window
                    return currentTime >= startMinutes && currentTime <= endMinutes;
                } else {
                    // Overnight window
                    return currentTime >= startMinutes || currentTime <= endMinutes;
                }
            });

            if (!isWithinTimeWindow) {
                return new Response(JSON.stringify({ error: 'Clock-in is not allowed at this time. Please check your workplace time rules.' }), { status: 403 });
            }
        }
        oauthClient.credentials.access_token = employer.google_access_token;
        oauthClient.credentials.refresh_token = employer.google_refresh_token;
        // force expire to avoid the real expiration since I dont store it
        oauthClient.credentials.expiry_date = Date.now();
        
        const doc = new GoogleSpreadsheet(file_id, oauthClient);
        await doc.loadInfo();
        const timestamp = new Date().toLocaleString("sv", {timeZone: doc.timeZone});
        const log = [timestamp.slice(0, 10), timestamp.slice(11, 16), locals.user.full_name];
        let sheet = doc.sheetsByTitle[name + ' log'];
        if (!sheet) sheet = await doc.addSheet({ title: `${name} log`, headerValues: ['Date', 'Time', 'Name'] });
        sheet.addRow(log);
        return new Response(JSON.stringify({ message: 'Clock-in successful' }));
    } catch (error) {
        console.error('Clock-in logging error:', error);
        return new Response(JSON.stringify({ error: 'Clock-in failed' }), { status: 500 });
    }
}

