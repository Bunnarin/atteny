import {PUBLIC_UNIT_PRICE} from '$env/static/public';

export const POST = async ({ request, locals }) => {
    const data = await request.json();
    if (data.status != '00') 
        return new Response(JSON.stringify({ success: false }));
    // update the user's free_spots
    const amount = data.amount / PUBLIC_UNIT_PRICE;
    locals.user = await locals.pb.collection('users').update(locals.user.id, {
        free_spots: locals.user.free_spots + amount
    });
    return new Response(JSON.stringify({ success: true }));
};
