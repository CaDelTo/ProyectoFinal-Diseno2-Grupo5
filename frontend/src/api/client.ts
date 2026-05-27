import ky from 'ky';

function getToken(): string | null {
  return sessionStorage.getItem('access_token');
}

// Use absolute URL so ky works in both browser and Node.js (jsdom) test environments.
// In jsdom, window.location.origin is 'http://localhost'.
const API_BASE =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/`
    : 'http://localhost/api/v1/';

export const apiClient = ky.create({
  prefixUrl: API_BASE,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
  },
  retry: 0,
});
