import { memo, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

function ResultsChart({ results, votingType }) {
  if (!results || !results.results) return null;

  // Préparer les données pour les graphiques (memoized pour éviter recalculs inutiles)
  const data = useMemo(() => {
    return results.results.map((result, index) => ({
      name: result.option.option_text.length > 30
        ? result.option.option_text.substring(0, 30) + '...'
        : result.option.option_text,
      votes: parseInt(result.votes || result.approvals || 0),
      percentage: parseFloat(result.percentage || 0),
      weight: parseFloat(result.weight || 0),
      color: COLORS[index % COLORS.length]
    }));
  }, [results.results]);

  return (
    <div style={{ marginTop: '40px' }}>
      <h2 style={{
        fontSize: '24px',
        marginBottom: '30px',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        📊 Visualisation des résultats
      </h2>

      <div className="grid grid-2">
        {/* Graphique à barres */}
        <div className="card" style={{ background: 'white' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: 'var(--gray-700)' }}>
            Répartition des votes
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                style={{ fontSize: '12px' }}
              />
              <YAxis />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar
                dataKey="votes"
                fill="url(#colorGradient)"
                name="Nombre de votes"
                radius={[8, 8, 0, 0]}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique circulaire */}
        <div className="card" style={{ background: 'white' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: 'var(--gray-700)' }}>
            Répartition en pourcentage
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="percentage"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: 'var(--gray-700)' }}>
          Résultats détaillés
        </h3>
        <table className="table">
          <thead>
            <tr>
              <th>Position</th>
              <th>Option</th>
              <th>Votes</th>
              <th>Pourcentage</th>
              <th>Visualisation</th>
            </tr>
          </thead>
          <tbody>
            {results.results.map((result, index) => (
              <tr key={index}>
                <td>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: index === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                               index === 1 ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' :
                               index === 2 ? 'linear-gradient(135deg, #fca5a5, #dc2626)' :
                               'var(--gray-200)',
                    color: index < 3 ? 'white' : 'var(--gray-600)',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {index + 1}
                  </span>
                </td>
                <td>
                  <strong>{result.option.option_text}</strong>
                  {result.option.candidate_name && (
                    <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      {result.option.candidate_name}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: '16px', fontWeight: '600' }}>
                    {result.votes || result.approvals || 0}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {result.percentage}%
                  </span>
                </td>
                <td>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${result.percentage}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Wrap avec React.memo pour éviter re-renders inutiles quand les props ne changent pas
export default memo(ResultsChart);
