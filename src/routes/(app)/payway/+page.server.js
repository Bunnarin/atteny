import { PUBLIC_MERCHANT_ID, PUBLIC_PAYWAY_ENDPOINT, PUBLIC_PAYOUT_ACCOUNT } from '$env/static/public';
import { PAYWAY_KEY, RSA_PUBLIC_KEY } from '$env/static/private';
import { createHmac } from 'crypto';

export const actions = {
    default: async ({ url, request }) => {
        const formData = await request.formData();
        const amount = formData.get('amount');
        const req_time = Math.floor(Date.now() / 1000).toString();
        const merchant_id = PUBLIC_MERCHANT_ID;
        const tran_id = req_time;
        const payment_option = 'cards';
        const view_type = "hosted_view";

        const hashStr = req_time + merchant_id + tran_id + amount + payment_option;
        const hash = createHmac('sha512', PAYWAY_KEY).update(hashStr).digest('base64');

        return {
            hash,
            tran_id,
            amount,
            merchant_id,
            req_time,
            payment_option,
            view_type
        };
    }
}