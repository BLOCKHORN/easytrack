// src/services/paquetesService.js
// 📦 Funciones relacionadas con la gestión de paquetes

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');
const API_URL = `${API_BASE}/api`;

// Crear un nuevo paquete
export async function crearPaqueteBackend(datos, token) {
  try {
    const response = await fetch(`${API_URL}/paquetes/crear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(datos)
    });

    const resultado = await response.json();

    if (!response.ok) {
      throw new Error(resultado?.error || 'Error al crear el paquete');
    }

    return resultado.paquete;
  } catch (error) {
    console.error('[crearPaqueteBackend] Error:', error);
    throw error;
  }
}

// Obtener lista de paquetes
export const obtenerPaquetesBackend = async (token) => {
  const res = await fetch(`${API_URL}/paquetes/listar`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error('Error al obtener paquetes');
  return res.json();
};

// Eliminar un paquete
export const eliminarPaqueteBackend = async (id, token) => {
  const res = await fetch(`${API_URL}/paquetes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error('Error al eliminar paquete');
};

// Marcar un paquete como entregado
export const entregarPaqueteBackend = async (id, token) => {
  const res = await fetch(`${API_URL}/paquetes/entregar/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error('Error al marcar como entregado');
};

// Editar un paquete existente
export const editarPaqueteBackend = async (paquete, token) => {
  const res = await fetch(`${API_URL}/paquetes/${paquete.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(paquete)
  });

  if (!res.ok) throw new Error('Error al editar paquete');
  return res.json();
};

// 🗂 Obtener estructura completa del almacén con paquetes agrupados por balda
export const obtenerEstructuraEstantesYPaquetes = async (token) => {
  const res = await fetch(`${API_URL}/estantes/estructura`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error('Error al obtener estructura del almacén');
  return res.json(); // { estructura: [...], paquetesPorBalda: {...} }
};
