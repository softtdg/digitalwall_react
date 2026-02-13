import axiosInstance from '../utils/axiosInstance';

/**
 * Add a new project
 * @param {Object} projectData - Project data to submit
 * @returns {Promise} API response
 */
export const addProject = async (projectData) => {
  const response = await axiosInstance.post('/api/projects/add_project', projectData, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response;
};

/**
 * Get all projects
 * @param {Object} params - Query parameters (page, limit, search, etc.)
 * @returns {Promise} API response
 */
export const getProjects = async (params = {}) => {
  const response = await axiosInstance.get('/api/projects/get_projects', {
    params,
  });
  return response;
};

/**
 * Get project titles for dropdowns
 * @returns {Promise} API response
 */
export const getProjectTitles = async () => {
  const response = await axiosInstance.get('/api/projects/get_projects_title');
  return response;
};

/**
 * Get project by code
 * @param {string} code - Project code
 * @returns {Promise} API response
 */
export const getProjectByCode = async (code) => {
  const response = await axiosInstance.get(`/api/projects/get_projects_by_code/${code}`);
  return response;
};

/**
 * Edit a project
 * @param {string} id - Project ID
 * @param {Object} projectData - Updated project data
 * @returns {Promise} API response
 */
export const editProject = async (id, projectData) => {
  const response = await axiosInstance.post(`/api/projects/edit_project/${id}`, projectData, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response;
};

/**
 * Delete a project
 * @param {string|number} id - Project ID
 * @returns {Promise} API response
 */
export const deleteProject = async (id) => {
  const response = await axiosInstance.delete(`/api/projects/remove_project/${id}`);
  return response;
};

