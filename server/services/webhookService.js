/**
 * Webhook Service
 *
 * Handles sending notifications to Slack and Microsoft Teams
 * via incoming webhooks.
 */

import axios from 'axios';
import { query } from '../database/supabase.js';
import logger from '../utils/logger.js';

/**
 * Event types that can trigger webhooks
 */
export const WEBHOOK_EVENTS = {
  ELECTION_CREATED: 'election_created',
  ELECTION_STARTED: 'election_started',
  ELECTION_CLOSED: 'election_closed',
  QUORUM_REACHED: 'quorum_reached',
  VOTE_CAST: 'vote_cast',
  VOTER_ADDED: 'voter_added',
  SECURITY_ALERT: 'security_alert'
};

/**
 * Format message for Slack
 */
function formatSlackMessage(event, data) {
  const colors = {
    [WEBHOOK_EVENTS.ELECTION_CREATED]: '#2196F3',
    [WEBHOOK_EVENTS.ELECTION_STARTED]: '#4CAF50',
    [WEBHOOK_EVENTS.ELECTION_CLOSED]: '#FF9800',
    [WEBHOOK_EVENTS.QUORUM_REACHED]: '#9C27B0',
    [WEBHOOK_EVENTS.VOTE_CAST]: '#00BCD4',
    [WEBHOOK_EVENTS.VOTER_ADDED]: '#8BC34A',
    [WEBHOOK_EVENTS.SECURITY_ALERT]: '#F44336'
  };

  const icons = {
    [WEBHOOK_EVENTS.ELECTION_CREATED]: ':ballot_box:',
    [WEBHOOK_EVENTS.ELECTION_STARTED]: ':white_check_mark:',
    [WEBHOOK_EVENTS.ELECTION_CLOSED]: ':lock:',
    [WEBHOOK_EVENTS.QUORUM_REACHED]: ':tada:',
    [WEBHOOK_EVENTS.VOTE_CAST]: ':writing_hand:',
    [WEBHOOK_EVENTS.VOTER_ADDED]: ':bust_in_silhouette:',
    [WEBHOOK_EVENTS.SECURITY_ALERT]: ':warning:'
  };

  const attachment = {
    color: colors[event] || '#607D8B',
    fallback: data.title,
    title: `${icons[event] || ':bell:'} ${data.title}`,
    text: data.message,
    fields: [],
    footer: 'E-Voting Platform',
    footer_icon: 'https://api.iconify.design/lucide/vote.svg',
    ts: Math.floor(Date.now() / 1000)
  };

  // Add custom fields based on event type
  if (data.election) {
    attachment.fields.push({
      title: 'Élection',
      value: data.election.title,
      short: true
    });
  }

  if (data.statistics) {
    const stats = data.statistics;
    if (stats.totalVoters !== undefined) {
      attachment.fields.push({
        title: 'Votants Total',
        value: `${stats.totalVoters}`,
        short: true
      });
    }
    if (stats.votedCount !== undefined) {
      attachment.fields.push({
        title: 'Votes Enregistrés',
        value: `${stats.votedCount}`,
        short: true
      });
    }
    if (stats.participation !== undefined) {
      attachment.fields.push({
        title: 'Taux de Participation',
        value: `${stats.participation.toFixed(1)}%`,
        short: true
      });
    }
  }

  if (data.url) {
    attachment.actions = [{
      type: 'button',
      text: 'Voir l\'élection',
      url: data.url
    }];
  }

  return {
    username: 'E-Voting Bot',
    icon_emoji: ':ballot_box_with_ballot:',
    attachments: [attachment]
  };
}

/**
 * Format message for Microsoft Teams
 */
