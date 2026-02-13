import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { deleteProject, getProjectTitles } from '../../services/projectService';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';

const DeleteProject = () => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch project titles on mount
  useEffect(() => {
    fetchProjectTitles();
  }, []);

  // Fetch project titles
  const fetchProjectTitles = async () => {
    try {
      const response = await getProjectTitles();
      const projects = response.data?.projects || [];
      const options = projects.map((item) => ({
        label: item.title || 'Untitled Project',
        value: item.code,
      }));
      setProjectOptions(options);
    } catch (error) {
      console.error('Error fetching project titles:', error);
      toast.error('Failed to load projects');
    }
  };

  // Handle project selection
  const handleProjectChange = (event, newValue) => {
    setSelectedProject(newValue);
  };

  // Handle delete button click - opens confirmation modal
  const handleDeleteClick = () => {
    if (!selectedProject) {
      toast.error('Please select a project to delete');
      return;
    }
    setShowConfirmModal(true);
  };

  // Handle confirmed deletion
  const handleConfirmDelete = async () => {
    if (!selectedProject) {
      return;
    }

    setShowConfirmModal(false);
    setIsDeleting(true);

    try {
      const response = await deleteProject(selectedProject.value);

      if (response.status === 200 || response.status === 201) {
        // Get the project name for the success message
        const projectName = selectedProject.label || 'Project';
        toast.success(`Project "${projectName}" deleted successfully!`);

        // Clear the selected project
        setSelectedProject(null);

        // Refresh the project list
        await fetchProjectTitles();

        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setIsDeleting(false);
        toast.error('Failed to delete project. Please try again.');
      }
    } catch (error) {
      setIsDeleting(false);
      console.error('Error deleting project:', error);

      // Show appropriate error message based on error type
      if (error.response?.status === 404) {
        toast.error('Project not found. It may have already been deleted.');
      } else if (error.response?.status === 401) {
        toast.error('Unauthorized. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to delete this project.");
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        toast.error('Network error. Please check your connection.');
      } else {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          'Error deleting project. Please try again.';
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Delete Project</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Warning Banner */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <WarningIcon sx={{ fontSize: 24, color: '#f59e0b', mr: 2, mt: 0.5 }} />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                    Warning: This action cannot be undone
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Deleting a project will permanently remove it from the system. All associated data will be lost.
                  </p>
                </div>
              </div>
            </div>

            {/* Project Selector */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Project to Delete
              </label>
              <Autocomplete
                options={projectOptions}
                value={selectedProject}
                onChange={handleProjectChange}
                getOptionLabel={(option) => option.label || ''}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select a project to delete"
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                        border: '1px solid #7373734D',
                        borderRadius: '6px',
                        fontSize: '14px',
                        '& fieldset': {
                          border: 'none',
                        },
                        '&:hover fieldset': {
                          border: 'none',
                        },
                        '&.Mui-focused fieldset': {
                          border: 'none',
                        },
                      },
                    }}
                  />
                )}
                sx={{ width: '100%' }}
              />
            </div>

            {/* Delete Button */}
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isDeleting || !selectedProject}
                className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                <DeleteIcon sx={{ fontSize: 20 }} />
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 p-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-3 bg-red-100 rounded-full">
                  <DeleteIcon sx={{ fontSize: 32, color: '#dc2626' }} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 text-center">Confirm Deletion</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-center mb-2">
                Are you sure you want to delete the project:
              </p>
              <p className="text-gray-800 font-semibold text-center mb-6">
                "{selectedProject.label}"?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800 text-center">
                  <WarningIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  This action cannot be undone. All project data will be permanently deleted.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    toast('Project deletion cancelled', {
                      icon: 'ℹ️',
                      style: {
                        background: '#2196F3',
                        color: '#fff',
                      },
                    });
                  }}
                  disabled={isDeleting}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <DeleteIcon sx={{ fontSize: 18 }} />
                      Delete Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteProject;
