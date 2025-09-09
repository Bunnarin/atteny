import { PUBLIC_MERCHANT_ID, PUBLIC_PAYWAY_ENDPOINT, PUBLIC_PAYOUT_ACCOUNT } from '$env/static/public';
import { PAYWAY_KEY, RSA_PUBLIC_KEY } from '$env/static/private';
import { createHmac } from 'crypto';

export const actions = {
    default: async ({ url, request }) => {
        const formData = await request.formData();
        const amount = formData.get('amount');
        const req_time = Math.floor(Date.now() / 1000).toString();
        const merchant_id = PUBLIC_MERCHANT_ID;
        const transactionId = req_time;


        const hashStr = req_time + merchant_id + transactionId + amount;
        console.table({ amount, req_time, merchant_id, hashStr, PAYWAY_KEY });

        const hash = createHmac('sha512', PAYWAY_KEY).update(hashStr).digest('base64');

        return {
            hash,
            tran_id: transactionId,
            amount,
            merchant_id,
            req_time
        };
    }
}