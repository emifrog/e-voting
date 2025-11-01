/**
 * Utilitaires d'export des résultats
 */

/**
 * Exporter en CSV
 */
export const exportToCSV = (results, election) => {
  const { results: data, stats } = results;

  // En-têtes
  const headers = ['Position', 'Option', 'Candidat', 'Votes', 'Pourcentage', 'Poids'].join(',');

  // Données
  const rows = data.map((result, index) => {
    return [
      index + 1,
      `"${result.option.option_text}"`,
      `"${result.option.candidate_name || '-'}"`,
      result.votes || result.approvals || 0,
      result.percentage,
      result.weight || '-'
    ].join(',');
  });

  // Statistiques
  const statsRows = [
    '',
    'STATISTIQUES',
    `"Total électeurs",${stats.total_voters}`,
    `"Ont voté",${stats.voted_count}`,
    `"Taux de participation",${stats.participation_rate}%`
  ];

  // Combiner
  const csv = [
    `RÉSULTATS - ${election.title}`,
    `Date : ${new Date().toLocaleString('fr-FR')}`,
    '',
    headers,
    ...rows,
    ...statsRows
  ].join('\n');

  // Télécharger
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `resultats-${election.id}-${Date.now()}.csv`;
  link.click();
};

/**
 * Exporter en JSON
 */
export const exportToJSON = (results, election) => {
  const exportData = {
    election: {
      id: election.id,
      title: election.title,
      voting_type: election.voting_type,
      exported_at: new Date().toISOString()
    },
    statistics: results.stats,
    results: results.results.map((r, index) => ({
      position: index + 1,
      option: r.option.option_text,
      candidate: r.option.candidate_name,
      votes: r.votes || r.approvals || 0,
      percentage: parseFloat(r.percentage),
      weight: r.weight
    }))
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `resultats-${election.id}-${Date.now()}.json`;
  link.click();
};

/**
 * Exporter en format Excel (HTML table)
 */
export const exportToExcel = (results, election) => {
  const { results: data, stats } = results;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; font-weight: bold; }
        .header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .stats { margin-top: 20px; background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">RÉSULTATS - ${election.title}</div>
      <div>Date : ${new Date().toLocaleString('fr-FR')}</div>
      <br>

      <table>
        <thead>
          <tr>
            <th>Position</th>
            <th>Option</th>
            <th>Candidat</th>
            <th>Votes</th>
            <th>Pourcentage</th>
            <th>Poids</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((result, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${result.option.option_text}</td>
              <td>${result.option.candidate_name || '-'}</td>
              <td>${result.votes || result.approvals || 0}</td>
              <td>${result.percentage}%</td>
              <td>${result.weight || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <br>
      <table class="stats">
        <tr>
          <th colspan="2">STATISTIQUES</th>
        </tr>
        <tr>
          <td><strong>Total électeurs</strong></td>
          <td>${stats.total_voters}</td>
        </tr>
        <tr>
          <td><strong>Ont voté</strong></td>
          <td>${stats.voted_count}</td>
        </tr>
        <tr>
          <td><strong>Taux de participation</strong></td>
          <td>${stats.participation_rate}%</td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `resultats-${election.id}-${Date.now()}.xls`;
  link.click();
};

/**
 * Imprimer les résultats
 */
export const printResults = (results, election) => {
  const printWindow = window.open('', '_blank');
  const { results: data, stats } = results;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Résultats - ${election.title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #6366f1;
          padding-bottom: 20px;
        }
        h1 {
          color: #6366f1;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background: #6366f1;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background: #f9fafb;
        }
        .stats {
          margin-top: 40px;
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🗳️ ${election.title}</h1>
        <p>Résultats du scrutin</p>
        <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><strong>Type :</strong> ${election.voting_type}</p>
      </div>

      <h2>Résultats détaillés</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 80px;">Position</th>
            <th>Option</th>
            <th>Candidat</th>
            <th style="width: 100px;">Votes</th>
            <th style="width: 120px;">Pourcentage</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((result, index) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${index + 1}</td>
              <td><strong>${result.option.option_text}</strong></td>
              <td>${result.option.candidate_name || '-'}</td>
              <td style="text-align: center;">${result.votes || result.approvals || 0}</td>
              <td style="text-align: center; font-weight: bold;">${result.percentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="stats">
        <h2>Statistiques</h2>
        <p><strong>Total électeurs inscrits :</strong> ${stats.total_voters}</p>
        <p><strong>Nombre de votants :</strong> ${stats.voted_count}</p>
        <p><strong>Taux de participation :</strong> ${stats.participation_rate}%</p>
        <p><strong>Abstention :</strong> ${(100 - parseFloat(stats.participation_rate)).toFixed(2)}%</p>
      </div>

      <div class="footer">
        <p>Document généré par E-Voting Platform</p>
        <p>Certifié conforme aux résultats officiels</p>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 40px;">
        <button onclick="window.print()" style="padding: 10px 30px; background: #6366f1; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
          🖨️ Imprimer
        </button>
        <button onclick="window.close()" style="padding: 10px 30px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">
          Fermer
        </button>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
};

export default { exportToCSV, exportToJSON, exportToExcel, printResults };
