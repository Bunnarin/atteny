import { redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => calculate_free_spot(params, locals);

export const actions = {
    delete: async ({ params, locals }) => {
        const workplace = await locals.pb.collection('workplace').getOne(params.id, {expand: 'employees'})
        // for each employees that is unverified, delete them
        workplace.expand?.employees?.forEach(user => {
            if (!user.verified) locals.pb.collection('users').delete(user.id);
        });        
        // release the free_spots
        locals.user = await locals.pb.collection('users').update(locals.user.id, {
            free_spots: locals.user.free_spots + workplace.expand?.employees?.length
        });
        locals.pb.collection('workplace').delete(params.id);
        throw redirect(303, '/');
    },
    upsert: async ({ request, params, locals }) => {
        const { workplace, free_spots } = await calculate_free_spot(params, locals);
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

        // update the user's free_spots
        locals.user = await locals.pb.collection('users').update(locals.user.id, {
            free_spots: free_spots + emails.length
        });
        throw redirect(303, '/');
    }
};

async function calculate_free_spot(params, locals) {
    if (params.id == "new") 
        return { free_spots: locals.user.free_spots };
    
    const workplace = await locals.pb.collection('workplace').getOne(params.id, {
        expand: 'employees'
    });
    return { 
        workplace,
        free_spots: locals.user.free_spots - workplace.expand.employees.length 
    };
}