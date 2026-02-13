import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { addUser } from '../../services/userService';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const AddUser = () => {
  const [formData, setFormData] = useState({
    uname: '',
    password: '',
    role: 'modifier',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDropdownChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.uname || !formData.password || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the API to add the user
      const response = await addUser(formData);

      toast.success(`User "${formData.uname}" added successfully!`);

      // Reset form
      setFormData({
        uname: '',
        password: '',
        role: 'modifier',
      });
    } catch (error) {
      console.error('Error adding user:', error);

      // First, try to get error message from API response
      const apiErrorMessage =
        error.response?.data?.message || error.response?.data?.error;

      if (apiErrorMessage) {
        // Show API error message if available
        toast.error(apiErrorMessage);
      } else {
        // Fall back to manual error messages based on status codes
        if (error.response?.status === 400) {
          toast.error('Invalid user data. Please check your input.');
        } else if (error.response?.status === 409) {
          toast.error(
            'Username already exists. Please choose a different username.'
          );
        } else if (error.response?.status === 401) {
          toast.error('Unauthorized. Please login again.');
        } else if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.');
        } else if (error.code === 'NETWORK_ERROR' || !error.response) {
          toast.error('Network error. Please check your connection.');
        } else {
          // Final fallback to generic error message
          const fallbackMessage =
            error.message || 'Error adding user. Please try again.';
          toast.error(fallbackMessage);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = [{ label: 'Modifier', value: 'modifier' }];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Add User</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Username Field */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
              <label htmlFor="uname" className="block text-sm font-semibold text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PersonIcon sx={{ fontSize: 20, color: '#6b7280' }} />
                </div>
                <input
                  type="text"
                  id="uname"
                  name="uname"
                  value={formData.uname}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  placeholder="Enter username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon sx={{ fontSize: 20, color: '#6b7280' }} />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {/* Role Field */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
              <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={(e) => handleDropdownChange('role', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                <PersonAddIcon sx={{ fontSize: 20 }} />
                {isSubmitting ? 'Adding User...' : 'Add User'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUser;
