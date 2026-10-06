

const API_URL = import.meta.env.PROD
  ? window.location.origin
  : (window.location.origin || 'http://localhost:8080');

export const teamApi = {
  getTeams: async (token) => {
    const res = await fetch(`${API_URL}/api/teams`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  },
  getTeamActivity: async (token, teamId, page = 1, limit = 50) => {
    const res = await fetch(`${API_URL}/api/teams/${teamId}/activity?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch team activity');
    return res.json();
  }
};
