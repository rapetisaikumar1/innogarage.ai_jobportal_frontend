import api from '../services/api';

let cachedGoogleClientId;
let pendingGoogleClientIdRequest = null;

export const getGoogleClientId = async () => {
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (envClientId) return envClientId;

  if (cachedGoogleClientId !== undefined) {
    return cachedGoogleClientId;
  }

  if (!pendingGoogleClientIdRequest) {
    pendingGoogleClientIdRequest = api
      .get('/auth/public-config', { dedupe: false })
      .then(({ data }) => {
        cachedGoogleClientId = (data?.googleClientId || '').trim();
        return cachedGoogleClientId;
      })
      .catch(() => {
        cachedGoogleClientId = '';
        return cachedGoogleClientId;
      })
      .finally(() => {
        pendingGoogleClientIdRequest = null;
      });
  }

  return pendingGoogleClientIdRequest;
};