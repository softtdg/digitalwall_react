import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { addProject } from '../../services/projectService';
import { getLogosList, saveLogoReference, deleteLogo } from '../../services/logoService';
import { uploadImageDirectToOCI, uploadMultipleFilesDirectToOCI } from '../../services/uploadService';
import { getOciUrl } from '../../utils/ociUrl';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DiamondIcon from '@mui/icons-material/Diamond';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';

const AddProject = () => {
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

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState('');
    const [noNRC, setNoNRC] = useState(false);

    // Logo states
    const [staticLogoOptions, setStaticLogoOptions] = useState([]);
    const [customLogoFile, setCustomLogoFile] = useState(null);
    const [customLogoPreview, setCustomLogoPreview] = useState('');
    const [customManufacturerLogoFile, setCustomManufacturerLogoFile] = useState(null);
    const [customManufacturerLogoPreview, setCustomManufacturerLogoPreview] = useState('');
    const [showLogoModal, setShowLogoModal] = useState(false);
    const [logoModalContext, setLogoModalContext] = useState(null); // 'main' | 'manufacturer' | null
    const [isLogoSaving, setIsLogoSaving] = useState(false);
    const [isLogoListLoading, setIsLogoListLoading] = useState(false);
    const [showDeleteLogoModal, setShowDeleteLogoModal] = useState(false);
    const [logoToDelete, setLogoToDelete] = useState(null);

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
        { label: <DiamondIcon sx={{ color: 'rgb(255,215,5)' }} />, value: '2' },
        { label: <DiamondIcon sx={{ color: 'green' }} />, value: '3' },
        { label: <DiamondIcon sx={{ color: 'red' }} />, value: '4' },
        {
            label: (
                <span style={{ display: 'flex', gap: '4px' }}>
                    <DiamondIcon sx={{ color: 'red' }} />
                    <DiamondIcon sx={{ color: 'red' }} />
                </span>
            ), value: '5'
        },
    ];

    // Load logos on mount
    useEffect(() => {
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
        };
    }, [imagePreview, customLogoPreview, customManufacturerLogoPreview]);

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
                    setImagePreview(imageUrl);
                    setFormData((prev) => ({
                        ...prev,
                        image: file,
                    }));
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

    // Remove file from array
    const removeFile = (name, index) => {
        setFormData((prev) => ({
            ...prev,
            [name]: prev[name].filter((_, i) => i !== index),
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

    // Helper functions for safe number conversion
    const safeNumberString = (value) => {
        if (value === null || value === undefined || value === '') return '1';
        const num = Number(value);
        return isNaN(num) ? '1' : String(num);
    };

    const safeDropdownNumber = (value) => {
        if (value === null || value === undefined || value === '') return '1';
        const strValue = String(value);
        if (['1', '2', '3', '4', '5'].includes(strValue)) return strValue;
        const num = Number(value);
        return isNaN(num) ? '1' : String(num);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.title || formData.title.trim() === '') {
            toast.error('Please enter a project title');
            return;
        }

        if (formData.title.length > 255) {
            toast.error('Project title is too long (max 255 characters)');
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload image if exists
            let imagePath = '';
            if (formData.image instanceof File) {
                toast.loading('Uploading image...', { id: 'image-upload' });
                imagePath = await uploadImageDirectToOCI(formData.image);
                toast.success('Image uploaded successfully!', { id: 'image-upload' });
            }

            // Upload SCL files if exist
            let sclFiles = [];
            if (formData.SCL && formData.SCL.length > 0) {
                toast.loading(`Uploading ${formData.SCL.length} SCL file(s)...`, { id: 'scl-upload' });
                sclFiles = await uploadMultipleFilesDirectToOCI(formData.SCL, 'scl');
                toast.success('SCL files uploaded successfully!', { id: 'scl-upload' });
            }

            // Upload PLAN files if exist
            let planFiles = [];
            if (formData.pro_plan && formData.pro_plan.length > 0) {
                toast.loading(`Uploading ${formData.pro_plan.length} PLAN file(s)...`, { id: 'plan-upload' });
                planFiles = await uploadMultipleFilesDirectToOCI(formData.pro_plan, 'plan');
                toast.success('PLAN files uploaded successfully!', { id: 'plan-upload' });
            }

            // Prepare JSON data
            const jsonData = {
                title: formData.title || '',
                logo: formData.logo || '',
                manufactureLogo: formData.manufactureLogo || '',
                manager: formData.manager || '',
                cont_deliverable_total: safeNumberString(formData.cont_deliverable_total),
                cont_deliverable_rem: safeNumberString(formData.cont_deliverable_rem),
                fixture: formData.fixture || '',
                files: formData.files ? (isNaN(Number(formData.files)) ? 0 : Number(formData.files)) : 0,
                legal: formData.legal || '',
                risk_status: formData.risk_status || '',
                risk_sts: safeDropdownNumber(formData.risk_sts),
                comp_drawing_total: safeNumberString(formData.comp_drawing_total),
                comp_drawing_rem: safeNumberString(formData.comp_drawing_rem),
                comp_drawing_sts: safeDropdownNumber(formData.comp_drawing_sts),
                parts_to_buy_total: safeNumberString(formData.parts_to_buy_total),
                parts_to_buy_rem: safeNumberString(formData.parts_to_buy_rem),
                parts_to_buy_sts: safeDropdownNumber(formData.parts_to_buy_sts),
                pro_readiness_total: safeNumberString(formData.pro_readiness_total),
                pro_readiness_rem: safeNumberString(formData.pro_readiness_rem),
                pro_readiness_sts: safeDropdownNumber(formData.pro_readiness_sts),
                cont_del_sts: safeDropdownNumber(formData.cont_del_sts),
                cont_deliverable_sts: safeDropdownNumber(formData.cont_deliverable_sts),
                amount: noNRC ? '0' : formData.amount || '',
                amount_rem: noNRC ? '0' : formData.amount_rem || '',
                amount_sts: noNRC ? '1' : safeDropdownNumber(formData.amount_sts),
                currencyCode: noNRC ? (currencyOptions[0]?.value || 'USD') : (formData.currencyCode || 'USD'),
                currencySymbol: noNRC ? (currencyOptions[0]?.symbol || '$') : (formData.currencySymbol || '$'),
                SCL: sclFiles,
                pro_plan: planFiles,
                image: imagePath,
            };

            const response = await addProject(jsonData);

            if (response.status === 200 || response.status === 201) {
                toast.success(`Project "${formData.title}" added successfully!`);

                // Reset form
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

                // Clear previews
                if (imagePreview && imagePreview.startsWith('blob:')) {
                    URL.revokeObjectURL(imagePreview);
                }
                setImagePreview('');
                setNoNRC(false);
                if (customLogoPreview) {
                    URL.revokeObjectURL(customLogoPreview);
                    setCustomLogoPreview('');
                }
                if (customManufacturerLogoPreview) {
                    URL.revokeObjectURL(customManufacturerLogoPreview);
                    setCustomManufacturerLogoPreview('');
                }
                setCustomLogoFile(null);
                setCustomManufacturerLogoFile(null);
            } else {
                toast.error('Failed to add project. Please try again.');
            }
        } catch (error) {
            console.error('Error adding project:', error);
            if (error.response?.status === 400) {
                const backendMessage = error.response?.data?.message || error.response?.data?.error || JSON.stringify(error.response?.data);
                toast.error(`Invalid data: ${backendMessage}`);
            } else if (error.response?.status === 409) {
                toast.error('Project with this title already exists. Please choose a different title.');
            } else if (error.response?.status === 401) {
                toast.error('Unauthorized. Please login again.');
            } else if (error.response?.status >= 500) {
                toast.error('Server error. Please try again later.');
            } else {
                toast.error(error.response?.data?.message || error.message || 'Error adding project. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Logo preview URLs
    const mainLogoPreviewSrc = customLogoPreview || (formData.logo ? (getOciUrl(formData.logo) || formData.logo) : '');
    const manufacturerLogoPreviewSrc = customManufacturerLogoPreview || (formData.manufactureLogo ? (getOciUrl(formData.manufactureLogo) || formData.manufactureLogo) : '');
    const isMainStaticLogoSelected = formData.logo && staticLogoOptions.some((logo) => logo.url === formData.logo);
    const isManufacturerStaticLogoSelected = formData.manufactureLogo && staticLogoOptions.some((logo) => logo.url === formData.manufactureLogo);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <DescriptionIcon sx={{ fontSize: 28, color: 'white' }} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Add New Project</h1>
                            <p className="text-sm text-gray-600 mt-1">Fill in the project details below to create a new project</p>
                        </div>
                    </div>
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
                                <p className="text-xl font-semibold text-gray-800 mb-1">Adding Project</p>
                                <p className="text-sm text-gray-600">Please wait while we process your request...</p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 md:p-8 space-y-6">
                        {/* Project Image */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <label className="block text-sm font-semibold text-gray-700 mb-4">Project Image</label>
                            <div className="space-y-4">
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
                                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                                            <CloudUploadIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Click to upload image</p>
                                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
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
                                                    setFormData(prev => ({ ...prev, image: null }));
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
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                placeholder="Enter Project Title"
                            />
                        </div>

                        {/* Logo Field */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <label className="block text-sm font-semibold text-gray-700 mb-4">Logo</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Customer Logo */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Customer Logo</label>
                                    <div
                                        onClick={() => handleOpenLogoModal('main')}
                                        className={`border-2 rounded-xl p-6 text-center cursor-pointer transition-all duration-200 min-h-[160px] flex flex-col items-center justify-center ${formData.logo
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
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">End Customer Logo</label>
                                    <div
                                        onClick={() => handleOpenLogoModal('manufacturer')}
                                        className={`border-2 rounded-xl p-6 text-center cursor-pointer transition-all duration-200 min-h-[160px] flex flex-col items-center justify-center ${formData.manufactureLogo
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
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <label htmlFor="manager" className="block text-sm font-semibold text-gray-700 mb-2">Manager</label>
                            <select
                                id="manager"
                                name="manager"
                                value={formData.manager}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
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
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-2 mb-6">
                                <AssessmentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                <h2 className="text-lg font-semibold text-gray-800">Total Contract Deliverables</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label htmlFor="fixture" className="block text-sm font-semibold text-gray-700 mb-2">Fixture</label>
                                    <input
                                        type="text"
                                        id="fixture"
                                        name="fixture"
                                        value={formData.fixture}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="files" className="block text-sm font-semibold text-gray-700 mb-2">File</label>
                                    <input
                                        type="text"
                                        id="files"
                                        name="files"
                                        value={formData.files}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="legal" className="block text-sm font-semibold text-gray-700 mb-2">Legal Name</label>
                                    <input
                                        type="text"
                                        id="legal"
                                        name="legal"
                                        value={formData.legal}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="cont_del_sts" className="block text-sm font-semibold text-gray-700 mb-2">Select Risk Status</label>
                                    <select
                                        id="cont_del_sts"
                                        name="cont_del_sts"
                                        value={formData.cont_del_sts}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    >
                                        {riskStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: FUD & Risk Status */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-2 mb-6">
                                <AssessmentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                <h2 className="text-lg font-semibold text-gray-800">FUD & Risk Status</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="risk_status" className="block text-sm font-semibold text-gray-700 mb-2">FUD Date</label>
                                    <input
                                        type="date"
                                        id="risk_status"
                                        name="risk_status"
                                        value={formData.risk_status}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="risk_sts" className="block text-sm font-semibold text-gray-700 mb-2">Select Risk Status</label>
                                    <select
                                        id="risk_sts"
                                        name="risk_sts"
                                        value={formData.risk_sts}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    >
                                        {riskStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Component Drawings */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-2 mb-6">
                                <AssessmentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                <h2 className="text-lg font-semibold text-gray-800">Component Drawings</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="comp_drawing_rem" className="block text-sm font-semibold text-gray-700 mb-2">Remaining Deliverables</label>
                                    <input
                                        type="number"
                                        id="comp_drawing_rem"
                                        name="comp_drawing_rem"
                                        value={formData.comp_drawing_rem}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="comp_drawing_total" className="block text-sm font-semibold text-gray-700 mb-2">Total Deliverables</label>
                                    <input
                                        type="number"
                                        id="comp_drawing_total"
                                        name="comp_drawing_total"
                                        value={formData.comp_drawing_total}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="comp_drawing_sts" className="block text-sm font-semibold text-gray-700 mb-2">Select Risk Status</label>
                                    <select
                                        id="comp_drawing_sts"
                                        name="comp_drawing_sts"
                                        value={formData.comp_drawing_sts}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    >
                                        {riskStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Parts To Buy (PBOM) */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-2 mb-6">
                                <AssessmentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                <h2 className="text-lg font-semibold text-gray-800">Parts To Buy (PBOM)</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="parts_to_buy_rem" className="block text-sm font-semibold text-gray-700 mb-2">Remaining Deliverables</label>
                                    <input
                                        type="number"
                                        id="parts_to_buy_rem"
                                        name="parts_to_buy_rem"
                                        value={formData.parts_to_buy_rem}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="parts_to_buy_total" className="block text-sm font-semibold text-gray-700 mb-2">Total Deliverables</label>
                                    <input
                                        type="number"
                                        id="parts_to_buy_total"
                                        name="parts_to_buy_total"
                                        value={formData.parts_to_buy_total}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="parts_to_buy_sts" className="block text-sm font-semibold text-gray-700 mb-2">Select Risk Status</label>
                                    <select
                                        id="parts_to_buy_sts"
                                        name="parts_to_buy_sts"
                                        value={formData.parts_to_buy_sts}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    >
                                        {riskStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Production Readiness */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-2 mb-6">
                                <AssessmentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                <h2 className="text-lg font-semibold text-gray-800">Production Readiness</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="pro_readiness_rem" className="block text-sm font-semibold text-gray-700 mb-2">Remaining Deliverables</label>
                                    <input
                                        type="number"
                                        id="pro_readiness_rem"
                                        name="pro_readiness_rem"
                                        value={formData.pro_readiness_rem}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="pro_readiness_total" className="block text-sm font-semibold text-gray-700 mb-2">Total Deliverables</label>
                                    <input
                                        type="number"
                                        id="pro_readiness_total"
                                        name="pro_readiness_total"
                                        value={formData.pro_readiness_total}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="pro_readiness_sts" className="block text-sm font-semibold text-gray-700 mb-2">Select Risk Status</label>
                                    <select
                                        id="pro_readiness_sts"
                                        name="pro_readiness_sts"
                                        value={formData.pro_readiness_sts}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    >
                                        {riskStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 6: Contract Deliverables */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-2 mb-6">
                                <AssessmentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                <h2 className="text-lg font-semibold text-gray-800">Contract Deliverables</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="cont_deliverable_rem" className="block text-sm font-semibold text-gray-700 mb-2">Remaining Deliverables</label>
                                    <input
                                        type="number"
                                        id="cont_deliverable_rem"
                                        name="cont_deliverable_rem"
                                        value={formData.cont_deliverable_rem}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="cont_deliverable_total" className="block text-sm font-semibold text-gray-700 mb-2">Total Deliverables</label>
                                    <input
                                        type="number"
                                        id="cont_deliverable_total"
                                        name="cont_deliverable_total"
                                        value={formData.cont_deliverable_total}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="cont_deliverable_sts" className="block text-sm font-semibold text-gray-700 mb-2">Select Risk Status</label>
                                    <select
                                        id="cont_deliverable_sts"
                                        name="cont_deliverable_sts"
                                        value={formData.cont_deliverable_sts}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    >
                                        {riskStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 7: NRC */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <AssessmentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                    <h2 className="text-lg font-semibold text-gray-800">NRC</h2>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={noNRC}
                                        onChange={(e) => handleNoNRCChange(e.target.checked)}
                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                    />
                                    <span className="text-sm font-medium text-gray-700">No NRC</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <label htmlFor="amount_rem" className="block text-sm font-semibold text-gray-700 mb-2">Remaining Amount</label>
                                    <input
                                        type="text"
                                        id="amount_rem"
                                        name="amount_rem"
                                        value={formData.amount_rem}
                                        onChange={handleChange}
                                        disabled={noNRC}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="currencyCode1" className="block text-sm font-semibold text-gray-700 mb-2">Select Currency</label>
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">Total Amount</label>
                                    <input
                                        type="text"
                                        id="amount"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        disabled={noNRC}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="currencyCode2" className="block text-sm font-semibold text-gray-700 mb-2">Select Currency</label>
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="amount_sts" className="block text-sm font-semibold text-gray-700 mb-2">Select Risk Status</label>
                                    <select
                                        id="amount_sts"
                                        name="amount_sts"
                                        value={formData.amount_sts}
                                        onChange={handleChange}
                                        disabled={noNRC}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {riskStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SCL and PLAN Files */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* SCL Files */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">SCL</label>
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
                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
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
                                                        <span className="truncate flex-1">{file.name || (file.originalname || 'Unknown file')}</span>
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
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">PLAN</label>
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
                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
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
                                                        <span className="truncate flex-1">{file.name || (file.originalname || 'Unknown file')}</span>
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

                        {/* Submit Button Section */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 shadow-lg">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-white text-blue-600 py-4 px-6 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-md hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        Adding Project...
                                    </span>
                                ) : (
                                    'Add Project'
                                )}
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
        </div>
    );
};

export default AddProject;
