import { defineObject, FieldType, RelationType, OnDeleteAction } from 'twenty-sdk/define';

import {
  ORDER_ITEM_LINE_TOTAL_FIELD_ID,
  ORDER_ITEM_ORDER_FIELD_ID,
  ORDER_ITEM_PRODUCT_NAME_FIELD_ID,
  ORDER_ITEM_QUANTITY_FIELD_ID,
  ORDER_ITEM_SKU_FIELD_ID,
  ORDER_ITEM_UNIT_PRICE_FIELD_ID,
  ORDER_ITEM_UNIVERSAL_IDENTIFIER,
  ORDER_ORDER_ITEMS_FIELD_ID,
  ORDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/order-service-identifiers';

export default defineObject({
  universalIdentifier: ORDER_ITEM_UNIVERSAL_IDENTIFIER,
  nameSingular: 'orderItem',
  namePlural: 'orderItems',
  labelSingular: 'Order Item',
  labelPlural: 'Order Items',
  description: 'A single line item belonging to an order.',
  icon: 'IconBox',
  labelIdentifierFieldMetadataUniversalIdentifier: ORDER_ITEM_PRODUCT_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: ORDER_ITEM_PRODUCT_NAME_FIELD_ID,
      name: 'productName',
      label: 'Product Name',
      type: FieldType.TEXT,
    },
    {
      universalIdentifier: ORDER_ITEM_SKU_FIELD_ID,
      name: 'sku',
      label: 'SKU',
      type: FieldType.TEXT,
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: ORDER_ITEM_QUANTITY_FIELD_ID,
      name: 'quantity',
      label: 'Quantity',
      type: FieldType.NUMBER,
      defaultValue: 1,
    },
    {
      universalIdentifier: ORDER_ITEM_UNIT_PRICE_FIELD_ID,
      name: 'unitPrice',
      label: 'Unit Price',
      type: FieldType.CURRENCY,
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: ORDER_ITEM_LINE_TOTAL_FIELD_ID,
      name: 'lineTotal',
      label: 'Line Total',
      type: FieldType.CURRENCY,
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: ORDER_ITEM_ORDER_FIELD_ID,
      name: 'order',
      label: 'Order',
      type: FieldType.RELATION,
      relationTargetObjectMetadataUniversalIdentifier: ORDER_UNIVERSAL_IDENTIFIER,
      relationTargetFieldMetadataUniversalIdentifier: ORDER_ORDER_ITEMS_FIELD_ID,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.CASCADE,
        joinColumnName: 'orderId',
      },
    },
  ],
});
