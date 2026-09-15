import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';
 
// Runs in the resolved workspace. The resolver already authenticated the
// request, so this handler can focus on the actual work.
const handler = async (event: RoutePayload) => {
  const client = new CoreApiClient();
  const body = (event.body ?? {}) as { type?: string };
 
  console.log('handle-webhook-event: starting mutation, body =', body);
 
  try {
    const result = await client.mutation({
      createCompany: {
        __args: { data: { name: `Webhook event: ${body.type ?? 'unknown'}` } },
        id: true,
        name: true,
      },
    });

    console.log('handle-webhook-event: mutation result =', JSON.stringify(result));

    if (!result?.createCompany?.id) {
      throw new Error(
        `createCompany returned no id. Full result: ${JSON.stringify(result)}`,
      );
    }
 
    return { received: true, companyId: result.createCompany.id };
  } catch (err) {
    console.error('handle-webhook-event: mutation failed:', err);
    throw err;
  }
};
 
export default defineLogicFunction({
  universalIdentifier: '5cb4a297-e2e6-4a35-8526-f05f7fa735ea',
  name: 'handle-webhook-event',
  handler,
});