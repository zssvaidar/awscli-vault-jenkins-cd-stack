
import { createHmac, timingSafeEqual } from 'crypto';
import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

// Runs in the owner workspace. Verifies the request signature, picks
// which target function should handle the event, and returns the
// workspace + target the platform should dispatch to.
const handler = async (event: RoutePayload) => {
  // Fail closed if the secret isn't configured — never fall back to an
  // empty key, which would let any caller forge a matching signature.
  const secret = '78703028c477e78122c5eab3268ffb9ec7218a4f4fc11da9de52036e745eb70b';

  if (!secret) {
    throw new Error('WEBHOOK_SECRET is not configured');
  }

  const signature = event.headers['x-hub-signature-256'] ?? '';
  const expected =
    'sha256=' +
    createHmac('sha256', secret).update(event.rawBody ?? '').digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('invalid signature');
  }

  const body = (event.body ?? {}) as {
    challenge?: string;
    metadata?: { twentyWorkspaceId?: string };
    type?: string;
  };

  // Handshakes must be answered on this same response, so reply from the
  // resolver instead of returning a dispatch target.
  if (body.type === 'url_verification') {
    return new Response({ challenge: body.challenge });
  }

  const workspaceId = body.metadata?.twentyWorkspaceId;

  if (!workspaceId) {
    throw new Error('event is not linked to a workspace');
  }

  return {
    workspaceId,
    // Route different event types to different target functions.
    targetLogicFunctionUniversalIdentifier: '5cb4a297-e2e6-4a35-8526-f05f7fa735ea'
  };
};

export default defineLogicFunction({
  universalIdentifier: '9bd834c5-d6bf-4f54-b333-82fa6b9a5502',
  name: 'resolve-server-route',
  handler,
  serverRouteTriggerSettings: {
    forwardedRequestHeaders: ['x-hub-signature-256'],
  },
});