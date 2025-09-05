export const load = async ({ locals }) => {
    const workplaces = await locals.pb.collection('workplace').getFullList({
        expand: 'employer'
    });
    return { 
        workplaces_as_employer: workplaces.filter((workplace) => workplace.employer === locals.user.id),
        workplaces_as_employee: workplaces.filter((workplace) => workplace.employees.includes(locals.user.id))
     };
};