import { defineField, FieldType, RelationType, STANDARD_OBJECT } from 'twenty-sdk/define';

import {
  ORDER_CUSTOMER_FIELD_ID,
  ORDER_UNIVERSAL_IDENTIFIER,
  PERSON_ORDERS_FIELD_ID,
} from 'src/constants/order-service-identifiers';

export default defineField({
  universalIdentifier: PERSON_ORDERS_FIELD_ID,
  objectUniversalIdentifier: STANDARD_OBJECT.person.universalIdentifier,
  name: 'orders',
  label: 'Orders',
  type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: ORDER_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORDER_CUSTOMER_FIELD_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
