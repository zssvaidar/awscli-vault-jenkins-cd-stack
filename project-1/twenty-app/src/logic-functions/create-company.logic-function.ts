import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

const handler = async (params: RoutePayload) => {
  const client = new CoreApiClient();
  const body = (params.body ?? {}) as { name?: string };
  const name = body.name ?? process.env.DEFAULT_COMPANY_NAME ?? 'Test Company';

  const result = await client.mutation({
    createCompany: {
      __args: { data: { name } }, 
      id: true,
      name: true,
    },
  });

  console.log('handle-create-company: mutation result =', JSON.stringify(result));

  if (!result?.createCompany?.id) {
    throw new Error(
      `createCompany returned no id. Full result: ${JSON.stringify(result)}`,
    );
  }
 
  return { received: true, companyId: result.createCompany.id };
};

export default defineLogicFunction({
  universalIdentifier: '43d24699-d73e-437b-8fb7-bba0dfde0a40',
  name: 'create-company',
  timeoutSeconds: 10,
  handler,
  httpRouteTriggerSettings: {
    path: '/company/create',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-webhook-signature', 'content-type'],

  },
});