import api from '../api/axios';

const authService = {
  login: (identificador, contrasena) =>
    api.post('/auth/login', { identificador, contrasena }),
};

export default authService;