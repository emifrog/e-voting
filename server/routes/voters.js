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
 * GET /api/elections/:electionId/voters - Récupérer les électeurs avec pagination
 * Params:
 *   - page: Numéro de page (défaut: 1)
 *   - limit: Électeurs par page (défaut: 50, max: 500)
 *   - search: Recherche par email ou nom (optionnel)
 *   - sort: Champ de tri (email, name, weight, has_voted, created_at) (défaut: created_at)
 *   - direction: Direction du tri (asc, desc) (défaut: desc)
 * Response: { voters, pagination: { page, pageSize, total, totalPages, hasNextPage, hasPreviousPage } }
 */
router.get('/:electionId/voters', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
    const search = req.query.search || '';
    const sort = ['email', 'name', 'weight', 'has_voted', 'created_at'].includes(req.query.sort)
      ? req.query.sort
      : 'created_at';
    const direction = req.query.direction === 'asc' ? 'asc' : 'desc';

    // Verify election exists and belongs to user
    const election = await db.get(
      'SELECT * FROM elections WHERE id = ? AND created_by = ?',
      [electionId, req.user.id]
    );

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    // Build WHERE clause
    let whereClause = 'election_id = ?';
    let whereParams = [electionId];

    if (search) {
      whereClause += ' AND (email LIKE ? OR name LIKE ?)';
      const searchPattern = `%${search}%`;
      whereParams.push(searchPattern, searchPattern);
    }

    // Get total count
    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM voters WHERE ${whereClause}`,
      whereParams
    );
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Validate page number
    if (page > totalPages && total > 0) {
      return res.status(400).json({
        error: 'Numéro de page invalide',
        totalPages
      });
    }

    // Fetch paginated voters
    const offset = (page - 1) * limit;
    const voters = await db.all(`
      SELECT id, email, name, weight, has_voted, voted_at, reminder_sent, last_reminder_at, created_at
      FROM voters
      WHERE ${whereClause}
      ORDER BY ${sort} ${direction}
      LIMIT ? OFFSET ?
    `, [...whereParams, limit, offset]);

    res.json({
      voters,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Erreur récupération électeurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des électeurs' });
  }
});

/**
 * POST /api/elections/:electionId/voters/send-emails - Envoyer les emails de vote
 * Optimized: Batch QR code generation and database updates (no N+1 queries)
 */
router.post('/:electionId/voters/send-emails', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    // Single query to fetch all voters
    const voters = await db.all('SELECT * FROM voters WHERE election_id = ?', [electionId]);

    if (voters.length === 0) {
      return res.json({
        message: 'Aucun électeur à notifier',
        sentCount: 0,
        totalVoters: 0
      });
    }

    let sentCount = 0;
    const errors = [];

    // Prepare batch update statement
    const updateQrCode = db.prepare('UPDATE voters SET qr_code = ? WHERE id = ?');
    const updateReminder = db.prepare('UPDATE voters SET reminder_sent = true, last_reminder_at = datetime(\'now\') WHERE id = ?');

    // Step 1: Generate QR codes for all voters (can be done in parallel)
    const votersWithQr = await Promise.all(
      voters.map(async (voter) => {
        try {
          const votingUrl = `${process.env.APP_URL}/vote/${voter.token}`;
          const qrCodeDataUrl = await generateVotingQRCode(votingUrl);
          return { ...voter, qrCodeDataUrl };
        } catch (error) {
          errors.push({ email: voter.email, error: `QR Code error: ${error.message}` });
          return null;
        }
      })
    );

    // Filter out failed QR code generations
    const validVoters = votersWithQr.filter(v => v !== null);

    // Step 2: Batch update QR codes in database (single transaction)
    try {
      const transaction = db.transaction(() => {
        for (const voter of validVoters) {
          updateQrCode.run(voter.qrCodeDataUrl, voter.id);
        }
      });
      transaction();
    } catch (error) {
      console.error('Erreur batch update QR codes:', error);
      errors.push({ email: 'batch', error: 'QR Code database update failed' });
    }

    // Step 3: Send emails in parallel (can be optimized further with queuing)
    const emailResults = await Promise.allSettled(
      validVoters.map(voter =>
        sendVotingEmail(voter, election, voter.qrCodeDataUrl)
          .then(result => ({ voter, result }))
      )
    );

    // Step 4: Batch update reminder flags for successfully sent emails
    const successfulVoters = [];
    for (const settlement of emailResults) {
      if (settlement.status === 'fulfilled' && settlement.value.result.success) {
        successfulVoters.push(settlement.value.voter.id);
        sentCount++;
      } else {
        const voter = settlement.value?.voter;
        const error = settlement.value?.result?.error || settlement.reason?.message;
        if (voter) {
          errors.push({ email: voter.email, error });
        }
      }
    }

    // Step 5: Batch update reminder flags (single transaction)
    try {
      const transaction = db.transaction(() => {
        for (const voterId of successfulVoters) {
          updateReminder.run(voterId);
        }
      });
      transaction();
    } catch (error) {
      console.error('Erreur batch update reminder flags:', error);
    }

    res.json({
      message: `${sentCount} email(s) envoyé(s) sur ${voters.length}`,
      sentCount,
      totalVoters: voters.length,
      qrCodesGenerated: validVoters.length,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: voters.length,
        sent: sentCount,
        failed: voters.length - sentCount - errors.length,
        errors: errors.length
      }
    });
  } catch (error) {
    console.error('Erreur envoi emails:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi des emails' });
  }
});

/**
 * PUT /api/elections/:electionId/voters/:voterId - Mettre à jour un électeur
 * Allowed fields: email, name, weight
 */
router.put('/:electionId/voters/:voterId', authenticateAdmin, async (req, res) => {
  try {
    const { electionId, voterId } = req.params;
    const { email, name, weight } = req.body;

    // Verify election exists and belongs to user
    const election = await db.get(
      'SELECT * FROM elections WHERE id = ? AND created_by = ?',
      [electionId, req.user.id]
    );

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    // Only allow editing before voting starts
    if (election.status !== 'draft') {
      return res.status(400).json({ error: 'Impossible de modifier un électeur après le démarrage' });
    }

    // Verify voter exists and belongs to this election
    const voter = await db.get(
      'SELECT * FROM voters WHERE id = ? AND election_id = ?',
      [voterId, electionId]
    );

    if (!voter) {
      return res.status(404).json({ error: 'Électeur non trouvé' });
    }

    // Validate inputs
    if (!email || email.trim().length === 0) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    // Check for duplicate email (excluding current voter)
    const existingVoter = await db.get(
      'SELECT id FROM voters WHERE email = ? AND election_id = ? AND id != ?',
      [email, electionId, voterId]
    );

    if (existingVoter) {
      return res.status(400).json({ error: 'Cet email existe déjà pour cette élection' });
    }

    // Prepare update data
    const updateFields = ['email = ?'];
    const updateParams = [email];

    if (name !== undefined && name !== null) {
      updateFields.push('name = ?');
      updateParams.push(name.trim());
    }

    if (weight !== undefined && weight !== null && election.is_weighted) {
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum < 0) {
        return res.status(400).json({ error: 'Poids doit être un nombre positif' });
      }
      updateFields.push('weight = ?');
      updateParams.push(weightNum);
    }

    updateParams.push(voterId, electionId);

    // Update voter
    await db.run(
      `UPDATE voters SET ${updateFields.join(', ')} WHERE id = ? AND election_id = ?`,
      updateParams
    );

    // Return updated voter
    const updatedVoter = await db.get(
      'SELECT * FROM voters WHERE id = ? AND election_id = ?',
      [voterId, electionId]
    );

    res.json({
      message: 'Électeur mis à jour avec succès',
      voter: updatedVoter
    });
  } catch (error) {
    console.error('Erreur mise à jour électeur:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
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

/**
 * POST /api/elections/:electionId/voters/bulk-delete - Supprimer plusieurs électeurs
 * Body: { voterIds: [...] }
 */
router.post('/:electionId/voters/bulk-delete', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { voterIds } = req.body;

    if (!Array.isArray(voterIds) || voterIds.length === 0) {
      return res.status(400).json({ error: 'IDs des électeurs requis' });
    }

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (election.status !== 'draft') {
      return res.status(400).json({ error: 'Impossible de supprimer après le démarrage' });
    }

    // Prepare batch delete with placeholders
    const placeholders = voterIds.map(() => '?').join(',');
    const deleteStmt = db.prepare(`
      DELETE FROM voters
      WHERE id IN (${placeholders}) AND election_id = ?
    `);

    const result = deleteStmt.run(...voterIds, electionId);

    res.json({
      message: `${result.changes} électeur(s) supprimé(s)`,
      deletedCount: result.changes
    });
  } catch (error) {
    console.error('Erreur suppression en masse:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression en masse' });
  }
});

/**
 * PUT /api/elections/:electionId/voters/bulk-update - Mettre à jour le poids de plusieurs électeurs
 * Body: { voterIds: [...], weight: number }
 */
router.put('/:electionId/voters/bulk-update', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { voterIds, weight } = req.body;

    if (!Array.isArray(voterIds) || voterIds.length === 0) {
      return res.status(400).json({ error: 'IDs des électeurs requis' });
    }

    if (weight === undefined || weight === null) {
      return res.status(400).json({ error: 'Poids requis' });
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 0) {
      return res.status(400).json({ error: 'Poids doit être un nombre positif' });
    }

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (!election.is_weighted) {
      return res.status(400).json({ error: 'Cette élection n\'est pas pondérée' });
    }

    if (election.status !== 'draft') {
      return res.status(400).json({ error: 'Impossible de modifier après le démarrage' });
    }

    // Prepare batch update with transaction
    const transaction = db.transaction(() => {
      const updateStmt = db.prepare('UPDATE voters SET weight = ? WHERE id = ? AND election_id = ?');
      let updatedCount = 0;

      for (const voterId of voterIds) {
        const result = updateStmt.run(weightNum, voterId, electionId);
        updatedCount += result.changes;
      }

      return updatedCount;
    });

    const updatedCount = transaction();

    res.json({
      message: `${updatedCount} électeur(s) mis à jour`,
      updatedCount
    });
  } catch (error) {
    console.error('Erreur mise à jour en masse:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour en masse' });
  }
});

/**
 * POST /api/elections/:electionId/voters/bulk-resend - Renvoyer les invitations à plusieurs électeurs
 * Body: { voterIds: [...] }
 */
router.post('/:electionId/voters/bulk-resend', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { voterIds } = req.body;

    if (!Array.isArray(voterIds) || voterIds.length === 0) {
      return res.status(400).json({ error: 'IDs des électeurs requis' });
    }

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    // Fetch voters to resend invites
    const placeholders = voterIds.map(() => '?').join(',');
    const voters = await db.all(`
      SELECT * FROM voters
      WHERE id IN (${placeholders}) AND election_id = ?
    `, [...voterIds, electionId]);

    let sentCount = 0;
    const errors = [];

    // Send emails in parallel
    const emailResults = await Promise.allSettled(
      voters.map(voter =>
        sendVotingEmail(voter, election)
          .then(result => ({ voter, result }))
      )
    );

    // Count successes and failures
    for (const settlement of emailResults) {
      if (settlement.status === 'fulfilled' && settlement.value.result.success) {
        sentCount++;
      } else {
        const voter = settlement.value?.voter;
        const error = settlement.value?.result?.error || settlement.reason?.message;
        if (voter) {
          errors.push({ email: voter.email, error });
        }
      }
    }

    res.json({
      message: `${sentCount} invitation(s) renvoyée(s) sur ${voters.length}`,
      sentCount,
      totalVoters: voters.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Erreur renvoi invitations en masse:', error);
    res.status(500).json({ error: 'Erreur lors du renvoi des invitations' });
  }
});

/**
 * POST /api/elections/:electionId/voters/bulk-export-csv - Exporter les électeurs sélectionnés en CSV
 * Body: { voterIds: [...] } (si vide, exporte tous)
 */
router.post('/:electionId/voters/bulk-export-csv', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    let { voterIds } = req.body;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    let voters;
    if (voterIds && Array.isArray(voterIds) && voterIds.length > 0) {
      // Export selected voters
      const placeholders = voterIds.map(() => '?').join(',');
      voters = await db.all(`
        SELECT id, email, name, weight, has_voted, created_at
        FROM voters
        WHERE id IN (${placeholders}) AND election_id = ?
        ORDER BY created_at DESC
      `, [...voterIds, electionId]);
    } else {
      // Export all voters
      voters = await db.all(`
        SELECT id, email, name, weight, has_voted, created_at
        FROM voters
        WHERE election_id = ?
        ORDER BY created_at DESC
      `, [electionId]);
    }

    // Build CSV content
    const headers = ['Email', 'Nom', ...(election.is_weighted ? ['Poids'] : []), 'Statut', 'Date d\'ajout'];
    const rows = voters.map(voter => [
      voter.email,
      voter.name || '',
      ...(election.is_weighted ? [voter.weight] : []),
      voter.has_voted ? 'A voté' : 'En attente',
      new Date(voter.created_at).toLocaleString('fr-FR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="electeurs_${election.id}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Erreur export CSV en masse:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

export default router;
