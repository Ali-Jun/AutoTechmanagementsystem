import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "";

export const apiEnabled = Boolean(baseURL);

export const api = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
  },
});

export function setApiToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export const apiClient = {
  login: (payload) => api.post("/login", payload),
  register: (payload) => api.post("/register", payload),
  me: () => api.get("/me"),
  logout: () => api.post("/logout"),
  services: () => api.get("/services"),
  createService: (payload) => api.post("/services", payload),
  updateService: (id, payload) => api.put(`/services/${id}`, payload),
  bookings: () => api.get("/bookings"),
  createBooking: (payload) => api.post("/bookings", payload),
  updateBooking: (id, payload) => api.put(`/bookings/${id}`, payload),
  mechanics: () => api.get("/mechanics"),
  createMechanic: (payload) => api.post("/mechanics", payload),
  invoices: () => api.get("/invoices"),
  createInvoice: (payload) => api.post("/invoices", payload),
  payments: () => api.get("/payments"),
  createPayment: (payload) => api.post("/payments", payload),
  feedback: () => api.get("/feedback"),
  createFeedback: (payload) => api.post("/feedback", payload),
  reports: () => api.get("/reports"),
};
