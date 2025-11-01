import cron from 'node-cron';
import db from '../database/db.js';

/**
 * Vérifie et démarre les élections planifiées
 */
const checkScheduledStarts = async () => {
  try {
    const elections = await db.all(`
      SELECT * FROM elections
      WHERE status = 'draft'
        AND scheduled_start IS NOT NULL
        AND scheduled_start <= NOW()
    `);

    for (const election of elections) {
      await db.run(`
        UPDATE elections
        SET status = 'active', actual_start = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [election.id]);

      console.log(`Élection ${election.title} démarrée automatiquement`);
    }
  } catch (error) {
    console.error('Erreur vérification démarrages planifiés:', error);
  }
};

/**
 * Vérifie et clôture les élections planifiées
 */
const checkScheduledEnds = async () => {
  try {
    const elections = await db.all(`
      SELECT * FROM elections
      WHERE status = 'active'
        AND scheduled_end IS NOT NULL
        AND scheduled_end <= NOW()
    `);

    for (const election of elections) {
      await db.run(`
        UPDATE elections
        SET status = 'closed', actual_end = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [election.id]);

      console.log(`Élection ${election.title} clôturée automatiquement`);
    }
  } catch (error) {
    console.error('Erreur vérification clôtures planifiées:', error);
  }
};

/**
 * Nettoie les anciennes tâches
 */
const cleanupOldTasks = async () => {
  try {
    // Supprimer les logs d'audit de plus de 1 an
    await db.run(`
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '1 year'
    `);

    console.log('Nettoyage des anciennes données effectué');
  } catch (error) {
    console.error('Erreur nettoyage:', error);
  }
};

/**
 * Initialise le planificateur de tâches
 */
export const initScheduler = () => {
  // Vérifier toutes les minutes les élections à démarrer/clôturer
  cron.schedule('* * * * *', () => {
    checkScheduledStarts();
    checkScheduledEnds();
  });

  // Nettoyage quotidien à 3h du matin
  cron.schedule('0 3 * * *', () => {
    cleanupOldTasks();
  });

  console.log('Planificateur de tâches initialisé');
};

export default { initScheduler };
