import { redirect } from "@sveltejs/kit";
// when the user gets here, they will be added to the workplace
export const GET = async ({ locals, params }) => {
    // if not authenitcalted, redirect to login, and then come back here
    if (!locals.user) {
        throw redirect(302, '/login?redirect=/subscribe/' + params.id);
    }
    await locals.pb.send(`/subscribe/${params.id}`, {
        method: "POST",
        headers: { Accept: "application/json" }
    });
    throw redirect(302, '/');
}
