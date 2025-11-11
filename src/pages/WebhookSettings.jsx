/**
 * Webhook Settings Page
 *
 * Allows election creators to configure Slack/Teams webhook integrations
 * for receiving notifications about election events.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  PlusCircle,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Send,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

export default function WebhookSettings() {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [testingWebhook, setTestingWebhook] = useState(null);

  // Fetch webhooks
  const { data: webhooksData, isLoading } = useQuery({
    queryKey: ['webhooks', electionId],
    queryFn: async () => {
      const response = await api.get(`/api/webhooks/${electionId}`);
      return response.data;
    }
  });

  // Fetch available events
  const { data: eventsData } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: async () => {
      const response = await api.get('/api/webhooks/events/list');
      return response.data;
    }
  });

  // Delete webhook mutation
  const deleteMutation = useMutation({
    mutationFn: async (webhookId) => {
      await api.delete(`/api/webhooks/${electionId}/${webhookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks', electionId]);
    }
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ webhookId, isActive }) => {
      await api.put(`/api/webhooks/${electionId}/${webhookId}`, {
        isActive: !isActive
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks', electionId]);
    }
  });

  const handleDelete = async (webhookId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce webhook ?')) {
      deleteMutation.mutate(webhookId);
    }
  };

  const handleToggleActive = (webhook) => {
    toggleActiveMutation.mutate({
      webhookId: webhook.id,
      isActive: webhook.is_active
    });
  };

  const getPlatformIcon = (platform) => {
    if (platform === 'slack') {
      return '💬';
    } else if (platform === 'teams') {
      return '🔷';
    }
    return '🔗';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const webhooks = webhooksData?.webhooks || [];

  return (
    <div className="min-h-screen py-8" style={{ background: '#1A1D21' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/elections/${electionId}`)}
            className="flex items-center mb-4"
            style={{ color: '#9CA3AF', cursor: 'pointer', background: 'transparent', border: 'none', padding: '8px' }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour à l'élection
          </button>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#EFEFEF' }}>
                Configuration des Webhooks
              </h1>
              <p className="mt-2" style={{ color: '#9CA3AF' }}>
                Recevez des notifications en temps réel sur Slack ou Microsoft Teams
              </p>
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ background: '#74E2DE', color: '#1A1D21', fontWeight: '600' }}
            >
              <PlusCircle className="w-5 h-5" />
              Ajouter un webhook
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(116, 226, 222, 0.1)', border: '1px solid rgba(116, 226, 222, 0.3)' }}>
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#74E2DE' }} />
            <div className="text-sm" style={{ color: '#9CA3AF' }}>
              <p className="font-semibold mb-1" style={{ color: '#74E2DE' }}>Comment configurer un webhook ?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Slack :</strong> Créez un webhook entrant dans votre workspace Slack
                  (Apps → Incoming Webhooks)
                </li>
                <li>
                  <strong>Teams :</strong> Créez un connecteur webhook entrant dans votre canal Teams
                  (⋯ → Connecteurs → Webhook entrant)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Webhooks List */}
        {webhooks.length === 0 ? (
          <div className="rounded-lg shadow p-12 text-center" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#EFEFEF' }}>
              Aucun webhook configuré
            </h3>
            <p className="mb-6" style={{ color: '#9CA3AF' }}>
              Ajoutez votre premier webhook pour recevoir des notifications
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
              style={{ background: '#74E2DE', color: '#1A1D21', fontWeight: '600' }}
            >
              <PlusCircle className="w-5 h-5" />
              Ajouter un webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                events={eventsData?.events || []}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onEdit={(w) => setEditingWebhook(w)}
                onTest={(w) => setTestingWebhook(w)}
                getPlatformIcon={getPlatformIcon}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {(showAddForm || editingWebhook) && (
          <WebhookFormModal
            electionId={electionId}
            webhook={editingWebhook}
            events={eventsData?.events || []}
            onClose={() => {
              setShowAddForm(false);
              setEditingWebhook(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries(['webhooks', electionId]);
              setShowAddForm(false);
              setEditingWebhook(null);
            }}
          />
        )}

        {/* Test Modal */}
        {testingWebhook && (
          <TestWebhookModal
            webhook={testingWebhook}
            onClose={() => setTestingWebhook(null)}
          />
        )}
      </div>
    </div>
  );
}

// Webhook Card Component
function WebhookCard({
  webhook,
  events,
  onDelete,
  onToggleActive,
  onEdit,
  onTest,
  getPlatformIcon
}) {
  const eventNames = events
    .filter(e => webhook.events.includes(e.id))
    .map(e => e.name);

  return (
    <div className="rounded-lg shadow hover:shadow-md transition-shadow p-6" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{getPlatformIcon(webhook.platform)}</span>
            <div>
              <h3 className="text-lg font-semibold capitalize" style={{ color: '#EFEFEF' }}>
                {webhook.platform}
              </h3>
              <p className="text-sm font-mono truncate max-w-md" style={{ color: '#9CA3AF' }}>
                {webhook.webhook_url.substring(0, 50)}...
              </p>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-sm font-medium mb-2" style={{ color: '#9CA3AF' }}>
              Événements surveillés :
            </p>
            <div className="flex flex-wrap gap-2">
              {eventNames.map((name, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-xs font-medium rounded-full"
                  style={{ background: 'rgba(116, 226, 222, 0.1)', color: '#74E2DE', border: '1px solid rgba(116, 226, 222, 0.3)' }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {webhook.last_triggered_at && (
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Dernier déclenchement :{' '}
              {new Date(webhook.last_triggered_at).toLocaleString('fr-FR')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => onToggleActive(webhook)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              webhook.is_active
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label={webhook.is_active ? 'Actif' : 'Inactif'}
          >
            {webhook.is_active ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Actif
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Inactif
              </>
            )}
          </button>

          <button
            onClick={() => onTest(webhook)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
            aria-label="Tester le webhook"
          >
            <Send className="w-4 h-4" />
            Tester
          </button>

          <button
            onClick={() => onEdit(webhook)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Modifier le webhook"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </button>

          <button
            onClick={() => onDelete(webhook.id)}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            aria-label="Supprimer le webhook"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// Webhook Form Modal Component
function WebhookFormModal({ electionId, webhook, events, onClose, onSuccess }) {
  const [platform, setPlatform] = useState(webhook?.platform || 'slack');
  const [webhookUrl, setWebhookUrl] = useState(webhook?.webhookUrl || '');
  const [selectedEvents, setSelectedEvents] = useState(webhook?.events || []);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (webhook) {
        await api.put(`/api/webhooks/${electionId}/${webhook.id}`, data);
      } else {
        await api.post(`/api/webhooks/${electionId}`, data);
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!webhookUrl.startsWith('https://')) {
      setError('L\'URL doit commencer par https://');
      return;
    }

    if (selectedEvents.length === 0) {
      setError('Sélectionnez au moins un événement');
      return;
    }

    mutation.mutate({
      platform,
      webhookUrl,
      events: selectedEvents
    });
  };

  const toggleEvent = (eventId) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {webhook ? 'Modifier le webhook' : 'Ajouter un webhook'}
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plateforme
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPlatform('slack')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    platform === 'slack'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">💬</div>
                  <div className="font-semibold">Slack</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('teams')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    platform === 'teams'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">🔷</div>
                  <div className="font-semibold">Microsoft Teams</div>
                </button>
              </div>
            </div>

            {/* Webhook URL */}
            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-2">
                URL du webhook
              </label>
              <input
                type="url"
                id="webhookUrl"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Events Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Événements à surveiller
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {events.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{event.name}</div>
                      <div className="text-sm text-gray-600">{event.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Test Webhook Modal Component
function TestWebhookModal({ webhook, onClose }) {
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await api.post('/api/webhooks/test', {
        platform: webhook.platform,
        webhookUrl: webhook.webhook_url
      });

      setResult({
        success: true,
        message: response.data.message
      });
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Échec du test'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Tester le webhook
          </h2>

          <p className="text-gray-600 mb-6">
            Un message de test sera envoyé à votre canal {webhook.platform === 'slack' ? 'Slack' : 'Teams'}.
          </p>

          {result && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {result.message}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
            {!result && (
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {testing ? 'Envoi...' : 'Envoyer le test'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
