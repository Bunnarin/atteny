import { PUBLIC_MERCHANT_ID, PUBLIC_UNIT_PRICE, PUBLIC_PAYOUT_ACCOUNT } from '$env/static/public';
import { PAYWAY_KEY, RSA_PUBLIC_KEY } from '$env/static/private';
import { createHmac } from 'crypto';

export const actions = {
    default: async ({ url, request, locals }) => {
        const formData = await request.formData();
        const amount = formData.get('amount') * PUBLIC_UNIT_PRICE;
        const req_time = Math.floor(Date.now() / 1000).toString();
        const merchant_id = PUBLIC_MERCHANT_ID;
        const tran_id = req_time;
        const email = locals.user.email;
        const return_url = url.origin + '/payway/webhook';

        const hashStr = req_time + merchant_id + tran_id + amount + email + return_url;
        const hash = createHmac('sha512', PAYWAY_KEY).update(hashStr).digest('base64');

        return {
            hash,
            tran_id,
            amount,
            merchant_id,
            req_time,
            email,
            return_url,
        };
    }
}