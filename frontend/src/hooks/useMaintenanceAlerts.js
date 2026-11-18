import { useEffect, useState } from 'react';
import api from '../services/api';

export default function useMaintenanceAlerts(enabled) {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setAlerts([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    let active = true;
    let requestNumber = 0;
    setLoading(true);
    const loadAlerts = async () => {
      const currentRequest = ++requestNumber;
      try {
        const response = await api.get('/vehicles/maintenance-alerts');
        if (active && currentRequest === requestNumber) {
          setAlerts(response.data.data);
          setError('');
        }
      } catch {
        if (active && currentRequest === requestNumber) {
          setError('No se pudieron actualizar las alertas de mantenimiento.');
        }
      } finally {
        if (active && currentRequest === requestNumber) {
          setLoading(false);
        }
      }
    };

    loadAlerts();
    const interval = window.setInterval(loadAlerts, 60000);
    window.addEventListener('maintenance-updated', loadAlerts);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('maintenance-updated', loadAlerts);
    };
  }, [enabled]);

  return { alerts, error, loading };
}
