export const POST = async ({ request, locals }) => {
    const data = await request.json();
    if (data.status != '00') 
        return new Response(JSON.stringify({ success: false }));
    // update the user's max_employees
    locals.user = await locals.pb.collection('users').update(locals.user.id, {
        free_spots: locals.user.free_spots + data.amount
    });
    return new Response(JSON.stringify({ success: true }));
};
