export const load = async ({ params, locals }) => {
    const requests = await locals.pb.collection('request').getFullList({
        filter: `workplace = "${params.id}"`,
        sort: '-date',
        expand: 'createdBy'
    });

    return {requests};
};