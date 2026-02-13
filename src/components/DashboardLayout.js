import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { Pagination, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel, Box, Divider, IconButton } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';

const DashboardLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [projectOptions, setProjectOptions] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const projectDropdownRef = useRef(null);
    const [searchInput, setSearchInput] = useState('');
    const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
    const searchDropdownRef = useRef(null);
    const searchInputRef = useRef(null);
    const modalSearchDropdownRef = useRef(null);
    const modalSearchInputRef = useRef(null);
    const isSearchInputFocusedRef = useRef(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // Read pagination from URL params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const totalPages = parseInt(searchParams.get('totalPages') || '0', 10);
    const selectedProjectsParam = searchParams.get('projects') || '';
    const searchParam = searchParams.get('search') || '';

    // Parse selected projects from URL (comma-separated)
    const selectedProjects = selectedProjectsParam
        ? selectedProjectsParam.split(',').map(code => code.trim()).filter(Boolean)
        : [];

    // Fetch project options
    useEffect(() => {
        const fetchProjectOptions = async () => {
            if (location.pathname !== '/dashboard') return;

            try {
                setLoadingProjects(true);
                // Use axiosInstance with full URL - axios will automatically ignore baseURL for absolute URLs
                const response = await axiosInstance.get('/api/projects/get_projects_title');
                if (response.data && response.data.projects) {
                    setProjectOptions(response.data.projects);
                }
            } catch (error) {
                console.error('Error fetching project options:', error);
            } finally {
                setLoadingProjects(false);
            }
        };

        fetchProjectOptions();
    }, [location.pathname]);

    // Sync search input with URL param when search param or project options change
    // Only sync when input is not focused (to avoid interfering with user typing)
    useEffect(() => {
        if (!isSearchInputFocusedRef.current) {
            if (searchParam && projectOptions.length > 0) {
                const project = projectOptions.find(p => p.code.toString() === searchParam);
                if (project && searchInput !== project.title) {
                    setSearchInput(project.title);
                }
            } else if (!searchParam && searchInput) {
                // Clear input when search param is removed
                setSearchInput('');
            }
        }
    }, [searchParam, projectOptions]);

    // Track window width for responsive limit
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
                setProjectDropdownOpen(false);
            }
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
                setSearchSuggestionsOpen(false);
            }
            if (modalSearchDropdownRef.current && !modalSearchDropdownRef.current.contains(event.target)) {
                setSearchSuggestionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Function to update URL params
    const updateSearchParams = (updates) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                newParams.set(key, value.toString());
            } else {
                newParams.delete(key);
            }
        });
        setSearchParams(newParams, { replace: true });
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        updateSearchParams({ page: newPage });
    };

    // Get max limit based on screen width
    const getMaxLimit = () => {
        if (windowWidth < 550) return 1;
        if (windowWidth < 950) return 2;
        if (windowWidth < 1150) return 3;
        if (windowWidth < 1400) return 4;
        return 9;
    };

    // Handle limit change
    const handleLimitChange = (newLimit) => {
        // Cap limit based on screen width
        const maxLimit = getMaxLimit();
        const cappedLimit = Math.min(newLimit, maxLimit);
        updateSearchParams({ limit: cappedLimit, page: 1 }); // Reset to page 1 when limit changes
    };

    // Get available limit options based on screen width
    const getAvailableLimits = () => {
        const maxLimit = getMaxLimit();
        return Array.from({ length: maxLimit }, (_, i) => i + 1);
    };

    // Ensure current limit doesn't exceed max when window resizes
    useEffect(() => {
        if (location.pathname === '/dashboard') {
            const maxLimit = getMaxLimit();
            if (limit > maxLimit) {
                const newParams = new URLSearchParams(searchParams);
                newParams.set('limit', maxLimit.toString());
                newParams.set('page', '1');
                setSearchParams(newParams, { replace: true });
            }
        }
    }, [windowWidth, location.pathname, limit, searchParams, setSearchParams]);

    // Handle project checkbox toggle
    const handleProjectToggle = (projectCode) => {
        const codeStr = projectCode.toString();
        const newSelectedProjects = selectedProjects.includes(codeStr)
            ? selectedProjects.filter(code => code !== codeStr)
            : [...selectedProjects, codeStr];

        if (newSelectedProjects.length > 0) {
            updateSearchParams({ projects: newSelectedProjects.join(','), page: 1 });
        } else {
            updateSearchParams({ projects: null, page: 1 });
        }
    };

    // Handle select all projects
    const handleSelectAll = () => {
        if (selectedProjects.length === projectOptions.length) {
            // Deselect all
            updateSearchParams({ projects: null, page: 1 });
        } else {
            // Select all
            const allCodes = projectOptions.map(p => p.code.toString()).join(',');
            updateSearchParams({ projects: allCodes, page: 1 });
        }
    };

    // Get display text for selected projects
    const getSelectedProjectsText = () => {
        if (selectedProjects.length === 0) {
            return 'All Projects';
        }
        if (selectedProjects.length === 1) {
            const project = projectOptions.find(p => p.code.toString() === selectedProjects[0]);
            return project ? project.title : '1 project selected';
        }
        return `${selectedProjects.length} projects selected`;
    };

    // Filter projects for search suggestions
    const getSearchSuggestions = () => {
        if (!searchInput.trim()) {
            return [];
        }
        const searchLower = searchInput.toLowerCase().trim();
        return projectOptions.filter(project =>
            project.title.toLowerCase().includes(searchLower) ||
            project.code.toString().includes(searchLower)
        ).slice(0, 10); // Limit to 10 suggestions
    };

    // Handle search input change
    const handleSearchInputChange = (e) => {
        const value = e.target.value;
        setSearchInput(value);
        setSearchSuggestionsOpen(value.trim().length > 0);
    };

    // Handle search suggestion click
    const handleSearchSuggestionClick = (projectCode) => {
        const project = projectOptions.find(p => p.code.toString() === projectCode.toString());
        updateSearchParams({ search: projectCode.toString(), page: 1 });
        setSearchInput(project ? project.title : '');
        setSearchSuggestionsOpen(false);
    };

    // Clear search
    const handleClearSearch = () => {
        updateSearchParams({ search: null, page: 1 });
        setSearchInput('');
        setSearchSuggestionsOpen(false);
    };

    const handleLogoutClick = () => {
        setLogoutModalOpen(true);
    };

    const handleLogoutConfirm = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
        setLogoutModalOpen(false);
        navigate('/login');
    };

    const handleLogoutCancel = () => {
        setLogoutModalOpen(false);
    };

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userRole = localStorage.getItem('userRole');

    // Menu items - show all for admin, limited for modifier
    const menuItems = [
        { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: DashboardIcon, roles: ['admin', 'modifier'] },
        { id: 'add-project', path: '/add-project', label: 'Add Project', icon: AddIcon, roles: ['admin', 'modifier'] },
        { id: 'edit-project', path: '/edit-project', label: 'Edit Project', icon: EditIcon, roles: ['admin', 'modifier'] },
        { id: 'delete-project', path: '/delete-project', label: 'Delete Project', icon: DeleteIcon, roles: ['admin'] },
        { id: 'add-user', path: '/add-user', label: 'Add User', icon: PersonAddIcon, roles: ['admin'] },
    ].filter(item => item.roles.includes(userRole));

    const handleMenuClick = () => {
        setSidebarOpen(false); // Close sidebar when menu item is clicked
    };

    // MUI Theme for Pagination - matches header theme
    const paginationTheme = createTheme({
        components: {
            MuiPagination: {
                styleOverrides: {
                    root: {
                        '& .MuiPaginationItem-root': {
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            minWidth: '32px',
                            height: '32px',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&.Mui-selected': {
                                backgroundColor: '#2563eb', // blue-600
                                color: 'white',
                                border: 'none',
                                '&:hover': {
                                    backgroundColor: '#1d4ed8', // blue-700
                                },
                            },
                            '&.Mui-disabled': {
                                opacity: 0.5,
                                cursor: 'not-allowed',
                            },
                        },
                        '& .MuiPaginationItem-icon': {
                            color: 'white',
                            fontSize: '1.25rem',
                        },
                        '& .MuiPaginationItem-ellipsis': {
                            color: 'white',
                        },
                    },
                },
            },
        },
    });

    return (
        <div className="min-h-screen bg-gray-100 w-full">
            {/* Header */}
            <div className="bg-[#0d0f36] shadow-md sticky top-0 z-40">
                <div className="max-w-full mx-auto px-1 sm:px-3 py-1">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">

                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 rounded-md hover:bg-opacity-20 hover:bg-white transition-colors"
                                aria-label="Toggle menu"
                            >
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path d="M4 6h16M4 12h16M4 18h16"></path>
                                </svg>
                            </button>
                            {/* Logo - hidden on screens smaller than md */}
                            <div className="flex-shrink-0 hidden md:block">
                                <img src="/favicon.png" alt="Logo" className="h-[35px] w-auto object-contain" />
                            </div>
                            {/* Search Field - only show on dashboard route, hide on screens < 1200px */}
                            {location.pathname === '/dashboard' && windowWidth >= 1200 && (
                                <div className="relative" ref={searchDropdownRef}>
                                    <div className="relative 2xl:ml-[100px]">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchInput}
                                            onChange={handleSearchInputChange}
                                            onFocus={() => { isSearchInputFocusedRef.current = true; }}
                                            onBlur={() => {
                                                isSearchInputFocusedRef.current = false;
                                                // Sync with URL param when input loses focus
                                                if (searchParam && projectOptions.length > 0) {
                                                    const project = projectOptions.find(p => p.code.toString() === searchParam);
                                                    if (project && searchInput !== project.title) {
                                                        setSearchInput(project.title);
                                                    }
                                                }
                                            }}
                                            placeholder="Search projects..."
                                            className="px-3 py-1.5 pl-10 pr-8 border border-white border-opacity-30 rounded-md text-sm font-medium text-white bg-white bg-opacity-10 hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-white placeholder-opacity-60 2xl:w-[500px]"
                                        />
                                        <svg
                                            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white opacity-60"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        {searchParam && (
                                            <button
                                                onClick={handleClearSearch}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white opacity-60 hover:opacity-100"
                                                aria-label="Clear search"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    {searchSuggestionsOpen && getSearchSuggestions().length > 0 && (
                                        <div className="absolute top-full left-0 mt-1 2xl:ml-[100px] 2xl:w-[500px] bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                                            <div className="py-1">
                                                {getSearchSuggestions().map((project) => (
                                                    <button
                                                        key={project.code}
                                                        onClick={() => handleSearchSuggestionClick(project.code)}
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                                    >
                                                        <span className="text-sm text-gray-700 flex-1">{project.title}</span>
                                                        {/* <span className="text-xs text-gray-500 ml-2">Code: {project.code}</span> */}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Filter Button - only show on dashboard route when screen < 1200px */}
                            {location.pathname === '/dashboard' && windowWidth < 1200 && (
                                <button
                                    onClick={() => setFilterModalOpen(true)}
                                    className="flex items-center sm:space-x-2 px-2 sm:px-3 py-1.5 border border-white border-opacity-30 rounded-md text-sm font-medium text-white bg-white bg-opacity-10 hover:bg-opacity-20 transition-colors"
                                >
                                    <FilterListIcon sx={{ fontSize: 18 }} />
                                    <span className="hidden sm:inline">Filter</span>
                                </button>
                            )}
                            {/* <div>
                                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                            </div> */}
                        </div>
                        <div className="flex items-center space-x-4">

                            {/* Project Multi-Select - only show on dashboard route, hide on screens < 1200px */}
                            {location.pathname === '/dashboard' && windowWidth >= 1200 && (
                                <div className="flex items-center space-x-2 relative" ref={projectDropdownRef}>
                                    {/* <label className="text-white text-sm font-medium">Project:</label> */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                                            disabled={loadingProjects}
                                            className="px-3 py-1.5 border border-white border-opacity-30 rounded-md text-sm font-medium text-white bg-white bg-opacity-10 hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer min-w-[200px] text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="truncate">{loadingProjects ? 'Loading...' : getSelectedProjectsText()}</span>
                                            <svg
                                                className={`w-4 h-4 ml-2 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {projectDropdownOpen && !loadingProjects && (
                                            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                                                <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                                                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProjects.length === projectOptions.length && projectOptions.length > 0}
                                                            onChange={handleSelectAll}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">Select All</span>
                                                    </label>
                                                </div>
                                                <div className="py-1">
                                                    {projectOptions.map((project) => {
                                                        const isChecked = selectedProjects.includes(project.code.toString());
                                                        return (
                                                            <label
                                                                key={project.code}
                                                                className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleProjectToggle(project.code)}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                />
                                                                <span className="text-sm text-gray-700 flex-1">{project.title}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* Limit Selector - only show on dashboard route, hide on screens < 1200px */}
                            {location.pathname === '/dashboard' && windowWidth >= 1200 && (
                                <div className="flex items-center space-x-2">
                                    {/* <label className="text-white text-sm font-medium">Show:</label> */}
                                    <select
                                        value={limit}
                                        onChange={(e) => {
                                            const newLimit = Number(e.target.value);
                                            handleLimitChange(newLimit);
                                        }}
                                        className="px-2 py-1.5 border border-white border-opacity-30 rounded-md text-sm font-medium text-white bg-white bg-opacity-10 hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
                                    >
                                        {getAvailableLimits().map((num) => (
                                            <option key={num} value={num} className="bg-[#0d0f36] text-white">
                                                {num}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {/* Pagination - only show on dashboard route */}
                            {location.pathname === '/dashboard' && totalPages > 1 && (
                                <ThemeProvider theme={paginationTheme}>
                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={(event, value) => handlePageChange(value)}
                                        color="primary"
                                        size="small"
                                        siblingCount={windowWidth < 768 ? 0 : 1}
                                        boundaryCount={1}
                                        sx={{
                                            '& .MuiPagination-ul': {
                                                gap: '4px',
                                            },
                                        }}
                                    />
                                </ThemeProvider>
                            )}
                            <button
                                onClick={handleLogoutClick}
                                className="hidden md:flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                <span className="">{userData.uname || 'User'}</span>
                                <LogoutIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overlay Sidebar */}
            {sidebarOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    ></div>

                    {/* Sidebar */}
                    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                                aria-label="Close menu"
                            >
                                <svg
                                    className="w-5 h-5 text-gray-700"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <nav className="p-4">
                            <ul className="space-y-2">
                                {menuItems.map((item) => {
                                    const IconComponent = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <li key={item.id}>
                                            <NavLink
                                                to={item.path}
                                                onClick={handleMenuClick}
                                                className={({ isActive }) =>
                                                    `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${isActive
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                                    }`
                                                }
                                            >
                                                <IconComponent
                                                    sx={{
                                                        fontSize: 24,
                                                        color: isActive ? 'white' : '#374151'
                                                    }}
                                                />
                                                <span className="font-medium">{item.label}</span>
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                            {/* Logout Button - only show on screens smaller than md */}
                            <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleLogoutClick}
                                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left bg-red-600 text-white hover:bg-red-700"
                                >
                                    <LogoutIcon
                                        sx={{
                                            fontSize: 24,
                                            color: 'white'
                                        }}
                                    />
                                    <span className="font-medium">Logout ({userData.uname || 'User'})</span>
                                </button>
                            </div>
                        </nav>
                    </div>
                </>
            )}

            {/* Main Content */}
            <div className="w-full">
                {children}
            </div>

            {/* Logout Confirmation Modal */}
            <Dialog
                open={logoutModalOpen}
                onClose={handleLogoutCancel}
                aria-labelledby="logout-dialog-title"
                aria-describedby="logout-dialog-description"
            >
                <DialogTitle id="logout-dialog-title">
                    Confirm Logout
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="logout-dialog-description">
                        Are you sure you want to logout? You will need to login again to access the dashboard.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleLogoutCancel} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleLogoutConfirm} color="error" variant="contained" autoFocus>
                        Logout
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Filter Modal - only show on dashboard route */}
            {location.pathname === '/dashboard' && (
                <Dialog
                    open={filterModalOpen}
                    onClose={() => {
                        setFilterModalOpen(false);
                        setSearchSuggestionsOpen(false);
                    }}
                    aria-labelledby="filter-dialog-title"
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle id="filter-dialog-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Filters</span>
                        <IconButton
                            onClick={() => setFilterModalOpen(false)}
                            size="small"
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                            {/* Search Field */}
                            <Box>
                                <InputLabel sx={{ mb: 1, fontWeight: 600 }}>Search Projects</InputLabel>
                                <div className="relative" ref={modalSearchDropdownRef}>
                                    <TextField
                                        fullWidth
                                        inputRef={modalSearchInputRef}
                                        type="text"
                                        value={searchInput}
                                        onChange={handleSearchInputChange}
                                        onFocus={() => { isSearchInputFocusedRef.current = true; }}
                                        onBlur={() => {
                                            isSearchInputFocusedRef.current = false;
                                            if (searchParam && projectOptions.length > 0) {
                                                const project = projectOptions.find(p => p.code.toString() === searchParam);
                                                if (project && searchInput !== project.title) {
                                                    setSearchInput(project.title);
                                                }
                                            }
                                        }}
                                        placeholder="Search projects..."
                                        variant="outlined"
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <svg
                                                    className="w-4 h-4 text-gray-400 mr-2"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            ),
                                            endAdornment: searchParam && (
                                                <IconButton
                                                    size="small"
                                                    onClick={handleClearSearch}
                                                    sx={{ mr: -1 }}
                                                >
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            )
                                        }}
                                    />
                                    {searchSuggestionsOpen && getSearchSuggestions().length > 0 && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            mt: 1,
                                            bgcolor: 'white',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: 1,
                                            boxShadow: 3,
                                            zIndex: 1000,
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            {getSearchSuggestions().map((project) => (
                                                <Button
                                                    key={project.code}
                                                    onClick={() => {
                                                        handleSearchSuggestionClick(project.code);
                                                        setSearchSuggestionsOpen(false);
                                                    }}
                                                    fullWidth
                                                    sx={{
                                                        justifyContent: 'flex-start',
                                                        textTransform: 'none',
                                                        color: 'text.primary',
                                                        '&:hover': { bgcolor: 'action.hover' }
                                                    }}
                                                >
                                                    {project.title}
                                                </Button>
                                            ))}
                                        </Box>
                                    )}
                                </div>
                            </Box>

                            <Divider />

                            {/* Project Multi-Select */}
                            <Box>
                                <InputLabel sx={{ mb: 1, fontWeight: 600 }}>Select Projects</InputLabel>
                                <Box sx={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 1,
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    <Box sx={{ p: 1, borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedProjects.length === projectOptions.length && projectOptions.length > 0}
                                                onChange={handleSelectAll}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '14px', fontWeight: 600 }}>Select All</span>
                                        </label>
                                    </Box>
                                    <Box sx={{ py: 1 }}>
                                        {projectOptions.map((project) => {
                                            const isChecked = selectedProjects.includes(project.code.toString());
                                            return (
                                                <label
                                                    key={project.code}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '8px 12px',
                                                        cursor: 'pointer',
                                                        '&:hover': { backgroundColor: '#f5f5f5' }
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleProjectToggle(project.code)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: '14px', flex: 1 }}>{project.title}</span>
                                                </label>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            </Box>

                            <Divider />

                            {/* Limit Selector */}
                            <Box>
                                <InputLabel sx={{ mb: 1, fontWeight: 600 }}>Show Cards</InputLabel>
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={limit}
                                        onChange={(e) => {
                                            const newLimit = Number(e.target.value);
                                            handleLimitChange(newLimit);
                                        }}
                                    >
                                        {getAvailableLimits().map((num) => (
                                            <MenuItem key={num} value={num}>
                                                {num}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => {
                                setFilterModalOpen(false);
                                setSearchSuggestionsOpen(false);
                            }}
                            variant="contained"
                        >
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </div>
    );
};

export default DashboardLayout;

