import { redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => calculate_free_spot(params, locals);

export const actions = {
    delete: async ({ params, locals }) => {
        // for each employees that is unverified, delete them
        const workplace = await locals.pb.collection('workplace').getOne(params.id, {expand: 'employees'})
            .then(workplace => workplace.expand?.employees?.forEach((user) => {
                if (!user.verified) locals.pb.collection('users').delete(user.id);
            }));
        // deduct the current_employees from the user
        locals.user = await locals.pb.collection('users').update(locals.user.id, {
            current_employees: locals.user.current_employees - workplace.employees?.length
        });
        locals.pb.collection('workplace').delete(params.id);
        throw redirect(303, '/');
    },
    upsert: async ({ request, params, locals }) => {
        const { workplace, current_employee_without_this_workplace } = await calculate_free_spot(params, locals);
        const initial_emails = workplace?.expand?.employees?.map(e => e.email) || [];

        const data = await request.formData();
        const emails = JSON.parse(data.get('emails')?.toString() || '[]');

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
            name: data.get('name')?.toString(),
            proximity: data.get('proximity')?.toString(),
            employer: locals.user.id,
            employees: employees,
            location: {
                lat: parseFloat(data.get('lat')?.toString() || '0'),
                lon: parseFloat(data.get('lon')?.toString() || '0')
            },
            file_id: data.get('file_id')?.toString(),
            rules: JSON.parse(data.get('rules')?.toString() || '[]')
        };
        
        if (params.id == 'new') await locals.pb.collection('workplace').create(workplace_fixture);
        else await locals.pb.collection('workplace').update(params.id, workplace_fixture);

        // update the user's current_employees
        locals.user = await locals.pb.collection('users').update(locals.user.id, {
            current_employees: current_employee_without_this_workplace + emails.length
        });
        throw redirect(303, '/');
    }
};

async function calculate_free_spot(params, locals) {
    if (params.id == "new") {
        return { free_spot: locals.user.max_employees - locals.user.current_employees, 
            current_employee_without_this_workplace: locals.user.current_employees };
    } else {
        const workplace = await locals.pb.collection('workplace').getOne(params.id, {
            expand: 'employees'
        });
        const initial_total = (workplace?.expand?.employees?.length || 0);
        const current_employee_without_this_workplace = locals.user.current_employees - initial_total;
        return { workplace, 
            free_spot: locals.user.max_employees - current_employee_without_this_workplace, 
            current_employee_without_this_workplace 
        };
    }
}