import { PUBLIC_MERCHANT_ID, PUBLIC_PAYWAY_ENDPOINT, PUBLIC_PAYOUT_ACCOUNT } from '$env/static/public';
import { PAYWAY_KEY, RSA_PUBLIC_KEY } from '$env/static/private';
import { createHmac } from 'crypto';
import NodeRSA from 'node-rsa';


export const actions = {
    default: async ({ url, request }) => {
        // get the formdata
        const data = await request.formData();
        const amount = data.get('amount')?.toString();
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "multipart/form-data");

        // Define all form fields in a single object
        console.log(new Date().toLocaleString('sv').replace(/[\s:-]/g, ''));
        console.log(new Date().toISOString().replace(/[\s:T.-]/g, '').slice(0, 14));
        const formFields = {
            request_time: new Date().toISOString().replace(/[\s:T.-]/g, '').slice(0, 14),
            merchant_id: PUBLIC_MERCHANT_ID,
            merchant_auth: '',
            mc_id: PUBLIC_MERCHANT_ID,
            title: "employee",
            amount: amount,
            currency: "USD",
            payment_limit: 1,
            expired_date: null, 
            return_url: url.origin + '/payway/callback',
            payout: JSON.stringify({
                acc: PUBLIC_PAYOUT_ACCOUNT,
                amt: amount
            }),
            hash: ""
        };

        // Encrypt with RSA public key
        // extract these filed and create a object
        const mc_auth_obj = {};
        for (const field of [
            'mc_id', 'title', 'amount', 'currency', 'description', 'payment_limit', 'expired_date', 'return_url', 'merchant_ref_no', 'payout'
        ]) {
            mc_auth_obj[field] = formFields[field] || "";
        }
        const key = new NodeRSA();
        key.importKey(RSA_PUBLIC_KEY, 'public');
        formFields.merchant_auth = key.encrypt(JSON.stringify(mc_auth_obj), 'base64');

        // Create the hash string in the required order
        const hashString = [
            'request_time', 'merchant_id', 'merchant_auth'
        ].map(field => formFields[field] || '').join('');
        formFields.hash = createHmac('sha512', PAYWAY_KEY)
            .update(hashString)
            .digest('base64');

        // Convert to FormData
        const formData = new FormData();
        Object.entries(formFields).forEach(([key, value]) => {
            formData.append(key, value);
        });

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: formData,
            redirect: 'follow'
        };

        try {
            fetch(PUBLIC_PAYWAY_ENDPOINT, requestOptions)
                .then(response => response.text())
                .then(result => console.log(result));
        } catch (error) {
            console.error('Error:', error);
            return { error: error.message };
        }
    }
}