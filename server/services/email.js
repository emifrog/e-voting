import nodemailer from 'nodemailer';
import { generateMeetingInvitation } from './meetings.js';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Envoie un email de vote à un électeur
 */
export const sendVotingEmail = async (voter, election, qrCodeDataUrl) => {
  const votingUrl = `${process.env.APP_URL}/vote/${voter.token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .qr-section { text-align: center; margin: 20px 0; padding: 20px; background: white; }
        .info-box { background: #e0f2fe; padding: 15px; border-left: 4px solid #0284c7; margin: 15px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗳️ Invitation à Voter</h1>
        </div>

        <div class="content">
          <h2>Bonjour ${voter.name || 'Électeur'},</h2>

          <p>Vous êtes invité(e) à participer au vote suivant :</p>

          <div class="info-box">
            <h3>${election.title}</h3>
            <p>${election.description || ''}</p>
          </div>

          <p><strong>Pour voter, vous avez deux options :</strong></p>

          <h3>Option 1 : Lien direct</h3>
          <p>Cliquez sur le bouton ci-dessous pour accéder à votre bulletin de vote personnel :</p>
          <a href="${votingUrl}" class="button">Voter maintenant</a>

          <h3>Option 2 : QR Code</h3>
          <div class="qr-section">
            <p>Scannez ce QR Code avec votre smartphone :</p>
            <img src="${qrCodeDataUrl}" alt="QR Code de vote" style="max-width: 200px;" />
          </div>

          ${generateMeetingInvitation(election)}

          <div class="info-box">
            <p><strong>⚠️ Important :</strong></p>
            <ul>
              <li>Ce lien est personnel et unique</li>
              <li>Ne le partagez avec personne</li>
              <li>${election.is_secret ? 'Votre vote sera secret et anonyme' : 'Votre vote sera enregistré avec votre identité'}</li>
              ${election.scheduled_start ? `<li>Le vote commence le : ${new Date(election.scheduled_start).toLocaleString('fr-FR')}</li>` : ''}
              ${election.scheduled_end ? `<li>Le vote se termine le : ${new Date(election.scheduled_end).toLocaleString('fr-FR')}</li>` : ''}
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>Cet email a été envoyé par la plateforme E-Voting</p>
          <p>Si vous avez reçu cet email par erreur, veuillez l'ignorer</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: voter.email,
    subject: `Invitation à voter : ${election.title}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoie un rappel de vote
 */
export const sendReminderEmail = async (voter, election) => {
  const votingUrl = `${process.env.APP_URL}/vote/${voter.token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Rappel : N'oubliez pas de voter !</h1>
        </div>

        <div class="content">
          <h2>Bonjour ${voter.name || 'Électeur'},</h2>

          <p>Nous constatons que vous n'avez pas encore voté pour :</p>
          <h3>${election.title}</h3>

          <p>Il est encore temps de participer !</p>

          <a href="${votingUrl}" class="button">Voter maintenant</a>

          ${generateMeetingInvitation(election)}

          ${election.scheduled_end ? `<p><strong>Date limite :</strong> ${new Date(election.scheduled_end).toLocaleString('fr-FR')}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: voter.email,
    subject: `Rappel : ${election.title}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Erreur envoi rappel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoie un email à un observateur
 */
export const sendObserverEmail = async (observer, election) => {
  const observerUrl = `${process.env.APP_URL}/observer/${observer.access_token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #059669; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👁️ Accès Observateur</h1>
        </div>

        <div class="content">
          <h2>Bonjour ${observer.name},</h2>

          <p>Vous avez été désigné(e) comme observateur pour le vote :</p>
          <h3>${election.title}</h3>

          <p>Cliquez sur le bouton ci-dessous pour accéder au tableau de bord de suivi :</p>

          <a href="${observerUrl}" class="button">Accéder au suivi</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: observer.email,
    subject: `Accès observateur : ${election.title}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Erreur envoi email observateur:', error);
    return { success: false, error: error.message };
  }
};

export default transporter;
