import { defineField, FieldType, STANDARD_OBJECT } from 'twenty-sdk/define';

import { PERSON_EXTERNAL_CUSTOMER_ID_FIELD_ID } from 'src/constants/order-service-identifiers';

export default defineField({
  universalIdentifier: PERSON_EXTERNAL_CUSTOMER_ID_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT.person.universalIdentifier,
  name: 'externalCustomerId',
  label: 'External Customer ID',
  description: 'Immutable foreign key from the external order system (specs-2.md §2.1).',
  type: FieldType.TEXT,
  isUnique: true,
  isNullable: true,
  defaultValue: null,
});
