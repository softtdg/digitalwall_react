import axiosInstance from '../utils/axiosInstance';

/**
 * Add a new user
 * @param {Object} userData - User data to submit (uname, password, role)
 * @returns {Promise} API response
 */
export const addUser = async (userData) => {
  const response = await axiosInstance.post('/auth/register_user', userData, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response;
};

