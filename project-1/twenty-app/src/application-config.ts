import { defineApplication } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  WEBHOOK_SECRET
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,

  applicationVariables: {

    WEBHOOK_SECRET: {
      universalIdentifier: '8c319b1c-a830-42fc-9f1d-2007d48d5043',
      description: 'HMAC secret used to verify incoming webhook signatures.',
      value: '78703028c477e78122c5eab3268ffb9ec7218a4f4fc11da9de52036e745eb70b',
      // isSecret: true,
    },
  }
});
