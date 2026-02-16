const Documents = {
  async fetch(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      credentials: 'include',
      headers: options.headers || {},
    });
    return res;
  },

  async list() {
    const res = await this.fetch('/api/documents');
    if (!res.ok) throw new Error('Eroare la listare');
    const data = await res.json();
    return data.documents;
  },

  async get(id) {
    const res = await this.fetch(`/api/documents/${id}`);
    if (!res.ok) throw new Error('Document negăsit');
    return res.json();
  },

  async upload(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await this.fetch('/api/documents/upload', {
      method: 'POST',
      body: form,
      headers: {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Eroare la încărcare');
    return data;
  },

  async delete(id) {
    const res = await this.fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Eroare la ștergere');
  },

  fileUrl(id) {
    return `/api/documents/${id}/file`;
  },
};
