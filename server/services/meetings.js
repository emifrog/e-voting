/**
 * Service d'intégration avec Teams et Zoom
 */

/**
 * Plateformes de réunion supportées
 */
export const MEETING_PLATFORMS = {
  TEAMS: 'teams',
  ZOOM: 'zoom'
};

/**
 * Génère un lien Teams pour une élection
 * Note: Pour une vraie intégration, il faudrait utiliser Microsoft Graph API
 * Cette version simplifie la création d'un lien de réunion
 */
export const generateTeamsLink = async (election) => {
  // Pour une intégration complète, vous auriez besoin de:
  // 1. Microsoft Graph API credentials
  // 2. OAuth2 authentication
  // 3. Teams meeting creation API call

  // Pour l'instant, on retourne un format de lien générique
  // que l'admin peut remplacer par un vrai lien Teams
  const meetingId = `evoting-${election.id}`;

  return {
    platform: MEETING_PLATFORMS.TEAMS,
    url: `https://teams.microsoft.com/l/meetup-join/`, // L'admin devra fournir le lien complet
    meetingId: meetingId,
    instructions: `
      Pour configurer Teams:
      1. Créez une réunion Teams dans votre calendrier
      2. Copiez le lien de la réunion
      3. Collez-le dans le champ "URL de réunion"
      4. (Optionnel) Ajoutez l'ID et le mot de passe si nécessaire
    `
  };
};

/**
 * Génère un lien Zoom pour une élection
 * Note: Pour une vraie intégration, il faudrait utiliser Zoom API
 */
export const generateZoomLink = async (election) => {
  // Pour une intégration complète avec Zoom API, vous auriez besoin de:
  // 1. Zoom API credentials (API Key & Secret ou OAuth)
  // 2. Créer une réunion via l'API Zoom
  // 3. Récupérer les détails de la réunion

  // Exemple de structure pour une vraie intégration:
  /*
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ZOOM_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topic: election.title,
      type: 2, // Scheduled meeting
      start_time: election.scheduled_start,
      duration: calculateDuration(election.scheduled_start, election.scheduled_end),
      settings: {
        waiting_room: true,
        join_before_host: false
      }
    })
  });
  */

  const meetingId = `evoting-${election.id}`;

  return {
    platform: MEETING_PLATFORMS.ZOOM,
    url: `https://zoom.us/j/`, // L'admin devra fournir le lien complet
    meetingId: meetingId,
    instructions: `
      Pour configurer Zoom:
      1. Créez une réunion Zoom programmée
      2. Copiez le lien de la réunion (https://zoom.us/j/XXXXXXXXXX)
      3. Collez-le dans le champ "URL de réunion"
      4. Ajoutez l'ID de réunion et le mot de passe si nécessaire
    `
  };
};

/**
 * Valide un lien de réunion
 */
export const validateMeetingLink = (platform, url) => {
  if (!url) return false;

  switch (platform) {
    case MEETING_PLATFORMS.TEAMS:
      return url.includes('teams.microsoft.com') ||
             url.includes('teams.live.com');

    case MEETING_PLATFORMS.ZOOM:
      return url.includes('zoom.us') ||
             url.includes('zoom.com');

    default:
      return false;
  }
};

/**
 * Formate les informations de réunion pour l'affichage
 */
export const formatMeetingInfo = (election) => {
  if (!election.meeting_platform || !election.meeting_url) {
    return null;
  }

  return {
    platform: election.meeting_platform,
    url: election.meeting_url,
    meetingId: election.meeting_id,
    password: election.meeting_password,
    platformName: election.meeting_platform === MEETING_PLATFORMS.TEAMS ? 'Microsoft Teams' : 'Zoom',
    joinText: `Rejoindre la réunion ${election.meeting_platform === MEETING_PLATFORMS.TEAMS ? 'Teams' : 'Zoom'}`
  };
};

/**
 * Génère un texte d'invitation avec lien de réunion
 */
export const generateMeetingInvitation = (election) => {
  const meetingInfo = formatMeetingInfo(election);

  if (!meetingInfo) {
    return '';
  }

  let invitation = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  invitation += `📹 RÉUNION EN LIGNE\n`;
  invitation += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  invitation += `Cette élection se déroulera en ligne via ${meetingInfo.platformName}.\n\n`;
  invitation += `🔗 Lien de connexion:\n${meetingInfo.url}\n\n`;

  if (meetingInfo.meetingId) {
    invitation += `📋 ID de réunion: ${meetingInfo.meetingId}\n`;
  }

  if (meetingInfo.password) {
    invitation += `🔐 Mot de passe: ${meetingInfo.password}\n`;
  }

  invitation += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return invitation;
};

/**
 * Instructions pour l'intégration API complète (pour les développeurs)
 */
export const getAPIIntegrationInstructions = () => {
  return {
    teams: {
      title: "Intégration Microsoft Teams",
      steps: [
        "1. Créer une application Azure AD",
        "2. Configurer les permissions Microsoft Graph (OnlineMeetings.ReadWrite)",
        "3. Obtenir les credentials (Client ID, Client Secret, Tenant ID)",
        "4. Ajouter les variables d'environnement dans .env",
        "5. Utiliser Microsoft Graph API pour créer des réunions automatiquement"
      ],
      documentation: "https://docs.microsoft.com/en-us/graph/api/application-post-onlinemeetings"
    },
    zoom: {
      title: "Intégration Zoom",
      steps: [
        "1. Créer une app Zoom sur marketplace.zoom.us",
        "2. Choisir le type 'Server-to-Server OAuth' ou 'OAuth'",
        "3. Obtenir les credentials (API Key, API Secret)",
        "4. Ajouter les variables d'environnement dans .env",
        "5. Utiliser Zoom API v2 pour créer des réunions automatiquement"
      ],
      documentation: "https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingCreate"
    }
  };
};

export default {
  MEETING_PLATFORMS,
  generateTeamsLink,
  generateZoomLink,
  validateMeetingLink,
  formatMeetingInfo,
  generateMeetingInvitation,
  getAPIIntegrationInstructions
};
