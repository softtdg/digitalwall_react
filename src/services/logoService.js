import axiosInstance from '../utils/axiosInstance';

/**
 * Get list of available logos
 * @returns {Promise} API response with logos array
 */
export const getLogosList = async () => {
  const response = await axiosInstance.get('/api/logos/list');
  return response;
};

/**
 * Save a logo reference to the database
 * @param {string} logoUrl - Logo URL or object path
 * @returns {Promise} API response
 */
export const saveLogoReference = async (logoUrl) => {
  const response = await axiosInstance.post(
    '/api/logos/',
    { logo_url: logoUrl },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response;
};

/**
 * Delete a logo
 * @param {string|number} id - Logo ID
 * @returns {Promise} API response
 */
export const deleteLogo = async (id) => {
  const response = await axiosInstance.delete(`/api/logos/${id}`);
  return response;
};

