/**
 * Register Shopify webhooks for real-time order/fulfillment sync.
 *
 * Topics registered:
 *   - orders/create
 *   - orders/updated
 *   - fulfillments/create
 *   - fulfillments/update
 *
 * Usage:
 *   pnpm register:webhooks
 *
 * Requires: SHOPIFY_SHOP_DOMAIN, SHOPIFY_ADMIN_TOKEN, NEXT_PUBLIC_APP_URL
 */

import 'dotenv/config';
import { createAdminApiClient } from '@shopify/admin-api-client';
import { getShopifyAdminEnv } from '../lib/shopify/env';

const WEBHOOK_TOPICS = [
  'ORDERS_CREATE',
  'ORDERS_UPDATED',
  'FULFILLMENTS_CREATE',
  'FULFILLMENTS_UPDATE',
  'CUSTOMERS_UPDATE',
] as const;

const LIST_QUERY = `query {
  webhookSubscriptions(first: 100) {
    edges {
      node {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
    }
  }
}`;

const CREATE_MUTATION = `mutation webhookCreate($topic: WebhookSubscriptionTopic!, $url: URL!) {
  webhookSubscriptionCreate(
    topic: $topic
    webhookSubscription: { callbackUrl: $url, format: JSON }
  ) {
    webhookSubscription {
      id
      topic
    }
    userErrors {
      field
      message
    }
  }
}`;

const DELETE_MUTATION = `mutation webhookDelete($id: ID!) {
  webhookSubscriptionDelete(id: $id) {
    deletedWebhookSubscriptionId
    userErrors {
      field
      message
    }
  }
}`;

async function main() {
  const creds = getShopifyAdminEnv();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL env var is required (e.g. https://your-app.vercel.app)');
  }

  const callbackUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/shopify`;
  console.log(`[register-webhooks] Target: ${callbackUrl}`);
  console.log(`[register-webhooks] Store:  ${creds.shopDomain}`);

  const client = createAdminApiClient({
    storeDomain: creds.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    apiVersion: creds.apiVersion,
    accessToken: creds.accessToken,
  });

  // List existing webhooks
  const { data: listData } = await client.request(LIST_QUERY);
  const existing = (listData as any)?.webhookSubscriptions?.edges ?? [];

  console.log(`[register-webhooks] Found ${existing.length} existing webhook(s)`);

  // Remove existing webhooks pointing to our callback URL
  for (const edge of existing) {
    const node = edge.node;
    const url = node.endpoint?.callbackUrl;
    if (url === callbackUrl) {
      console.log(`  Removing old ${node.topic} (${node.id})`);
      await client.request(DELETE_MUTATION, { variables: { id: node.id } });
    }
  }

  // Register fresh webhooks
  for (const topic of WEBHOOK_TOPICS) {
    console.log(`  Registering ${topic} → ${callbackUrl}`);
    const { data } = await client.request(CREATE_MUTATION, {
      variables: { topic, url: callbackUrl },
    });

    const result = (data as any)?.webhookSubscriptionCreate;
    const errors = result?.userErrors ?? [];
    if (errors.length > 0) {
      console.error(`  ERROR for ${topic}:`, errors);
    } else {
      console.log(`  OK: ${result?.webhookSubscription?.id}`);
    }
  }

  console.log('[register-webhooks] Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
