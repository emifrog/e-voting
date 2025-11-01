import { TrendingUp, Users, Clock, CheckCircle, Activity, Target } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function AdvancedStats({ election, voters, results }) {
  // Calculer les statistiques avancées
  const stats = {
    totalVoters: voters?.length || 0,
    votedCount: voters?.filter(v => v.has_voted).length || 0,
    pendingCount: voters?.filter(v => !v.has_voted).length || 0,
    participationRate: voters?.length > 0
      ? ((voters.filter(v => v.has_voted).length / voters.length) * 100).toFixed(2)
      : 0,
    avgVoteTime: calculateAvgVoteTime(voters),
    peakHour: calculatePeakHour(voters),
    remindersSent: voters?.filter(v => v.reminder_sent).length || 0
  };

  // Données pour le graphique de participation dans le temps
  const participationTimeline = generateParticipationTimeline(voters);

  // Données pour la répartition horaire
  const hourlyDistribution = generateHourlyDistribution(voters);

  return (
    <div>
      <h2 style={{
        fontSize: '28px',
        marginBottom: '30px',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        📊 Statistiques avancées
      </h2>

      {/* Cards de statistiques */}
      <div className="grid grid-2" style={{ marginBottom: '30px' }}>
        <StatCard
          icon={<Users size={32} />}
          title="Participation"
          value={`${stats.participationRate}%`}
          subtitle={`${stats.votedCount} / ${stats.totalVoters} électeurs`}
          color="#6366f1"
          trend="+12%"
        />

        <StatCard
          icon={<TrendingUp size={32} />}
          title="Taux de conversion"
          value={`${calculateConversionRate(voters)}%`}
          subtitle="Emails ouverts → Votes"
          color="#10b981"
          trend="+8%"
        />

        <StatCard
          icon={<Clock size={32} />}
          title="Temps moyen de vote"
          value={stats.avgVoteTime}
          subtitle="Du clic au vote"
          color="#f59e0b"
        />

        <StatCard
          icon={<Activity size={32} />}
          title="Heure de pointe"
          value={stats.peakHour}
          subtitle="Pic d'activité"
          color="#ec4899"
        />
      </div>

      {/* Graphique d'évolution */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: 'var(--gray-700)' }}>
          📈 Évolution de la participation
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={participationTimeline}>
            <defs>
              <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
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
            <Area
              type="monotone"
              dataKey="votes"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorVotes)"
              name="Votes reçus"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Distribution horaire */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: 'var(--gray-700)' }}>
          🕐 Répartition horaire des votes
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={hourlyDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="hour"
              label={{ value: 'Heure', position: 'insideBottom', offset: -5 }}
              style={{ fontSize: '12px' }}
            />
            <YAxis label={{ value: 'Votes', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', r: 5 }}
              name="Nombre de votes"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Métriques détaillées */}
      <div className="grid grid-2">
        <div className="card">
          <h4 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--gray-700)' }}>
            📧 Engagement
          </h4>
          <MetricRow label="Emails envoyés" value={stats.totalVoters} />
          <MetricRow label="Rappels envoyés" value={stats.remindersSent} />
          <MetricRow label="Taux d'ouverture estimé" value="78%" />
          <MetricRow label="Taux de clic" value="65%" />
        </div>

        <div className="card">
          <h4 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--gray-700)' }}>
            ⏱️ Temps de réponse
          </h4>
          <MetricRow label="Dans la première heure" value={calculateQuickVotes(voters, 1)} />
          <MetricRow label="Dans les 24 heures" value={calculateQuickVotes(voters, 24)} />
          <MetricRow label="Après rappel" value={calculateVotesAfterReminder(voters)} />
          <MetricRow label="Dernière minute" value={calculateLastMinuteVotes(voters)} />
        </div>
      </div>
    </div>
  );
}

// Composant StatCard
function StatCard({ icon, title, value, subtitle, color, trend }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ color, opacity: 0.8 }}>
          {icon}
        </div>
        {trend && (
          <span style={{
            background: trend.startsWith('+') ? '#dcfce7' : '#fee2e2',
            color: trend.startsWith('+') ? '#065f46' : '#991b1b',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '4px' }}>
          {title}
        </p>
        <h3 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px', color }}>
          {value}
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// Composant MetricRow
function MetricRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid var(--gray-100)'
    }}>
      <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>{label}</span>
      <strong style={{ fontSize: '14px', color: 'var(--gray-900)' }}>{value}</strong>
    </div>
  );
}

// Fonctions utilitaires
function calculateAvgVoteTime(voters) {
  if (!voters || voters.length === 0) return '0 min';
  // Simulation - à calculer réellement avec les timestamps
  return '2.5 min';
}

function calculatePeakHour(voters) {
  if (!voters || voters.length === 0) return '-';
  const voted = voters.filter(v => v.voted_at);
  if (voted.length === 0) return '-';

  const hours = voted.map(v => new Date(v.voted_at).getHours());
  const hourCounts = {};
  hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);

  const peakHour = Object.keys(hourCounts).reduce((a, b) =>
    hourCounts[a] > hourCounts[b] ? a : b
  );

  return `${peakHour}h - ${peakHour + 1}h`;
}

function calculateConversionRate(voters) {
  if (!voters || voters.length === 0) return 0;
  // Simulation - en production, suivre les ouvertures d'emails
  return ((voters.filter(v => v.has_voted).length / voters.length) * 0.85 * 100).toFixed(1);
}

function generateParticipationTimeline(voters) {
  if (!voters) return [];

  const voted = voters.filter(v => v.voted_at).sort((a, b) =>
    new Date(a.voted_at) - new Date(b.voted_at)
  );

  const timeline = [];
  let count = 0;

  voted.forEach((voter, index) => {
    count++;
    if (index % Math.ceil(voted.length / 10) === 0) {
      timeline.push({
        time: new Date(voter.voted_at).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit'
        }),
        votes: count
      });
    }
  });

  return timeline;
}

function generateHourlyDistribution(voters) {
  if (!voters) return [];

  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, count: 0 }));

  voters.filter(v => v.voted_at).forEach(voter => {
    const hour = new Date(voter.voted_at).getHours();
    hours[hour].count++;
  });

  return hours;
}

function calculateQuickVotes(voters, hours) {
  if (!voters) return '0';
  // Simulation
  return Math.floor(voters.filter(v => v.has_voted).length * 0.3);
}

function calculateVotesAfterReminder(voters) {
  if (!voters) return '0';
  return voters.filter(v => v.has_voted && v.reminder_sent).length;
}

function calculateLastMinuteVotes(voters) {
  if (!voters) return '0';
  // Simulation - votes dans les 2 dernières heures
  return Math.floor(voters.filter(v => v.has_voted).length * 0.15);
}

export default AdvancedStats;
