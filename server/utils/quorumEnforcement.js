/**
 * Quorum Enforcement Utility
 * Prevents election closure if quorum requirements are not met
 *
 * Features:
 * - Validates quorum before election closure
 * - Provides detailed quorum status
 * - Supports multiple quorum types
 * - Clear error messages for admins
 */

import db from '../database/db.js';
import * as quorumService from '../services/quorum.js';
import { log } from './logger.js';

/**
 * Check if election can be closed based on quorum
 * @param {string} electionId - Election ID
 * @param {string} userId - User ID (for logging)
 * @returns {Promise} - Object with canClose, status, and error details
 */
export async function canCloseElection(electionId, userId = null) {
  try {
    // Get election details
    const election = await db.get(
      'SELECT id, title, status, quorum_type, quorum_value, is_weighted FROM elections WHERE id = ?',
      [electionId]
    );

    if (!election) {
      return {
        canClose: false,
        error: 'Election not found',
        electionId
      };
    }

    // Check if election is active
    if (election.status !== 'active') {
      return {
        canClose: false,
        error: 'Election is not active',
        status: election.status,
        electionId
      };
    }

    // Check if quorum is required
    if (election.quorum_type === quorumService.QUORUM_TYPES.NONE) {
      return {
        canClose: true,
        quorumRequired: false,
        electionId
      };
    }

    // Get quorum status
    const quorumStatus = await quorumService.calculateQuorumStatus(electionId);

    // Check if quorum is reached
    if (!quorumStatus.reached) {
      // Quorum not reached - election cannot be closed
      log.security('election_closure_blocked', 'high', {
        election_id: electionId,
        user_id: userId,
        reason: 'quorum_not_reached',
        current: quorumStatus.current,
        target: quorumStatus.target,
        percentage: quorumStatus.percentage,
        quorum_type: quorumStatus.type
      });

      return {
        canClose: false,
        quorumRequired: true,
        quorumMet: false,
        status: quorumStatus,
        error: 'Quorum requirement not met',
        message: `Quorum not reached: ${quorumStatus.current}/${quorumStatus.target} (${quorumStatus.percentage}%)`,
        electionId
      };
    }

    // Quorum is reached - election can be closed
    return {
      canClose: true,
      quorumRequired: true,
      quorumMet: true,
      status: quorumStatus,
      electionId
    };
  } catch (error) {
    log.error('Error checking quorum enforcement', {
      election_id: electionId,
      user_id: userId,
      error: error.message
    });

    return {
      canClose: false,
      error: 'Error checking quorum',
      details: error.message,
      electionId
    };
  }
}

/**
 * Get quorum enforcement details for an election
 * @param {string} electionId - Election ID
 * @returns {Promise} - Detailed quorum information
 */
export async function getQuorumEnforcementDetails(electionId) {
  try {
    const election = await db.get(
      `SELECT
        id, title, status, quorum_type, quorum_value, is_weighted,
        quorum_reached, quorum_reached_at
      FROM elections
      WHERE id = ?`,
      [electionId]
    );

    if (!election) {
      return {
        error: 'Election not found'
      };
    }

    if (election.quorum_type === quorumService.QUORUM_TYPES.NONE) {
      return {
        enforced: false,
        election_id: electionId,
        election_title: election.title,
        election_status: election.status,
        message: 'No quorum requirement for this election'
      };
    }

    const quorumStatus = await quorumService.calculateQuorumStatus(electionId);

    return {
      enforced: true,
      election_id: electionId,
      election_title: election.title,
      election_status: election.status,
      quorum: {
        type: election.quorum_type,
        value: election.quorum_value,
        required: true,
        reached: quorumStatus.reached,
        reached_at: election.quorum_reached_at,
        current: quorumStatus.current,
        target: quorumStatus.target,
        percentage: quorumStatus.percentage,
        total_voters: quorumStatus.totalVoters,
        remaining: Math.max(0, quorumStatus.target - quorumStatus.current)
      },
      can_close: quorumStatus.reached,
      message: quorumStatus.reached
        ? `Quorum met: ${quorumStatus.current}/${quorumStatus.target} (${quorumStatus.percentage}%)`
        : `Quorum not met: ${quorumStatus.current}/${quorumStatus.target} (${quorumStatus.percentage}%) - ${Math.max(0, quorumStatus.target - quorumStatus.current)} more needed`
    };
  } catch (error) {
    log.error('Error getting quorum details', {
      election_id: electionId,
      error: error.message
    });

    return {
      error: 'Error retrieving quorum details',
      details: error.message
    };
  }
}

/**
 * Format quorum status message for users
 * @param {Object} quorumStatus - Quorum status object
 * @param {string} languageCode - Language code (en, fr)
 * @returns {string} - Formatted message
 */
export function formatQuorumMessage(quorumStatus, languageCode = 'en') {
  const messages = {
    en: {
      percentage: 'Quorum: ${current}/${target} votes (${percentage}%)',
      absolute: 'Quorum: ${current}/${target} votes required',
      weighted: 'Quorum: ${current.toFixed(2)}/${target.toFixed(2)} weight (${percentage}%)',
      reached: 'Quorum reached!',
      not_reached: 'Quorum not yet reached'
    },
    fr: {
      percentage: 'Quorum: ${current}/${target} votes (${percentage}%)',
      absolute: 'Quorum: ${current}/${target} votes requis',
      weighted: 'Quorum: ${current.toFixed(2)}/${target.toFixed(2)} poids (${percentage}%)',
      reached: 'Quorum atteint!',
      not_reached: 'Quorum non encore atteint'
    }
  };

  const lang = messages[languageCode] || messages.en;

  let template = lang.percentage;
  if (quorumStatus.type === 'absolute') {
    template = lang.absolute;
  } else if (quorumStatus.type === 'weighted') {
    template = lang.weighted;
  }

  const message = template
    .replace('${current}', Math.round(quorumStatus.current))
    .replace('${target}', Math.round(quorumStatus.target))
    .replace('${percentage}', quorumStatus.percentage);

  return `${message} - ${quorumStatus.reached ? lang.reached : lang.not_reached}`;
}

/**
 * Log quorum enforcement violation
 * @param {string} electionId - Election ID
 * @param {string} userId - User ID
 * @param {string} reason - Reason for violation
 * @param {Object} details - Additional details
 */
export function logQuorumViolation(electionId, userId, reason, details = {}) {
  log.security('quorum_enforcement_violation', 'high', {
    election_id: electionId,
    user_id: userId,
    reason,
    ...details
  });
}

/**
 * Get quorum enforcement summary
 * @param {Array} elections - Array of election objects with quorum info
 * @returns {Object} - Summary of enforced elections
 */
export function getEnforcementSummary(elections) {
  const summary = {
    total: elections.length,
    enforced: 0,
    not_enforced: 0,
    quorum_met: 0,
    quorum_not_met: 0,
    can_close: 0,
    cannot_close: 0
  };

  elections.forEach(election => {
    if (election.quorum_type === quorumService.QUORUM_TYPES.NONE) {
      summary.not_enforced++;
      summary.can_close++;
    } else {
      summary.enforced++;
      if (election.quorum_reached) {
        summary.quorum_met++;
        summary.can_close++;
      } else {
        summary.quorum_not_met++;
        summary.cannot_close++;
      }
    }
  });

  return summary;
}

export default {
  canCloseElection,
  getQuorumEnforcementDetails,
  formatQuorumMessage,
  logQuorumViolation,
  getEnforcementSummary
};
