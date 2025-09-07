import { redirect } from '@sveltejs/kit';

export const POST = async ({ request, locals }) => {
    const data = await request.json();
    if (data.status != '00') 
        throw redirect(304, '/');
    // update the user's max_employees
    locals.user = await locals.pb.collection('users').update(locals.user.id, {
        max_employees: locals.user.max_employees + data.amount
    });
    throw redirect(303, '/');
};
