import axios from "axios";

const url = "http://localhost:3001/api";

const api = axios.create({
  baseURL: url,
  headers: {
    "content-type": "application/json",
  },
});

export default api;
