export const POST = async ({ locals, params }) => {
    locals.pb.collection('request').delete(params.id);    
    return new Response(JSON.stringify({ message: 'Request deleted successfully' }));
}