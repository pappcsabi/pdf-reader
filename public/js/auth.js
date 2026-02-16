const Auth = {
  async fetch(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return res;
  },

  async getMe() {
    try {
      const res = await this.fetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch (err) {
      console.error('getMe error:', err);
      return null;
    }
  },

  async login(email, password) {
    const res = await this.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Eroare autentificare');
    return data;
  },

  async register(email, password) {
    const res = await this.fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Eroare înregistrare');
    return data;
  },

  async logout() {
    await this.fetch('/api/auth/logout', { method: 'POST' });
  },
};
