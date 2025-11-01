import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import db from '../database/db.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { validateVoters } from '../middleware/validation.js';
import { generateToken } from '../utils/crypto.js';
import { sendVotingEmail } from '../services/email.js';
import { generateVotingQRCode } from '../services/qrcode.js';
import { notifyVotersAdded } from '../services/websocket.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

/**
 * POST /api/elections/:electionId/voters - Ajouter des électeurs
 */
router.post('/:electionId/voters', authenticateAdmin, validateVoters, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { voters } = req.body;

    // Vérifier que l'élection existe et appartient à l'admin
    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (election.status !== 'draft') {
      return res.status(400).json({ error: 'Impossible d\'ajouter des électeurs après le démarrage' });
    }

    const insertVoter = db.prepare(`
      INSERT INTO voters (id, election_id, email, name, weight, token)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const addedVoters = [];

    const duplicateEmails = [];

    for (const voter of voters) {
      try {
        const voterId = uuidv4();
        const token = generateToken();

        insertVoter.run(
          voterId,
          electionId,
          voter.email,
          voter.name || '',
          voter.weight || 1.0,
          token
        );

        addedVoters.push({
          id: voterId,
          email: voter.email,
          name: voter.name,
          token
        });
      } catch (error) {
        // Gérer les doublons (violation de contrainte unique)
        if (error.message.includes('UNIQUE') || error.code === 'SQLITE_CONSTRAINT') {
          console.log(`Électeur ${voter.email} déjà ajouté pour cette élection`);
          duplicateEmails.push(voter.email);
        } else {
          throw error;
        }
      }
    }

    // Notification: Électeurs ajoutés
    if (addedVoters.length > 0) {
      await notifyVotersAdded(electionId, req.user.id, addedVoters.length, election.title);
    }

    let message = `${addedVoters.length} électeur(s) ajouté(s) avec succès`;
    if (duplicateEmails.length > 0) {
      message += `\n⚠️ ${duplicateEmails.length} électeur(s) ignoré(s) (déjà présent(s)): ${duplicateEmails.join(', ')}`;
    }

    res.status(201).json({
      message,
      voters: addedVoters,
      duplicates: duplicateEmails,
      success: addedVoters.length > 0
    });
  } catch (error) {
    console.error('Erreur ajout électeurs:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout des électeurs' });
  }
});

/**
 * POST /api/elections/:electionId/voters/import - Importer des électeurs depuis CSV
 */
router.post('/:electionId/voters/import', authenticateAdmin, upload.single('file'), async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Fichier manquant' });
    }

    // Lire le fichier CSV
    const fs = await import('fs');
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const insertVoter = db.prepare(`
      INSERT INTO voters (id, election_id, email, name, weight, token)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const addedVoters = [];
    const duplicateEmails = [];
    const invalidRows = [];

    for (const record of records) {
      try {
        // Valider que l'email existe
        const email = record.email || record.Email || record.EMAIL;
        if (!email || !email.trim()) {
          invalidRows.push({ row: record, reason: 'Email manquant' });
          continue;
        }

        const voterId = uuidv4();
        const token = generateToken();

        insertVoter.run(
          voterId,
          electionId,
          email,
          record.name || record.Name || record.NAME || '',
          parseFloat(record.weight || record.Weight || record.WEIGHT || 1.0),
          token
        );

        addedVoters.push({
          id: voterId,
          email: email,
          name: record.name || record.Name || record.NAME || '',
          token
        });
      } catch (error) {
        // Gérer les doublons (violation de contrainte unique)
        if (error.message.includes('UNIQUE') || error.code === 'SQLITE_CONSTRAINT') {
          const email = record.email || record.Email || record.EMAIL;
          console.log(`Électeur ${email} déjà ajouté pour cette élection`);
          duplicateEmails.push(email);
        } else {
          throw error;
        }
      }
    }

    // Nettoyer le fichier uploadé
    fs.unlinkSync(req.file.path);

    // Notification: Électeurs importés
    if (addedVoters.length > 0) {
      await notifyVotersAdded(electionId, req.user.id, addedVoters.length, election.title);
    }

    let message = `${addedVoters.length} électeur(s) importé(s)`;
    if (duplicateEmails.length > 0) {
      message += `\n⚠️ ${duplicateEmails.length} électeur(s) ignoré(s) (déjà présent(s)): ${duplicateEmails.join(', ')}`;
    }
    if (invalidRows.length > 0) {
      message += `\n⚠️ ${invalidRows.length} ligne(s) invalide(s) (email manquant)`;
    }

    res.status(201).json({
      message,
      voters: addedVoters,
      count: addedVoters.length,
      duplicates: duplicateEmails,
      invalid: invalidRows,
      success: addedVoters.length > 0
    });
  } catch (error) {
    console.error('Erreur import électeurs:', error);
    res.status(500).json({ error: 'Erreur lors de l\'importation' });
  }
});

/**
 * GET /api/elections/:electionId/voters - Liste des électeurs
 */
router.get('/:electionId/voters', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const voters = await db.all(`
      SELECT id, email, name, weight, has_voted, voted_at, reminder_sent, last_reminder_at, created_at
      FROM voters
      WHERE election_id = ?
      ORDER BY created_at DESC
    `, [electionId]);

    res.json({ voters });
  } catch (error) {
    console.error('Erreur récupération électeurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des électeurs' });
  }
});

/**
 * POST /api/elections/:electionId/voters/send-emails - Envoyer les emails de vote
 */
router.post('/:electionId/voters/send-emails', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const voters = await db.all('SELECT * FROM voters WHERE election_id = ?', [electionId]);

    let sentCount = 0;
    const errors = [];

    for (const voter of voters) {
      try {
        const votingUrl = `${process.env.APP_URL}/vote/${voter.token}`;
        const qrCodeDataUrl = await generateVotingQRCode(votingUrl);

        // Enregistrer le QR code dans la BD
        await db.run('UPDATE voters SET qr_code = ? WHERE id = ?', [qrCodeDataUrl, voter.id]);

        const result = await sendVotingEmail(voter, election, qrCodeDataUrl);

        if (result.success) {
          sentCount++;
        } else {
          errors.push({ email: voter.email, error: result.error });
        }
      } catch (error) {
        errors.push({ email: voter.email, error: error.message });
      }
    }

    res.json({
      message: `${sentCount} email(s) envoyé(s) sur ${voters.length}`,
      sentCount,
      totalVoters: voters.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Erreur envoi emails:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi des emails' });
  }
});

/**
 * DELETE /api/elections/:electionId/voters/:voterId - Supprimer un électeur
 */
router.delete('/:electionId/voters/:voterId', authenticateAdmin, async (req, res) => {
  try {
    const { electionId, voterId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (election.status !== 'draft') {
      return res.status(400).json({ error: 'Impossible de supprimer un électeur après le démarrage' });
    }

    await db.run('DELETE FROM voters WHERE id = ? AND election_id = ?', [voterId, electionId]);

    res.json({ message: 'Électeur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression électeur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
