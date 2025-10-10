const API_BASE = 'http://localhost:3000/api'

export const api = {
  async get(url) {
    const response = await fetch(`${API_BASE}${url}`)
    return response.json()
  },
  
  async post(url, data) {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },
  
  async put(url, data) {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return response.json()
  }
}