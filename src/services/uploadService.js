/**
 * Upload service for handling file uploads to OCI
 * Assumes backend handles OCI integration via API routes
 */

import axiosInstance from '../utils/axiosInstance';

/**
 * Upload a single image file
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} Object path of uploaded file
 */
export const uploadImageDirectToOCI = async (file) => {
  try {
    // Get presigned URL from backend
    const presignedResponse = await axiosInstance.post('/api/upload/presigned-url', {
      fileName: file.name,
      fileType: file.type,
      category: 'images',
    });

    const { uploadUrl, fileName } = presignedResponse.data;

    // Upload file directly to OCI using presigned URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload file to OCI: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    // Return object path (not full URL) for database storage
    return fileName;
  } catch (error) {
    console.error('Error uploading image to OCI:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to upload image to Oracle Cloud');
  }
};

/**
 * Upload multiple files directly to OCI
 * @param {File[]} files - Array of files to upload
 * @param {string} category - Category of files ('scl', 'plan', 'documents', 'images')
 * @returns {Promise<Array<{filename: string, originalname: string}>>} Array of uploaded file info
 */
export const uploadMultipleFilesDirectToOCI = async (files, category = 'images') => {
  try {
    const uploadPromises = files.map(async (file) => {
      // Get presigned URL from backend
      const presignedResponse = await axiosInstance.post('/api/upload/presigned-url', {
        fileName: file.name,
        fileType: file.type,
        category: category,
      });

      const { uploadUrl, fileName } = presignedResponse.data;

      // Upload file directly to OCI using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Failed to upload file to OCI: ${uploadResponse.status} ${uploadResponse.statusText}`
        );
      }

      return {
        filename: fileName, // Object path for database storage
        originalname: file.name,
      };
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files to OCI:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to upload one or more files');
  }
};

/**
 * Alternative: Upload via backend API (if presigned URLs not available)
 * This method uploads through the backend, which then handles OCI
 */
export const uploadFileViaBackend = async (file, fileType = 'image') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);

    const endpoint = fileType === 'image' ? '/api/upload' : '/api/upload/document';

    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data;

    if (data.success && data.data?.url) {
      return data.data.url;
    } else if (data.data?.url) {
      return data.data.url;
    } else {
      throw new Error('No URL found in upload response');
    }
  } catch (error) {
    console.error('Error uploading file via backend:', error);
    throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to upload file');
  }
};

