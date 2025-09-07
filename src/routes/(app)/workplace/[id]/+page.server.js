import { redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => calculate_free_spot(params, locals);

export const actions = {
    delete: async ({ params, locals }) => {
        // for each employees that is unverified, delete them
        await locals.pb.collection('workplace').getOne(params.id, {expand: 'employees'})
            .then(workplace => workplace.expand?.employees?.forEach((user) => {
                if (!user.verified) locals.pb.collection('users').delete(user.id);
            }));
        locals.pb.collection('workplace').delete(params.id);
        throw redirect(303, '/');
    },
    upsert: async ({ request, params, locals }) => {
        const { free_spot, workplace } = await calculate_free_spot(params, locals);
        const initial_emails = workplace?.expand?.employees?.map(e => e.email) || [];

        const data = await request.formData();
        const name = data.get('name')?.toString();
        const proximity = data.get('proximity')?.toString();
        const lat = parseFloat(data.get('lat')?.toString() || '0');
        const lon = parseFloat(data.get('lon')?.toString() || '0');
        const file_id = data.get('file_id')?.toString();
        const emails = JSON.parse(data.get('emails')?.toString() || '[]');
        const rules = JSON.parse(data.get('rules')?.toString() || '[]');

        // for each of initial_emails that wasn't found in emails, check if the user is unverified
        await Promise.all(initial_emails.map(async (email) => {
            if (emails.includes(email)) return;
            await locals.pb.collection('users').getFirstListItem(`email = "${email}"`)
            .then(user => { if (!user.verified) locals.pb.collection('users').delete(user.id) });
        }));

        // get employees from email
        const employees = [];
        await Promise.all(emails.map(async (email) => {
            await locals.pb.collection('users').getFirstListItem(`email = "${email}"`)
            .then(user => employees.push(user.id))
            .catch(async () => { // create the user
                const password = (Math.random() + 1).toString(36).substring(7);
                await locals.pb.collection('users').create({
                    email: email,
                    emailVisibility: true,
                    password: password,
                    passwordConfirm: password,
                    max_employees: 10,
                    ip_address: (Math.random() + 1).toString(36).substring(7)
                })
                .then(newUser => employees.push(newUser.id));
            });
        }));

        const workplace_fixture = {
            name: name,
            proximity: proximity,
            employer: locals.user.id,
            employees: employees,
            location: {lat: lat, lon: lon},
            file_id: file_id,
            rules: rules
        };
        
        if (params.id == 'new') await locals.pb.collection('workplace').create(workplace_fixture);
        else await locals.pb.collection('workplace').update(params.id, workplace_fixture);

        // update the user's current_employees
        locals.user = await locals.pb.collection('users').update(locals.user.id, {
            current_employees: locals.user.max_employees - free_spot + emails.length
        });
        throw redirect(303, '/');
    }
};

async function calculate_free_spot(params, locals) {
    if (params.id == "new") {
        return { free_spot: locals.user.max_employees - locals.user.current_employees };
    } else {
        const workplace = await locals.pb.collection('workplace').getOne(params.id, {
            expand: 'employees'
        });
        const this_total = (workplace?.expand?.employees?.length || 0);
        return { workplace, free_spot: locals.user.max_employees - (locals.user.current_employees - this_total) };
    }
}