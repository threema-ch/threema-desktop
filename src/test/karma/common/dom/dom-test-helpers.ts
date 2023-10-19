import type {u53} from '~/common/types';

/**
 * Create a response object.
 *
 * @param status The response status code
 * @param body The response body
 */
export function makeResponse(status: u53, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: new Headers({
            'Content-Type': 'application/json',
        }),
    });
}
