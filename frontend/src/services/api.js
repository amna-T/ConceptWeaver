import axios from "axios";

// Create an Axios instance pointing to our backend
// In Docker, the backend `conceptweaver-api` is exposed on port 5000.
const api = axios.create({
    baseURL: "http://localhost:5000"
});

// Interceptor: This runs before every request we make.
// It checks if we have a token, and if so, attaches it to the Authorization header.
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
