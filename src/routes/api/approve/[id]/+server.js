import { GoogleSpreadsheet } from 'google-spreadsheet';
import { OAuth2Client } from 'google-auth-library';
import { PUBLIC_GOOGLE_CLIENT_ID} from '$env/static/public';
import { GOOGLE_CLIENT_SECRET } from '$env/static/private';

const oauthClient = new OAuth2Client({
    clientId: PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
  });

export const POST = async ({ locals, params }) => {
    // get the employer's credential
    const request = await locals.pb.collection('request').getOne(params.id, {
        expand: "createdBy, workplace.employer"
    });
    const workspace = request.expand.workplace;
    oauthClient.credentials.refresh_token = workspace.expand.employer.google_refresh_token;
    const doc = new GoogleSpreadsheet(workspace.file_id, oauthClient);
    await doc.loadInfo();
    const log = [request.date.slice(0, 10), "P", request.expand.createdBy.full_name];
    let sheet = doc.sheetsByTitle[workspace.name + ' log'];
    if (!sheet) sheet = await doc.addSheet({ title: `${workspace.name} log`, headerValues: ['Date', 'Time', 'Name'] });
    sheet.addRow(log);
    // delete the request
    await locals.pb.collection('request').delete(params.id);
    return new Response(JSON.stringify({ message: 'Request approved successfully' }));
}