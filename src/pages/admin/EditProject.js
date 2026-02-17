import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { editProject, getProjectTitles, getProjectByCode, getProjectfile } from '../../services/projectService';
import { getLogosList, saveLogoReference, deleteLogo } from '../../services/logoService';
import { uploadImageDirectToOCI, uploadMultipleFilesDirectToOCI } from '../../services/uploadService';
import { getOciUrl } from '../../utils/ociUrl';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DiamondIcon from '@mui/icons-material/Diamond';
import DeleteIcon from '@mui/icons-material/Delete';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Cropper from 'react-easy-crop';

const EditProject = () => {
  // Form data state
  const [formData, setFormData] = useState({
    image: null,
    title: '',
    logo: '',
    manufactureLogo: '',
    manager: '',
    cont_deliverable_total: '',
    cont_deliverable_rem: '',
    cont_deliverable_sts: '',
    fixture: '',
    files: '',
    legal: '',
    risk_status: '',
    risk_sts: '',
    comp_drawing_total: '',
    comp_drawing_rem: '',
    comp_drawing_sts: '',
    parts_to_buy_total: '',
    parts_to_buy_rem: '',
    parts_to_buy_sts: '',
    pro_readiness_total: '',
    pro_readiness_rem: '',
    pro_readiness_sts: '',
    cont_del_sts: '',
    amount: '',
    amount_rem: '',
    amount_sts: '',
    currencySymbol: '',
    currencyCode: '',
    SCL: [],
    pro_plan: [],
  });

  // Project selection state
  const [projectOptions, setProjectOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [noNRC, setNoNRC] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Logo states
  const [staticLogoOptions, setStaticLogoOptions] = useState([]);
  const [customLogoFile, setCustomLogoFile] = useState(null);
  const [customLogoPreview, setCustomLogoPreview] = useState('');
  const [customManufacturerLogoFile, setCustomManufacturerLogoFile] = useState(null);
  const [customManufacturerLogoPreview, setCustomManufacturerLogoPreview] = useState('');
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoModalContext, setLogoModalContext] = useState(null);
  const [isLogoSaving, setIsLogoSaving] = useState(false);
  const [isLogoListLoading, setIsLogoListLoading] = useState(false);
  const [showDeleteLogoModal, setShowDeleteLogoModal] = useState(false);
  const [logoToDelete, setLogoToDelete] = useState(null);

  // Image cropping states
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [originalImageFile, setOriginalImageFile] = useState(null);

  // Options
  const currencyOptions = [
    { label: '$ - USD', value: 'USD', symbol: '$' },
    { label: '$ - CAD', value: 'CAD', symbol: '$' },
    { label: '€ - EUR', value: 'EUR', symbol: '€' },
  ];

  const managerOptions = [
    { label: 'GABRIEL P', value: 'GABRIEL P' },
    { label: 'Sagar R.', value: 'Sagar R.' },
    { label: 'Camilla', value: 'Camilla' },
    { label: 'Melissa', value: 'Melissa' },
    { label: 'WALEED I', value: 'WALEED I' },
  ];

  const riskStatusOptions = [
    { label: 'None', value: '1' },
    { label: 'Yellow', value: '2' },
    { label: 'Green', value: '3' },
    { label: 'Red', value: '4' },
    { label: 'Double Red', value: '5' },
  ];

  // Helper function to render status icon (matching ProjectCard style)
  const renderStatusIcon = (statusValue) => {
    const val = Number(statusValue);

    if (val === 1) {
      return <em className="text-transparent flex-shrink-0"></em>;
    }
    if (val === 2) {
      return <div className="w-[15px] h-[15px] bg-[rgb(255,215,5)] rotate-45 flex-shrink-0"></div>;
    }
    if (val === 3) {
      return <div className="w-[12px] h-[12px] bg-green-500 rotate-45 flex-shrink-0"></div>;
    }
    if (val === 4) {
      return <div className="w-[18px] h-[18px] bg-red-500 rotate-45 flex-shrink-0"></div>;
    }
    if (val === 5) {
      return (
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-[18px] h-[18px] bg-red-500 rotate-45 mr-1"></div>
          <div className="w-[18px] h-[18px] bg-red-500 rotate-45"></div>
        </div>
      );
    }
    return <em className="text-gray-400 text-xs flex-shrink-0">None</em>;
  };

  // Fetch project titles on mount
  useEffect(() => {
    fetchProjectTitles();
    loadLogos();
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      if (customLogoPreview) {
        URL.revokeObjectURL(customLogoPreview);
      }
      if (customManufacturerLogoPreview) {
        URL.revokeObjectURL(customManufacturerLogoPreview);
      }
      if (imageToCrop && imageToCrop.startsWith('blob:')) {
        URL.revokeObjectURL(imageToCrop);
      }
    };
  }, [imagePreview, customLogoPreview, customManufacturerLogoPreview, imageToCrop]);

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
    }
  };

  // Load logos from API
  const loadLogos = useCallback(async () => {
    setIsLogoListLoading(true);
    try {
      const response = await getLogosList();
      const logos = Array.isArray(response.data?.data) ? response.data.data : [];
      const normalized = logos
        .map((logo, index) => {
          const cleanedUrl = sanitizeLogoUrl(logo?.logo_url);
          if (!cleanedUrl) return null;
          return {
            id: logo?.id ?? `logo-${index}`,
            url: cleanedUrl,
          };
        })
        .filter(Boolean);
      setStaticLogoOptions(normalized);
    } catch (error) {
      console.error('Failed to load logos:', error);
      toast.error('Unable to load logos. Please try again.');
    } finally {
      setIsLogoListLoading(false);
    }
  }, []);

  // Sanitize logo URL
  const sanitizeLogoUrl = useCallback((url) => {
    if (!url) return '';
    let cleaned = url.trim().replace(/%22/gi, '');
    cleaned = cleaned.replace(/^"+|"+$/g, '');
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch (error) {
      // ignore decode errors
    }
    return cleaned;
  }, []);

  // Fetch image preview
  const fetchImagePreview = useCallback(async (imagePath) => {
    if (!imagePath || imagePath === 'null' || imagePath === '') {
      setImagePreview('');
      return;
    }

    try {
      // Check if image is already a base64 data URL
      if (imagePath.startsWith('data:')) {
        setImagePreview(imagePath);
        return;
      }
      // Check if image is already a full URL
      else if (imagePath.startsWith('https://')) {
        setImagePreview(imagePath);
        return;
      }
      // Otherwise, it's an object path - construct full URL
      else {
        const ociUrl = getOciUrl(imagePath);
        if (ociUrl) {
          setImagePreview(ociUrl);
          return;
        }
        // Fallback: try to fetch from backend
        const response = await getProjectfile(imagePath);
        if (response.status === 200) {
          const blob = response.data;
          const imageUrl = URL.createObjectURL(blob);
          setImagePreview(imageUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching image preview:', error);
      setImagePreview('');
    }
  }, []);

  // Handle project selection
  const handleProjectChange = async (event, newValue) => {
    const projectCode = newValue?.value || '';
    setSelectedProject(newValue);

    if (!projectCode) {
      // Clear form if no project is selected
      setFormData({
        image: null,
        title: '',
        logo: '',
        manufactureLogo: '',
        manager: '',
        cont_deliverable_total: '',
        cont_deliverable_rem: '',
        cont_deliverable_sts: '',
        fixture: '',
        files: '',
        legal: '',
        risk_status: '',
        risk_sts: '',
        comp_drawing_total: '',
        comp_drawing_rem: '',
        comp_drawing_sts: '',
        parts_to_buy_total: '',
        parts_to_buy_rem: '',
        parts_to_buy_sts: '',
        pro_readiness_total: '',
        pro_readiness_rem: '',
        pro_readiness_sts: '',
        cont_del_sts: '',
        amount: '',
        amount_rem: '',
        amount_sts: '',
        currencySymbol: '',
        currencyCode: '',
        SCL: [],
        pro_plan: [],
      });
      setIsVisible(false);
      setNoNRC(false);
      setImagePreview('');
      if (customLogoPreview) URL.revokeObjectURL(customLogoPreview);
      if (customManufacturerLogoPreview) URL.revokeObjectURL(customManufacturerLogoPreview);
      setCustomLogoPreview('');
      setCustomManufacturerLogoPreview('');
      return;
    }

    // Load visibility state from localStorage
    const savedVisibility = localStorage.getItem(`projectVisibility_${projectCode}`);
    setIsVisible(savedVisibility ? savedVisibility === 'true' : false);

    try {
      // Fetch complete project data
      const response = await getProjectByCode(projectCode);

      if (response.status === 200) {
        let projectData;

        if (response.data?.projects && Array.isArray(response.data.projects)) {
          projectData = response.data.projects.find((project) => {
            return String(project.code) === String(projectCode);
          });
        } else if (response.data?.projects && typeof response.data.projects === 'object' && !Array.isArray(response.data.projects)) {
          projectData = response.data.projects;
        } else if (response.data?.project) {
          projectData = response.data.project;
        } else if (response.data && typeof response.data === 'object' && !response.data.projects) {
          projectData = response.data;
        }

        if (projectData) {
          // Format date for input field
          const formatDateForInput = (dateString) => {
            if (!dateString) return '';
            try {
              const date = new Date(dateString);
              return date.toISOString().split('T')[0];
            } catch (error) {
              return '';
            }
          };

          // Extract file paths
          const extractFilePaths = (files) => {
            if (!files) return [];

            let arr = [];

            if (typeof files === 'string') {
              try {
                arr = JSON.parse(files);
              } catch {
                arr = [files];
              }
            } else if (Array.isArray(files)) {
              arr = files;
            } else if (typeof files === 'object') {
              arr = [files];
            }

            return arr.map((file, index) => {
              if (file && typeof file === 'object' && file.filename) {
                return {
                  filename: file.filename,
                  originalname: file.originalname || `file_${index}.pdf`,
                };
              }
              if (typeof file === 'string') {
                return {
                  filename: file,
                  originalname: file.split('/').pop() || `file_${index}.pdf`,
                };
              }
              return {
                filename: '',
                originalname: 'Document',
              };
            });
          };

          const newFormData = {
            ...formData,
            title: projectData.title ?? projectData.name ?? '',
            image: projectData.image ?? formData.image,
            logo: projectData.logo ?? '',
            manufactureLogo: projectData.manufactureLogo ?? '',
            manager: projectData.manager ?? '',
            cont_deliverable_rem: projectData.cont_deliverable_rem ?? '',
            cont_deliverable_total: projectData.cont_deliverable_total ?? '',
            fixture: projectData.fixture ?? '',
            files: projectData.files ?? '',
            legal: projectData.legal ?? '',
            risk_status: formatDateForInput(projectData.risk_status),
            risk_sts: projectData.risk_sts ?? '',
            comp_drawing_rem: projectData.comp_drawing_rem ?? '',
            comp_drawing_total: projectData.comp_drawing_total ?? '',
            parts_to_buy_rem: projectData.parts_to_buy_rem ?? '',
            parts_to_buy_total: projectData.parts_to_buy_total ?? '',
            pro_readiness_rem: projectData.pro_readiness_rem ?? '',
            pro_readiness_total: projectData.pro_readiness_total ?? '',
            amount_rem: projectData.amount_rem ?? '',
            amount: projectData.amount ?? '',
            currencyCode: projectData.currencyCode ?? '',
            currencySymbol: projectData.currencySymbol ?? '',
            SCL: extractFilePaths(
              typeof projectData.SCL === 'string' ? JSON.parse(projectData.SCL) : projectData.SCL
            ) ?? formData.SCL,
            pro_plan: extractFilePaths(
              typeof projectData.pro_plan === 'string' ? JSON.parse(projectData.pro_plan) : projectData.pro_plan
            ) ?? formData.pro_plan,
            cont_deliverable_sts: projectData.cont_deliverable_sts ?? '',
            comp_drawing_sts: projectData.comp_drawing_sts ?? '',
            parts_to_buy_sts: projectData.parts_to_buy_sts ?? '',
            pro_readiness_sts: projectData.pro_readiness_sts ?? '',
            cont_del_sts: projectData.cont_del_sts ?? '',
            amount_sts: projectData.amount_sts ?? '',
          };

          setFormData(newFormData);

          // Handle logo loading
          if (projectData.logo) {
            const logoValue = projectData.logo;
            const isStaticLogo = staticLogoOptions.some((logo) => logo.url === logoValue);
            if (!isStaticLogo && logoValue.startsWith('http')) {
              setCustomLogoPreview(logoValue);
            }
          } else if (customLogoPreview) {
            URL.revokeObjectURL(customLogoPreview);
            setCustomLogoPreview('');
          }

          if (projectData.manufactureLogo) {
            const manufacturerLogoValue = projectData.manufactureLogo;
            const isStaticManufacturerLogo = staticLogoOptions.some((logo) => logo.url === manufacturerLogoValue);
            if (!isStaticManufacturerLogo && typeof manufacturerLogoValue === 'string' && manufacturerLogoValue.startsWith('http')) {
              setCustomManufacturerLogoPreview(manufacturerLogoValue);
            }
          } else if (customManufacturerLogoPreview) {
            URL.revokeObjectURL(customManufacturerLogoPreview);
            setCustomManufacturerLogoPreview('');
          }

          // Check if No NRC should be enabled
          const isNoNRC = (projectData.amount === '0' || projectData.amount === 0) && (projectData.amount_rem === '0' || projectData.amount_rem === 0);
          setNoNRC(isNoNRC);

          // Fetch image preview if image exists
          if (projectData.image && projectData.image !== 'null' && projectData.image !== '') {
            await fetchImagePreview(projectData.image);
          } else {
            setImagePreview('');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files && files.length > 0) {
      if (name === 'SCL' || name === 'pro_plan') {
        const newFiles = Array.from(files);
        setFormData((prev) => ({
          ...prev,
          [name]: [...(prev[name] || []), ...newFiles],
        }));
      } else if (name === 'image') {
        const file = files[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          setImageToCrop(imageUrl);
          setOriginalImageFile(file);
          setShowCropModal(true);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
        }
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle dropdown changes
  const handleDropdownChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle No NRC checkbox
  const handleNoNRCChange = (checked) => {
    setNoNRC(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        amount: '0',
        amount_rem: '0',
        currencyCode: currencyOptions[0]?.value || 'USD',
        currencySymbol: currencyOptions[0]?.symbol || '$',
        amount_sts: '1',
      }));
    }
  };

  // Logo management functions
  const handleOpenLogoModal = (context) => {
    setLogoModalContext(context);
    setShowLogoModal(true);
  };

  const closeLogoModal = () => {
    setShowLogoModal(false);
    setLogoModalContext(null);
  };

  const handleStaticLogoSelect = (logoUrl, context) => {
    setFormData((prev) => ({
      ...prev,
      [context === 'main' ? 'logo' : 'manufactureLogo']: logoUrl,
    }));
    if (context === 'main') {
      setCustomLogoFile(null);
      setCustomLogoPreview('');
    } else {
      setCustomManufacturerLogoFile(null);
      setCustomManufacturerLogoPreview('');
    }
    closeLogoModal();
  };

  const handleCustomLogoUpload = async (file, context) => {
    setIsLogoSaving(true);
    const label = context === 'main' ? 'Customer Logo' : 'End Customer Logo';
    try {
      toast.loading(`Uploading ${label}...`, { id: 'logo-upload' });
      const objectPath = await uploadImageDirectToOCI(file);
      toast.success(`${label} uploaded successfully!`, { id: 'logo-upload' });

      toast.loading(`Saving ${label}...`, { id: 'logo-save' });
      await saveLogoReference(objectPath);
      toast.success(`${label} saved successfully!`, { id: 'logo-save' });

      const objectUrl = URL.createObjectURL(file);
      if (context === 'main') {
        setCustomLogoPreview(objectUrl);
        setCustomLogoFile(file);
      } else {
        setCustomManufacturerLogoPreview(objectUrl);
        setCustomManufacturerLogoFile(file);
      }

      await loadLogos();
      setFormData((prev) => ({
        ...prev,
        [context === 'main' ? 'logo' : 'manufactureLogo']: objectPath,
      }));
      closeLogoModal();
    } catch (error) {
      toast.error(`Failed to upload ${label}: ${error.message}`, { id: 'logo-upload' });
    } finally {
      setIsLogoSaving(false);
    }
  };

  const handleClearLogoSelection = (context) => {
    setFormData((prev) => ({
      ...prev,
      [context === 'main' ? 'logo' : 'manufactureLogo']: '',
    }));
    if (context === 'main') {
      if (customLogoPreview) URL.revokeObjectURL(customLogoPreview);
      setCustomLogoFile(null);
      setCustomLogoPreview('');
    } else {
      if (customManufacturerLogoPreview) URL.revokeObjectURL(customManufacturerLogoPreview);
      setCustomManufacturerLogoFile(null);
      setCustomManufacturerLogoPreview('');
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoToDelete?.id) return;
    setIsLogoSaving(true);
    try {
      await deleteLogo(logoToDelete.id);
      toast.success('Logo deleted successfully');
      setStaticLogoOptions((prev) => prev.filter((logo) => logo.id !== logoToDelete.id));
      await loadLogos();
      setLogoToDelete(null);
      setShowDeleteLogoModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete logo');
    } finally {
      setIsLogoSaving(false);
    }
  };

  // Image cropping functions
  const createImage = (url) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });
  };

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          const originalFileName = originalImageFile?.name || 'image.jpg';
          const fileExtension = originalFileName.split('.').pop() || 'jpg';
          const fileName = `cropped-image.${fileExtension}`;
          const file = new File([blob], fileName, {
            type: blob.type || 'image/jpeg',
          });
          resolve(file);
        },
        'image/jpeg',
        0.95
      );
    });
  };

  const onCropComplete = async () => {
    if (!imageToCrop || !croppedAreaPixels) {
      return;
    }

    try {
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const croppedImageUrl = URL.createObjectURL(croppedFile);

      setFormData((prev) => ({
        ...prev,
        image: croppedFile,
      }));

      setImagePreview(croppedImageUrl);

      setShowCropModal(false);
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
      setImageToCrop(null);
      setOriginalImageFile(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);

      toast.success('Image cropped successfully!');
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error('Failed to crop image. Please try again.');
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    setOriginalImageFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  // Remove file from array
  const removeFile = (name, index) => {
    setFormData((prev) => ({
      ...prev,
      [name]: prev[name].filter((_, i) => i !== index),
    }));
  };

  // Prevent number input from changing on mouse wheel
  const handleNumberWheel = (e) => {
    e.target.blur();
  };

  // Helper functions for safe number conversion
  const safeNumberString = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    return isNaN(num) ? '' : String(num);
  };

  const safeDropdownNumber = (value) => {
    if (value === null || value === undefined || value === '') return '1';
    const strValue = String(value);
    if (['1', '2', '3', '4', '5'].includes(strValue)) return strValue;
    const num = Number(value);
    return isNaN(num) ? '1' : String(num);
  };

  // Handle form submission - opens confirmation modal
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    setShowConfirmModal(true);
  };

  // Handle confirmed submission
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    try {
      // Handle image file - upload to OCI if it's a new File
      let imagePath = '';
      if (formData.image instanceof File) {
        try {
          toast.loading('Uploading image...', { id: 'image-upload' });
          imagePath = await uploadImageDirectToOCI(formData.image);
          toast.success('Image uploaded successfully!', { id: 'image-upload' });
        } catch (error) {
          toast.error('Failed to upload image: ' + error.message, { id: 'image-upload' });
          setIsSubmitting(false);
          return;
        }
      } else if (typeof formData.image === 'string' && formData.image.trim() !== '' && formData.image !== 'null') {
        imagePath = formData.image;
      }

      // Handle SCL files - upload new files, keep existing URLs
      const sclFiles = [];
      if (Array.isArray(formData.SCL) && formData.SCL.length > 0) {
        const newSCLFiles = [];

        for (const file of formData.SCL) {
          if (file instanceof File) {
            newSCLFiles.push(file);
          } else if (typeof file === 'object' && file.filename) {
            sclFiles.push({
              filename: file.filename,
              originalname: file.originalname || 'file.pdf',
            });
          } else if (typeof file === 'string') {
            sclFiles.push({
              filename: file,
              originalname: file.split('/').pop() || 'file.pdf',
            });
          }
        }

        if (newSCLFiles.length > 0) {
          try {
            toast.loading(`Uploading ${newSCLFiles.length} SCL file(s)...`, { id: 'scl-upload' });
            const uploadedFiles = await uploadMultipleFilesDirectToOCI(newSCLFiles, 'scl');
            sclFiles.push(...uploadedFiles);
            toast.success('SCL files uploaded successfully!', { id: 'scl-upload' });
          } catch (error) {
            toast.error('Failed to upload SCL files: ' + error.message, { id: 'scl-upload' });
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Handle PLAN files - upload new files, keep existing URLs
      const planFiles = [];
      if (Array.isArray(formData.pro_plan) && formData.pro_plan.length > 0) {
        const newPlanFiles = [];

        for (const file of formData.pro_plan) {
          if (file instanceof File) {
            newPlanFiles.push(file);
          } else if (typeof file === 'object' && file.filename) {
            planFiles.push({
              filename: file.filename,
              originalname: file.originalname || 'file.pdf',
            });
          } else if (typeof file === 'string') {
            planFiles.push({
              filename: file,
              originalname: file.split('/').pop() || 'file.pdf',
            });
          }
        }

        if (newPlanFiles.length > 0) {
          try {
            toast.loading(`Uploading ${newPlanFiles.length} PLAN file(s)...`, { id: 'plan-upload' });
            const uploadedFiles = await uploadMultipleFilesDirectToOCI(newPlanFiles, 'plan');
            planFiles.push(...uploadedFiles);
            toast.success('PLAN files uploaded successfully!', { id: 'plan-upload' });
          } catch (error) {
            toast.error('Failed to upload PLAN files: ' + error.message, { id: 'plan-upload' });
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Prepare JSON data
      const jsonData = {
        title: formData.title || '',
        logo: formData.logo || '',
        manufactureLogo: formData.manufactureLogo || '',
        manager: formData.manager || '',
        cont_deliverable_rem: safeNumberString(formData.cont_deliverable_rem),
        cont_deliverable_total: safeNumberString(formData.cont_deliverable_total),
        fixture: formData.fixture || '',
        files: formData.files ? (isNaN(Number(formData.files)) ? 0 : Number(formData.files)) : 0,
        legal: formData.legal || '',
        risk_status: formData.risk_status || '',
        risk_sts: safeDropdownNumber(formData.risk_sts),
        comp_drawing_rem: safeNumberString(formData.comp_drawing_rem),
        comp_drawing_total: safeNumberString(formData.comp_drawing_total),
        parts_to_buy_rem: safeNumberString(formData.parts_to_buy_rem),
        parts_to_buy_total: safeNumberString(formData.parts_to_buy_total),
        pro_readiness_rem: safeNumberString(formData.pro_readiness_rem),
        pro_readiness_total: safeNumberString(formData.pro_readiness_total),
        amount_rem: noNRC ? '0' : safeNumberString(formData.amount_rem),
        amount: noNRC ? '0' : safeNumberString(formData.amount),
        currencyCode: noNRC ? (currencyOptions[0]?.value || 'USD') : (formData.currencyCode || 'USD'),
        currencySymbol: noNRC ? (currencyOptions[0]?.symbol || '$') : (formData.currencySymbol || '$'),
        cont_deliverable_sts: safeDropdownNumber(formData.cont_deliverable_sts),
        comp_drawing_sts: safeDropdownNumber(formData.comp_drawing_sts),
        parts_to_buy_sts: safeDropdownNumber(formData.parts_to_buy_sts),
        pro_readiness_sts: safeDropdownNumber(formData.pro_readiness_sts),
        cont_del_sts: safeDropdownNumber(formData.cont_del_sts),
        amount_sts: noNRC ? '1' : safeDropdownNumber(formData.amount_sts),
        image: imagePath,
        SCL: sclFiles,
        pro_plan: planFiles,
      };

      const response = await editProject(selectedProject.value, jsonData);

      if (response.status === 200 || response.status === 201) {
        toast.success(`Project "${formData.title}" updated successfully!`);
        setIsSubmitting(false);

        // Save visibility state to localStorage
        localStorage.setItem(`projectVisibility_${selectedProject.value}`, isVisible.toString());

        // Refresh the page after a short delay to show the success message
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setIsSubmitting(false);
        toast.error('Failed to update project. Please try again.');
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error in handleSubmit:', error);

      if (error.response?.status === 400) {
        toast.error('Invalid project data. Please check your input.');
      } else if (error.response?.status === 404) {
        toast.error('Project not found. Please refresh and try again.');
      } else if (error.response?.status === 409) {
        toast.error('Project with this title already exists. Please choose a different title.');
      } else if (error.response?.status === 401) {
        toast.error('Unauthorized. Please login again.');
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        toast.error('Network error. Please check your connection.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Error updating project. Please try again.';
        toast.error(errorMessage);
      }
    }
  };

  // Logo preview sources
  const mainLogoPreviewSrc = customLogoPreview || (typeof formData.logo === 'string' && formData.logo ? (getOciUrl(formData.logo) || formData.logo) : '');
  const manufacturerLogoPreviewSrc = customManufacturerLogoPreview || (typeof formData.manufactureLogo === 'string' && formData.manufactureLogo ? (getOciUrl(formData.manufactureLogo) || formData.manufactureLogo) : '');

  const isMainStaticLogoSelected = typeof formData.logo === 'string' && formData.logo ? staticLogoOptions.some((logo) => logo.url === formData.logo) : false;
  const isManufacturerStaticLogoSelected = typeof formData.manufactureLogo === 'string' && formData.manufactureLogo ? staticLogoOptions.some((logo) => logo.url === formData.manufactureLogo) : false;

  const activeLogoContext = logoModalContext ?? 'main';
  const activeLogoValue = activeLogoContext === 'manufacturer' ? formData.manufactureLogo : formData.logo;
  const activeIsCustomLogoSelected = activeLogoValue && !staticLogoOptions.some((logo) => logo.url === activeLogoValue);
  const activeCustomPreviewSrc = (activeLogoContext === 'main' ? customLogoPreview : customManufacturerLogoPreview) || (activeIsCustomLogoSelected && typeof activeLogoValue === 'string' && activeLogoValue ? (getOciUrl(activeLogoValue) || activeLogoValue) : '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Edit Projects</h1>
        </div>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-10 flex flex-col items-center gap-6 min-w-[300px]">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-800 mb-1">Updating Project</p>
                <p className="text-sm text-gray-600">Please wait while we process your request...</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 space-y-4">
            {/* Project Selector */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Project</label>
              <Autocomplete
                options={projectOptions}
                value={selectedProject}
                onChange={handleProjectChange}
                getOptionLabel={(option) => option.label || ''}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select a project to edit"
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

            {/* Rest of the form fields - same as AddProject */}
            {/* Project Image */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Project Image</label>
              <div className="space-y-3">
                <input
                  type="file"
                  id="imageUpload"
                  name="image"
                  onChange={handleChange}
                  accept="image/*"
                  className="hidden"
                />
                <label
                  htmlFor="imageUpload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                      <CloudUploadIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Click to upload image</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                </label>
                {imagePreview && (
                  <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Project Image Preview"
                        className="max-w-full max-h-64 h-auto rounded-lg shadow-md object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, image: null }));
                          if (imagePreview.startsWith('blob:')) {
                            URL.revokeObjectURL(imagePreview);
                          }
                          setImagePreview('');
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                      >
                        <CloseIcon sx={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Project Title */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={255}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                placeholder="Enter Project Title"
              />
            </div>

            {/* Logo Field */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Logo</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Logo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Logo</label>
                  <div
                    onClick={() => handleOpenLogoModal('main')}
                    className={`border-2 rounded-lg p-4 text-center cursor-pointer transition-all duration-200 min-h-[140px] flex flex-col items-center justify-center ${formData.logo
                      ? 'border-blue-500 bg-blue-50/50 shadow-md'
                      : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                      }`}
                  >
                    {mainLogoPreviewSrc ? (
                      <div className="space-y-3 w-full">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <img
                            src={mainLogoPreviewSrc}
                            alt="Customer Logo"
                            className="max-w-full max-h-16 mx-auto object-contain"
                          />
                        </div>
                        <p className="text-sm font-medium text-blue-600">Click to Change Logo</p>
                        <p className="text-xs text-gray-500">
                          {isMainStaticLogoSelected ? 'Static logo selected' : 'Custom logo selected'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-100 rounded-full">
                          <CloudUploadIcon sx={{ fontSize: 32, color: '#6b7280' }} />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Select Logo</p>
                        <p className="text-xs text-gray-500">Click to choose a logo</p>
                      </div>
                    )}
                  </div>
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() => handleClearLogoSelection('main')}
                      className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium hover:underline transition-colors"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                {/* End Customer Logo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Customer Logo</label>
                  <div
                    onClick={() => handleOpenLogoModal('manufacturer')}
                    className={`border-2 rounded-lg p-4 text-center cursor-pointer transition-all duration-200 min-h-[140px] flex flex-col items-center justify-center ${formData.manufactureLogo
                      ? 'border-blue-500 bg-blue-50/50 shadow-md'
                      : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                      }`}
                  >
                    {manufacturerLogoPreviewSrc ? (
                      <div className="space-y-3 w-full">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <img
                            src={manufacturerLogoPreviewSrc}
                            alt="End Customer Logo"
                            className="max-w-full max-h-16 mx-auto object-contain"
                          />
                        </div>
                        <p className="text-sm font-medium text-blue-600">Click to Change Logo</p>
                        <p className="text-xs text-gray-500">
                          {isManufacturerStaticLogoSelected ? 'Static logo selected' : 'Custom logo selected'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-100 rounded-full">
                          <CloudUploadIcon sx={{ fontSize: 32, color: '#6b7280' }} />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Select End Customer Logo</p>
                        <p className="text-xs text-gray-500">Click to choose a logo</p>
                      </div>
                    )}
                  </div>
                  {formData.manufactureLogo && (
                    <button
                      type="button"
                      onClick={() => handleClearLogoSelection('manufacturer')}
                      className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium hover:underline transition-colors"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Manager Field */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <label htmlFor="manager" className="block text-sm font-semibold text-gray-700 mb-2">Manager</label>
              <select
                id="manager"
                name="manager"
                value={formData.manager}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
              >
                <option value="">Select Manager</option>
                {managerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Section 1: Total Contract Deliverables */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <AssessmentIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                <h2 className="text-base font-semibold text-gray-800">Total Contract Deliverables</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="fixture" className="block text-xs font-semibold text-gray-700 mb-1.5">Fixture</label>
                  <input
                    type="text"
                    id="fixture"
                    name="fixture"
                    value={formData.fixture}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="files" className="block text-xs font-semibold text-gray-700 mb-1.5">File</label>
                  <input
                    type="text"
                    id="files"
                    name="files"
                    value={formData.files}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="legal" className="block text-xs font-semibold text-gray-700 mb-1.5">Legal Name</label>
                  <input
                    type="text"
                    id="legal"
                    name="legal"
                    value={formData.legal}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cont_del_sts" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Risk Status</label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="cont_del_sts"
                      name="cont_del_sts"
                      value={formData.cont_del_sts || '1'}
                      onChange={(e) => handleChange({ target: { name: 'cont_del_sts', value: e.target.value } })}
                      renderValue={(value) => {
                        return renderStatusIcon(value);
                      }}
                      className="text-sm"
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      }}
                    >
                      {riskStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {renderStatusIcon(option.value)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>

            {/* Section 2: FUD & Risk Status */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <AssessmentIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                <h2 className="text-base font-semibold text-gray-800">FUD & Risk Status</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="risk_status" className="block text-xs font-semibold text-gray-700 mb-1.5">FUD Date</label>
                  <input
                    type="date"
                    id="risk_status"
                    name="risk_status"
                    value={formData.risk_status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="risk_sts" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Risk Status</label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="risk_sts"
                      name="risk_sts"
                      value={formData.risk_sts || '1'}
                      onChange={(e) => handleChange({ target: { name: 'risk_sts', value: e.target.value } })}
                      renderValue={(value) => {
                        return renderStatusIcon(value);
                      }}
                      className="text-sm"
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      }}
                    >
                      {riskStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {renderStatusIcon(option.value)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>

            {/* Section 3: Component Drawings */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <AssessmentIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                <h2 className="text-base font-semibold text-gray-800">Component Drawings</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="comp_drawing_rem" className="block text-xs font-semibold text-gray-700 mb-1.5">Remaining Deliverables</label>
                  <input
                    type="number"
                    id="comp_drawing_rem"
                    name="comp_drawing_rem"
                    value={formData.comp_drawing_rem}
                    onChange={handleChange}
                    onWheel={handleNumberWheel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="comp_drawing_total" className="block text-xs font-semibold text-gray-700 mb-1.5">Total Deliverables</label>
                  <input
                    type="number"
                    id="comp_drawing_total"
                    name="comp_drawing_total"
                    value={formData.comp_drawing_total}
                    onChange={handleChange}
                    onWheel={handleNumberWheel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="comp_drawing_sts" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Risk Status</label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="comp_drawing_sts"
                      name="comp_drawing_sts"
                      value={formData.comp_drawing_sts || '1'}
                      onChange={(e) => handleChange({ target: { name: 'comp_drawing_sts', value: e.target.value } })}
                      renderValue={(value) => {
                        return renderStatusIcon(value);
                      }}
                      className="text-sm"
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      }}
                    >
                      {riskStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {renderStatusIcon(option.value)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>

            {/* Section 4: Parts To Buy (PBOM) */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <AssessmentIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                <h2 className="text-base font-semibold text-gray-800">Parts To Buy (PBOM)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="parts_to_buy_rem" className="block text-xs font-semibold text-gray-700 mb-1.5">Remaining Deliverables</label>
                  <input
                    type="number"
                    id="parts_to_buy_rem"
                    name="parts_to_buy_rem"
                    value={formData.parts_to_buy_rem}
                    onChange={handleChange}
                    onWheel={handleNumberWheel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="parts_to_buy_total" className="block text-xs font-semibold text-gray-700 mb-1.5">Total Deliverables</label>
                  <input
                    type="number"
                    id="parts_to_buy_total"
                    name="parts_to_buy_total"
                    value={formData.parts_to_buy_total}
                    onChange={handleChange}
                    onWheel={handleNumberWheel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="parts_to_buy_sts" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Risk Status</label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="parts_to_buy_sts"
                      name="parts_to_buy_sts"
                      value={formData.parts_to_buy_sts || '1'}
                      onChange={(e) => handleChange({ target: { name: 'parts_to_buy_sts', value: e.target.value } })}
                      renderValue={(value) => {
                        return renderStatusIcon(value);
                      }}
                      className="text-sm"
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      }}
                    >
                      {riskStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {renderStatusIcon(option.value)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>

            {/* Section 5: Production Readiness */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <AssessmentIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                <h2 className="text-base font-semibold text-gray-800">Production Readiness</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="pro_readiness_rem" className="block text-xs font-semibold text-gray-700 mb-1.5">Remaining Deliverables</label>
                  <input
                    type="number"
                    id="pro_readiness_rem"
                    name="pro_readiness_rem"
                    value={formData.pro_readiness_rem}
                    onChange={handleChange}
                    onWheel={handleNumberWheel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="pro_readiness_total" className="block text-xs font-semibold text-gray-700 mb-1.5">Total Deliverables</label>
                  <input
                    type="number"
                    id="pro_readiness_total"
                    name="pro_readiness_total"
                    value={formData.pro_readiness_total}
                    onChange={handleChange}
                    onWheel={handleNumberWheel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="pro_readiness_sts" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Risk Status</label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="pro_readiness_sts"
                      name="pro_readiness_sts"
                      value={formData.pro_readiness_sts || '1'}
                      onChange={(e) => handleChange({ target: { name: 'pro_readiness_sts', value: e.target.value } })}
                      renderValue={(value) => {
                        return renderStatusIcon(value);
                      }}
                      className="text-sm"
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      }}
                    >
                      {riskStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {renderStatusIcon(option.value)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>

            {/* Section 6: Contract Deliverables */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <AssessmentIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                <h2 className="text-base font-semibold text-gray-800">Contract Deliverables</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="cont_deliverable_rem" className="block text-xs font-semibold text-gray-700 mb-1.5">Remaining Deliverables</label>
                  <input
                    type="number"
                    id="cont_deliverable_rem"
                    name="cont_deliverable_rem"
                    value={formData.cont_deliverable_rem}
                    onChange={handleChange}
                    onWheel={handleNumberWheel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cont_deliverable_total" className="block text-xs font-semibold text-gray-700 mb-1.5">Total Deliverables</label>
                  <input
                    type="number"
                    id="cont_deliverable_total"
                    name="cont_deliverable_total"
                    value={formData.cont_deliverable_total}
                    onChange={handleChange}
                    onWheel={handleNumberWheel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cont_deliverable_sts" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Risk Status</label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="cont_deliverable_sts"
                      name="cont_deliverable_sts"
                      value={formData.cont_deliverable_sts || '1'}
                      onChange={(e) => handleChange({ target: { name: 'cont_deliverable_sts', value: e.target.value } })}
                      renderValue={(value) => {
                        return renderStatusIcon(value);
                      }}
                      className="text-sm"
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      }}
                    >
                      {riskStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {renderStatusIcon(option.value)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>

            {/* Section 7: NRC */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AssessmentIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                  <h2 className="text-base font-semibold text-gray-800">NRC</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noNRC}
                    onChange={(e) => handleNoNRCChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-xs font-medium text-gray-700">No NRC</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label htmlFor="amount_rem" className="block text-xs font-semibold text-gray-700 mb-1.5">Remaining Amount</label>
                  <input
                    type="text"
                    id="amount_rem"
                    name="amount_rem"
                    value={formData.amount_rem}
                    onChange={handleChange}
                    disabled={noNRC}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="currencyCode1" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Currency</label>
                  <select
                    id="currencyCode1"
                    name="currencyCode"
                    value={formData.currencyCode}
                    onChange={(e) => {
                      const selected = currencyOptions.find((opt) => opt.value === e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        currencyCode: e.target.value,
                        currencySymbol: selected?.symbol || '$',
                      }));
                    }}
                    disabled={noNRC}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 text-sm"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="amount" className="block text-xs font-semibold text-gray-700 mb-1.5">Total Amount</label>
                  <input
                    type="text"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={noNRC}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="currencyCode2" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Currency</label>
                  <select
                    id="currencyCode2"
                    name="currencyCode"
                    value={formData.currencyCode}
                    onChange={(e) => {
                      const selected = currencyOptions.find((opt) => opt.value === e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        currencyCode: e.target.value,
                        currencySymbol: selected?.symbol || '$',
                      }));
                    }}
                    disabled={noNRC}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 text-sm"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="amount_sts" className="block text-xs font-semibold text-gray-700 mb-1.5">Select Risk Status</label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="amount_sts"
                      name="amount_sts"
                      value={formData.amount_sts || '1'}
                      onChange={(e) => handleChange({ target: { name: 'amount_sts', value: e.target.value } })}
                      disabled={noNRC}
                      renderValue={(value) => {
                        return renderStatusIcon(value);
                      }}
                      className="text-sm"
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: '#f3f4f6',
                          opacity: 0.6,
                        },
                      }}
                    >
                      {riskStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {renderStatusIcon(option.value)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>

            {/* SCL and PLAN Files */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SCL Files */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SCL</label>
                  <input
                    type="file"
                    id="sclFiles"
                    name="SCL"
                    onChange={handleChange}
                    multiple
                    className="hidden"
                  />
                  <label
                    htmlFor="sclFiles"
                    className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                        <CloudUploadIcon sx={{ fontSize: 24, color: '#3b82f6' }} />
                      </div>
                      <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Choose files</p>
                    </div>
                  </label>
                  {formData.SCL && formData.SCL.length > 0 && (
                    <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <strong className="block text-sm font-semibold text-gray-700 mb-2">Current SCL files:</strong>
                      <ul className="space-y-1">
                        {formData.SCL.map((file, index) => (
                          <li key={index} className="flex items-center justify-between text-sm text-gray-600">
                            <span className="truncate flex-1">{file.name || (file.originalname || (typeof file === 'string' ? file : 'Unknown file'))}</span>
                            <button
                              type="button"
                              onClick={() => removeFile('SCL', index)}
                              className="ml-2 text-red-600 hover:text-red-700"
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* PLAN Files */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">PLAN</label>
                  <input
                    type="file"
                    id="planFiles"
                    name="pro_plan"
                    onChange={handleChange}
                    multiple
                    className="hidden"
                  />
                  <label
                    htmlFor="planFiles"
                    className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                        <CloudUploadIcon sx={{ fontSize: 24, color: '#3b82f6' }} />
                      </div>
                      <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Choose files</p>
                    </div>
                  </label>
                  {formData.pro_plan && formData.pro_plan.length > 0 && (
                    <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <strong className="block text-sm font-semibold text-gray-700 mb-2">Current PLAN files:</strong>
                      <ul className="space-y-1">
                        {formData.pro_plan.map((file, index) => (
                          <li key={index} className="flex items-center justify-between text-sm text-gray-600">
                            <span className="truncate flex-1">{file.name || (file.originalname || (typeof file === 'string' ? file : 'Unknown file'))}</span>
                            <button
                              type="button"
                              onClick={() => removeFile('pro_plan', index)}
                              className="ml-2 text-red-600 hover:text-red-700"
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visibility Switch */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
              <FormControlLabel
                control={
                  <Switch
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    color="primary"
                  />
                }
                label="Show Project on Dashboard"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !selectedProject}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                <EditIcon sx={{ fontSize: 20 }} />
                {isSubmitting ? 'Updating...' : 'Edit Project'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Logo Selection Modal */}
      {showLogoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-2xl font-bold text-gray-800">
                {logoModalContext === 'manufacturer' ? 'Select End Customer Logo' : 'Select Logo'}
              </h2>
              <button
                onClick={closeLogoModal}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <CloseIcon sx={{ fontSize: 24 }} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {/* Custom Logo Upload */}
              <div className="mb-8 border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white hover:border-blue-400 transition-colors">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CloudUploadIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                  {logoModalContext === 'manufacturer' ? 'Custom End Customer Logo' : 'Custom Logo'}
                </h3>
                <input
                  type="file"
                  id={`customLogoUpload-${logoModalContext}`}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCustomLogoUpload(file, logoModalContext);
                  }}
                  className="hidden"
                />
                <label
                  htmlFor={`customLogoUpload-${logoModalContext}`}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                >
                  <div className="p-4 bg-blue-100 rounded-full mb-3">
                    <CloudUploadIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 mb-1">
                    {logoModalContext === 'manufacturer' ? 'Upload Custom End Customer Logo' : 'Upload Custom Logo'}
                  </span>
                  <span className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</span>
                </label>
              </div>

              {/* Static Logos */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-3">Static Logos</h3>
                {isLogoListLoading ? (
                  <p className="text-center text-gray-500 py-8">Loading logos...</p>
                ) : staticLogoOptions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No logos available. Please contact administrator.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {staticLogoOptions.map((logo) => {
                      const logoDisplayUrl = getOciUrl(logo.url) || logo.url;
                      const isSelected = formData[logoModalContext === 'main' ? 'logo' : 'manufactureLogo'] === logo.url;
                      const canDelete = logo.id && typeof logo.id === 'number';

                      return (
                        <div
                          key={logo.id}
                          onClick={() => handleStaticLogoSelect(logo.url, logoModalContext)}
                          className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                            }`}
                        >
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogoToDelete(logo);
                                setShowDeleteLogoModal(true);
                              }}
                              className="absolute top-2 right-2 bg-black bg-opacity-30 hover:bg-opacity-50 rounded-full p-1 text-white"
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </button>
                          )}
                          <img
                            src={logoDisplayUrl}
                            alt="Logo option"
                            className="max-w-full max-h-12 mx-auto object-contain"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Logo Confirmation Modal */}
      {showDeleteLogoModal && logoToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 p-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-3 bg-red-100 rounded-full">
                  <DeleteIcon sx={{ fontSize: 32, color: '#dc2626' }} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 text-center">Delete Logo</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete this logo? This action cannot be undone.
              </p>
              {logoToDelete.url && (
                <div className="mb-6 flex justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <img
                    src={getOciUrl(logoToDelete.url) || logoToDelete.url}
                    alt="Logo to delete"
                    className="max-w-48 max-h-24 object-contain"
                  />
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteLogoModal(false);
                    setLogoToDelete(null);
                  }}
                  disabled={isLogoSaving}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  disabled={isLogoSaving}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                >
                  {isLogoSaving ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </span>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-200 p-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <AssessmentIcon sx={{ fontSize: 32, color: '#2196F3' }} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 text-center">Confirm Update</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to update the project "{formData.title}"? This action will save all changes.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    toast('Project update cancelled', {
                      icon: 'ℹ️',
                      style: {
                        background: '#2196F3',
                        color: '#fff',
                      },
                    });
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </span>
                  ) : (
                    'Confirm Update'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      <Modal
        open={showCropModal}
        onClose={handleCropCancel}
        aria-labelledby="crop-image-modal"
        disableEnforceFocus
        disableAutoFocus
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '90%',
            maxWidth: '800px',
            bgcolor: 'background.paper',
            borderRadius: '8px',
            boxShadow: 24,
            p: 3,
            outline: 'none',
            zIndex: 1301,
          }}
        >
          <h2
            style={{
              marginBottom: '20px',
              fontSize: '24px',
              fontWeight: '600',
            }}
          >
            Crop Image (2.36:1 Ratio)
          </h2>
          {imageToCrop && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '500px',
                backgroundColor: '#000',
                borderRadius: '8px',
                overflow: 'hidden',
                zIndex: 2,
                touchAction: 'none',
                userSelect: 'none',
                pointerEvents: 'auto',
                isolation: 'isolate',
              }}
            >
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={2.36 / 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(croppedArea, croppedAreaPixels) => {
                  setCroppedAreaPixels(croppedAreaPixels);
                }}
                cropShape="rect"
                showGrid={true}
              />
            </div>
          )}
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Zoom: {Math.round(zoom * 100)}%
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleCropCancel}
                style={{
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCropComplete}
                style={{
                  backgroundColor: '#2196F3',
                  color: '#fff',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Crop Image
              </button>
            </div>
          </div>
        </Box>
      </Modal>
    </div>
  );
};

export default EditProject;
