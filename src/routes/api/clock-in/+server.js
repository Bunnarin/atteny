import { GoogleSpreadsheet } from 'google-spreadsheet';
import { OAuth2Client } from 'google-auth-library';
import { PUBLIC_GOOGLE_CLIENT_ID} from '$env/static/public';
import { GOOGLE_CLIENT_SECRET } from '$env/static/private';

const oauthClient = new OAuth2Client({
    clientId: PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
  });

export async function POST({ request, locals }) {
    try {
        oauthClient.credentials.access_token = locals.user.google_access_token;
        oauthClient.credentials.refresh_token = locals.user.google_refresh_token;
        const { file_id } = await request.json();
        const doc = new GoogleSpreadsheet(file_id, oauthClient);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.setHeaderRow(['Date', 'Time', 'Name'])
        .then(() => sheet.addRow([new Date(), new Date().toLocaleTimeString(), locals.user.full_name]));
        return new Response(JSON.stringify({ message: 'Clock-in successful' }));
    } catch (error) {
        console.error('Clock-in logging error:', error);
        return new Response(JSON.stringify({ error: 'Clock-in failed' }), { status: 500 });
    }
}

