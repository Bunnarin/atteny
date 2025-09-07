export const load = async ({ locals }) => {
    const workplaces = await locals.pb.collection('workplace').getFullList();
    return { 
        workplaces_as_employer: workplaces.filter((workplace) => workplace.employer === locals.user.id),
        workplaces_as_employee: workplaces.filter((workplace) => workplace.employees.includes(locals.user.id))
    };
};

export const actions = {
    request_leave: async ({ request, locals }) => {
        const data = await request.formData();
        await locals.pb.collection('request').create({
            createdBy: locals.user.id,
            workplace: data.get('workplace_id'),
            date: data.get('date'),
            reason: data.get('reason'),
        });
        return {success: true};
    }
};