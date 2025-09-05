import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
    let free_spot;
    if (params.id != "new") {
        const workplace = await locals.pb.collection('workplace').getOne(params.id, {
            expand: 'employees'
        });
        const invitations = await locals.pb.collection('workplace_invite').getFullList({
            filter: `workplace = "${params.id}"`
        });
        const this_total = invitations.length + (workplace?.expand?.employees?.length || 0);
        free_spot = locals.user.max_employees - (locals.user.current_employees - this_total);
        return { 
            workplace, 
            id: params.id, 
            invitations: invitations || [], 
            free_spot 
        };
    } else {
        free_spot = locals.user.max_employees - locals.user.current_employees;
        return { 
            free_spot ,
            id: params.id
        };
    }
};

export const actions = {
    upsert: async ({ request, params, locals }) => {
        const data = await request.formData();
        const name = data.get('name')?.toString();
        const proximity = data.get('proximity')?.toString();
        const emails = JSON.parse(data.get('emails')?.toString() || '[]');
        const lat = parseFloat(data.get('lat')?.toString() || '0');
        const lon = parseFloat(data.get('lon')?.toString() || '0');
        const file_id = data.get('file_id')?.toString() || null;
        const rules = JSON.parse(data.get('rules')?.toString() || '[]');

        // Calculate free spots
        let free_spot;
        let existingInvites = [];
        if (params.id != "new") {
            const existingWorkplace = await locals.pb.collection('workplace').getOne(params.id, {
                expand: 'employees'
            });
            existingInvites = await locals.pb.collection('workplace_invite').getFullList({
                filter: `workplace = "${params.id}"`
            });
            const this_total = existingInvites.length + (existingWorkplace?.expand?.employees?.length || 0);
            free_spot = locals.user.max_employees - (locals.user.current_employees - this_total);
        } else {
            free_spot = locals.user.max_employees - locals.user.current_employees;
        }

        // Validate number of emails doesn't exceed free spots
        const this_total = emails.length;
        if (this_total > free_spot) 
            return fail(400, {
                error: `You can only add up to ${free_spot} more employees based on your plan.`
            });

        // try to find user by email
        const employees = [];
        await Promise.all(emails.map(async (email) => {
            await locals.pb.collection('users').getFirstListItem(`email = "${email}"`)
                .then((user) => {
                    employees.push(user.id);
                    const index = emails.indexOf(email);
                    if (index == -1) return;
                    emails.splice(index, 1);
                })
                .catch(() => {});
        }));

        try {
            const workplace = {
                name: name,
                proximity: proximity,
                employer: locals.user.id,
                employees: employees,
                location: {
                    lat: lat,
                    lon: lon
                },
                file_id: file_id,
                rules: rules
            };
            const record = (params.id != 'new') ?
                await locals.pb.collection('workplace').update(params.id, workplace) :
                await locals.pb.collection('workplace').create(workplace)
            
            await Promise.all(emails.map(async (email) => {
                if (existingInvites.find(invite => invite.email === email))
                    return;
                await locals.pb.collection('workplace_invite').create({
                    workplace: record.id,
                    email: email
                });
            }));
            // update the user's current_employees
            await locals.pb.collection('users').update(locals.user.id, {
                current_employees: locals.user.max_employees - free_spot + this_total
            });
        } catch (error) {
            return fail(500, { message: error instanceof Error ? error.message : String(error) });
        }
        throw redirect(303, '/');
    },
    delete: async ({ params, locals }) => {
        await locals.pb.collection('workplace').delete(params.id);
        throw redirect(303, '/');
    }
};