function formatTeamsMessage(event, data) {
  const colors = {
    [WEBHOOK_EVENTS.ELECTION_CREATED]: '0078D4',
    [WEBHOOK_EVENTS.ELECTION_STARTED]: '107C10',
    [WEBHOOK_EVENTS.ELECTION_CLOSED]: 'FF8C00',
    [WEBHOOK_EVENTS.QUORUM_REACHED]: '8661C5',
    [WEBHOOK_EVENTS.VOTE_CAST]: '00B7C3',
    [WEBHOOK_EVENTS.VOTER_ADDED]: '498205',
    [WEBHOOK_EVENTS.SECURITY_ALERT]: 'D13438'
  };

  const card = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: data.title,
    themeColor: colors[event] || '5C2D91',
    title: data.title,
    text: data.message,
    sections: []
  };

  // Add facts section
  const facts = [];

  if (data.election) {
    facts.push({
      name: 'Élection',
      value: data.election.title
    });
  }

  if (data.statistics) {
    const stats = data.statistics;
    if (stats.totalVoters !== undefined) {
      facts.push({
        name: 'Votants Total',
        value: `${stats.totalVoters}`
      });
    }
    if (stats.votedCount !== undefined) {
      facts.push({
        name: 'Votes Enregistrés',
        value: `${stats.votedCount}`
      });
    }
    if (stats.participation !== undefined) {
      facts.push({
        name: 'Taux de Participation',
        value: `${stats.participation.toFixed(1)}%`
      });
    }
  }

  if (facts.length > 0) {
    card.sections.push({ facts });
  }

  // Add action button
  if (data.url) {
    card.potentialAction = [{
      '@type': 'OpenUri',
      name: 'Voir l\'élection',
      targets: [{
        os: 'default',
        uri: data.url
      }]
    }];
  }

  return card;
}

/**
 * Send webhook notification
 */
async function sendWebhook(webhookUrl, platform, event, data) {
  try {
    let payload;

    if (platform === 'slack') {
      payload = formatSlackMessage(event, data);
    } else if (platform === 'teams') {
      payload = formatTeamsMessage(event, data);
    } else {
      throw new Error(`Platform non supportée: ${platform}`);
    }

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 seconds timeout
    });

    if (response.status >= 200 && response.status < 300) {
      logger.info(`✅ Webhook ${platform} envoyé avec succès pour l'événement ${event}`);
      return { success: true, status: response.status };
    } else {
      logger.warn(`⚠️  Webhook ${platform} retourné status ${response.status}`);
      return { success: false, status: response.status, error: 'Unexpected status code' };
    }
  } catch (error) {
    logger.error(`❌ Erreur envoi webhook ${platform}:`, error.message);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Trigger webhooks for an event
 *
 * @param {string} electionId - Election ID
 * @param {string} event - Event type (from WEBHOOK_EVENTS)
 * @param {object} data - Event data (title, message, statistics, etc.)
 */
export async function triggerWebhooks(electionId, event, data) {
  try {
    // Get active webhooks for this election that listen to this event
    const result = await query(`
      SELECT id, platform, webhook_url, events
      FROM webhook_configurations
      WHERE election_id = $1
        AND is_active = true
    `, [electionId]);

    if (result.rows.length === 0) {
      logger.debug(`Aucun webhook configuré pour l'élection ${electionId}`);
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Filter webhooks that listen to this event
    const webhooks = result.rows.filter(webhook => {
      try {
        const events = JSON.parse(webhook.events);
        return events.includes(event);
      } catch (e) {
        logger.error(`Erreur parsing events pour webhook ${webhook.id}:`, e);
        return false;
      }
    });

    logger.info(`📤 Envoi de ${webhooks.length} webhook(s) pour l'événement ${event}`);

    // Send webhooks in parallel
    const results = await Promise.allSettled(
      webhooks.map(webhook =>
        sendWebhook(webhook.webhook_url, webhook.platform, event, data)
          .then(result => ({ ...result, webhookId: webhook.id }))
      )
    );

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
        // Update last_triggered_at
        try {
          await query(`
            UPDATE webhook_configurations
            SET last_triggered_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [result.value.webhookId]);
        } catch (e) {
          logger.error(`Erreur update last_triggered_at:`, e);
        }
      } else {
        failed++;
        logger.error(`Échec webhook:`, result.reason || result.value?.error);
      }
    }

    logger.info(`📊 Webhooks envoyés: ${sent} réussis, ${failed} échoués`);

    return { sent, failed };
  } catch (error) {
    logger.error('❌ Erreur triggerWebhooks:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
}

/**
 * Test a webhook configuration
 */
export async function testWebhook(platform, webhookUrl) {
  const testData = {
    title: 'Test de Webhook',
    message: 'Ceci est un message de test pour vérifier la configuration de votre webhook.',
    election: {
      title: 'Élection de Test'
    },
    statistics: {
      totalVoters: 100,
      votedCount: 42,
      participation: 42.0
    }
  };

  return sendWebhook(webhookUrl, platform, WEBHOOK_EVENTS.ELECTION_STARTED, testData);
}

export default {
  WEBHOOK_EVENTS,
  triggerWebhooks,
  testWebhook
};
